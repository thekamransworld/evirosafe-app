// Builds the payload of a new permit. Pure.
//
// Old behaviour this replaces: every checklist item started as "N/A" (so an
// untouched checklist looked complete), every requester phone number was the
// same placeholder, attachments were random stock-photo URLs, default times
// were UTC, and PPE was the same for every permit type.

import { ptwChecklistData } from '../../config/ptw-checklists';
import { CRITICAL_CHECKLIST_ITEMS, typeRule, type PermitType, type PpeKey } from './model';

const emptySignature = () => ({ signature: '', signed_at: '' });
const emptySignoff = () => ({ name: '', designation: '', email: '', mobile: '', remarks: '', signature: '', signed_at: '' });

export const GLOBAL_STANDARDS = ['ISO 45001:2018', 'OSHA 29 CFR 1910'];

export interface RequesterInfo {
  id: string;
  name: string;
  email?: string;
  /** The person's real phone number, if the profile has one. Never a placeholder. */
  mobile?: string;
  role?: string;
  company?: string;
}

/** The requester block from a user record. Uses the person's real mobile/phone, or leaves it blank. */
export function requesterFromUser(u: { id: string; name: string; email?: string; mobile?: string; phone?: string; designation?: string; role?: string; company?: string }): RequesterInfo {
  return {
    id: u.id, name: u.name, email: u.email ?? '', mobile: u.mobile || u.phone || '',
    role: u.designation || String(u.role ?? '').replace(/_/g, ' ').toLowerCase(), company: u.company,
  };
}

export interface PermitFormInput {
  type: PermitType;
  requester: RequesterInfo;
  location: string;
  description: string;
  /** Local date and time, as a datetime-local input gives them: 'YYYY-MM-DD' and 'HH:mm'. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  numberOfWorkers?: number;
  emergencyContact?: string;
  ramsRef?: string;
  /** Number written on a paper permit this one replaces ("Add existing permit"). */
  externalRef?: string;
  /** The "before you start" confirmations the requester ticked. */
  declarations?: Record<string, boolean>;
  /** Extra sections to carry along (e.g. hazards and controls from the guided wizard). */
  extra?: Record<string, unknown>;
  team?: Array<{ id: string; name: string; role: string; user_id?: string; company?: string; mobile?: string }>;
  ppeOverrides?: Partial<Record<PpeKey, boolean>>;
}

const ALL_PPE: Record<PpeKey, boolean> = {
  hard_hat: false, safety_shoes: false, goggles: false, safety_harness: false,
  coverall: false, respirator: false, safety_gloves: false, vest: false,
};

/** PPE ticked for a new permit: the site basics, plus whatever the permit type requires. */
export function defaultPpe(type: PermitType): Record<PpeKey, boolean> {
  const ppe = { ...ALL_PPE, hard_hat: true, safety_shoes: true };
  for (const k of typeRule(type)?.ppe ?? []) ppe[k] = true;
  return ppe;
}

/** The checklist for a type, every item UNANSWERED. */
export function blankChecklist(type: PermitType) {
  return (ptwChecklistData[type] ?? []).map(item => ({
    id: item.id,
    text: item.text,
    response: '' as const,
    ...((CRITICAL_CHECKLIST_ITEMS as readonly string[]).includes(item.id) ? { is_critical: true } : {}),
  }));
}

function typeBlock(type: PermitType): Record<string, unknown> {
  switch (type) {
    case 'Hot Work': return { fire_watcher: { name: '', mobile: '' }, post_watch_minutes: 30 };
    case 'Work at Height': return { access_equipment: {} };
    case 'Confined Space Entry': return { gas_tests: [], entry_log: [] };
    case 'Excavation': return { soil_type: 'A', cave_in_protection: [] };
    case 'Road Closure': return { closure_type: 'partial' };
    case 'Lifting':
      return {
        load_calculation: {
          lift_plan_ref: '', crane_certification_no: '', operator_certification_no: '',
          hook_rigging_weight: '', load_weight: '', total_weight: '',
          crane_capacity_at_radius: '', utilization_percent: '',
        },
      };
    default: return {};
  }
}

export function buildPermitPayload(i: PermitFormInput): Record<string, any> {
  return {
    creator_id: i.requester.id,
    permit_no: '', // the real number is assigned by the system when the permit is created
    category: 'standard',
    ...(i.externalRef ? { external_ref: i.externalRef.trim() } : {}),
    requester: {
      name: i.requester.name,
      email: i.requester.email ?? '',
      mobile: i.requester.mobile ?? '',
      designation: i.requester.role ?? '',
      contractor: i.requester.company || 'Internal',
      signature: '',
    },
    work: {
      location: i.location.trim(),
      description: i.description.trim(),
      coverage: { start_date: i.startDate, start_time: i.startTime, end_date: i.endDate, end_time: i.endTime },
      number_of_workers: i.numberOfWorkers && i.numberOfWorkers > 0 ? i.numberOfWorkers : undefined,
      emergency_contact: (i.emergencyContact ?? '').trim(),
      risk_assessment_ref: (i.ramsRef ?? '').trim(),
      associated_permits: [],
    },
    safety_requirements: blankChecklist(i.type),
    ppe: { ...defaultPpe(i.type), ...(i.ppeOverrides ?? {}) },
    signoffs: { client_proponent: emptySignoff(), other_stakeholders: [], client_hs: emptySignoff() },
    joint_inspection: { remarks: '', requester: emptySignature(), client_proponent: emptySignature(), client_hs: emptySignature() },
    holding_or_stoppage: [],
    extension: {
      is_requested: false, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' },
      requester: emptySignature(), client_proponent: emptySignature(), client_hs: emptySignature(),
    },
    closure: { note: '', permit_requester: emptySignature(), client_proponent: emptySignature(), client_hs: emptySignature() },
    attachments: [], // file storage is not enabled; nothing is attached
    audit: [],
    global_compliance: { standards: GLOBAL_STANDARDS, ...(i.declarations ? { declarations: i.declarations } : {}) },
    team: (i.team ?? []).map(m => ({ ...m })),
    isolation: [],
    ...typeBlock(i.type),
    ...(i.extra ?? {}),
  };
}

// ─── local date and time ──────────────────────────────────────────────────

const p2 = (n: number) => String(n).padStart(2, '0');

/** epoch ms → 'YYYY-MM-DDTHH:mm' in the device's LOCAL time (what a datetime-local input wants). The old code used UTC. */
export function localDateTimeInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function splitLocalInput(v: string): { date: string; time: string } {
  const [date = '', time = ''] = String(v || '').split('T');
  return { date, time: time.slice(0, 5) };
}
