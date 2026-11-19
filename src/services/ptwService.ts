// Firestore side of the permit-to-work system. All the decisions (who may do
// what, validity, gates) live in src/lib/ptw; this file only reads and writes.
//
// Rules of the road:
//  * Every action re-reads the permit FROM THE SERVER first, so a stale
//    screen can never act on an old copy. (The app loads permits once.)
//  * Every transition is ONE batch: the permit update plus its public status
//    mirror, so they can never disagree.
//  * Server time is stamped by Firestore (serverTimestamp), never by the
//    browser. The database rules refuse a client clock.
//  * No offline queueing: a permit action must happen now, with the database.

import { db } from '../firebase';
import {
  addDoc, collection, deleteField, doc, getDocFromServer, getDocsFromServer, query, runTransaction,
  serverTimestamp, Timestamp, where, writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type { Ptw, PtwPayload } from '../types';
import {
  checkContentEdit, prepareTransition,
  type ActorLike, type EnginePermit, type LogEntry,
} from '../lib/ptw/engine';
import { groupNeedsOthers, type GateContext, type GateResult } from '../lib/ptw/gates';
import { ACTIONS, type ActionId, type PermitType } from '../lib/ptw/model';
import { counterDocId } from '../lib/ptw/numbering';
import { effectiveStatus } from '../lib/ptw/validity';
import { stripUndefined } from '../lib/ptw/clean';
import { planNotifications, type NotifyUser } from '../lib/ptw/notify';
import {
  buildNewPermit, generatePublicToken, planContentWrite, planTransitionWrite,
  resolveSentinels, type Sentinel,
} from '../lib/ptw/writes';

// ─── helpers ──────────────────────────────────────────────────────────────

const toPermit = (snap: DocumentSnapshot): Ptw => ({ ...(snap.data() as object), id: snap.id } as unknown as Ptw);

/** Swaps the pure sentinels for real Firestore values. */
const toFirestore = <T,>(v: T): T =>
  resolveSentinels(stripUndefined(v), (s: Sentinel) =>
    s.__sentinel === 'serverTimestamp' ? serverTimestamp()
    : s.__sentinel === 'timestamp' ? Timestamp.fromMillis(s.ms)
    : deleteField());

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/**
 * Writes the REAL error to the browser console, naming the operation. The person sees a plain
 * message; whoever is debugging needs the code and the context (the database's own message
 * for a refused write is only "Missing or insufficient permissions").
 */
function logPtwError(label: string, e: unknown, context: Record<string, unknown> = {}) {
  const err = e as { code?: string; message?: string };
  console.error(`[PTW] ${label} failed`, { code: err?.code, message: err?.message, ...context });
}

/** Turns a Firebase error into something a person can act on. */
export function describePtwError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case 'permission-denied':
      return 'The database refused this change. Usual causes: someone else changed this permit a moment ago (refresh and try again); '
        + 'your device clock is more than 10 minutes wrong (start and extension times come from the server clock); '
        + 'your role is not allowed to do this; or the latest Firestore rules have not been deployed.';
    case 'aborted':
      return 'Another change got in first. Refresh the permit and try again.';
    case 'unavailable':
    case 'deadline-exceeded':
    case 'failed-precondition':
      return 'Could not reach the server. Permit actions need a live connection: check your internet and try again.';
    case 'not-found':
      return 'This permit no longer exists. It may have been deleted.';
    case 'resource-exhausted':
      return 'The server is busy. Wait a moment and try again.';
    case 'unauthenticated':
      return 'You have been signed out. Sign in again and retry.';
    default:
      return (e as { message?: string })?.message || 'Something went wrong. Try again.';
  }
}

async function readPermit(id: string): Promise<{ ok: true; permit: Ptw } | { ok: false; reason: string }> {
  const snap = await getDocFromServer(doc(db, 'ptws', id));
  if (!snap.exists()) return { ok: false, reason: 'This permit no longer exists. It may have been deleted.' };
  return { ok: true, permit: toPermit(snap) };
}

const LEGACY_MESSAGE =
  'This permit was created before the new permit system and cannot be progressed or edited. '
  + 'An administrator can delete it so you can raise a new one.';

// ─── create ───────────────────────────────────────────────────────────────

export interface CreatePermitInput {
  actor: ActorLike;
  orgId: string;
  projectId: string;
  type: PermitType;
  title: string;
  payload: PtwPayload;
  receiverId?: string;
}

export type CreateOutcome = { ok: true; permit: Ptw } | { ok: false; reason: string };

/**
 * Creates a DRAFT permit. One transaction: the organisation's yearly counter
 * is read and incremented, and the permit, its public status mirror and the
 * counter are written together, so a permit number is never skipped or reused.
 */
export async function createPermit(input: CreatePermitInput): Promise<CreateOutcome> {
  try {
    const now = Date.now();
    const year = new Date(now).getFullYear();
    const permitRef = doc(collection(db, 'ptws'));
    const counterRef = doc(db, 'counters', counterDocId(input.orgId, year));
    const token = generatePublicToken(randomBytes);

    await runTransaction(db, async tx => {
      const snap = await tx.get(counterRef);
      const n = (snap.exists() ? Number(snap.data().value) : 0) + 1;
      const built = buildNewPermit(permitRef.id, {
        orgId: input.orgId, projectId: input.projectId, type: input.type, title: input.title,
        payload: input.payload, creator: input.actor, receiverId: input.receiverId,
        year, n, token, now,
      });
      if (snap.exists()) tx.update(counterRef, { value: n });
      else tx.set(counterRef, built.counter);
      tx.set(permitRef, toFirestore(built.permit));
      tx.set(doc(db, 'ptw_public', token), toFirestore(built.mirror));
    });

    const read = await readPermit(permitRef.id);
    return read.ok === true ? { ok: true, permit: read.permit } : { ok: false, reason: read.reason };
  } catch (e) {
    logPtwError('create permit', e, { actor: { id: input.actor.id, role: input.actor.role }, orgId: input.orgId, projectId: input.projectId, type: input.type });
    return { ok: false, reason: describePtwError(e) };
  }
}

// ─── neighbouring permits (SIMOPS) ────────────────────────────────────────

/** Every permit of a project, read from the server (never from cache). */
export async function fetchProjectPermits(orgId: string, projectId: string): Promise<Ptw[]> {
  const snap = await getDocsFromServer(query(collection(db, 'ptws'), where('org_id', '==', orgId), where('project_id', '==', projectId)));
  return snap.docs.map(d => ({ ...(d.data() as object), id: d.id } as unknown as Ptw));
}

// ─── transitions ──────────────────────────────────────────────────────────

export interface TransitionRequest {
  permitId: string;
  action: ActionId;
  actor: ActorLike;
  note?: string;
  /** Written reason for a segregation or gate override. */
  justification?: string;
  /** The person has just re-entered their password (see reauth.ts). */
  reauthenticated?: boolean;
  /**
   * Training data for the competency check. `others` (the project's other permits, for
   * SIMOPS) is fetched FRESH from the server when left undefined: a screen's copy of the
   * list can be minutes old, and a conflict that appeared since would be missed.
   */
  gateInputs: Partial<Pick<GateContext, 'others' | 'competency'>>;
  /** Everyone in the organisation, so the right people are notified. */
  orgUsers?: NotifyUser[];
}

export type TransitionOutcome =
  | { ok: true; permit: Ptw; log: LogEntry; override: boolean; gates: GateResult[] }
  | { ok: false; reason: string; gates?: GateResult[] };

export async function performTransition(req: TransitionRequest): Promise<TransitionOutcome> {
  let statusBefore: string | undefined;
  try {
    const read = await readPermit(req.permitId);
    if (read.ok === false) return { ok: false, reason: read.reason };
    const permit = read.permit;
    statusBefore = permit.status;
    if (!permit.permit_no) return { ok: false, reason: LEGACY_MESSAGE };

    let others = req.gateInputs.others;
    const gate = ACTIONS[req.action]?.gate;
    if (others === undefined && gate && groupNeedsOthers(gate)) {
      try {
        others = (await fetchProjectPermits(permit.org_id, permit.project_id)) as unknown as NonNullable<typeof others>;
      } catch (e) {
        return { ok: false, reason: `Could not check for conflicting permits. ${describePtwError(e)}` };
      }
    }

    const result = prepareTransition({
      permit: permit as unknown as EnginePermit,
      action: req.action,
      actor: req.actor,
      now: Date.now(),
      note: req.note,
      justification: req.justification,
      reauthenticated: req.reauthenticated,
      gateInputs: { ...req.gateInputs, others },
    });
    if (result.ok === false) return { ok: false, reason: result.reason, gates: result.gates };

    const plan = planTransitionWrite(permit as unknown as EnginePermit, result);
    const ref = doc(db, 'ptws', permit.id);
    const batch = writeBatch(db);
    batch.update(ref, toFirestore(plan.permit) as Record<string, unknown>);
    if (permit.public_token) batch.set(doc(db, 'ptw_public', permit.public_token), toFirestore(plan.mirror), { merge: true });
    await batch.commit();

    const fresh = await readPermit(permit.id);
    const updated = fresh.ok ? fresh.permit : ({ ...permit, status: result.to } as Ptw);
    void notifyAfter(updated, req.action, result.to, req.actor.id, req.orgUsers ?? [], req.note);
    return { ok: true, permit: updated, log: result.log, override: result.override, gates: result.gates };
  } catch (e) {
    logPtwError(`action "${req.action}"`, e, { permitId: req.permitId, from: statusBefore, actor: { id: req.actor.id, role: req.actor.role } });
    return { ok: false, reason: describePtwError(e) };
  }
}

/**
 * Marks an ACTIVE permit EXPIRED once its server-stamped end has passed.
 * Safe to call from every open browser: if someone else already did it, the
 * database refuses the second write and this simply returns false.
 */
export async function expireIfDue(permit: Ptw, actor: ActorLike, now = Date.now(), orgUsers: NotifyUser[] = []): Promise<boolean> {
  if (permit.status !== 'ACTIVE' || effectiveStatus(permit as unknown as EnginePermit, now) !== 'EXPIRED') return false;
  const r = await performTransition({ permitId: permit.id, action: 'expire', actor, gateInputs: {}, orgUsers });
  return r.ok === true;
}

// ─── content edits and deletes ────────────────────────────────────────────

export type SaveOutcome = { ok: true; permit: Ptw; changed: boolean } | { ok: false; reason: string };

/**
 * Saves edited permit content (never status, log, signatures or validity).
 * Only the payload SECTIONS the editor changed (compared with `base`, the
 * payload they loaded) are written, so two people editing different sections
 * do not overwrite each other. The same section edited twice: last save wins.
 */
export async function savePermitContent(
  permitId: string,
  actor: ActorLike,
  next: { payload?: PtwPayload; title?: string; receiver_id?: string },
  base?: PtwPayload,
): Promise<SaveOutcome> {
  try {
    const ref = doc(db, 'ptws', permitId);
    let refusal = '';
    let changed = false;
    // One transaction: read the permit as it is NOW and write the editor's changes onto it, so a
    // concurrent save is retried against the newer version instead of overwriting it.
    await runTransaction(db, async tx => {
      refusal = ''; changed = false;
      const snap = await tx.get(ref);
      if (!snap.exists()) { refusal = 'This permit no longer exists. It may have been deleted.'; return; }
      const permit = toPermit(snap) as unknown as EnginePermit & Ptw;
      const allowed = checkContentEdit(permit, actor);
      if (allowed.ok === false) { refusal = allowed.reason; return; }
      const plan = planContentWrite(permit, next, Date.now(), base);
      if (!plan.changed) return;
      changed = true;
      tx.update(ref, toFirestore(plan.permit) as Record<string, unknown>);
      if (plan.mirror && permit.public_token) tx.set(doc(db, 'ptw_public', permit.public_token), toFirestore(plan.mirror), { merge: true });
    });
    if (refusal) return { ok: false, reason: refusal };
    const fresh = await readPermit(permitId);
    return fresh.ok === true ? { ok: true, permit: fresh.permit, changed } : { ok: false, reason: fresh.reason };
  } catch (e) {
    logPtwError('save permit', e, { permitId, actor: { id: actor.id, role: actor.role } });
    return { ok: false, reason: describePtwError(e) };
  }
}

/** Deletes a permit (a draft, or an old pre-rebuild permit when an administrator asks) and its public mirror. */
export async function deleteDraftPermit(permit: Pick<Ptw, 'id' | 'public_token'>): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'ptws', permit.id));
    if (permit.public_token) batch.delete(doc(db, 'ptw_public', permit.public_token));
    await batch.commit();
    return { ok: true };
  } catch (e) {
    logPtwError('delete permit', e, { permitId: permit.id });
    return { ok: false, reason: describePtwError(e) };
  }
}

// ─── public status page ───────────────────────────────────────────────────

export interface PublicPermit {
  token: string;
  permit_no: string;
  type: string;
  status: string;
  location: string;
  valid_from?: string;
  valid_until?: string;
  valid_until_ts?: { toMillis(): number } | null;
  updated_at?: string;
}

/** Reads one public status page by its exact token. Works without signing in. */
export async function fetchPublicPermit(token: string): Promise<{ ok: true; permit: PublicPermit } | { ok: false; reason: 'not-found' | 'offline' | 'error' }> {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { ok: false, reason: 'not-found' };
  try {
    const snap = await getDocFromServer(doc(db, 'ptw_public', token));
    if (!snap.exists()) return { ok: false, reason: 'not-found' };
    return { ok: true, permit: snap.data() as PublicPermit };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'unavailable' || code === 'deadline-exceeded') return { ok: false, reason: 'offline' };
    if (code === 'permission-denied' || code === 'not-found') return { ok: false, reason: 'not-found' };
    return { ok: false, reason: 'error' };
  }
}

// ─── notifications ────────────────────────────────────────────────────────

/** Best effort: a failed notification never fails the permit action. */
export async function notifyAfter(
  permit: Ptw, action: ActionId, to: Parameters<typeof planNotifications>[2],
  actorId: string, users: NotifyUser[], note?: string,
): Promise<void> {
  try {
    const plan = planNotifications(permit as unknown as Parameters<typeof planNotifications>[0], action, to, actorId, users, note);
    await Promise.allSettled(plan.map(n =>
      addDoc(collection(db, 'notifications'), {
        org_id: permit.org_id, // without this the rules refuse the document and nobody sees it
        user_id: n.user_id,
        message: n.message,
        type: n.type,
        is_read: false,
        timestamp: new Date().toISOString(),
      })));
  } catch (e) {
    console.error('PTW notification failed:', e);
  }
}
