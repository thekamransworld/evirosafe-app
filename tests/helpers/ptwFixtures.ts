// Shared by the rules-simulation and service tests: people, a seeded rules world, and payload fixtures.
import { Ts, World } from './rulesSim';
import { allRules } from './allRules';
import type { Sentinel } from '../../src/lib/ptw/writes';

export const MIN = 60_000, H = 3_600_000, DAY = 24 * H;

/** Every generated section (shared helpers, PTW, ACTIONS): the permit rules call the shared helpers. */
export const rules = { functions: allRules.functions, matches: allRules.matches };

// ─── people ───────────────────────────────────────────────────────────────

export const mk = (id: string, role: string, org = 'org1', projects: string[] = ['proj']) =>
  ({ uid: `uid-${id}`, id, name: `${id} name`, role, org, projects });
export const P = {
  creator: mk('creator', 'SUPERVISOR'),
  receiver: mk('receiver', 'WORKER'),
  reviewer: mk('rev', 'HSE_OFFICER'),
  approver: mk('app', 'HSE_MANAGER'),
  admin: mk('adm', 'ADMIN'),
  orgAdmin: mk('oadm', 'ORG_ADMIN'),
  worker: mk('w', 'WORKER'),
  viewer: mk('v', 'CLIENT_VIEWER'),
  outsider: mk('o', 'HSE_MANAGER', 'org2', ['proj']),
  otherProj: mk('op', 'HSE_OFFICER', 'org1', ['other']),
};
export type Person = (typeof P)[keyof typeof P];

export function newWorld(): World {
  const w = new World(rules.functions, rules.matches);
  for (const p of Object.values(P)) w.pointer(p.uid, { docId: p.id, org_id: p.org, role: p.role, project_ids: p.projects });
  return w;
}

// ─── fixtures ─────────────────────────────────────────────────────────────

export const T0 = Date.UTC(2026, 10, 14, 7, 0, 0); // 10:00 in Riyadh
export const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const hm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function payload(now: number, over: any = {}, hours = 5) {
  return {
    work: {
      location: 'Level 3 corridor', description: 'Replace damaged ceiling tiles', number_of_workers: 4,
      emergency_contact: '0500000000', risk_assessment_ref: 'RAMS-001',
      coverage: { start_date: ymd(now), start_time: hm(now), end_date: ymd(now + hours * H), end_time: hm(now + hours * H) },
      ...(over.work ?? {}),
    },
    safety_requirements: [{ id: 'c1', text: 'Area barricaded', response: 'Yes', is_critical: true }],
    ppe: { hard_hat: true, goggles: true, safety_gloves: true, safety_harness: true },
    fire_watcher: { name: 'Farid' }, post_watch_minutes: 30,
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'work')),
  };
}

export const resolver = (now: number) => (s: Sentinel) =>
  s.__sentinel === 'serverTimestamp' ? new Ts(now) : s.__sentinel === 'timestamp' ? new Ts((s as any).ms) : undefined;

