// Maps the Guided Permit wizard's flat answers onto the one permit shape.
// The wizard used its own type codes (HOT_WORK...) and a flat data layout that
// nothing else understood; it now goes through the same builder as the form.

import { buildPermitPayload, splitLocalInput, type RequesterInfo } from './payload';
import type { PermitType, PpeKey } from './model';

export const WIZARD_TYPE_MAP: Record<string, PermitType> = {
  HOT_WORK: 'Hot Work',
  CONFINED_SPACE: 'Confined Space Entry',
  WORKING_AT_HEIGHT: 'Work at Height',
  ELECTRICAL: 'Electrical Work',
  EXCAVATION: 'Excavation',
  LIFTING: 'Lifting',
  CHEMICAL: 'Chemical Handling',
  ISOLATION: 'Mechanical Work',
  GENERAL: 'General Work',
};

/** Wizard PPE labels → permit PPE keys. Labels with no key (hearing protection, lanyard) are kept as notes. */
const PPE_LABEL_TO_KEY: Record<string, PpeKey> = {
  'Hard hat': 'hard_hat',
  'Safety glasses': 'goggles',
  'Face shield': 'goggles',
  'Respirator / SCBA': 'respirator',
  'Safety gloves': 'safety_gloves',
  'Chemical gloves': 'safety_gloves',
  'Safety boots': 'safety_shoes',
  'Hi-vis vest': 'vest',
  'Fire-retardant coveralls': 'coverall',
  'Full body harness': 'safety_harness',
};

export interface WizardData {
  type?: string; description?: string; location?: string; project_id?: string;
  planned_start?: string; planned_end?: string;
  hazards?: string[]; controls?: string[]; ppe_required?: string[];
  receiver_name?: string; receiver_company?: string; team_members?: string;
  isolations_required?: boolean; gas_test_required?: boolean; fire_watch_required?: boolean;
  rescue_plan?: string;
}

export interface PermitData {
  project_id: string;
  type: PermitType;
  title: string;
  payload: Record<string, any>;
  receiver_id?: string;
}

export type WizardResult = { ok: true; data: PermitData } | { ok: false; reason: string };

const clean = (a: unknown): string[] => (Array.isArray(a) ? a : []).map(x => String(x ?? '').trim()).filter(Boolean);

export function wizardToPermitData(w: WizardData, requester: RequesterInfo, opts: { now?: number } = {}): WizardResult {
  const type = WIZARD_TYPE_MAP[String(w.type ?? '')];
  if (!type) return { ok: false, reason: `The permit type "${w.type ?? ''}" is not one this system recognises.` };
  if (!w.project_id) return { ok: false, reason: 'Choose a project for this permit.' };
  const start = splitLocalInput(w.planned_start ?? '');
  const end = splitLocalInput(w.planned_end ?? '');
  if (!start.date || !start.time) return { ok: false, reason: 'Set the planned start date and time.' };

  // No end given: default to the start of the day's work plus 8 hours, in local time.
  let endDate = end.date, endTime = end.time;
  if (!endDate || !endTime) {
    const [y, m, d] = start.date.split('-').map(Number);
    const [hh, mm] = start.time.split(':').map(Number);
    const e = new Date(y, m - 1, d, hh + 8, mm);
    const p2 = (n: number) => String(n).padStart(2, '0');
    endDate = `${e.getFullYear()}-${p2(e.getMonth() + 1)}-${p2(e.getDate())}`;
    endTime = `${p2(e.getHours())}:${p2(e.getMinutes())}`;
  }

  const ppeOverrides: Partial<Record<PpeKey, boolean>> = {};
  const unmapped: string[] = [];
  for (const label of clean(w.ppe_required)) {
    const key = PPE_LABEL_TO_KEY[label];
    if (key) ppeOverrides[key] = true; else unmapped.push(label);
  }

  const team = clean(String(w.team_members ?? '').split(/[\n,;]+/)).map((name, i) => ({
    id: `team_${(opts.now ?? 0)}_${i}`, name, role: 'worker', company: w.receiver_company?.trim() || undefined,
  }));

  const payload = buildPermitPayload({
    type, requester,
    location: w.location ?? '', description: w.description ?? '',
    startDate: start.date, startTime: start.time, endDate, endTime,
    ppeOverrides, team,
    extra: {
      wizard: {
        hazards: clean(w.hazards), controls: clean(w.controls), rescue_plan: (w.rescue_plan ?? '').trim(),
        receiver_name: (w.receiver_name ?? '').trim(), receiver_company: (w.receiver_company ?? '').trim(),
        isolations_required: !!w.isolations_required, gas_test_required: !!w.gas_test_required,
        fire_watch_required: !!w.fire_watch_required, other_ppe: unmapped,
      },
    },
  });

  const description = (w.description ?? '').trim();
  return {
    ok: true,
    data: {
      project_id: w.project_id,
      type,
      title: description.length > 80 ? `${description.slice(0, 77)}...` : description || 'Untitled permit',
      payload,
    },
  };
}
