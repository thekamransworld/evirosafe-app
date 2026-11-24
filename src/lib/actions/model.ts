// The single table of truth for ACTIONS (corrective and preventive actions, from every source).
//
// Everything that decides "who may do what, from which stage, to which stage" lives HERE and nowhere
// else. The screens read it to draw buttons, the engine reads it to validate a step, and
// scripts/actions-rules-lib.mjs reads it to generate the Firestore rules, so the app and the database
// cannot disagree.
//
// This replaces three older stores for the same thing: `actions` (Action Tracker), `corrective_actions`
// (CAR register) and the `capa[]` array inside every incident report.
//
// Keep this file free of imports from the app: it must load in plain Node (esbuild) for the tests and the
// rules generator. Data only, no side effects.

import {
  APPROVERS, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS, REVIEWERS, STAFF, type Role,
} from '../shared/roles';
import type { CounterSpec } from '../shared/counters';

export { APPROVERS, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS, REVIEWERS, STAFF };
export type { Role };

// ─── Stages ───────────────────────────────────────────────────────────────

export const STAGES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed, awaiting verification',
  CLOSED: 'Closed (verified)',
  CANCELLED: 'Cancelled',
};

/** One line per stage, shown above the action buttons. */
export const STAGE_HELP: Record<Stage, string> = {
  OPEN: 'Raised and assigned. The owner starts work, or marks it completed with a note.',
  IN_PROGRESS: 'The owner is working on it. Progress notes can be added at any time.',
  COMPLETED: 'The owner says it is done. Someone other than the owner (and other than whoever recorded the completion) must verify it before it closes.',
  CLOSED: 'Verified and closed. An approver can reopen it with a written reason.',
  CANCELLED: 'Cancelled with a reason. An approver can reopen it.',
};

export const TERMINAL_STAGES: readonly Stage[] = ['CLOSED', 'CANCELLED'];

/** List tabs. Every stage appears in exactly one group. */
export const STAGE_GROUPS = {
  todo: ['OPEN', 'IN_PROGRESS'],
  verify: ['COMPLETED'],
  done: ['CLOSED', 'CANCELLED'],
} as const satisfies Record<string, readonly Stage[]>;
export type StageGroup = keyof typeof STAGE_GROUPS;

// ─── Classifications ──────────────────────────────────────────────────────

export const KINDS = ['corrective', 'preventive', 'improvement'] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = {
  corrective: 'Corrective (fixes something that went wrong)',
  preventive: 'Preventive (stops it going wrong)',
  improvement: 'Improvement',
};

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

/**
 * DEFAULT time allowed, in days, from raising an action to its due date, by priority. Used to pre-fill the
 * due date; the person can change it. Confirm against the client's procedure.
 */
export const PRIORITY_DUE_DAYS: Record<Priority, number> = { critical: 1, high: 7, medium: 14, low: 30 };

export const SOURCE_TYPES = ['incident', 'inspection', 'audit', 'plan', 'observation', 'manual'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const SOURCE_LABEL: Record<SourceType, string> = {
  incident: 'Incident', inspection: 'Inspection', audit: 'Audit', plan: 'Plan', observation: 'Observation', manual: 'Raised directly',
};
/** Which screen to open for a source (the `link_page` of a notification, the "go to source" link). */
export const SOURCE_VIEW: Record<SourceType, string | null> = {
  incident: 'reports', inspection: 'inspections', audit: 'audit-inspection', plan: 'plans', observation: 'bbs', manual: null,
};

// ─── Roles ────────────────────────────────────────────────────────────────

/** Who may raise an action. A worker can own one, not raise one (DEFAULT: confirm). */
export const CREATE_ROLES: readonly Role[] = REVIEWERS;
/** Who may run the one-off import of the old action stores. */
export const IMPORT_ROLES: readonly Role[] = OVERRIDERS;

/** Numbers: ACT-YYYY-NNNN, one counter per organisation per year. Read by the rules generator. */
export const COUNTER: CounterSpec = { kind: 'act', prefix: 'ACT', roles: CREATE_ROLES };

// ─── Actions (steps) ──────────────────────────────────────────────────────

export type ActionId =
  | 'start' | 'complete' | 'verify' | 'send_back' | 'add_note'
  | 'reschedule' | 'withdraw' | 'cancel' | 'reopen';

/**
 * any       anyone whose role is allowed
 * owner     the person the action is assigned to
 * verifier  NOT the owner and NOT the person who recorded the completion (segregation of duties)
 * creator   the person who raised it
 * Administrators (OVERRIDERS) can do an owner / verifier / creator step they are not entitled to, but only
 * with a written justification, which is recorded and flagged in the history.
 */
export type ActorRule = 'any' | 'owner' | 'verifier' | 'creator';

export type Tone = 'primary' | 'neutral' | 'warning' | 'danger';

export interface ActionDef {
  id: ActionId;
  label: string;
  from: readonly Stage[];
  /** The stage the step moves to, or 'SAME' for a step that leaves the stage as it is (a note, a new due date). */
  to: Stage | 'SAME';
  roles: readonly Role[];
  actor: ActorRule;
  /** A written note (the history note) is mandatory. */
  reason: boolean;
  tone: Tone;
  /** Top-level fields this step may change, besides the standard ones (status, history, times). */
  writes: readonly string[];
  /** The signed record this step stamps: who, when (server time) and the note. */
  record?: 'completion' | 'verification';
}

const LIVE: readonly Stage[] = ['OPEN', 'IN_PROGRESS'];
const NOT_FINISHED: readonly Stage[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];

export const ACTIONS: Record<ActionId, ActionDef> = {
  start: {
    id: 'start', label: 'Start work', from: ['OPEN'], to: 'IN_PROGRESS',
    roles: STAFF, actor: 'owner', reason: false, tone: 'primary', writes: [],
  },
  complete: {
    id: 'complete', label: 'Mark completed', from: LIVE, to: 'COMPLETED',
    roles: STAFF, actor: 'owner', reason: true, tone: 'primary', writes: ['completion'], record: 'completion',
  },
  verify: {
    id: 'verify', label: 'Verify and close', from: ['COMPLETED'], to: 'CLOSED',
    roles: REVIEWERS, actor: 'verifier', reason: true, tone: 'primary', writes: ['verification'], record: 'verification',
  },
  send_back: {
    id: 'send_back', label: 'Send back (not done)', from: ['COMPLETED'], to: 'IN_PROGRESS',
    roles: REVIEWERS, actor: 'verifier', reason: true, tone: 'warning', writes: [],
  },
  add_note: {
    id: 'add_note', label: 'Add progress note', from: NOT_FINISHED, to: 'SAME',
    roles: STAFF, actor: 'any', reason: true, tone: 'neutral', writes: [],
  },
  reschedule: {
    id: 'reschedule', label: 'Change owner, due date or priority', from: LIVE, to: 'SAME',
    roles: REVIEWERS, actor: 'any', reason: true, tone: 'warning', writes: ['due_date', 'owner_id', 'priority'],
  },
  withdraw: {
    id: 'withdraw', label: 'Withdraw (raised in error)', from: ['OPEN'], to: 'CANCELLED',
    roles: REVIEWERS, actor: 'creator', reason: true, tone: 'neutral', writes: [],
  },
  cancel: {
    id: 'cancel', label: 'Cancel', from: NOT_FINISHED, to: 'CANCELLED',
    roles: APPROVERS, actor: 'any', reason: true, tone: 'danger', writes: [],
  },
  reopen: {
    id: 'reopen', label: 'Reopen', from: ['CLOSED', 'CANCELLED'], to: 'OPEN',
    roles: APPROVERS, actor: 'any', reason: true, tone: 'warning', writes: [],
  },
};

/** The stage a step leaves the action in, given the stage it started from. */
export const targetStage = (def: ActionDef, from: Stage): Stage => (def.to === 'SAME' ? from : def.to);

/** The step that moves each stage along: drives "Awaiting me". */
export const FORWARD_ACTIONS: Partial<Record<Stage, readonly ActionId[]>> = {
  OPEN: ['start', 'complete'],
  IN_PROGRESS: ['complete'],
  COMPLETED: ['verify'],
};

// ─── Who is told ──────────────────────────────────────────────────────────

/** A group of people, worked out from the action, that a notification goes to. */
export type Audience = 'owner' | 'creator' | 'verifiers' | 'previous_owner';
export const AUDIENCE_LABEL: Record<Audience, string> = {
  owner: 'the owner',
  creator: 'the person who raised it',
  verifiers: 'the reviewers of the project (not the owner)',
  previous_owner: 'the previous owner (when the owner changed)',
};

export type NotifyStep = ActionId | 'create';

/** Who hears about each step. Never the person who did it; only active people of the organisation. */
export const NOTIFY: Record<NotifyStep, readonly Audience[]> = {
  create: ['owner'],
  start: ['creator'],
  complete: ['creator', 'verifiers'],
  verify: ['owner', 'creator'],
  send_back: ['owner'],
  add_note: ['owner', 'creator'],
  reschedule: ['owner', 'previous_owner'],
  withdraw: ['owner', 'creator'],
  cancel: ['owner', 'creator'],
  reopen: ['owner', 'creator'],
};

// ─── Fields ───────────────────────────────────────────────────────────────

export const DATE_PATTERN = '[0-9]{4}-[0-9]{2}-[0-9]{2}';
export const MAX = { title: 200, description: 4000, car: 2000, note: 1000, id: 128, ref: 100 } as const;

/** The optional corrective-action (CAR) section. */
export const CAR_KEYS = ['root_cause', 'effectiveness_plan', 'effectiveness_result'] as const;
export const CAR_LABEL: Record<(typeof CAR_KEYS)[number], string> = {
  root_cause: 'Root cause',
  effectiveness_plan: 'How the fix will be checked',
  effectiveness_result: 'Effectiveness check result',
};

/** Validation of the fields a step may change; the rules generator turns each into a rule. */
export const FIELD_SPECS = {
  due_date: { kind: 'date' },
  owner_id: { kind: 'id' },
  priority: { kind: 'enum', values: PRIORITIES },
} as const;

export const SOURCE_KEYS = ['type', 'id', 'ref', 'item'] as const;

export const HISTORY_KEYS = [
  'action', 'from', 'stage', 'user_id', 'user_name', 'role', 'timestamp',
  'note', 'override', 'justification', 'changes',
] as const;

export const IMPORT_SOURCES = ['actions', 'corrective_actions', 'report_capa'] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

// ─── Contract with the database ───────────────────────────────────────────
// Shared by the client writes (writes.ts), the rules generator and the tests, so the two sides cannot drift.

/** Fields every step may change. */
export const COMMON_TRANSITION_KEYS = ['status', 'history', 'last_transition_at', 'stage_times', 'updated_at'] as const;

/** Stages in which the definition (title, description, CAR section) may be edited. */
export const CONTENT_STAGES: readonly Stage[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
export const CONTENT_KEYS = ['title', 'description', 'car', 'updated_at'] as const;

/** Top-level fields a brand-new action carries. */
export const CREATE_KEYS = [
  'org_id', 'project_id', 'number', 'action_year', 'title', 'description', 'kind', 'priority', 'status',
  'owner_id', 'creator_id', 'due_date', 'source', 'car', 'history', 'stage_times',
  'last_transition_at', 'created_at', 'updated_at',
] as const;
export const CREATE_REQUIRED = CREATE_KEYS.filter(k => k !== 'description' && k !== 'car');

/** An imported action: the same fields plus the import marker and the old record, and no required project. */
export const IMPORT_KEYS = [...CREATE_KEYS, 'imported', 'import_source', 'import_ref', 'legacy'] as const;
export const IMPORT_REQUIRED = IMPORT_KEYS.filter(k => k !== 'description' && k !== 'car' && k !== 'project_id');
