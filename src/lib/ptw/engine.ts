// The workflow engine. Pure: no Firebase, no clock, no DOM.
//
//   checkActor        may THIS person perform THIS action on THIS permit?
//   availableActions  what to show on screen, with the reason for each "no"
//   prepareTransition validate everything and compute the exact patch, log
//                     entry and signature to write. Nothing is written here.
//
// The service layer writes the result atomically and stamps server time.

import {
  ACTIONS, APPROVERS, CONTENT_STAGES, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, OVERRIDERS,
  SIGNATURE_SLOT, STAFF, STAGE_LABEL, normalizeStage,
  type ActionDef, type ActionId, type Stage,
} from './model';
import { activationWindow, effectiveStatus, revalidationWindow, validUntilMs } from './validity';
import {
  canOverrideGates, evaluateGates, hardBlocks, overridableBlocks,
  type GateContext, type GatePermit, type GateResult,
} from './gates';

export interface ActorLike { id: string; name: string; role: string }

export interface EnginePermit extends GatePermit {
  extensions?: any[];
  /** Present on every permit created by the new system; absent on legacy permits. */
  permit_no?: string;
}

// ─── Actor rules ──────────────────────────────────────────────────────────

export type ActorCheck =
  | { ok: true; override: boolean }
  | { ok: false; reason: string; overridable?: boolean };

const isRequester = (p: EnginePermit, a: ActorLike) =>
  !!a.id && (a.id === p.creator_id || a.id === p.receiver_id);

export function checkActor(
  def: ActionDef,
  permit: EnginePermit,
  actor: ActorLike,
  justification?: string,
): ActorCheck {
  if (!(def.roles as readonly string[]).includes(actor.role)) {
    const who = def.roles.length <= 3 ? def.roles.join(', ') : 'site staff';
    return { ok: false, reason: `Your role (${actor.role || 'unknown'}) cannot ${def.label.toLowerCase()}. Allowed: ${who}.` };
  }
  if (def.actor === 'any' || def.actor === 'system') return { ok: true, override: false };

  const requester = isRequester(permit, actor);
  const violated = def.actor === 'requester' ? !requester : requester;
  if (!violated) return { ok: true, override: false };

  const reason = def.actor === 'requester'
    ? 'Only the person who raised this permit (or its receiver) can do this.'
    : 'You raised or received this permit, so someone else must do this (segregation of duties).';

  if (!(OVERRIDERS as readonly string[]).includes(actor.role)) return { ok: false, reason };
  if (String(justification ?? '').trim().length >= MIN_JUSTIFICATION_CHARS) return { ok: true, override: true };
  return { ok: false, reason: `${reason} As an administrator you can override this with a written justification.`, overridable: true };
}

// ─── Stage matching ───────────────────────────────────────────────────────

/**
 * Stage used to decide whether an action applies. `expire` is the one action
 * that looks at the STORED status (ACTIVE) because the displayed stage is
 * already EXPIRED by the time it is needed.
 */
function stageFor(def: ActionDef, permit: EnginePermit, now: number): Stage | null {
  return def.id === 'expire' ? normalizeStage(permit.status) : effectiveStatus(permit, now);
}

// ─── Available actions ────────────────────────────────────────────────────

export interface ActionOption {
  def: ActionDef;
  enabled: boolean;
  /** Why it is disabled (role, segregation, or a gate that cannot be overridden by this person). */
  reason?: string;
  /** The segregation rule can be overridden by this person in writing. */
  needsOverride?: boolean;
  /** A gate block exists that this person may override in writing. */
  needsGateOverride?: boolean;
  /** Gate results for display (empty when no gate context was supplied). */
  gates: GateResult[];
}

type GateInputs = Pick<GateContext, 'others' | 'competency'>;

export function availableActions(
  permit: EnginePermit,
  actor: ActorLike,
  now: number,
  gateInputs?: GateInputs,
): ActionOption[] {
  const out: ActionOption[] = [];
  for (const def of Object.values(ACTIONS)) {
    if (def.actor === 'system') continue; // automatic, never a button
    const stage = stageFor(def, permit, now);
    if (!stage || !def.from.includes(stage)) continue;

    const who = checkActor(def, permit, actor);
    let gates: GateResult[] = [];
    if (def.gate && gateInputs) {
      gates = evaluateGates(def.gate, { permit, now, action: def.id, ...gateInputs });
    }
    const opt: ActionOption = { def, enabled: true, gates };

    if (who.ok === false) {
      opt.enabled = false;
      opt.reason = who.reason;
      opt.needsOverride = who.overridable;
    } else if (hardBlocks(gates).length) {
      opt.enabled = false;
      opt.reason = hardBlocks(gates)[0].message;
    } else if (overridableBlocks(gates).length) {
      if (canOverrideGates(actor.role)) opt.needsGateOverride = true;
      else {
        opt.enabled = false;
        opt.reason = `${overridableBlocks(gates)[0].message} Only an approver can override this, in writing.`;
      }
    }
    out.push(opt);
  }
  return out;
}

// ─── Transition ───────────────────────────────────────────────────────────

export interface LogEntry {
  stage: Stage;
  from: Stage;
  action: ActionId;
  user_id: string;
  user_name: string;
  role: string;
  timestamp: string;
  comments?: string;
  override?: boolean;
  /** Gate ids that were overridden, if any. */
  override_items?: string[];
  justification?: string;
}

export interface SignatureSlot {
  user_id: string;
  name: string;
  role: string;
  signed_at: string;
  action: ActionId;
}

export interface TransitionInput {
  permit: EnginePermit;
  action: ActionId;
  actor: ActorLike;
  now: number;
  /** The action note. Required for actions that demand a reason. */
  note?: string;
  /** Written justification for a segregation or gate override. */
  justification?: string;
  /** The person has just re-entered their password. */
  reauthenticated?: boolean;
  /** Inputs for the gate checks (other permits, training records). */
  gateInputs?: GateInputs;
}

export type TransitionResult =
  | {
      ok: true;
      from: Stage;
      to: Stage;
      /** Dotted-path field updates for the permit document. Times are ISO strings. */
      patch: Record<string, unknown>;
      log: LogEntry;
      override: boolean;
      gates: GateResult[];
      /** Set when this transition grants or extends validity. */
      validity?: { from?: number; until: number };
    }
  | { ok: false; reason: string; gates?: GateResult[] };

const iso = (ms: number) => new Date(ms).toISOString();
const fail = (reason: string, gates?: GateResult[]): TransitionResult => ({ ok: false, reason, ...(gates ? { gates } : {}) });

export function prepareTransition(input: TransitionInput): TransitionResult {
  const { permit, action, actor, now } = input;
  const def = ACTIONS[action];
  if (!def) return fail(`Unknown action "${action}".`);

  const from = stageFor(def, permit, now);
  if (!from) return fail(`This permit has an unrecognised status ("${permit.status}") and cannot be progressed.`);
  if (!def.from.includes(from)) {
    return fail(`"${def.label}" is not available while the permit is ${STAGE_LABEL[from].toLowerCase()}.`);
  }

  const note = String(input.note ?? '').trim();
  const justification = String(input.justification ?? '').trim();

  // 1. Who
  const who = checkActor(def, permit, actor, justification);
  if (who.ok === false) return fail(who.reason);

  // 2. Reason
  if (def.reason && note.length < MIN_REASON_CHARS) {
    return fail(`A written reason is required (at least ${MIN_REASON_CHARS} characters).`);
  }

  // 3. Content gates
  let gates: GateResult[] = [];
  let gateOverride = false;
  let overriddenIds: string[] = [];
  if (def.gate) {
    if (!input.gateInputs) return fail('Internal error: gate inputs were not supplied.');
    gates = evaluateGates(def.gate, { permit, now, action, ...input.gateInputs });
    const hard = hardBlocks(gates);
    if (hard.length) return fail(hard[0].message, gates);
    const soft = overridableBlocks(gates);
    if (soft.length) {
      if (!(APPROVERS as readonly string[]).includes(actor.role)) {
        return fail(`${soft[0].message} Only an approver can override this, in writing.`, gates);
      }
      if (justification.length < MIN_JUSTIFICATION_CHARS) {
        return fail(`${soft[0].message} To proceed anyway, write a justification (at least ${MIN_JUSTIFICATION_CHARS} characters).`, gates);
      }
      gateOverride = true;
      overriddenIds = soft.map(g => g.id);
    }
  }

  // 4. Re-authentication
  if (def.reauth && !input.reauthenticated) {
    return fail('Confirm your password to do this.');
  }

  // 5. Action-specific computation
  const patch: Record<string, unknown> = { status: def.to };
  let validity: { from?: number; until: number } | undefined;
  const payload = permit.payload ?? {};
  const stoppages: any[] = Array.isArray(payload.holding_or_stoppage) ? payload.holding_or_stoppage : [];
  const actorName = actor.name || actor.id;

  switch (action) {
    case 'accept_handover': {
      const w = activationWindow(permit, now);
      if (w.ok === false) return fail(w.reason, gates);
      patch.valid_from = iso(w.from);
      patch.valid_until = iso(w.until);
      patch.first_activated_at = iso(now);
      validity = { from: w.from, until: w.until };
      break;
    }
    case 'revalidate': {
      const w = revalidationWindow(permit, now);
      if (w.ok === false) return fail(w.reason, gates);
      patch.valid_until = iso(w.until);
      patch.extensions = [
        ...(permit.extensions ?? []),
        { at: iso(now), by_id: actor.id, by_name: actorName, reason: note, from_until: Number.isFinite(validUntilMs(permit)) ? iso(validUntilMs(permit)) : '', to_until: iso(w.until) },
      ];
      validity = { until: w.until };
      break;
    }
    case 'resume': {
      // Resuming never extends validity (the gate already refused an expired permit).
      const open = stoppages.map((s, i) => ({ s, i })).reverse().find(x => !x.s?.restarted_time);
      const next = stoppages.map(s => ({ ...s }));
      if (open) {
        next[open.i].restarted_time = iso(now);
        next[open.i].resumed_by = actorName;
        next[open.i].resume_note = note;
      }
      patch['payload.holding_or_stoppage'] = next;
      break;
    }
    case 'stop_work':
    case 'inspection_fail': {
      patch['payload.holding_or_stoppage'] = [
        ...stoppages,
        {
          time: iso(now),
          reason: action === 'inspection_fail' ? `Completion inspection failed: ${note}` : note,
          stopped_by: actorName,
          stopped_by_id: actor.id,
          informed_to: '',
          restarted_time: '',
          signature: '',
        },
      ];
      break;
    }
    case 'expire': {
      const until = validUntilMs(permit);
      if (!Number.isFinite(until) || now <= until) return fail('The permit has not reached its end time yet.');
      break;
    }
    case 'send_back':
      // Sign-offs belong to the version that was reviewed; a changed permit needs fresh ones.
      patch.signatures = {};
      break;
    default:
      break;
  }

  // 6. Signature slot
  const slot = SIGNATURE_SLOT[action];
  if (slot) {
    const sig: SignatureSlot = { user_id: actor.id, name: actorName, role: actor.role, signed_at: iso(now), action };
    patch[`signatures.${slot}`] = sig;
  }

  const override = who.override || gateOverride;
  const log: LogEntry = {
    stage: def.to,
    from,
    action,
    user_id: actor.id,
    user_name: actorName,
    role: actor.role,
    timestamp: iso(now),
    ...(note ? { comments: note } : {}),
    ...(override ? { override: true, justification } : {}),
    ...(gateOverride ? { override_items: overriddenIds } : {}),
  };

  return { ok: true, from, to: def.to, patch, log, override, gates, ...(validity ? { validity } : {}) };
}

// ─── Content edits (not transitions) ──────────────────────────────────────

export type ContentEditCheck = { ok: true } | { ok: false; reason: string };

/**
 * May this person edit the permit's content right now? Mirrors the database
 * rule exactly: staff only; a DRAFT is editable by its creator, its receiver
 * or an approver; after that only the stages where site staff record work
 * (inspection, handover, active, hold, expired, completion pending).
 * Uses the STORED status, as the database does.
 */
export function checkContentEdit(permit: EnginePermit, actor: ActorLike): ContentEditCheck {
  if (!(STAFF as readonly string[]).includes(actor.role)) {
    return { ok: false, reason: 'Your role cannot edit permits.' };
  }
  if (!permit.permit_no) {
    return { ok: false, reason: 'This permit was created before the new permit system and is read-only. Ask an administrator to delete it and raise a new one.' };
  }
  const stage = normalizeStage(permit.status);
  if (stage === 'DRAFT') {
    const mine = actor.id === permit.creator_id || actor.id === permit.receiver_id;
    return mine || (APPROVERS as readonly string[]).includes(actor.role)
      ? { ok: true }
      : { ok: false, reason: 'Only the person who raised this draft, its receiver, or an approver can edit it.' };
  }
  if (stage && (CONTENT_STAGES as readonly string[]).includes(stage)) return { ok: true };
  return { ok: false, reason: `The permit is locked for editing while it is ${stage ? STAGE_LABEL[stage].toLowerCase() : 'in an unknown state'}.` };
}
