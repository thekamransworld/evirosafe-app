// Firestore side of the actions system. All the decisions (who may do what, what is valid) live in
// src/lib/actions; this file only reads and writes.
//
// Rules of the road (the same as the permit service):
//  * Every step re-reads the action FROM THE SERVER first, so a stale screen can never act on an old copy.
//  * Creating an action is ONE transaction: the yearly counter is read and bumped, and the action is written
//    with it, so an action number is never skipped or reused.
//  * Server time is stamped by Firestore (serverTimestamp), never by the browser. The database rules refuse a
//    client clock. The history is append-only in the rules.
//  * The REAL error of every refused write is logged to the console (logActionError), so it can be sent back.

import { db } from '../firebase';
import {
  collection, deleteField, doc, getDocFromServer, onSnapshot, query, runTransaction, serverTimestamp,
  Timestamp, where, writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { stripUndefined } from '../lib/shared/clean';
import { counterDocId } from '../lib/shared/counters';
import { resolveSentinels, type Sentinel } from '../lib/shared/writes';
import {
  canCreate, checkContentEdit, prepareTransition, validateNewAction, LEGACY_MESSAGE,
  type ActionDoc, type ActorLike, type LogEntry, type NewActionInput, type Reschedule,
} from '../lib/actions/engine';
import type { ActionId } from '../lib/actions/model';
import { buildNewAction, planContentWrite, planTransitionWrite, validateContent, type ContentFields } from '../lib/actions/writes';
import { planNotifications, type NotifyStep, type NotifyUser } from '../lib/actions/notify';
import { writeNotifications } from './notificationService';

// ─── helpers ──────────────────────────────────────────────────────────────

const toAction = (snap: DocumentSnapshot): ActionDoc => ({ ...(snap.data() as object), id: snap.id } as unknown as ActionDoc);

/** Swaps the pure sentinels for real Firestore values. */
const toFirestore = <T,>(v: T): T =>
  resolveSentinels(stripUndefined(v), (s: Sentinel) =>
    s.__sentinel === 'serverTimestamp' ? serverTimestamp()
    : s.__sentinel === 'timestamp' ? Timestamp.fromMillis(s.ms)
    : deleteField());

/**
 * Writes the REAL error to the browser console, naming the operation. The person sees a plain message;
 * whoever is debugging needs the code and the context (the database's own message for a refused write is
 * only "Missing or insufficient permissions").
 */
export function logActionError(label: string, e: unknown, context: Record<string, unknown> = {}) {
  const err = e as { code?: string; message?: string };
  console.error(`[ACTIONS] ${label} failed`, { code: err?.code, message: err?.message, ...context });
}

/** Turns a Firebase error into something a person can act on. */
export function describeActionError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case 'permission-denied':
      return 'The database refused this change. Usual causes: someone else changed this action a moment ago (refresh and try again); '
        + 'your device clock is more than 10 minutes wrong; your role is not allowed to do this; or the latest Firestore rules have not been deployed.';
    case 'aborted':
      return 'Another change got in first. Refresh the action and try again.';
    case 'unavailable':
    case 'deadline-exceeded':
    case 'failed-precondition':
      return 'Could not reach the server. Action changes need a live connection: check your internet and try again.';
    case 'not-found':
      return 'This action no longer exists.';
    case 'resource-exhausted':
      return 'The server is busy. Wait a moment and try again.';
    default:
      return 'Something went wrong while saving. Check your connection and try again. If it keeps happening, send the line starting [ACTIONS] from the browser console to whoever maintains the app.';
  }
}

async function readAction(id: string): Promise<{ ok: true; action: ActionDoc } | { ok: false; reason: string }> {
  const snap = await getDocFromServer(doc(db, 'actions', id));
  if (!snap.exists()) return { ok: false, reason: 'This action no longer exists.' };
  return { ok: true, action: toAction(snap) };
}

// ─── live list ────────────────────────────────────────────────────────────

export interface ListScope {
  orgId: string;
  /** A project-restricted person sees only their projects (at most 30, Firestore's limit for "in"). */
  projectIds: string[] | null;
}

/**
 * A live list of the organisation's actions. The query is built so that the database rules can prove every
 * document it returns is readable by this person (a restricted person must filter by their projects).
 */
export function subscribeActions(scope: ListScope, onData: (list: ActionDoc[]) => void, onError: (e: unknown) => void): () => void {
  const constraints = [where('org_id', '==', scope.orgId)];
  if (scope.projectIds) {
    if (scope.projectIds.length === 0) { onData([]); return () => {}; }
    constraints.push(where('project_id', 'in', scope.projectIds.slice(0, 30)));
  }
  return onSnapshot(
    query(collection(db, 'actions'), ...constraints),
    snap => onData(snap.docs.map(d => ({ ...(d.data({ serverTimestamps: 'estimate' }) as object), id: d.id } as unknown as ActionDoc))),
    e => { logActionError('live list', e, { orgId: scope.orgId }); onError(e); },
  );
}

// ─── create ───────────────────────────────────────────────────────────────

export interface CreateActionInput {
  actor: ActorLike;
  orgId: string;
  input: NewActionInput;
  orgUsers?: NotifyUser[];
}
export type CreateOutcome = { ok: true; action: ActionDoc } | { ok: false; reason: string };

/** Creates an OPEN action. One transaction: the yearly counter is read and bumped, and the action is written with it. */
export async function createAction(req: CreateActionInput): Promise<CreateOutcome> {
  try {
    if (!canCreate(req.actor)) return { ok: false, reason: `Your role (${req.actor.role}) cannot raise actions.` };
    const checked = validateNewAction(req.input as unknown as Record<string, unknown>);
    if (checked.ok === false) return { ok: false, reason: checked.problems.join(' ') };

    const now = Date.now();
    const year = new Date(now).getFullYear();
    const ref = doc(collection(db, 'actions'));
    const counterRef = doc(db, 'counters', counterDocId('act', req.orgId, year));

    await runTransaction(db, async tx => {
      const snap = await tx.get(counterRef);
      const n = (snap.exists() ? Number(snap.data().value) : 0) + 1;
      const built = buildNewAction({ orgId: req.orgId, actor: req.actor, input: checked.value, year, n, now });
      if (snap.exists()) tx.update(counterRef, { value: n });
      else tx.set(counterRef, built.counter);
      tx.set(ref, toFirestore(built.action));
    });

    const read = await readAction(ref.id);
    if (read.ok === false) return { ok: false, reason: read.reason };
    void notifyAfter(read.action, 'create', 'OPEN', req.actor.id, req.orgUsers ?? []);
    return { ok: true, action: read.action };
  } catch (e) {
    logActionError('create action', e, { actor: { id: req.actor.id, role: req.actor.role }, orgId: req.orgId, projectId: req.input?.project_id });
    return { ok: false, reason: describeActionError(e) };
  }
}

// ─── steps ────────────────────────────────────────────────────────────────

export interface StepRequest {
  actionId: string;
  step: ActionId;
  actor: ActorLike;
  note?: string;
  /** Written reason for a segregation override. */
  justification?: string;
  changes?: Reschedule;
  /** Everyone in the organisation, so the right people are notified. */
  orgUsers?: NotifyUser[];
}

export type StepOutcome =
  | { ok: true; action: ActionDoc; log: LogEntry; override: boolean }
  | { ok: false; reason: string };

export async function performStep(req: StepRequest): Promise<StepOutcome> {
  let statusBefore: string | undefined;
  try {
    const read = await readAction(req.actionId);
    if (read.ok === false) return { ok: false, reason: read.reason };
    const action = read.action;
    statusBefore = action.status;
    if (!action.number) return { ok: false, reason: LEGACY_MESSAGE };

    const result = prepareTransition({
      action, step: req.step, actor: req.actor, now: Date.now(),
      note: req.note, justification: req.justification, changes: req.changes,
    });
    if (result.ok === false) return { ok: false, reason: result.reason };

    const plan = planTransitionWrite(action, result);
    const batch = writeBatch(db);
    batch.update(doc(db, 'actions', action.id), toFirestore(plan.update) as Record<string, unknown>);
    await batch.commit();

    const fresh = await readAction(action.id);
    const updated = fresh.ok ? fresh.action : ({ ...action, status: result.to } as ActionDoc);
    void notifyAfter(updated, req.step, result.to, req.actor.id, req.orgUsers ?? [], req.note, action.owner_id);
    return { ok: true, action: updated, log: result.log, override: result.override };
  } catch (e) {
    logActionError(`step "${req.step}"`, e, { actionId: req.actionId, from: statusBefore, actor: { id: req.actor.id, role: req.actor.role } });
    return { ok: false, reason: describeActionError(e) };
  }
}

// ─── content edits ────────────────────────────────────────────────────────

export type SaveOutcome = { ok: true; action: ActionDoc; changed: boolean } | { ok: false; reason: string };

/**
 * Saves an edit of the definition. Only what the editor changed since `base` (the version they loaded) is
 * written, leaf by leaf, so two people editing different parts do not overwrite each other.
 */
export async function saveActionContent(actionId: string, next: ContentFields, actor: ActorLike, base?: ContentFields): Promise<SaveOutcome> {
  try {
    const read = await readAction(actionId);
    if (read.ok === false) return { ok: false, reason: read.reason };
    const action = read.action;
    const allowed = checkContentEdit(action, actor);
    if (allowed.ok === false) return { ok: false, reason: allowed.reason };
    const scoped: ContentFields = allowed.scope === 'car' ? { car: next.car } : next;
    const valid = validateContent(scoped);
    if (valid.ok === false) return { ok: false, reason: valid.reason };

    const plan = planContentWrite(action, scoped, base);
    if (!plan.changed) return { ok: true, action, changed: false };
    const batch = writeBatch(db);
    batch.update(doc(db, 'actions', actionId), toFirestore(plan.update) as Record<string, unknown>);
    await batch.commit();
    const fresh = await readAction(actionId);
    return { ok: true, action: fresh.ok ? fresh.action : action, changed: true };
  } catch (e) {
    logActionError('save content', e, { actionId, actor: { id: actor.id, role: actor.role } });
    return { ok: false, reason: describeActionError(e) };
  }
}

// ─── notifications ────────────────────────────────────────────────────────

/** Best effort: a failed notification never fails the step. */
export async function notifyAfter(
  action: ActionDoc, step: NotifyStep, to: ActionDoc['status'], actorId: string, users: NotifyUser[],
  note?: string, prevOwnerId?: string,
): Promise<void> {
  try {
    const plan = planNotifications({
      action, step, to: to as Parameters<typeof planNotifications>[0]['to'], actorId, users, note, prevOwnerId,
    });
    await writeNotifications(plan);
  } catch (e) {
    console.error('[ACTIONS] notification failed:', e);
  }
}
