// Turns engine decisions into the exact documents / field updates to write. Pure: no Firebase. Server time is
// a sentinel which the service layer swaps for Firestore's serverTimestamp (and the rules simulator swaps for a
// simulated clock), so what is tested is what is written.

import { formatNumber } from '../shared/counters';
import { SERVER_TIME, applyUpdate, diffSection, same, type Sentinel } from '../shared/writes';
import { MAX, type Stage } from './model';
import type {
  ActorLike, CarSection, EngineAction, LogEntry, NewActionInput, TransitionResult,
} from './engine';

const iso = (ms: number) => new Date(ms).toISOString();

// ─── Creation ─────────────────────────────────────────────────────────────

export interface NewActionArgs {
  orgId: string;
  actor: ActorLike;
  input: NewActionInput;
  /** The year of the counter, and the next number it hands out. */
  year: number;
  n: number;
  now: number;
}

/** The new action document and the counter document that must be written with it. */
export function buildNewAction(a: NewActionArgs): { action: Record<string, unknown>; counter: { org_id: string; year: number; value: number } } {
  const entry: LogEntry = {
    action: 'create', from: 'OPEN', stage: 'OPEN',
    user_id: a.actor.id, user_name: a.actor.name || a.actor.id, role: a.actor.role, timestamp: iso(a.now),
  };
  const i = a.input;
  const action: Record<string, unknown> = {
    org_id: a.orgId,
    project_id: i.project_id,
    number: formatNumber('act', a.year, a.n),
    action_year: a.year,
    title: i.title,
    ...(i.description ? { description: i.description } : {}),
    kind: i.kind,
    priority: i.priority,
    status: 'OPEN',
    owner_id: i.owner_id,
    creator_id: a.actor.id,
    due_date: i.due_date,
    source: i.source,
    ...(i.car ? { car: i.car } : {}),
    history: [entry],
    stage_times: { OPEN: SERVER_TIME },
    last_transition_at: SERVER_TIME,
    created_at: SERVER_TIME,
    updated_at: SERVER_TIME,
  };
  return { action, counter: { org_id: a.orgId, year: a.year, value: a.n } };
}

// ─── Steps ────────────────────────────────────────────────────────────────

/** The dotted-path update for one step: status, the appended history entry, server times, and the step's own fields. */
export function planTransitionWrite(action: EngineAction, r: Extract<TransitionResult, { ok: true }>): { update: Record<string, unknown> } {
  const update: Record<string, unknown> = {
    history: [...(action.history ?? []), r.log],
    last_transition_at: SERVER_TIME,
    updated_at: SERVER_TIME,
    ...r.patch,
  };
  if (r.to !== r.from) {
    update.status = r.to;
    update[`stage_times.${r.to}`] = SERVER_TIME;
  }
  if (r.record) update[r.record.field] = { by: r.record.by, at: SERVER_TIME, note: r.record.note };
  return { update };
}

// ─── Content edits ────────────────────────────────────────────────────────

export interface ContentFields { title?: string; description?: string; car?: CarSection }
export interface ContentWrite { changed: boolean; update: Record<string, unknown> }

export type ContentValidation = { ok: true } | { ok: false; reason: string };

export function validateContent(next: ContentFields): ContentValidation {
  if (next.title !== undefined) {
    const t = next.title.trim();
    if (!t) return { ok: false, reason: 'The title cannot be empty.' };
    if (t.length > MAX.title) return { ok: false, reason: `The title is too long (at most ${MAX.title} characters).` };
  }
  if (next.description !== undefined && next.description.trim().length > MAX.description) {
    return { ok: false, reason: `The description is too long (at most ${MAX.description} characters).` };
  }
  for (const [k, v] of Object.entries(next.car ?? {})) {
    if (typeof v === 'string' && v.trim().length > MAX.car) return { ok: false, reason: `"${k.replace(/_/g, ' ')}" is too long (at most ${MAX.car} characters).` };
  }
  return { ok: true };
}

const resolveNoop = (s: Sentinel) => (s.__sentinel === 'deleteField' ? undefined : 0);

/**
 * What to write for an edit. Only what the editor CHANGED (compared with `base`, the version they loaded) is
 * written, leaf by leaf for the corrective-action section, so two people editing different parts do not
 * overwrite each other. The same leaf edited twice: last save wins.
 */
export function planContentWrite(action: EngineAction, next: ContentFields, base?: ContentFields): ContentWrite {
  const from: ContentFields = base ?? { title: action.title, description: action.description ?? '', car: action.car ?? {} };
  const update: Record<string, unknown> = {};

  if (next.title !== undefined && next.title.trim() !== (from.title ?? '').trim()) update.title = next.title.trim();
  if (next.description !== undefined && next.description.trim() !== (from.description ?? '').trim()) update.description = next.description.trim();
  if (next.car !== undefined) Object.assign(update, diffSection('car', from.car ?? {}, trimCar(next.car), true));

  // Nothing to do if the server already holds exactly this.
  const applied = applyUpdate(action as unknown as Record<string, any>, update, resolveNoop);
  if (Object.keys(update).length === 0 || same(applied, action)) return { changed: false, update: {} };
  update.updated_at = SERVER_TIME;
  return { changed: true, update };
}

function trimCar(car: CarSection): CarSection {
  const out: CarSection = {};
  for (const [k, v] of Object.entries(car)) if (typeof v === 'string' && v.trim()) (out as Record<string, string>)[k] = v.trim();
  return out;
}

/** Stages in which an action counts as still being worked on. */
export const LIVE_STAGES: readonly Stage[] = ['OPEN', 'IN_PROGRESS'];
