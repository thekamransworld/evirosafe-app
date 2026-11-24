// The single table of truth for the permit-to-work workflow.
//
// Everything that decides "who may do what, from which stage, to which
// stage" lives HERE and nowhere else. The UI reads it to draw buttons, the
// engine reads it to validate a transition, and (in the rules phase) a
// script reads it to generate the Firestore rules, so the client and the
// database can never disagree.
//
// Keep this file free of imports from the app: it must load in plain Node
// (esbuild) for tests and for the rules generator. Data only, no side effects.

// ─── Stages ───────────────────────────────────────────────────────────────

export const STAGES = [
  'DRAFT',
  'SUBMITTED',          // awaiting pre-screen
  'SITE_INSPECTION',
  'APPROVAL',
  'SITE_HANDOVER',
  'ACTIVE',
  'HOLD',
  'EXPIRED',
  'COMPLETION_PENDING',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting pre-screen',
  SITE_INSPECTION: 'Site inspection',
  APPROVAL: 'Awaiting approval',
  SITE_HANDOVER: 'Ready for handover',
  ACTIVE: 'Active',
  HOLD: 'On hold',
  EXPIRED: 'Expired',
  COMPLETION_PENDING: 'Completion pending',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

/** Statuses written by the old engine, mapped to the stage that replaces them. */
export const LEGACY_STATUS_MAP: Record<string, Stage> = {
  PRE_SCREEN: 'SITE_INSPECTION',
  ISSUER_REVIEW: 'SITE_INSPECTION',
  ISSUER_SIGNED: 'SITE_INSPECTION',
  IV_REVIEW: 'SITE_INSPECTION',
  REQUESTED: 'SUBMITTED',
  PENDING_APPROVAL: 'APPROVAL',
  APPROVER_SIGNED: 'SITE_HANDOVER',
  AUTHORIZATION: 'SITE_HANDOVER',
  HANDOVER_PENDING: 'SITE_HANDOVER',
  SUSPENDED: 'HOLD',
  JOINT_INSPECTION: 'COMPLETION_PENDING',
  COMPLETED: 'COMPLETION_PENDING',
};

/** Returns null for a status nobody recognises (never guess a stage). */
export function normalizeStage(status: string | null | undefined): Stage | null {
  if (!status) return null;
  if ((STAGES as readonly string[]).includes(status)) return status as Stage;
  return LEGACY_STATUS_MAP[status] ?? null;
}

/** Stages in which a permit holds a claim on its work area (used by SIMOPS). */
export const OCCUPYING_STAGES: readonly Stage[] = [
  'SITE_HANDOVER', 'ACTIVE', 'HOLD', 'EXPIRED', 'COMPLETION_PENDING',
];

export const TERMINAL_STAGES: readonly Stage[] = ['CLOSED', 'CANCELLED', 'REJECTED', 'ARCHIVED'];

/** List tabs. Every stage appears in exactly one group. */
export const STAGE_GROUPS = {
  draft: ['DRAFT'],
  pending: ['SUBMITTED', 'SITE_INSPECTION', 'APPROVAL', 'SITE_HANDOVER'],
  active: ['ACTIVE', 'HOLD', 'EXPIRED'],
  closing: ['COMPLETION_PENDING'],
  done: ['CLOSED', 'CANCELLED', 'REJECTED', 'ARCHIVED'],
} as const satisfies Record<string, readonly Stage[]>;
export type StageGroup = keyof typeof STAGE_GROUPS;

// ─── Roles ────────────────────────────────────────────────────────────────
// The role lists are shared by every module (src/lib/shared/roles.ts).

import {
  APPROVERS, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS, REVIEWERS, STAFF, type Role,
} from '../shared/roles';
import type { CounterSpec } from '../shared/counters';

export { APPROVERS, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS, REVIEWERS, STAFF };
export type { Role };

/** Permit numbers: PTW-YYYY-NNNN, one counter per organisation per year. Read by the rules generator. */
export const COUNTER: CounterSpec = { kind: 'ptw', prefix: 'PTW', roles: STAFF };

// ─── Actions ──────────────────────────────────────────────────────────────

export type ActionId =
  | 'submit' | 'prescreen_pass' | 'site_inspection_pass' | 'approve'
  | 'accept_handover' | 'stop_work' | 'resume' | 'revalidate'
  | 'inspection_fail' | 'request_completion' | 'close' | 'send_back'
  | 'reject' | 'withdraw' | 'cancel' | 'expire' | 'archive';

/**
 * any        anyone whose role is allowed
 * requester  the permit's creator or receiver
 * reviewer   NOT the creator or receiver (segregation of duties)
 * system     automatic; the database checks the clock
 */
export type ActorRule = 'any' | 'requester' | 'reviewer' | 'system';

export type GateGroup =
  | 'submit' | 'inspection' | 'approve' | 'activate'
  | 'revalidate' | 'completion' | 'close';

export type Tone = 'primary' | 'neutral' | 'warning' | 'danger';

export interface ActionDef {
  id: ActionId;
  label: string;
  from: readonly Stage[];
  to: Stage;
  roles: readonly Role[];
  actor: ActorRule;
  /** A written reason (the action note) is mandatory. */
  reason: boolean;
  gate?: GateGroup;
  /** The person must re-type their password before this is accepted. */
  reauth: boolean;
  tone: Tone;
}

const NOT_FINISHED: readonly Stage[] = [
  'SUBMITTED', 'SITE_INSPECTION', 'APPROVAL', 'SITE_HANDOVER',
  'ACTIVE', 'HOLD', 'EXPIRED', 'COMPLETION_PENDING',
];
const REVIEW_STAGES: readonly Stage[] = ['SUBMITTED', 'SITE_INSPECTION', 'APPROVAL'];

export const ACTIONS: Record<ActionId, ActionDef> = {
  submit: {
    id: 'submit', label: 'Submit for approval', from: ['DRAFT'], to: 'SUBMITTED',
    roles: STAFF, actor: 'requester', reason: false, gate: 'submit', reauth: false, tone: 'primary',
  },
  prescreen_pass: {
    id: 'prescreen_pass', label: 'Pass pre-screen', from: ['SUBMITTED'], to: 'SITE_INSPECTION',
    roles: REVIEWERS, actor: 'reviewer', reason: false, reauth: false, tone: 'primary',
  },
  site_inspection_pass: {
    id: 'site_inspection_pass', label: 'Pass site inspection', from: ['SITE_INSPECTION'], to: 'APPROVAL',
    roles: REVIEWERS, actor: 'reviewer', reason: false, gate: 'inspection', reauth: false, tone: 'primary',
  },
  approve: {
    id: 'approve', label: 'Approve', from: ['APPROVAL'], to: 'SITE_HANDOVER',
    roles: APPROVERS, actor: 'reviewer', reason: false, gate: 'approve', reauth: true, tone: 'primary',
  },
  accept_handover: {
    id: 'accept_handover', label: 'Accept handover & start work', from: ['SITE_HANDOVER'], to: 'ACTIVE',
    roles: STAFF, actor: 'requester', reason: false, gate: 'activate', reauth: true, tone: 'primary',
  },
  stop_work: {
    id: 'stop_work', label: 'Stop work', from: ['ACTIVE'], to: 'HOLD',
    roles: STAFF, actor: 'any', reason: true, reauth: false, tone: 'danger',
  },
  resume: {
    id: 'resume', label: 'Resume work', from: ['HOLD'], to: 'ACTIVE',
    roles: REVIEWERS, actor: 'reviewer', reason: true, gate: 'revalidate', reauth: false, tone: 'primary',
  },
  revalidate: {
    id: 'revalidate', label: 'Revalidate (extend)', from: ['ACTIVE'], to: 'ACTIVE',
    roles: REVIEWERS, actor: 'reviewer', reason: true, gate: 'revalidate', reauth: true, tone: 'warning',
  },
  inspection_fail: {
    id: 'inspection_fail', label: 'Fail inspection', from: ['COMPLETION_PENDING'], to: 'HOLD',
    roles: REVIEWERS, actor: 'reviewer', reason: true, reauth: false, tone: 'danger',
  },
  request_completion: {
    id: 'request_completion', label: 'Request completion', from: ['ACTIVE', 'HOLD', 'EXPIRED'], to: 'COMPLETION_PENDING',
    roles: STAFF, actor: 'requester', reason: false, gate: 'completion', reauth: false, tone: 'primary',
  },
  close: {
    id: 'close', label: 'Close permit', from: ['COMPLETION_PENDING'], to: 'CLOSED',
    roles: REVIEWERS, actor: 'reviewer', reason: false, gate: 'close', reauth: true, tone: 'primary',
  },
  send_back: {
    id: 'send_back', label: 'Send back for changes', from: REVIEW_STAGES, to: 'DRAFT',
    roles: REVIEWERS, actor: 'reviewer', reason: true, reauth: false, tone: 'warning',
  },
  reject: {
    id: 'reject', label: 'Reject', from: REVIEW_STAGES, to: 'REJECTED',
    roles: REVIEWERS, actor: 'reviewer', reason: true, reauth: false, tone: 'danger',
  },
  withdraw: {
    id: 'withdraw', label: 'Withdraw', from: ['DRAFT', 'SUBMITTED', 'SITE_INSPECTION', 'APPROVAL', 'SITE_HANDOVER'], to: 'CANCELLED',
    roles: STAFF, actor: 'requester', reason: true, reauth: false, tone: 'neutral',
  },
  cancel: {
    id: 'cancel', label: 'Cancel permit', from: NOT_FINISHED, to: 'CANCELLED',
    roles: REVIEWERS, actor: 'reviewer', reason: true, reauth: false, tone: 'danger',
  },
  expire: {
    id: 'expire', label: 'Mark expired', from: ['ACTIVE'], to: 'EXPIRED',
    roles: STAFF, actor: 'system', reason: false, reauth: false, tone: 'neutral',
  },
  archive: {
    id: 'archive', label: 'Archive', from: ['CLOSED', 'CANCELLED', 'REJECTED'], to: 'ARCHIVED',
    roles: APPROVERS, actor: 'any', reason: false, reauth: false, tone: 'neutral',
  },
};

/** The forward action(s) that move each stage along: drives "Awaiting me". */
export const FORWARD_ACTIONS: Partial<Record<Stage, readonly ActionId[]>> = {
  DRAFT: ['submit'],
  SUBMITTED: ['prescreen_pass'],
  SITE_INSPECTION: ['site_inspection_pass'],
  APPROVAL: ['approve'],
  SITE_HANDOVER: ['accept_handover'],
  HOLD: ['resume'],
  EXPIRED: ['request_completion'],
  COMPLETION_PENDING: ['close'],
};

// ─── Permit types ─────────────────────────────────────────────────────────

export type PermitType =
  | 'General Work' | 'Hot Work' | 'Electrical Work' | 'Excavation' | 'Lifting'
  | 'Work at Height' | 'Confined Space Entry' | 'Night Work' | 'Road Closure'
  | 'Utility Work' | 'Mechanical Work' | 'Chemical Handling';

export type RiskTier = 'high' | 'medium' | 'low';

export type PpeKey =
  | 'hard_hat' | 'safety_shoes' | 'goggles' | 'safety_harness'
  | 'coverall' | 'respirator' | 'safety_gloves' | 'vest';

export interface TypeRule {
  /** Longest a single activation may last, in hours. */
  maxHours: number;
  risk: RiskTier;
  /** A risk assessment / method statement reference is mandatory. */
  rams: boolean;
  isolation: boolean;
  fireWatch: boolean;
  /** Gas testing is mandatory; the latest passing test must be this fresh. */
  gasMaxAgeMin?: number;
  ppe: readonly PpeKey[];
  /** Competency keys every worker on the permit must hold. */
  competency: readonly string[];
}

// DEFAULTS. These are reasonable industry starting points, not the client's
// procedure: confirm every number against the client's permit procedure.
export const TYPE_RULES: Record<PermitType, TypeRule> = {
  'Hot Work':             { maxHours: 8,  risk: 'high',   rams: true,  isolation: false, fireWatch: true,  ppe: ['goggles', 'safety_gloves'], competency: ['HOT_WORK'] },
  'Confined Space Entry': { maxHours: 8,  risk: 'high',   rams: true,  isolation: true,  fireWatch: false, gasMaxAgeMin: 60, ppe: [], competency: ['CONFINED_SPACE'] },
  'Chemical Handling':    { maxHours: 8,  risk: 'high',   rams: true,  isolation: false, fireWatch: false, ppe: [], competency: ['CHEMICAL_HANDLING'] },
  'Work at Height':       { maxHours: 12, risk: 'high',   rams: true,  isolation: false, fireWatch: false, ppe: ['safety_harness', 'hard_hat'], competency: ['WORK_AT_HEIGHT'] },
  'Electrical Work':      { maxHours: 12, risk: 'high',   rams: true,  isolation: true,  fireWatch: false, ppe: [], competency: ['ELECTRICAL_SAFETY'] },
  'Excavation':           { maxHours: 12, risk: 'high',   rams: true,  isolation: false, fireWatch: false, ppe: [], competency: ['EXCAVATION'] },
  'Lifting':              { maxHours: 12, risk: 'high',   rams: true,  isolation: false, fireWatch: false, ppe: [], competency: ['LIFTING_RIGGING'] },
  'Utility Work':         { maxHours: 12, risk: 'medium', rams: true,  isolation: true,  fireWatch: false, ppe: [], competency: [] },
  'Mechanical Work':      { maxHours: 12, risk: 'medium', rams: true,  isolation: true,  fireWatch: false, ppe: [], competency: [] },
  'Night Work':           { maxHours: 12, risk: 'medium', rams: true,  isolation: false, fireWatch: false, ppe: [], competency: [] },
  'Road Closure':         { maxHours: 24, risk: 'medium', rams: true,  isolation: false, fireWatch: false, ppe: [], competency: [] },
  'General Work':         { maxHours: 24, risk: 'low',    rams: false, isolation: false, fireWatch: false, ppe: [], competency: [] },
};

/** A permit, with all its extensions, lasts at most this long in total. */
export const MAX_TOTAL_DAYS = 7;

/** Minimum fire-watch time after hot work finishes. */
export const MIN_POST_WATCH_MINUTES = 30;

/** Lift utilisation: above WARN is flagged, above BLOCK is refused. */
export const LIFT_UTIL_WARN = 85;
export const LIFT_UTIL_BLOCK = 100;

export function typeRule(type: string | undefined): TypeRule | null {
  return type && (TYPE_RULES as Record<string, TypeRule>)[type] || null;
}

// ─── Competency keys ──────────────────────────────────────────────────────

/** Tag a training course with any of these so the permit can verify people. */
export const COMPETENCY_KEYS = [
  'HOT_WORK', 'FIRE_WATCH', 'CONFINED_SPACE', 'GAS_TESTING', 'WORK_AT_HEIGHT',
  'ELECTRICAL_SAFETY', 'LOTO', 'LIFTING_RIGGING', 'CRANE_OPERATOR', 'EXCAVATION',
  'CHEMICAL_HANDLING', 'FIRST_AID', 'PERMIT_ISSUER',
] as const;
export type CompetencyKey = (typeof COMPETENCY_KEYS)[number];

export const COMPETENCY_LABEL: Record<CompetencyKey, string> = {
  HOT_WORK: 'Hot work',
  FIRE_WATCH: 'Fire watch',
  CONFINED_SPACE: 'Confined space entry',
  GAS_TESTING: 'Gas testing',
  WORK_AT_HEIGHT: 'Work at height',
  ELECTRICAL_SAFETY: 'Electrical safety',
  LOTO: 'Lock-out / tag-out',
  LIFTING_RIGGING: 'Lifting & rigging',
  CRANE_OPERATOR: 'Crane operator',
  EXCAVATION: 'Excavation',
  CHEMICAL_HANDLING: 'Chemical handling',
  FIRST_AID: 'First aid',
  PERMIT_ISSUER: 'Permit issuer',
};

/** Roles a team member can have on a permit, and the extra key each implies. */
export type TeamRole = 'worker' | 'supervisor' | 'standby' | 'rigger' | 'fire_watch' | 'gas_tester' | 'crane_operator';
export const TEAM_ROLE_EXTRA_KEYS: Record<TeamRole, readonly string[]> = {
  worker: [], supervisor: [], standby: [], rigger: [],
  fire_watch: ['FIRE_WATCH'],
  gas_tester: ['GAS_TESTING'],
  crane_operator: ['CRANE_OPERATOR'],
};
/** Roles that must hold the permit type's own competency keys. */
export const TEAM_ROLES_NEEDING_TYPE_KEYS: readonly TeamRole[] = ['worker', 'supervisor', 'standby', 'rigger'];

/**
 * Checklist items where "No" means a mandatory control is missing, so the permit cannot proceed.
 * DEFAULTS chosen conservatively from the shipped checklists (src/config/ptw-checklists.ts);
 * confirm against the client's procedure. Keyed by item id so it also covers old permits.
 */
export const CRITICAL_CHECKLIST_ITEMS: readonly string[] = [
  'uw_5',
  'wah_7', 'wah_11', 'wah_13', 'wah_14',
  'cs_2', 'cs_3', 'cs_4', 'cs_5', 'cs_6', 'cs_7',
  'ew_1', 'ew_2',
  'ex_2',
  'hw_1', 'hw_2', 'hw_3',
  'li_1', 'li_2', 'li_4',
  'mw_1',
  'ch_1',
];

// ─── Contract with the database ───────────────────────────────────────────
// Everything below is shared by the client writes (writes.ts), the Firestore
// rules generator (scripts/ptw-rules-lib.mjs) and the tests, so the two sides
// cannot drift apart.

/**
 * A client-computed expiry is checked against SERVER time. A device clock off
 * by more than this many minutes is refused (see describePtwError).
 */
export const CLOCK_SKEW_MINUTES = 10;

/** The signature slot each action fills (the signer is always the logged-in user). */
export const SIGNATURE_SLOT: Partial<Record<ActionId, string>> = {
  submit: 'requester',
  prescreen_pass: 'prescreen',
  site_inspection_pass: 'inspection',
  approve: 'approval',
  accept_handover: 'handover',
  request_completion: 'completion_request',
  close: 'closure',
};
export const SIGNATURE_SLOTS: readonly string[] = Array.from(new Set(Object.values(SIGNATURE_SLOT) as string[]));

/** Stages in which site staff may edit permit content (gas tests, isolation, entry log...). */
export const CONTENT_STAGES: readonly Stage[] = [
  'SITE_INSPECTION', 'SITE_HANDOVER', 'ACTIVE', 'HOLD', 'EXPIRED', 'COMPLETION_PENDING',
];

/** Top-level fields a brand-new permit may carry. */
export const PERMIT_CREATE_KEYS = [
  'org_id', 'project_id', 'type', 'status', 'title', 'payload', 'approvals', 'audit_log',
  'updated_at', 'workflow_log', 'permit_no', 'permit_year', 'public_token', 'creator_id',
  'receiver_id', 'last_transition_at', 'stage_times', 'signatures', 'extensions',
] as const;
/** Required subset (receiver_id is optional). */
export const PERMIT_CREATE_REQUIRED = PERMIT_CREATE_KEYS.filter(k => k !== 'receiver_id');

/** Top-level fields a transition may change. */
export const PERMIT_TRANSITION_KEYS = [
  'status', 'workflow_log', 'last_transition_at', 'stage_times', 'signatures',
  'valid_from', 'valid_until', 'first_activated_at',
  'valid_from_ts', 'valid_until_ts', 'first_activated_ts',
  'extensions', 'payload', 'updated_at',
] as const;
/** Top-level fields a content edit may change, by stage kind. */
export const PERMIT_DRAFT_CONTENT_KEYS = ['title', 'payload', 'receiver_id', 'updated_at'] as const;
export const PERMIT_LIVE_CONTENT_KEYS = ['payload', 'updated_at'] as const;

/** Payload sections only a transition may write (never a plain content edit). */
export const TRANSITION_ONLY_PAYLOAD_KEYS = ['holding_or_stoppage'] as const;

/** Fields of the public status mirror (ptw_public/{token}). No names, no description. */
export const PUBLIC_MIRROR_KEYS = [
  'token', 'permit_id', 'org_id', 'permit_no', 'type', 'status', 'location',
  'valid_from', 'valid_until', 'valid_until_ts', 'updated_at',
] as const;
