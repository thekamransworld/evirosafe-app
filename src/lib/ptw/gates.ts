// Content gates: the checks that must pass before a transition is allowed.
//
// Every check returns results marked block / warn / ok. A block is a hard stop
// unless it is marked `overridable`, in which case an approver can push it
// through with a written justification (recorded and flagged in the log).
//
// NOTE: these are enforced by the app only. The database enforces who may
// make which transition, the validity window, an append-only log and server
// time (see the generated Firestore rules), not the content of the permit.

import {
  APPROVERS, CRITICAL_CHECKLIST_ITEMS, LIFT_UTIL_BLOCK, LIFT_UTIL_WARN, MAX_TOTAL_DAYS, MIN_POST_WATCH_MINUTES,
  TEAM_ROLE_EXTRA_KEYS, TEAM_ROLES_NEEDING_TYPE_KEYS, COMPETENCY_LABEL,
  typeRule, type ActionId, type GateGroup, type PpeKey, type TeamRole,
} from './model';
import { activationWindow, requestedWindow, revalidationWindow, validUntilMs } from './validity';
import { gasTestStatus } from './gas';
import { findConflicts, type SimopsPermit } from './simops';
import { checkCompetency, type CompetencyContext } from './competency';

export type GateLevel = 'block' | 'warn' | 'ok';

export interface GateResult {
  id: string;
  level: GateLevel;
  message: string;
  /** An approver may override this block in writing. */
  overridable?: boolean;
}

export interface GatePermit extends SimopsPermit {
  title?: string;
  creator_id?: string;
  receiver_id?: string;
  first_activated_at?: string;
}

export interface GateContext {
  permit: GatePermit;
  now: number;
  /** The action being attempted (resume and revalidate share a gate group). */
  action?: ActionId;
  /** Other permits in the same project, for SIMOPS. */
  others?: SimopsPermit[];
  /** Training records and courses, for competency. Absent = cannot verify. */
  competency?: CompetencyContext;
}

const ok = (id: string, message: string): GateResult => ({ id, level: 'ok', message });
const block = (id: string, message: string, overridable = false): GateResult =>
  ({ id, level: 'block', message, ...(overridable ? { overridable: true } : {}) });
const warn = (id: string, message: string): GateResult => ({ id, level: 'warn', message });

const s = (v: unknown) => String(v ?? '').trim();

// ─── Individual checks ────────────────────────────────────────────────────

function fields({ permit, now }: GateContext): GateResult[] {
  const out: GateResult[] = [];
  const w = permit.payload?.work ?? {};
  const missing: string[] = [];
  if (s(permit.title).length < 3) missing.push('title');
  if (!s(w.location)) missing.push('location');
  if (s(w.description).length < 10) missing.push('work description (at least 10 characters)');
  if (!(Number(w.number_of_workers) >= 1)) missing.push('number of workers');
  if (!s(w.emergency_contact)) missing.push('emergency contact');
  out.push(missing.length
    ? block('fields', `Complete: ${missing.join(', ')}.`)
    : ok('fields', 'Required details are filled in.'));

  const win = requestedWindow(permit.payload);
  if (!win) {
    out.push(block('window', 'Start and end date/time are missing, invalid, or the end is not after the start.'));
  } else if (win.end <= now) {
    out.push(block('window', 'The requested end time has already passed. Set a new window.'));
  } else if (win.end - win.start > MAX_TOTAL_DAYS * 86_400_000) {
    out.push(block('window', `A permit can cover at most ${MAX_TOTAL_DAYS} days.`));
  } else {
    out.push(ok('window', 'Requested window is valid.'));
  }
  return out;
}

function checklist({ permit }: GateContext): GateResult[] {
  const items: any[] = permit.payload?.safety_requirements ?? [];
  if (items.length === 0) return [block('checklist', 'No safety checklist is attached to this permit.')];
  // Critical by the stored flag OR by item id, so stripping the flag from a saved permit changes nothing.
  const isCritical = (i: any) => i.is_critical === true || (CRITICAL_CHECKLIST_ITEMS as readonly string[]).includes(i.id);
  const unanswered = items.filter(i => !s(i.response));
  const critNo = items.filter(i => i.response === 'No' && isCritical(i));
  const otherNo = items.filter(i => i.response === 'No' && !isCritical(i));
  const critNa = items.filter(i => i.response === 'N/A' && isCritical(i));
  const out: GateResult[] = [];
  if (unanswered.length) out.push(block('checklist.unanswered', `${unanswered.length} checklist item(s) are unanswered.`));
  if (critNo.length) out.push(block('checklist.critical', `Critical item answered "No": ${critNo.map(i => s(i.text)).slice(0, 3).join('; ')}${critNo.length > 3 ? '…' : ''}`));
  if (otherNo.length) out.push(warn('checklist.no', `${otherNo.length} non-critical item(s) answered "No". Make sure the gap is controlled.`));
  if (critNa.length) out.push(warn('checklist.na', `${critNa.length} critical item(s) marked N/A. Confirm that is correct.`));
  if (!unanswered.length && !critNo.length) out.push(ok('checklist', 'Checklist complete, no critical "No" answers.'));
  return out;
}

function rams({ permit }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  if (!rule?.rams) return [];
  return s(permit.payload?.work?.risk_assessment_ref)
    ? [ok('rams', 'Risk assessment reference recorded.')]
    : [block('rams', `${permit.type} permits need a risk assessment / method statement reference.`)];
}

function ppe({ permit }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  if (!rule || rule.ppe.length === 0) return [];
  const have = permit.payload?.ppe ?? {};
  const missing = (rule.ppe as readonly PpeKey[]).filter(k => have[k] !== true);
  return missing.length
    ? [block('ppe', `Required PPE not ticked: ${missing.map(k => k.replace(/_/g, ' ')).join(', ')}.`)]
    : [ok('ppe', 'Required PPE ticked.')];
}

function hotWork({ permit }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  if (!rule?.fireWatch) return [];
  const out: GateResult[] = [];
  if (!s(permit.payload?.fire_watcher?.name)) out.push(block('firewatch', 'A fire watcher must be named.'));
  const pw = Number(permit.payload?.post_watch_minutes);
  if (!(pw >= MIN_POST_WATCH_MINUTES)) out.push(block('postwatch', `Post-work fire watch must be at least ${MIN_POST_WATCH_MINUTES} minutes.`));
  if (out.length === 0) out.push(ok('firewatch', 'Fire watcher named, post-watch set.'));
  return out;
}

/**
 * Crane utilisation, recomputed from the weights and the capacity at the working radius.
 * The stored percentage is never trusted: an old or edited permit can leave it at 0.
 * Returns null when it cannot be worked out.
 */
export function liftUtilisation(lc: any): number | null {
  const cap = Number(lc?.crane_capacity_at_radius);
  const weight = (Number(lc?.hook_rigging_weight) || 0) + (Number(lc?.load_weight) || 0);
  if (!(cap > 0) || !(weight > 0)) return null;
  return (weight / cap) * 100;
}

function lifting({ permit }: GateContext): GateResult[] {
  if (permit.type !== 'Lifting') return [];
  const lc = permit.payload?.load_calculation ?? {};
  const out: GateResult[] = [];
  const missing: string[] = [];
  if (!s(lc.lift_plan_ref)) missing.push('lift plan reference');
  if (!s(lc.crane_certification_no)) missing.push('crane certificate number');
  if (!s(lc.operator_certification_no)) missing.push('operator certificate number');
  if (missing.length) out.push(block('lift.docs', `Lifting permit needs: ${missing.join(', ')}.`));
  const u = liftUtilisation(lc);
  if (u === null) {
    out.push(block('lift.util', 'Crane utilisation cannot be worked out: enter the load weight, hook and rigging weight, and crane capacity at the working radius.'));
  } else if (u > LIFT_UTIL_BLOCK) {
    out.push(block('lift.util', `Crane utilisation is ${u.toFixed(0)}%: above ${LIFT_UTIL_BLOCK}% the lift is not allowed.`));
  } else if (u > LIFT_UTIL_WARN) {
    out.push(warn('lift.util', `Crane utilisation is ${u.toFixed(0)}%: above ${LIFT_UTIL_WARN}% needs a lift supervisor's review.`));
  }
  if (out.length === 0) out.push(ok('lift', 'Lift plan, certificates and utilisation are in order.'));
  return out;
}

function isolationPlan({ permit }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  const pts: any[] = permit.payload?.isolation ?? [];
  if (rule?.isolation && pts.length === 0) {
    return [block('isolation.plan', `${permit.type} permits need at least one isolation point listed (or an entry explaining why none applies).`)];
  }
  return rule?.isolation ? [ok('isolation.plan', `${pts.length} isolation point(s) listed.`)] : [];
}

function isolationApplied({ permit }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  const pts: any[] = permit.payload?.isolation ?? [];
  if (!rule?.isolation && pts.length === 0) return [];
  if (rule?.isolation && pts.length === 0) return [block('isolation.applied', 'No isolation points are recorded.')];
  const notApplied = pts.filter(p => !s(p.applied_by) || !s(p.applied_at));
  const notVerified = pts.filter(p => !s(p.verified_by) || !s(p.verified_at));
  const out: GateResult[] = [];
  if (notApplied.length) out.push(block('isolation.applied', `${notApplied.length} isolation point(s) not yet applied.`));
  if (notVerified.length) out.push(block('isolation.verified', `${notVerified.length} isolation point(s) not yet verified.`));
  const same = pts.filter(p => s(p.applied_by) && s(p.applied_by).toLowerCase() === s(p.verified_by).toLowerCase());
  if (same.length) out.push(warn('isolation.same', `${same.length} point(s) were verified by the same person who applied them.`));
  if (!notApplied.length && !notVerified.length) out.push(ok('isolation.applied', 'All isolation points applied and verified.'));
  return out;
}

function isolationRemoved({ permit }: GateContext): GateResult[] {
  const pts: any[] = permit.payload?.isolation ?? [];
  if (pts.length === 0) return [];
  const left = pts.filter(p => !s(p.removed_by) || !s(p.removed_at));
  return left.length
    ? [block('isolation.removed', `${left.length} isolation point(s) not yet removed.`)]
    : [ok('isolation.removed', 'All isolation points removed.')];
}

function gas({ permit, now }: GateContext): GateResult[] {
  const rule = typeRule(permit.type);
  if (!rule?.gasMaxAgeMin) return [];
  const st = gasTestStatus(permit.payload?.gas_tests, now, rule.gasMaxAgeMin);
  switch (st.status) {
    case 'none': return [block('gas', 'No complete gas test is recorded.')];
    case 'fail': return [block('gas', `Latest gas test FAILED: ${st.failures.join('; ')}. Ventilate and re-test.`)];
    case 'stale': return [block('gas', `Latest gas test is ${st.ageMin} min old; it must be no more than ${rule.gasMaxAgeMin} min. Re-test.`)];
    default: return [ok('gas', `Gas test passed ${st.ageMin} min ago.`)];
  }
}

function nobodyInside({ permit }: GateContext): GateResult[] {
  const log: any[] = permit.payload?.entry_log ?? [];
  if (log.length === 0) return [];
  const inside = log.filter(e => s(e.time_in) && !s(e.time_out));
  return inside.length
    ? [block('inside', `Still inside: ${inside.map(e => s(e.name) || 'unnamed').join(', ')}. Everyone must be out and accounted for.`)]
    : [ok('inside', 'Everyone who entered has signed out.')];
}

function jointInspection({ permit }: GateContext): GateResult[] {
  const ji = permit.payload?.joint_inspection;
  const out: GateResult[] = [];
  if (!s(ji?.remarks)) out.push(block('joint.remarks', 'Record the joint inspection (remarks) before closing.'));
  if (!s(ji?.requester?.signature)) out.push(block('joint.requester', 'The requester must be recorded on the joint inspection.'));
  if (!s(ji?.client_proponent?.signature) && !s(ji?.client_hs?.signature)) {
    out.push(warn('joint.client', 'No client representative is recorded on the joint inspection.'));
  }
  if (!out.some(r => r.level === 'block')) out.unshift(ok('joint', 'Joint inspection recorded.'));
  return out;
}

function activationWindowGate({ permit, now }: GateContext): GateResult[] {
  const w = activationWindow(permit, now);
  return w.ok === false
    ? [block('activation.window', w.reason)]
    : [ok('activation.window', w.cappedByType
        ? `Valid until ${new Date(w.until).toLocaleString()} (capped at the ${typeRule(permit.type)?.maxHours} h limit for ${permit.type}).`
        : `Valid until ${new Date(w.until).toLocaleString()}.`)];
}

function revalidationGate({ permit, now, action }: GateContext): GateResult[] {
  if (action === 'resume') {
    const until = validUntilMs(permit);
    if (!Number.isFinite(until)) return [block('resume.window', 'This permit has no validity window to resume into.')];
    if (now > until) return [block('resume.window', 'The permit expired while on hold. Resuming does not extend it: request completion or cancel it.')];
    return [ok('resume.window', 'Still within the original validity. Resuming does not extend it.')];
  }
  const w = revalidationWindow(permit, now);
  return w.ok === false
    ? [block('revalidate.window', w.reason)]
    : [ok('revalidate.window', `Would extend validity to ${new Date(w.until).toLocaleString()}.`)];
}

// ─── Competency ───────────────────────────────────────────────────────────

export interface CompetencyNeed {
  name: string;
  user_id?: string;
  role: TeamRole | 'fire_watcher';
  keys: string[];
}

/** Who on this permit must hold which competency. */
export function competencyNeeds(permit: GatePermit): CompetencyNeed[] {
  const rule = typeRule(permit.type);
  const team: any[] = permit.payload?.team ?? [];
  const needs: CompetencyNeed[] = team.map(m => {
    const role: TeamRole = (m.role in TEAM_ROLE_EXTRA_KEYS ? m.role : 'worker') as TeamRole;
    const keys = [
      ...(TEAM_ROLES_NEEDING_TYPE_KEYS.includes(role) ? (rule?.competency ?? []) : []),
      ...TEAM_ROLE_EXTRA_KEYS[role],
    ];
    return { name: s(m.name) || 'Unnamed team member', user_id: s(m.user_id) || undefined, role, keys: Array.from(new Set(keys)) };
  }).filter(n => n.keys.length > 0);

  const fw = permit.payload?.fire_watcher;
  if (rule?.fireWatch && s(fw?.name) && !team.some(m => m.role === 'fire_watch')) {
    needs.push({ name: s(fw.name), user_id: s(fw.user_id) || undefined, role: 'fire_watcher', keys: ['FIRE_WATCH'] });
  }
  return needs;
}

function competency({ permit, now, competency: ctx }: GateContext): GateResult[] {
  const needs = competencyNeeds(permit);
  const rule = typeRule(permit.type);
  const team: any[] = permit.payload?.team ?? [];
  if (needs.length === 0) {
    return (rule?.competency.length ?? 0) > 0 && team.length === 0
      ? [warn('competency.team', 'No team members are listed, so competency cannot be verified.')]
      : [];
  }
  if (!ctx) return [warn('competency.unavailable', 'Training records could not be loaded, so competency was not verified.')];

  const out: GateResult[] = [];
  const unverified = new Set<string>();
  const noCourse = new Set<string>();
  let missingCount = 0;
  for (const n of needs) {
    for (const key of n.keys) {
      const c = checkCompetency(n.user_id, key, ctx, now);
      const label = (COMPETENCY_LABEL as Record<string, string>)[key] ?? key;
      if (c.status === 'missing') {
        missingCount++;
        out.push(block(`competency.${key}.${n.user_id}`,
          `${n.name}: no valid certificate for ${label} (accepted: ${c.courses.join(', ')}).`, true));
      } else if (c.status === 'unverified') {
        unverified.add(n.name);
      } else if (c.status === 'no_course') {
        noCourse.add(label);
      }
    }
  }
  if (unverified.size) out.push(warn('competency.unverified', `Not verifiable (no EviroSafe account): ${Array.from(unverified).join(', ')}. Check their certificates on site.`));
  if (noCourse.size) out.push(warn('competency.nocourse', `No training course is tagged for: ${Array.from(noCourse).join(', ')}. Tag a course to enable the check.`));
  if (missingCount === 0 && out.length === 0) out.push(ok('competency', 'Everyone on the team holds a valid certificate.'));
  return out;
}

// ─── SIMOPS ───────────────────────────────────────────────────────────────

function simops({ permit, now, others }: GateContext): GateResult[] {
  if (!others) return [warn('simops.unavailable', 'Other permits could not be loaded, so SIMOPS was not checked.')];
  const conflicts = findConflicts(permit, others, now);
  if (conflicts.length === 0) return [ok('simops', 'No conflicting permits in the same area.')];
  return conflicts.map(c =>
    c.severity === 'block'
      ? block(`simops.${c.other_id}`, c.reason, true)
      : warn(`simops.${c.other_id}`, c.reason));
}

// ─── Groups ───────────────────────────────────────────────────────────────

type Check = (c: GateContext) => GateResult[];

const GROUPS: Record<GateGroup, Check[]> = {
  submit:     [fields, checklist, rams, ppe, hotWork, lifting, isolationPlan],
  inspection: [fields, checklist, rams, ppe, hotWork, lifting, isolationPlan, competency, simops],
  approve:    [fields, checklist, rams, ppe, hotWork, lifting, isolationPlan, competency, simops],
  activate:   [activationWindowGate, checklist, competency, simops, isolationApplied, gas],
  revalidate: [revalidationGate, isolationApplied, gas, competency, simops],
  completion: [nobodyInside],
  close:      [nobodyInside, isolationRemoved, jointInspection],
};

/** True when the group checks for conflicting permits (so the caller must supply fresh `others`). */
export const groupNeedsOthers = (group: GateGroup): boolean => GROUPS[group].includes(simops);

export function evaluateGates(group: GateGroup, ctx: GateContext): GateResult[] {
  return GROUPS[group].flatMap(check => check(ctx));
}

export const hardBlocks = (r: GateResult[]) => r.filter(x => x.level === 'block' && !x.overridable);
export const overridableBlocks = (r: GateResult[]) => r.filter(x => x.level === 'block' && x.overridable);
export const warnings = (r: GateResult[]) => r.filter(x => x.level === 'warn');

export function canOverrideGates(role: string | undefined): boolean {
  return !!role && (APPROVERS as readonly string[]).includes(role);
}
