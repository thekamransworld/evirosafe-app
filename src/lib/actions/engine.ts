// The workflow engine for actions. Pure: no Firebase, no clock, no DOM.
//
//   checkActor        may THIS person perform THIS step on THIS action?
//   availableActions  what to show on screen, with the reason for each "no"
//   prepareTransition validate everything and compute the exact patch and history entry to write.
//                     Nothing is written here.
//   checkContentEdit  may this person edit the definition right now? (mirrors the database rule)
//   validateNewAction clean and check the fields of a new action
//
// The service layer writes the result atomically and the database stamps server time.

import {
  ACTIONS, APPROVERS, CAR_KEYS, CONTENT_STAGES, CREATE_ROLES, DATE_PATTERN, FIELD_SPECS, KINDS, MAX,
  MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS, PRIORITIES, REVIEWERS, SOURCE_TYPES, STAFF,
  STAGES, STAGE_LABEL, targetStage,
  type ActionDef, type ActionId, type Kind, type Priority, type SourceType, type Stage,
} from './model';

export interface ActorLike { id: string; name: string; role: string }

export interface ActionSource { type: SourceType; id?: string; ref?: string; item?: string }
export interface CarSection { root_cause?: string; effectiveness_plan?: string; effectiveness_result?: string }
/** `at` is server time: a Firestore Timestamp on screen, a sentinel in a write plan. */
export interface SignedRecord { by: string; at?: unknown; note?: string }

export interface LogEntry {
  action: string;
  from: Stage;
  stage: Stage;
  user_id: string;
  user_name: string;
  role: string;
  timestamp: string;
  note?: string;
  override?: boolean;
  justification?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface EngineAction {
  id?: string;
  org_id: string;
  project_id?: string;
  /** Present on every action made by the new system; absent on old, unmigrated ones. */
  number?: string;
  title: string;
  description?: string;
  kind: Kind | string;
  priority: Priority | string;
  status: string;
  owner_id: string;
  creator_id: string;
  due_date: string;
  source?: ActionSource;
  car?: CarSection;
  completion?: SignedRecord;
  verification?: SignedRecord;
  history?: LogEntry[];
  imported?: boolean;
  legacy?: Record<string, unknown>;
}

/** An action as the screens and the service handle it: the engine's view plus the stamped fields. */
export interface ActionDoc extends EngineAction {
  id: string;
  action_year?: number;
  /** Server-stamped times: Firestore Timestamps on screen. */
  stage_times?: Record<string, unknown>;
  last_transition_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  import_source?: string;
  import_ref?: string;
}

export const normalizeStage = (s: unknown): Stage | null =>
  typeof s === 'string' && (STAGES as readonly string[]).includes(s) ? (s as Stage) : null;

const inList = (list: readonly string[], v: unknown): boolean => typeof v === 'string' && list.includes(v);

// ─── Dates ────────────────────────────────────────────────────────────────

/** A real calendar date written YYYY-MM-DD (2026-02-30 is refused). */
export function isValidDate(s: unknown): boolean {
  if (typeof s !== 'string' || !new RegExp(`^${DATE_PATTERN}$`).test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// ─── Actor rules ──────────────────────────────────────────────────────────

export type ActorCheck =
  | { ok: true; override: boolean }
  | { ok: false; reason: string; overridable?: boolean };

const isOwner = (a: EngineAction, who: ActorLike) => !!who.id && who.id === a.owner_id;
const isCreator = (a: EngineAction, who: ActorLike) => !!who.id && who.id === a.creator_id;
const isCompleter = (a: EngineAction, who: ActorLike) => !!who.id && who.id === a.completion?.by;

export function checkActor(def: ActionDef, action: EngineAction, actor: ActorLike, justification?: string): ActorCheck {
  if (!(def.roles as readonly string[]).includes(actor.role)) {
    const who = def.roles.length <= 3 ? def.roles.join(', ') : 'site staff';
    return { ok: false, reason: `Your role (${actor.role || 'unknown'}) cannot ${def.label.toLowerCase()}. Allowed: ${who}.` };
  }
  if (def.actor === 'any') return { ok: true, override: false };

  let violated = false;
  let reason = '';
  if (def.actor === 'owner') {
    violated = !isOwner(action, actor);
    reason = action.owner_id ? 'Only the person this action is assigned to can do this.' : 'This action has no owner yet. Someone with the right role must assign one first.';
  } else if (def.actor === 'creator') {
    violated = !isCreator(action, actor);
    reason = 'Only the person who raised this action can do this.';
  } else if (def.actor === 'verifier') {
    const owner = isOwner(action, actor);
    violated = owner || isCompleter(action, actor);
    reason = owner
      ? 'You own this action, so someone else must verify it (segregation of duties).'
      : 'You recorded its completion, so someone else must verify it (segregation of duties).';
  }
  if (!violated) return { ok: true, override: false };

  if (!(OVERRIDERS as readonly string[]).includes(actor.role)) return { ok: false, reason };
  if (String(justification ?? '').trim().length >= MIN_JUSTIFICATION_CHARS) return { ok: true, override: true };
  return { ok: false, reason: `${reason} As an administrator you can override this with a written justification.`, overridable: true };
}

// ─── Available steps ──────────────────────────────────────────────────────

export interface ActionOption {
  def: ActionDef;
  enabled: boolean;
  /** Why it is disabled (role or segregation). */
  reason?: string;
  /** The segregation rule can be overridden by this person in writing. */
  needsOverride?: boolean;
}

export function availableActions(action: EngineAction, actor: ActorLike): ActionOption[] {
  const stage = normalizeStage(action.status);
  if (!stage) return [];
  const out: ActionOption[] = [];
  for (const def of Object.values(ACTIONS)) {
    if (!def.from.includes(stage)) continue;
    const who = checkActor(def, action, actor);
    out.push(who.ok === true
      ? { def, enabled: true }
      : { def, enabled: false, reason: who.reason, needsOverride: who.overridable });
  }
  return out;
}

/** Does this person have something to do on this action? (the "Awaiting me" tab) */
export function awaitingFor(action: EngineAction, actor: ActorLike): 'do' | 'verify' | null {
  const stage = normalizeStage(action.status);
  if (!stage || !actor.id) return null;
  if ((stage === 'OPEN' || stage === 'IN_PROGRESS') && isOwner(action, actor)) return 'do';
  if (stage === 'COMPLETED') {
    const who = checkActor(ACTIONS.verify, action, actor);
    if (who.ok === true && who.override === false) return 'verify';
  }
  return null;
}

// ─── Transition ───────────────────────────────────────────────────────────

export interface Reschedule { due_date?: string; owner_id?: string; priority?: string }

export interface TransitionInput {
  action: EngineAction;
  step: ActionId;
  actor: ActorLike;
  now: number;
  /** The written note. Required for every step except "Start work". */
  note?: string;
  /** Written justification for a segregation override. */
  justification?: string;
  /** For "reschedule": the new values. */
  changes?: Reschedule;
}

export type TransitionResult =
  | {
      ok: true;
      from: Stage;
      to: Stage;
      /** Plain field changes (due_date, owner_id, priority). */
      patch: Record<string, unknown>;
      /** The signed record this step stamps; the write plan adds server time. */
      record?: { field: 'completion' | 'verification'; by: string; note: string };
      log: LogEntry;
      override: boolean;
    }
  | { ok: false; reason: string };

const iso = (ms: number) => new Date(ms).toISOString();
const fail = (reason: string): TransitionResult => ({ ok: false, reason });

function checkField(key: string, value: unknown): string | null {
  const spec = (FIELD_SPECS as Record<string, any>)[key];
  if (!spec) return `"${key}" cannot be changed here.`;
  if (spec.kind === 'date') return isValidDate(value) ? null : 'The due date must be a real date.';
  if (spec.kind === 'id') return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX.id ? null : 'Choose an owner.';
  if (spec.kind === 'enum') return inList(spec.values, value) ? null : 'Choose a valid priority.';
  return null;
}

export function prepareTransition(input: TransitionInput): TransitionResult {
  const { action, step, actor, now } = input;
  const def = ACTIONS[step];
  if (!def) return fail(`Unknown step "${step}".`);
  if (!action.number) return fail(LEGACY_MESSAGE);

  const from = normalizeStage(action.status);
  if (!from) return fail(`This action has an unrecognised status ("${action.status}") and cannot be progressed.`);
  if (!def.from.includes(from)) return fail(`"${def.label}" is not available while the action is ${STAGE_LABEL[from].toLowerCase()}.`);

  const note = String(input.note ?? '').trim();
  const justification = String(input.justification ?? '').trim();

  const who = checkActor(def, action, actor, justification);
  if (who.ok === false) return fail(who.reason);

  if (def.reason && note.length < MIN_REASON_CHARS) {
    return fail(`A written note is required (at least ${MIN_REASON_CHARS} characters).`);
  }
  if (note.length > MAX.note) return fail(`The note is too long (at most ${MAX.note} characters).`);

  const to = targetStage(def, from);
  const patch: Record<string, unknown> = {};
  let changes: LogEntry['changes'];
  let record: { field: 'completion' | 'verification'; by: string; note: string } | undefined;

  if (def.record) record = { field: def.record, by: actor.id, note };

  if (step === 'reschedule') {
    const wanted = input.changes ?? {};
    changes = {};
    for (const key of def.writes) {
      if (!(key in wanted) || wanted[key as keyof Reschedule] === undefined) continue;
      const value = typeof wanted[key as keyof Reschedule] === 'string' ? String(wanted[key as keyof Reschedule]).trim() : wanted[key as keyof Reschedule];
      const bad = checkField(key, value);
      if (bad) return fail(bad);
      const current = (action as unknown as Record<string, unknown>)[key];
      if (value === current) continue;
      patch[key] = value;
      changes[key] = { from: current ?? '', to: value };
    }
    if (Object.keys(patch).length === 0) return fail('Nothing to change: pick a different owner, due date or priority.');
  }

  const override = who.override;
  const log: LogEntry = {
    action: step,
    from,
    stage: to,
    user_id: actor.id,
    user_name: actor.name || actor.id,
    role: actor.role,
    timestamp: iso(now),
    ...(note ? { note } : {}),
    ...(override ? { override: true, justification } : {}),
    ...(changes ? { changes } : {}),
  };

  return { ok: true, from, to, patch, ...(record ? { record } : {}), log, override };
}

export const LEGACY_MESSAGE =
  'This action was made before the new action system and is read-only. Its content was copied into a new action by the import; work on that one.';

// ─── Content edits (not steps) ────────────────────────────────────────────

export type ContentEditCheck = { ok: true; scope: 'all' | 'car' } | { ok: false; reason: string };

/**
 * May this person edit the action's definition right now? Mirrors the database rule exactly: staff only; a
 * numbered action not yet finished; the creator or an approver may edit everything; a reviewer who is not the
 * owner may edit the CAR section only.
 */
export function checkContentEdit(action: EngineAction, actor: ActorLike): ContentEditCheck {
  if (!(STAFF as readonly string[]).includes(actor.role)) return { ok: false, reason: 'Your role cannot edit actions.' };
  if (!action.number) return { ok: false, reason: LEGACY_MESSAGE };
  const stage = normalizeStage(action.status);
  if (!stage || !(CONTENT_STAGES as readonly string[]).includes(stage)) {
    return { ok: false, reason: `The action is locked for editing while it is ${stage ? STAGE_LABEL[stage].toLowerCase() : 'in an unknown state'}.` };
  }
  if (isCreator(action, actor) || (APPROVERS as readonly string[]).includes(actor.role)) return { ok: true, scope: 'all' };
  if ((REVIEWERS as readonly string[]).includes(actor.role) && !isOwner(action, actor)) return { ok: true, scope: 'car' };
  return { ok: false, reason: 'Only the person who raised this action, or an approver, can edit it. A reviewer can edit the corrective-action section.' };
}

// ─── New actions ──────────────────────────────────────────────────────────

export interface NewActionInput {
  project_id: string;
  title: string;
  description?: string;
  kind: Kind;
  priority: Priority;
  owner_id: string;
  due_date: string;
  source: ActionSource;
  car?: CarSection;
}

export const canCreate = (actor: ActorLike): boolean => (CREATE_ROLES as readonly string[]).includes(actor.role);

export type ValidatedNew = { ok: true; value: NewActionInput } | { ok: false; problems: string[] };

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/** Cleans and checks the fields of a new action. The same limits are in the database rules. */
export function validateNewAction(raw: Record<string, any>): ValidatedNew {
  const problems: string[] = [];
  const title = clean(raw.title);
  const description = clean(raw.description);
  const project_id = clean(raw.project_id);
  const owner_id = clean(raw.owner_id);
  const due_date = clean(raw.due_date);

  if (!title) problems.push('Write what has to be done (the title).');
  else if (title.length > MAX.title) problems.push(`The title is too long (at most ${MAX.title} characters).`);
  if (description.length > MAX.description) problems.push(`The description is too long (at most ${MAX.description} characters).`);
  if (!project_id) problems.push('Choose a project.');
  if (!owner_id) problems.push('Choose who is responsible (the owner).');
  else if (owner_id.length > MAX.id) problems.push('The owner is not valid.');
  if (!isValidDate(due_date)) problems.push('Choose a due date.');
  if (!inList(KINDS, raw.kind)) problems.push('Choose a type (corrective, preventive or improvement).');
  if (!inList(PRIORITIES, raw.priority)) problems.push('Choose a priority.');

  const src = raw.source ?? { type: 'manual' };
  const srcType = clean(src.type);
  const srcId = clean(src.id);
  const srcRef = clean(src.ref);
  const srcItem = clean(src.item);
  if (!inList(SOURCE_TYPES, srcType)) problems.push('The source is not valid.');
  else if (srcType !== 'manual' && !srcId) problems.push('A linked action needs the id of its source.');
  if (srcId.length > MAX.id || srcRef.length > MAX.ref || srcItem.length > MAX.ref) problems.push('The source reference is too long.');

  let car: CarSection | undefined;
  if (raw.car && typeof raw.car === 'object') {
    const c: CarSection = {};
    for (const k of CAR_KEYS) {
      const v = clean(raw.car[k]);
      if (v.length > MAX.car) problems.push(`"${k.replace(/_/g, ' ')}" is too long (at most ${MAX.car} characters).`);
      if (v) c[k] = v;
    }
    if (Object.keys(c).length) car = c;
  }

  if (problems.length) return { ok: false, problems };
  const source: ActionSource = { type: srcType as SourceType };
  if (srcType !== 'manual' && srcId) source.id = srcId;
  if (srcRef) source.ref = srcRef;
  if (srcItem) source.item = srcItem;
  return {
    ok: true,
    value: {
      project_id, title, kind: raw.kind, priority: raw.priority, owner_id, due_date, source,
      ...(description ? { description } : {}),
      ...(car ? { car } : {}),
    },
  };
}
