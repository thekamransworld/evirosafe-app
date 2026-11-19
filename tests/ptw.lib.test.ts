// Unit tests for the pure permit-to-work library (src/lib/ptw).
// Run with: npm run test:ptw
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIONS, FORWARD_ACTIONS, LEGACY_STATUS_MAP, OCCUPYING_STAGES, STAGES, STAGE_GROUPS,
  TYPE_RULES, normalizeStage, type ActionId, type Stage,
} from '../src/lib/ptw/model';
import {
  activationWindow, effectiveStatus, formatRemaining, parseLocal, remainingMs,
  requestedWindow, revalidationWindow,
} from '../src/lib/ptw/validity';
import { evaluateGasReading, gasTestStatus, parseTestTime } from '../src/lib/ptw/gas';
import { findConflicts, sameArea, windowsOverlap } from '../src/lib/ptw/simops';
import { checkCompetency } from '../src/lib/ptw/competency';
import { evaluateGates, hardBlocks, overridableBlocks, competencyNeeds } from '../src/lib/ptw/gates';
import { availableActions, checkActor, prepareTransition, type EnginePermit } from '../src/lib/ptw/engine';
import { counterDocId, formatPermitNo, parsePermitNo } from '../src/lib/ptw/numbering';
import { DELETE_FIELD, diffPayload, mergeThreeWay, planContentWrite } from '../src/lib/ptw/writes';
import { stripUndefined } from '../src/lib/ptw/clean';
import { planNotifications } from '../src/lib/ptw/notify';
import { blankChecklist, buildPermitPayload, defaultPpe, localDateTimeInput, splitLocalInput } from '../src/lib/ptw/payload';
import { WIZARD_TYPE_MAP, wizardToPermitData } from '../src/lib/ptw/payloadApp';
import { ptwChecklistData } from '../src/config/ptw-checklists';

// ─── fixtures ─────────────────────────────────────────────────────────────

const H = 3_600_000;
const NOW = new Date(2026, 10, 14, 10, 0, 0).getTime(); // 14 Nov 2026 10:00 local

const ymd = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const coverage = (start: number, end: number) => ({
  start_date: ymd(start), start_time: hm(start), end_date: ymd(end), end_time: hm(end),
});

const answered = [
  { id: 'c1', text: 'Area barricaded', response: 'Yes', is_critical: true },
  { id: 'c2', text: 'Housekeeping', response: 'N/A', is_critical: false },
];

function permit(over: Partial<EnginePermit> & { payload?: any } = {}): EnginePermit {
  const { payload, ...rest } = over;
  return {
    id: 'p1', project_id: 'proj', type: 'General Work', status: 'DRAFT', title: 'Replace ceiling tiles',
    creator_id: 'creator', receiver_id: 'receiver',
    payload: {
      work: {
        location: 'Level 3 corridor', description: 'Replace damaged ceiling tiles',
        coverage: coverage(NOW + H, NOW + 5 * H), number_of_workers: 4, emergency_contact: '0500000000',
        risk_assessment_ref: 'RAMS-001',
      },
      safety_requirements: answered,
      ppe: { hard_hat: true, goggles: true, safety_gloves: true, safety_harness: true },
      ...payload,
    },
    ...rest,
  };
}

const creator = { id: 'creator', name: 'Cathy Creator', role: 'SUPERVISOR' };
const reviewer = { id: 'rev', name: 'Rita Reviewer', role: 'HSE_OFFICER' };
const approver = { id: 'app', name: 'Ali Approver', role: 'HSE_MANAGER' };
const admin = { id: 'adm', name: 'Ada Admin', role: 'ADMIN' };
const viewer = { id: 'cv', name: 'Client Viewer', role: 'CLIENT_VIEWER' };

const noExternal = { others: [] as any[], competency: { records: [], courses: [] } };

// ─── model ────────────────────────────────────────────────────────────────

test('every stage is in exactly one list group', () => {
  const seen = Object.values(STAGE_GROUPS).flat() as Stage[];
  assert.equal(new Set(seen).size, seen.length, 'a stage appears in two groups');
  assert.deepEqual([...seen].sort(), [...STAGES].sort());
});

test('every action is wired to real stages and its id matches its key', () => {
  for (const [key, def] of Object.entries(ACTIONS)) {
    assert.equal(def.id, key);
    assert.ok(STAGES.includes(def.to), `${key}.to`);
    for (const f of def.from) assert.ok(STAGES.includes(f), `${key}.from ${f}`);
    assert.ok(def.roles.length > 0, `${key} has no roles`);
  }
  for (const [stage, ids] of Object.entries(FORWARD_ACTIONS)) {
    for (const id of ids!) assert.ok(ACTIONS[id].from.includes(stage as Stage), `${id} from ${stage}`);
  }
});

test('every legacy status maps to a real stage; unknown statuses do not', () => {
  for (const [legacy, stage] of Object.entries(LEGACY_STATUS_MAP)) {
    assert.ok(STAGES.includes(stage), legacy);
    assert.equal(normalizeStage(legacy), stage);
  }
  assert.equal(normalizeStage('PRE_SCREEN'), 'SITE_INSPECTION');
  assert.equal(normalizeStage('SUSPENDED'), 'HOLD');
  assert.equal(normalizeStage('COMPLETED'), 'COMPLETION_PENDING');
  assert.equal(normalizeStage('nonsense'), null);
  assert.equal(normalizeStage(undefined), null);
});

test('type rules match the agreed defaults', () => {
  assert.equal(TYPE_RULES['Hot Work'].maxHours, 8);
  assert.equal(TYPE_RULES['Confined Space Entry'].gasMaxAgeMin, 60);
  assert.equal(TYPE_RULES['General Work'].maxHours, 24);
  assert.equal(TYPE_RULES['Lifting'].risk, 'high');
});

// ─── numbering / clean ────────────────────────────────────────────────────

test('permit numbers round-trip and counters are per org per year', () => {
  assert.equal(formatPermitNo(2026, 7), 'PTW-2026-0007');
  assert.equal(formatPermitNo(2026, 12345), 'PTW-2026-12345');
  assert.deepEqual(parsePermitNo('PTW-2026-0007'), { year: 2026, n: 7 });
  assert.equal(parsePermitNo('PTW-26-7'), null);
  assert.equal(counterDocId('orgA', 2026), 'ptw_orgA_2026');
});

test('stripUndefined removes undefined deep but leaves class instances alone', () => {
  class Stamp { constructor(public v: number) {} }
  const stamp = new Stamp(1);
  const out: any = stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: [1, undefined, { f: undefined, g: 2 }] }, s: stamp });
  assert.deepEqual(out, { a: 1, c: { e: [1, { g: 2 }] }, s: stamp });
  assert.equal(out.s, stamp);
});

// ─── validity ─────────────────────────────────────────────────────────────

test('parseLocal accepts valid input and rejects impossible dates', () => {
  assert.equal(parseLocal('2026-11-14', '10:00'), NOW);
  assert.ok(Number.isNaN(parseLocal('2026-02-31', '10:00')));
  assert.ok(Number.isNaN(parseLocal('2026-11-14', '25:00')));
  assert.ok(Number.isNaN(parseLocal('', '10:00')));
});

test('requestedWindow is null when end is not after start', () => {
  assert.ok(requestedWindow(permit().payload));
  assert.equal(requestedWindow({ work: { coverage: coverage(NOW + 2 * H, NOW + H) } }), null);
  assert.equal(requestedWindow({}), null);
});

test('an ACTIVE permit past valid_until reads as EXPIRED; others are untouched', () => {
  const active = { status: 'ACTIVE', valid_until: new Date(NOW - 1000).toISOString() };
  assert.equal(effectiveStatus(active, NOW), 'EXPIRED');
  assert.equal(effectiveStatus({ status: 'ACTIVE', valid_until: new Date(NOW + H).toISOString() }, NOW), 'ACTIVE');
  assert.equal(effectiveStatus({ status: 'HOLD', valid_until: new Date(NOW - H).toISOString() }, NOW), 'HOLD');
  assert.equal(effectiveStatus({ status: 'SUSPENDED' }, NOW), 'HOLD'); // legacy
});

test('remaining time and its formatting', () => {
  const p = { status: 'ACTIVE', valid_until: new Date(NOW + 3 * H + 12 * 60_000).toISOString() };
  assert.equal(formatRemaining(remainingMs(p, NOW)), '3h 12m left');
  assert.equal(formatRemaining(45 * 60_000), '45m left');
  assert.equal(formatRemaining(-5 * 60_000), 'expired 5m ago');
  assert.equal(remainingMs({ status: 'HOLD', valid_until: p.valid_until }, NOW), null);
});

test('activation is capped by the type maximum or the requested end, whichever is earlier', () => {
  // Hot Work max 8 h; requested 12 h -> capped at 8 h
  const hot = permit({ type: 'Hot Work', payload: { work: { ...permit().payload.work, coverage: coverage(NOW, NOW + 12 * H) } } });
  const a = activationWindow(hot, NOW);
  assert.ok(a.ok === true && a.until === NOW + 8 * H && a.cappedByType);
  // General Work max 24 h; requested 4 h -> 4 h
  const gen = permit({ payload: { work: { ...permit().payload.work, coverage: coverage(NOW, NOW + 4 * H) } } });
  const b = activationWindow(gen, NOW);
  assert.ok(b.ok === true && b.until === NOW + 4 * H && !b.cappedByType);
  // requested end already past
  const past = permit({ payload: { work: { ...permit().payload.work, coverage: coverage(NOW - 5 * H, NOW - H) } } });
  assert.equal(activationWindow(past, NOW).ok, false);
});

test('revalidation: type max from now, 7 day hard stop, none after expiry', () => {
  const first = NOW - 2 * H;
  const base = { type: 'Hot Work', first_activated_at: new Date(first).toISOString(), valid_from: new Date(first).toISOString() };
  const ok = revalidationWindow({ ...base, valid_until: new Date(NOW + H).toISOString() }, NOW);
  assert.ok(ok.ok === true && ok.until === NOW + 8 * H);
  // near the 7-day limit
  const old = NOW - (7 * 24 - 3) * H;
  const near = revalidationWindow({ type: 'Hot Work', first_activated_at: new Date(old).toISOString(), valid_until: new Date(NOW + H).toISOString() }, NOW);
  assert.ok(near.ok === true && near.until === old + 7 * 24 * H);
  // expired
  assert.equal(revalidationWindow({ ...base, valid_until: new Date(NOW - 1).toISOString() }, NOW).ok, false);
  // past 7 days
  const dead = NOW - 8 * 24 * H;
  assert.equal(revalidationWindow({ type: 'Hot Work', first_activated_at: new Date(dead).toISOString(), valid_until: new Date(NOW + H).toISOString() }, NOW).ok, false);
});

// ─── gas ──────────────────────────────────────────────────────────────────

test('gas limits: boundaries pass, just outside fails, every failure is named', () => {
  assert.ok(evaluateGasReading({ o2: 19.5, lel: 10, co: 25, h2s: 10 }).pass);
  assert.ok(evaluateGasReading({ o2: 23.5, lel: 0, co: 0, h2s: 0 }).pass);
  const bad = evaluateGasReading({ o2: 18, lel: 11, co: 26, h2s: 11 });
  assert.equal(bad.pass, false);
  assert.equal(bad.failures.length, 4);
  assert.equal(evaluateGasReading({ o2: 20.9, lel: '', co: 0, h2s: 0 }).pass, false);
});

test('test times: HH:mm, ISO, and midnight roll-over', () => {
  const t = new Date(2026, 10, 14, 0, 10).getTime();
  assert.equal(parseTestTime('23:50', t), new Date(2026, 10, 13, 23, 50).getTime());
  assert.equal(parseTestTime('00:05', t), new Date(2026, 10, 14, 0, 5).getTime());
  assert.equal(parseTestTime(new Date(NOW - H).toISOString(), NOW), NOW - H);
  assert.equal(parseTestTime('99:99', NOW), null);
  assert.equal(parseTestTime('', NOW), null);
});

test('gas status: latest complete test decides; incomplete rows are ignored', () => {
  const good = (mins: number) => ({ time: hm(NOW - mins * 60_000), o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: 'Tariq' });
  assert.equal(gasTestStatus([], NOW, 60).status, 'none');
  assert.equal(gasTestStatus([good(10)], NOW, 60).status, 'pass');
  assert.equal(gasTestStatus([good(90)], NOW, 60).status, 'stale');
  // a half-typed newer row must not hide, or replace, the real latest test
  const half = { time: hm(NOW - 1000), o2: '', lel: '', co: '', h2s: '', tester_name: '' };
  assert.equal(gasTestStatus([good(30), half], NOW, 60).status, 'pass');
  assert.equal(gasTestStatus([half], NOW, 60).status, 'none');
  // an older pass cannot mask a newer failing test
  const fail = { ...good(5), o2: 17 };
  assert.equal(gasTestStatus([good(40), fail], NOW, 60).status, 'fail');
  // a row with no tester name is not accountable, so it does not count
  assert.equal(gasTestStatus([{ ...good(5), tester_name: '' }], NOW, 60).status, 'none');
});

// ─── SIMOPS ───────────────────────────────────────────────────────────────

test('sameArea: exact, contains, token overlap; empty never matches', () => {
  assert.ok(sameArea('Level 3 Corridor', 'level 3 corridor'));
  assert.ok(sameArea('Level 3', 'Level 3 corridor east'));
  assert.ok(sameArea('Plant room A level 2', 'level 2 plant room'));
  assert.ok(!sameArea('Level 3 corridor', 'Basement car park'));
  assert.ok(!sameArea('', 'Level 3'));
  assert.ok(!sameArea('', ''));
  assert.ok(!sameArea(undefined, 'x'));
  assert.ok(!sameArea('ab', 'abc')); // too short to be a containment match
});

test('windowsOverlap catches enclosure, partial overlap, and touching-but-not', () => {
  assert.ok(windowsOverlap({ start: 0, end: 10 }, { start: 3, end: 5 }));   // enclosing
  assert.ok(windowsOverlap({ start: 3, end: 5 }, { start: 0, end: 10 }));   // enclosed
  assert.ok(windowsOverlap({ start: 0, end: 5 }, { start: 4, end: 9 }));
  assert.ok(!windowsOverlap({ start: 0, end: 5 }, { start: 5, end: 9 }));
});

function active(over: Partial<EnginePermit> & { payload?: any }): EnginePermit {
  return permit({
    id: 'other', status: 'ACTIVE', valid_from: new Date(NOW - H).toISOString(), valid_until: new Date(NOW + 4 * H).toISOString(),
    ...over,
  });
}

test('SIMOPS: blocking pair in the same area at the same time blocks; other pairs only warn', () => {
  const mine = permit({ type: 'Hot Work' });
  const confined = active({ type: 'Confined Space Entry' });
  const c1 = findConflicts(mine, [confined], NOW);
  assert.equal(c1.length, 1);
  assert.equal(c1[0].severity, 'block');
  const general = active({ type: 'General Work' });
  assert.equal(findConflicts(mine, [general], NOW)[0].severity, 'warn');
});

test('SIMOPS ignores other projects, other areas, non-occupying stages, and non-overlapping times', () => {
  const mine = permit({ type: 'Hot Work' });
  assert.equal(findConflicts(mine, [active({ type: 'Confined Space Entry', project_id: 'other-proj' })], NOW).length, 0);
  assert.equal(findConflicts(mine, [active({ type: 'Confined Space Entry', payload: { work: { location: 'Roof', description: 'x', coverage: coverage(NOW - H, NOW + 4 * H) } } })], NOW).length, 0);
  assert.equal(findConflicts(mine, [active({ type: 'Confined Space Entry', status: 'DRAFT' })], NOW).length, 0);
  assert.equal(findConflicts(mine, [active({ type: 'Confined Space Entry', status: 'CLOSED' })], NOW).length, 0);
  const later = permit({ type: 'Hot Work', payload: { work: { ...permit().payload.work, coverage: coverage(NOW + 10 * H, NOW + 14 * H) } } });
  assert.equal(findConflicts(later, [active({ type: 'Confined Space Entry' })], NOW).length, 0);
});

test('SIMOPS: an empty location never conflicts with anything', () => {
  const noLoc = permit({ type: 'Hot Work', payload: { work: { ...permit().payload.work, location: '' } } });
  assert.equal(findConflicts(noLoc, [active({ type: 'Confined Space Entry' })], NOW).length, 0);
});

test('SIMOPS: a permit that has run past its window still occupies the area until closed', () => {
  const overdue = active({ type: 'Confined Space Entry', valid_from: new Date(NOW - 9 * H).toISOString(), valid_until: new Date(NOW - H).toISOString() });
  // my window starts in an hour, but the expired permit has not been closed
  assert.equal(findConflicts(permit({ type: 'Hot Work' }), [overdue], NOW).length, 1);
  // once it is closed the area is free
  assert.equal(findConflicts(permit({ type: 'Hot Work' }), [{ ...overdue, status: 'CLOSED' }], NOW).length, 0);
  // waiting for closure also holds the area, even with time left on the clock
  const pending = active({ type: 'Confined Space Entry', status: 'COMPLETION_PENDING' });
  assert.equal(findConflicts(permit({ type: 'Hot Work', payload: { work: { ...permit().payload.work, coverage: coverage(NOW + 6 * H, NOW + 9 * H) } } }), [pending], NOW).length, 1);
});

// ─── competency ───────────────────────────────────────────────────────────

const courses = [{ id: 'c-hot', title: 'Hot Work Safety', competencies: ['HOT_WORK'] }, { id: 'c-misc', title: 'Misc', competencies: [] as string[] }];
const rec = (over: any = {}) => ({ user_id: 'u1', course_id: 'c-hot', expires_at: new Date(NOW + 200 * 24 * H).toISOString(), revoked_at: undefined, ...over });

test('competency: ok / missing / no_course / unverified', () => {
  const ctx = { courses, records: [rec()] };
  assert.equal(checkCompetency('u1', 'HOT_WORK', ctx, NOW).status, 'ok');
  assert.equal(checkCompetency('u2', 'HOT_WORK', ctx, NOW).status, 'missing');
  assert.equal(checkCompetency('u1', 'LOTO', ctx, NOW).status, 'no_course');
  assert.equal(checkCompetency(undefined, 'HOT_WORK', ctx, NOW).status, 'unverified');
});

test('competency: expired and revoked certificates do not count; expiring ones do', () => {
  const expired = { courses, records: [rec({ expires_at: new Date(NOW - 5 * 24 * H).toISOString() })] };
  assert.equal(checkCompetency('u1', 'HOT_WORK', expired, NOW).status, 'missing');
  const revoked = { courses, records: [rec({ revoked_at: new Date(NOW - H).toISOString() })] };
  assert.equal(checkCompetency('u1', 'HOT_WORK', revoked, NOW).status, 'missing');
  const expiring = { courses, records: [rec({ expires_at: new Date(NOW + 5 * 24 * H).toISOString() })] };
  assert.equal(checkCompetency('u1', 'HOT_WORK', expiring, NOW).status, 'ok');
});

// ─── gates ────────────────────────────────────────────────────────────────

const gate = (group: any, p: EnginePermit, extra: any = {}) => evaluateGates(group, { permit: p, now: NOW, ...noExternal, ...extra });
const ids = (r: any[], level: string) => r.filter(x => x.level === level).map(x => x.id);

test('submit gate: a complete permit has no blocks', () => {
  assert.deepEqual(ids(gate('submit', permit()), 'block'), []);
});

test('submit gate: blank permit is blocked on details and window', () => {
  const blank = permit({ title: '', payload: { work: { location: '', description: '', coverage: {} }, safety_requirements: [] } });
  const blocks = ids(gate('submit', blank), 'block');
  assert.ok(blocks.includes('fields') && blocks.includes('window') && blocks.includes('checklist'));
});

test('checklist: unanswered blocks; "No" on a critical item blocks; "No" on a normal item only warns', () => {
  const un = permit({ payload: { safety_requirements: [{ id: 'a', text: 'x', response: '', is_critical: false }] } });
  assert.ok(ids(gate('submit', un), 'block').includes('checklist.unanswered'));
  const crit = permit({ payload: { safety_requirements: [{ id: 'a', text: 'Isolation done', response: 'No', is_critical: true }] } });
  assert.ok(ids(gate('submit', crit), 'block').includes('checklist.critical'));
  const norm = permit({ payload: { safety_requirements: [{ id: 'a', text: 'Tidy', response: 'No', is_critical: false }] } });
  assert.deepEqual(ids(gate('submit', norm), 'block'), []);
  assert.ok(ids(gate('submit', norm), 'warn').includes('checklist.no'));
});

test('RAMS reference is required for risk-assessed types, not General Work', () => {
  const noRams = (type: any) => permit({ type, payload: { work: { ...permit().payload.work, risk_assessment_ref: '' }, ppe: { hard_hat: true, goggles: true, safety_gloves: true, safety_harness: true }, fire_watcher: { name: 'F' }, post_watch_minutes: 30, isolation: [{ id: '1', point: 'x', method: 'LOTO' }] } });
  assert.ok(ids(gate('submit', noRams('Electrical Work')), 'block').includes('rams'));
  assert.ok(!ids(gate('submit', noRams('General Work')), 'block').includes('rams'));
});

test('hot work: fire watcher and a post-watch of at least 30 minutes', () => {
  const hw = (pw: any, name = 'Farid') => permit({ type: 'Hot Work', payload: { fire_watcher: { name }, post_watch_minutes: pw } });
  assert.deepEqual(ids(gate('submit', hw(30)), 'block'), []);
  assert.ok(ids(gate('submit', hw(29)), 'block').includes('postwatch'));
  assert.ok(ids(gate('submit', hw(30, '')), 'block').includes('firewatch'));
});

test('hot work: required PPE (goggles and gloves) must be ticked', () => {
  const p = permit({ type: 'Hot Work', payload: { fire_watcher: { name: 'F' }, post_watch_minutes: 30, ppe: { goggles: true, safety_gloves: false } } });
  assert.ok(ids(gate('submit', p), 'block').includes('ppe'));
});

test('lifting: documents required; utilisation is RECOMPUTED, above 100 blocks, above 85 warns', () => {
  const lift = (load: number | undefined, docs = true, extra: any = {}) => permit({ type: 'Lifting', payload: { load_calculation: { hook_rigging_weight: 0, load_weight: load, crane_capacity_at_radius: 100, utilization_percent: 0, lift_plan_ref: docs ? 'LP-1' : '', crane_certification_no: docs ? 'C-1' : '', operator_certification_no: docs ? 'O-1' : '', ...extra } } });
  assert.deepEqual(ids(gate('submit', lift(60)), 'block'), []);
  assert.ok(ids(gate('submit', lift(90)), 'warn').includes('lift.util'));
  assert.ok(ids(gate('submit', lift(101)), 'block').includes('lift.util'));
  assert.ok(ids(gate('submit', lift(60, false)), 'block').includes('lift.docs'));
  assert.ok(ids(gate('submit', lift(undefined)), 'block').includes('lift.util'), 'no weight, no calculation');
  // a stored percentage is never believed: 150 t on a 100 t crane is refused however the saved value reads
  assert.ok(ids(gate('submit', lift(150, true, { utilization_percent: 10 })), 'block').includes('lift.util'));
  assert.ok(ids(gate('submit', lift(150, true, { utilization_percent: 0 })), 'block').includes('lift.util'));
  // the old "all zeros" payload the previous creation form produced does not pass
  assert.ok(ids(gate('submit', permit({ type: 'Lifting', payload: { load_calculation: { load_weight: 0, crane_capacity: 0, utilization_percent: 0, lift_plan_ref: 'L', crane_certification_no: 'C', operator_certification_no: 'O' } } })), 'block').includes('lift.util'));
  // hook and rigging weight count towards the load
  assert.ok(ids(gate('submit', lift(60, true, { hook_rigging_weight: 45 })), 'block').includes('lift.util'));
});

test('activation: isolation must be applied AND verified; gas must be fresh and passing', () => {
  const cs = (iso: any[], gas: any[]) => permit({ type: 'Confined Space Entry', status: 'SITE_HANDOVER', payload: { isolation: iso, gas_tests: gas, team: [] } });
  const done = { id: '1', point: 'V-1', method: 'Blank', applied_by: 'A', applied_at: 'x', verified_by: 'B', verified_at: 'x' };
  const goodGas = [{ time: hm(NOW - 10 * 60_000), o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: 'T' }];
  assert.deepEqual(ids(gate('activate', cs([done], goodGas)), 'block'), []);
  assert.ok(ids(gate('activate', cs([{ ...done, verified_by: '' }], goodGas)), 'block').includes('isolation.verified'));
  assert.ok(ids(gate('activate', cs([{ ...done, applied_by: '' }], goodGas)), 'block').includes('isolation.applied'));
  assert.ok(ids(gate('activate', cs([done], [])), 'block').includes('gas'));
  assert.ok(ids(gate('activate', cs([done], [{ ...goodGas[0], time: hm(NOW - 120 * 60_000) }])), 'block').includes('gas'));
  assert.ok(ids(gate('activate', cs([done], [{ ...goodGas[0], o2: 17 }])), 'block').includes('gas'));
  assert.ok(ids(gate('activate', cs([{ ...done, verified_by: 'a' }], goodGas)), 'warn').includes('isolation.same'));
});

test('completion and close: nobody inside, isolation removed, joint inspection recorded', () => {
  const p = (over: any) => permit({ type: 'Confined Space Entry', status: 'COMPLETION_PENDING', payload: over });
  assert.ok(ids(gate('completion', p({ entry_log: [{ name: 'Sami', time_in: '09:00', time_out: '' }] })), 'block').includes('inside'));
  assert.deepEqual(ids(gate('completion', p({ entry_log: [{ name: 'Sami', time_in: '09:00', time_out: '10:00' }] })), 'block'), []);
  const closeBlocks = ids(gate('close', p({ isolation: [{ id: '1', point: 'v', method: 'm' }] })), 'block');
  assert.ok(closeBlocks.includes('isolation.removed') && closeBlocks.includes('joint.remarks') && closeBlocks.includes('joint.requester'));
  const closed = p({ isolation: [{ id: '1', point: 'v', method: 'm', removed_by: 'A', removed_at: 'x' }], joint_inspection: { remarks: 'All clear', requester: { signature: 'Cathy', signed_at: 'x' } } });
  assert.deepEqual(ids(gate('close', closed), 'block'), []);
});

test('competency gate: a missing certificate blocks but is overridable; unverifiable people only warn', () => {
  const p = permit({ type: 'Hot Work', payload: { fire_watcher: { name: 'F' }, post_watch_minutes: 30, team: [
    { id: 't1', name: 'Wasim', role: 'worker', user_id: 'u2' },
    { id: 't2', name: 'Contractor Joe', role: 'worker' },
  ] } });
  const r = gate('approve', p, { competency: { courses, records: [rec()] } });
  assert.equal(overridableBlocks(r).length, 1);
  assert.equal(hardBlocks(r).length, 0);
  assert.ok(ids(r, 'warn').includes('competency.unverified'));
  // no training data at all -> warn, never block
  const r2 = gate('approve', p, { competency: undefined });
  assert.ok(ids(r2, 'warn').includes('competency.unavailable'));
  assert.equal(ids(r2, 'block').length, 0);
});

test('competency needs: role-specific keys are added', () => {
  const p = permit({ type: 'Hot Work', payload: { fire_watcher: { name: 'Fouad' }, team: [{ id: '1', name: 'G', role: 'gas_tester' }, { id: '2', name: 'W', role: 'worker' }] } });
  const needs = competencyNeeds(p);
  assert.deepEqual(needs.find(n => n.name === 'G')!.keys, ['GAS_TESTING']);
  assert.deepEqual(needs.find(n => n.name === 'W')!.keys, ['HOT_WORK']);
  assert.deepEqual(needs.find(n => n.name === 'Fouad')!.keys, ['FIRE_WATCH']);
});

test('SIMOPS gate: a blocking conflict is an overridable block', () => {
  const r = gate('approve', permit({ type: 'Hot Work', payload: { fire_watcher: { name: 'F' }, post_watch_minutes: 30 } }), { others: [active({ type: 'Confined Space Entry' })] });
  assert.equal(overridableBlocks(r).length, 1);
});

// ─── actors ───────────────────────────────────────────────────────────────

test('actor rules: roles, requester and segregation of duties', () => {
  const p = permit({ status: 'SUBMITTED' });
  assert.equal(checkActor(ACTIONS.prescreen_pass, p, reviewer).ok, true);
  assert.equal(checkActor(ACTIONS.prescreen_pass, p, creator).ok, false);                           // creator may not review own permit
  assert.equal(checkActor(ACTIONS.prescreen_pass, p, { id: 'w', name: 'W', role: 'WORKER' }).ok, false); // role
  assert.equal(checkActor(ACTIONS.submit, permit(), creator).ok, true);
  assert.equal(checkActor(ACTIONS.submit, permit(), reviewer).ok, false);                           // not the requester
  assert.equal(checkActor(ACTIONS.stop_work, permit({ status: 'ACTIVE' }), { id: 'w', name: 'W', role: 'WORKER' }).ok, true); // anyone may stop work
  assert.equal(checkActor(ACTIONS.stop_work, permit({ status: 'ACTIVE' }), viewer).ok, false);       // viewers may not
  assert.equal(checkActor(ACTIONS.approve, permit({ status: 'APPROVAL' }), reviewer).ok, false);     // not an approver role
  assert.equal(checkActor(ACTIONS.approve, permit({ status: 'APPROVAL' }), approver).ok, true);
});

test('segregation override: only ADMIN / ORG_ADMIN, only with a written justification, and it is flagged', () => {
  const own = permit({ status: 'APPROVAL', creator_id: 'adm' });
  const noWords = checkActor(ACTIONS.approve, own, admin);
  assert.ok(noWords.ok === false && noWords.overridable === true);
  const withWords = checkActor(ACTIONS.approve, own, admin, 'Sole administrator on site; urgent MEP shutdown');
  assert.ok(withWords.ok === true && withWords.override === true);
  const hseOwn = permit({ status: 'APPROVAL', creator_id: 'app' });
  const hse = checkActor(ACTIONS.approve, hseOwn, approver, 'Please let me approve my own permit');
  assert.ok(hse.ok === false && !hse.overridable); // approver role is not an overrider
});

// ─── transitions (the bugs the audit found) ───────────────────────────────

const go = (p: EnginePermit, action: ActionId, actor: any, extra: any = {}) =>
  prepareTransition({ permit: p, action, actor, now: NOW, gateInputs: noExternal, ...extra });

test('REJECT rejects; it does not advance the permit', () => {
  const r = go(permit({ status: 'SUBMITTED' }), 'reject', reviewer, { note: 'Wrong location on the form' });
  assert.ok(r.ok === true && r.to === 'REJECTED' && r.patch.status === 'REJECTED');
});

test('CANCEL on a held permit cancels it; it does not reactivate it', () => {
  const r = go(permit({ status: 'HOLD' }), 'cancel', reviewer, { note: 'Scope withdrawn by client' });
  assert.ok(r.ok === true && r.to === 'CANCELLED');
});

test('every action lands on exactly the stage the table says (no more "first allowed transition")', () => {
  const sample: Array<[Stage, ActionId, any]> = [
    ['SUBMITTED', 'send_back', reviewer], ['SITE_INSPECTION', 'reject', reviewer], ['APPROVAL', 'send_back', reviewer],
    ['HOLD', 'request_completion', creator], ['ACTIVE', 'cancel', reviewer], ['COMPLETION_PENDING', 'inspection_fail', reviewer],
    ['DRAFT', 'withdraw', creator], ['CLOSED', 'archive', approver],
  ];
  for (const [stage, action, actor] of sample) {
    const r = go(permit({ status: stage, valid_until: new Date(NOW + H).toISOString() }), action, actor, { note: 'reason given here', justification: '', gateInputs: noExternal });
    if (r.ok === false) { assert.fail(`${action} from ${stage}: ${r.reason}`); }
    assert.equal(r.to, ACTIONS[action].to, `${action} from ${stage}`);
  }
});

test('actions are refused from the wrong stage', () => {
  const r = go(permit({ status: 'DRAFT' }), 'approve', approver, { reauthenticated: true });
  assert.ok(r.ok === false && /not available/i.test(r.reason));
  const legacyNone = go(permit({ status: 'MYSTERY' }), 'submit', creator);
  assert.ok(legacyNone.ok === false && /unrecognised/.test(legacyNone.reason));
});

test('legacy statuses are progressed through their mapped stage', () => {
  const r = go(permit({ status: 'PENDING_APPROVAL' }), 'approve', approver, { reauthenticated: true });
  assert.ok(r.ok === true && r.from === 'APPROVAL' && r.to === 'SITE_HANDOVER');
});

test('submit: gate failures stop it; a complete permit goes through with a signature', () => {
  const bad = go(permit({ payload: { safety_requirements: [] } }), 'submit', creator);
  assert.ok(bad.ok === false);
  const good = go(permit(), 'submit', creator);
  assert.ok(good.ok === true);
  if (good.ok === true) {
    assert.equal(good.log.action, 'submit');
    assert.equal(good.log.user_id, 'creator');
    assert.equal((good.patch['signatures.requester'] as any).user_id, 'creator');
  }
});

test('reasons are mandatory where the table says so', () => {
  assert.ok(go(permit({ status: 'ACTIVE' }), 'stop_work', creator, { note: '' }).ok === false);
  assert.ok(go(permit({ status: 'ACTIVE' }), 'stop_work', creator, { note: 'ab' }).ok === false);
  assert.ok(go(permit({ status: 'SUBMITTED' }), 'reject', reviewer, { note: '' }).ok === false);
});

test('re-authentication is demanded for approve, handover, revalidate and close', () => {
  for (const [stage, action, actor] of [['APPROVAL', 'approve', approver], ['SITE_HANDOVER', 'accept_handover', creator], ['COMPLETION_PENDING', 'close', reviewer]] as const) {
    const p = permit({ status: stage, payload: { joint_inspection: { remarks: 'ok', requester: { signature: 'C' } } } });
    const r = go(p, action, actor);
    assert.ok(r.ok === false && /password/i.test(r.reason), `${action}: ${r.ok === false ? r.reason : 'allowed'}`);
  }
});

test('handover grants validity capped by type; it is written for the server twins to mirror', () => {
  const p = permit({ type: 'Hot Work', status: 'SITE_HANDOVER', payload: { work: { ...permit().payload.work, coverage: coverage(NOW, NOW + 12 * H) }, fire_watcher: { name: 'F' }, post_watch_minutes: 30 } });
  const r = go(p, 'accept_handover', creator, { reauthenticated: true });
  assert.ok(r.ok === true);
  if (r.ok === true) {
    assert.equal(r.patch.valid_from, new Date(NOW).toISOString());
    assert.equal(r.patch.valid_until, new Date(NOW + 8 * H).toISOString());
    assert.equal(r.patch.first_activated_at, new Date(NOW).toISOString());
    assert.equal(r.validity!.until, NOW + 8 * H);
  }
});

test('stop work records a stoppage; resume closes it and does NOT extend validity', () => {
  const until = new Date(NOW + 2 * H).toISOString();
  const active_ = permit({ status: 'ACTIVE', valid_from: new Date(NOW - H).toISOString(), valid_until: until, first_activated_at: new Date(NOW - H).toISOString() });
  const stop = go(active_, 'stop_work', { id: 'w', name: 'Wasim', role: 'WORKER' }, { note: 'Gas smell reported' });
  assert.ok(stop.ok === true && stop.to === 'HOLD');
  if (stop.ok === true) {
    const rows: any[] = stop.patch['payload.holding_or_stoppage'] as any[];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reason, 'Gas smell reported');
    assert.equal(rows[0].restarted_time, '');
    const held = permit({ status: 'HOLD', valid_until: until, valid_from: active_.valid_from, first_activated_at: active_.first_activated_at, payload: { holding_or_stoppage: rows } });
    const resume = go(held, 'resume', reviewer, { note: 'Source found and fixed' });
    assert.ok(resume.ok === true && resume.to === 'ACTIVE');
    if (resume.ok === true) {
      assert.equal('valid_until' in resume.patch, false);                              // validity untouched
      assert.ok((resume.patch['payload.holding_or_stoppage'] as any[])[0].restarted_time);
    }
  }
});

test('a permit that expired while on hold cannot be resumed', () => {
  const held = permit({ status: 'HOLD', valid_until: new Date(NOW - 1000).toISOString(), valid_from: new Date(NOW - 5 * H).toISOString() });
  const r = go(held, 'resume', reviewer, { note: 'Trying to resume' });
  assert.ok(r.ok === false && /expired/i.test(r.reason));
});

test('revalidate appends an extension with who, why and the new end time', () => {
  const first = new Date(NOW - 3 * H).toISOString();
  const p = permit({ type: 'Hot Work', status: 'ACTIVE', first_activated_at: first, valid_from: first, valid_until: new Date(NOW + H).toISOString(), extensions: [], payload: { fire_watcher: { name: 'F' } } });
  const r = go(p, 'revalidate', reviewer, { note: 'Work running over; area re-checked', reauthenticated: true });
  assert.ok(r.ok === true);
  if (r.ok === true) {
    const ext = (r.patch.extensions as any[]);
    assert.equal(ext.length, 1);
    assert.equal(ext[0].by_id, 'rev');
    assert.equal(ext[0].reason, 'Work running over; area re-checked');
    assert.equal(r.patch.valid_until, new Date(NOW + 8 * H).toISOString());
  }
});

test('expire works only after valid_until', () => {
  const early = permit({ status: 'ACTIVE', valid_until: new Date(NOW + H).toISOString() });
  assert.ok(go(early, 'expire', creator).ok === false);
  const late = permit({ status: 'ACTIVE', valid_until: new Date(NOW - 1000).toISOString() });
  const r = go(late, 'expire', creator);
  assert.ok(r.ok === true && r.to === 'EXPIRED');
});

test('an expired-but-not-yet-marked permit: can complete or be cancelled, cannot stop work or revalidate', () => {
  const late = permit({ status: 'ACTIVE', valid_until: new Date(NOW - 1000).toISOString(), valid_from: new Date(NOW - 9 * H).toISOString(), first_activated_at: new Date(NOW - 9 * H).toISOString() });
  assert.ok(go(late, 'request_completion', creator).ok === true);
  assert.ok(go(late, 'cancel', reviewer, { note: 'No longer needed' }).ok === true);
  assert.ok(go(late, 'stop_work', creator, { note: 'Stopping now' }).ok === false);
  assert.ok(go(late, 'revalidate', reviewer, { note: 'Extend it please', reauthenticated: true }).ok === false);
});

test('send back clears earlier sign-offs and returns to DRAFT', () => {
  const r = go(permit({ status: 'APPROVAL', signatures: { prescreen: {} } } as any), 'send_back', approver, { note: 'Add RAMS reference' });
  assert.ok(r.ok === true && r.to === 'DRAFT' && JSON.stringify(r.patch.signatures) === '{}');
});

test('approving your own permit is refused, then allowed for an admin with written justification (flagged)', () => {
  const own = permit({ status: 'APPROVAL', creator_id: 'adm' });
  assert.ok(go(own, 'approve', admin, { reauthenticated: true }).ok === false);
  const r = go(own, 'approve', admin, { reauthenticated: true, justification: 'Sole admin on site, urgent shutdown work' });
  assert.ok(r.ok === true && r.override === true);
  if (r.ok === true) { assert.equal(r.log.override, true); assert.match(r.log.justification!, /Sole admin/); }
});

test('a competency block needs an approver and a written justification; the override is logged with the items', () => {
  const p = permit({ type: 'Hot Work', status: 'APPROVAL', payload: { fire_watcher: { name: 'F' }, post_watch_minutes: 30, team: [{ id: 't', name: 'Wasim', role: 'worker', user_id: 'u2' }] } });
  const gi = { others: [], competency: { courses, records: [rec()] } };
  const plain = go(p, 'approve', approver, { reauthenticated: true, gateInputs: gi });
  assert.ok(plain.ok === false && /justification/i.test(plain.reason));
  const ok = go(p, 'approve', approver, { reauthenticated: true, gateInputs: gi, justification: 'Certificate renewal in progress, verified on site' });
  assert.ok(ok.ok === true && ok.override === true);
  if (ok.ok === true) assert.ok(ok.log.override_items!.some(i => i.startsWith('competency.')));
});

test('hard gate blocks cannot be overridden by anyone', () => {
  const p = permit({ status: 'APPROVAL', payload: { safety_requirements: [{ id: 'a', text: 'x', response: 'No', is_critical: true }] } });
  const r = go(p, 'approve', approver, { reauthenticated: true, justification: 'Please just let it through thanks' });
  assert.ok(r.ok === false);
});

test('inspection failure puts the permit on hold with an open stoppage', () => {
  const r = go(permit({ status: 'COMPLETION_PENDING' }), 'inspection_fail', reviewer, { note: 'Debris left in duct' });
  assert.ok(r.ok === true && r.to === 'HOLD');
  if (r.ok === true) assert.match((r.patch['payload.holding_or_stoppage'] as any[])[0].reason, /Debris left/);
});

test('availableActions: shows what applies, with a reason for each disabled option', () => {
  const sub = permit({ status: 'SUBMITTED' });
  const mine = availableActions(sub, creator, NOW);
  const byId = Object.fromEntries(mine.map(o => [o.def.id, o]));
  assert.equal(byId.prescreen_pass.enabled, false);
  assert.match(byId.prescreen_pass.reason!, /segregation/);
  assert.equal(byId.withdraw.enabled, true);
  const theirs = availableActions(sub, reviewer, NOW);
  assert.equal(theirs.find(o => o.def.id === 'prescreen_pass')!.enabled, true);
  assert.equal(theirs.find(o => o.def.id === 'withdraw')!.enabled, false);
  assert.ok(!theirs.some(o => o.def.id === 'expire')); // automatic: never a button
});

test('availableActions: a viewer can do nothing; gate blocks disable the button with the reason', () => {
  assert.ok(availableActions(permit({ status: 'ACTIVE' }), viewer, NOW).every(o => !o.enabled));
  const bad = permit({ payload: { safety_requirements: [] } });
  const sub = availableActions(bad, creator, NOW, noExternal).find(o => o.def.id === 'submit')!;
  assert.equal(sub.enabled, false);
  assert.match(sub.reason!, /checklist/i);
});

test('exhaustive: every action x every stage agrees with the table', () => {
  const actors = [creator, reviewer, approver, admin, viewer, { id: 'w', name: 'W', role: 'WORKER' }];
  for (const stage of STAGES) {
    for (const actor of actors) {
      const p = permit({ status: stage, valid_until: new Date(NOW + H).toISOString(), valid_from: new Date(NOW - H).toISOString(), first_activated_at: new Date(NOW - H).toISOString() });
      for (const def of Object.values(ACTIONS)) {
        const r = prepareTransition({ permit: p, action: def.id, actor, now: NOW, note: 'a long enough reason', justification: '', reauthenticated: true, gateInputs: noExternal });
        if (r.ok === true) {
          assert.ok(def.from.includes(stage), `${def.id} allowed from ${stage}`);
          assert.ok((def.roles as readonly string[]).includes(actor.role), `${def.id} allowed for ${actor.role}`);
          assert.equal(r.to, def.to);
        }
      }
    }
  }
  assert.ok(OCCUPYING_STAGES.every(s => STAGES.includes(s)));
});

// ─── notifications ────────────────────────────────────────────────────────

const orgUsers = [
  { id: 'creator', org_id: 'org', role: 'SUPERVISOR', project_ids: ['proj'], status: 'active' },
  { id: 'receiver', org_id: 'org', role: 'WORKER', project_ids: ['proj'], status: 'active' },
  { id: 'rev', org_id: 'org', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'active' },
  { id: 'rev2', org_id: 'org', role: 'INSPECTOR', project_ids: ['proj'], status: 'active' },
  { id: 'rev-other-project', org_id: 'org', role: 'HSE_OFFICER', project_ids: ['elsewhere'], status: 'active' },
  { id: 'rev-invited', org_id: 'org', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'invited' },
  { id: 'app', org_id: 'org', role: 'HSE_MANAGER', project_ids: ['proj'], status: 'active' },
  { id: 'orgadmin', org_id: 'org', role: 'ORG_ADMIN', project_ids: [], status: 'active' },
  { id: 'stranger', org_id: 'other-org', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'active' },
  { id: 'viewer', org_id: 'org', role: 'CLIENT_VIEWER', project_ids: ['proj'], status: 'active' },
];
const nPermit = { org_id: 'org', project_id: 'proj', type: 'Hot Work', title: 'Cut pipe', permit_no: 'PTW-2026-0007', creator_id: 'creator', receiver_id: 'receiver' };
const who = (to: Stage, action: ActionId, actor = 'creator', note?: string) => planNotifications(nPermit, action, to, actor, orgUsers, note).map(n => n.user_id).sort();

test('notifications: submitted permits go to reviewers on that project, not to the people who raised it', () => {
  assert.deepEqual(who('SUBMITTED', 'submit'), ['app', 'orgadmin', 'rev', 'rev2']);
});

test('notifications: nobody outside the organisation, outside the project, not yet active, or read-only is told', () => {
  const all = who('SUBMITTED', 'submit');
  for (const bad of ['stranger', 'rev-other-project', 'rev-invited', 'viewer']) assert.ok(!all.includes(bad), bad);
});

test('notifications: approval goes to approvers; handover and outcomes go to the requester and receiver', () => {
  assert.deepEqual(who('APPROVAL', 'site_inspection_pass', 'rev'), ['app', 'orgadmin']);
  assert.deepEqual(who('SITE_HANDOVER', 'approve', 'app'), ['creator', 'receiver']);
  assert.deepEqual(who('REJECTED', 'reject', 'rev'), ['creator', 'receiver']);
  assert.deepEqual(who('CLOSED', 'close', 'rev'), ['creator', 'receiver']);
});

test('notifications: stopping work alerts everyone responsible except the person who stopped it', () => {
  assert.deepEqual(who('HOLD', 'stop_work', 'receiver', 'Gas smell reported'), ['app', 'creator', 'orgadmin', 'rev', 'rev2']);
});

test('notifications: the reason is included where it matters, and starting work notifies no one new', () => {
  const [n] = planNotifications(nPermit, 'reject', 'REJECTED', 'rev', orgUsers, 'Wrong location on the form');
  assert.match(n.message, /PTW-2026-0007/);
  assert.match(n.message, /Wrong location on the form/);
  assert.equal(n.type, 'error');
  assert.deepEqual(who('ACTIVE', 'accept_handover'), []);
  assert.deepEqual(who('ACTIVE', 'resume', 'rev', 'Source fixed and verified'), ['creator', 'receiver']);
});

test('notifications: a person is never told about their own action, and never twice', () => {
  assert.ok(!who('HOLD', 'stop_work', 'creator').includes('creator'));
  const dupes = planNotifications({ ...nPermit, receiver_id: 'creator' }, 'stop_work', 'HOLD', 'rev', orgUsers, 'x');
  assert.equal(new Set(dupes.map(d => d.user_id)).size, dupes.length);
});

test('critical checklist items are recognised by id, so removing the flag from a saved permit changes nothing', () => {
  const item = (id: string, response: string, flag?: boolean) => permit({ payload: { safety_requirements: [{ id, text: 'x', response, ...(flag === undefined ? {} : { is_critical: flag }) }] } });
  assert.ok(ids(gate('submit', item('hw_1', 'No')), 'block').includes('checklist.critical'), 'fire watch: No blocks');
  assert.ok(ids(gate('submit', item('hw_1', 'No', false)), 'block').includes('checklist.critical'), 'even with the flag stripped');
  assert.ok(!ids(gate('submit', item('uw_1', 'No')), 'block').includes('checklist.critical'), 'community announcement: No is fine');
  assert.ok(ids(gate('submit', item('cs_5', 'No')), 'block').includes('checklist.critical'), 'rescue plan');
});

// ─── payload builder and wizard mapping ───────────────────────────────────

const requester = { id: 'u1', name: 'Cathy Creator', email: 'c@x.com', role: 'SUPERVISOR', mobile: '0555123456', company: 'EGO Designs' };
const formInput = (type: any, over: any = {}) => ({
  type, requester, location: 'Level 3 corridor', description: 'Replace damaged ceiling tiles',
  startDate: '2026-11-14', startTime: '10:00', endDate: '2026-11-14', endTime: '15:00',
  numberOfWorkers: 4, emergencyContact: '0500000000', ramsRef: 'RAMS-001', ...over,
});

test('a new permit\'s checklist starts UNANSWERED, never "N/A"', () => {
  for (const type of Object.keys(TYPE_RULES)) {
    const list = blankChecklist(type as any);
    assert.equal(list.length, ptwChecklistData[type as keyof typeof ptwChecklistData].length, type);
    assert.ok(list.length > 0, `${type} has no checklist`);
    assert.ok(list.every(i => i.response === ''), type);
  }
  const hot = blankChecklist('Hot Work');
  assert.equal(hot.find(i => i.id === 'hw_1')!.is_critical, true);
  assert.equal(blankChecklist('Utility Work').find(i => i.id === 'uw_1')!.is_critical, undefined);
});

test('PPE defaults follow the permit type', () => {
  assert.equal(defaultPpe('Hot Work').goggles, true);
  assert.equal(defaultPpe('Hot Work').safety_gloves, true);
  assert.equal(defaultPpe('Work at Height').safety_harness, true);
  assert.equal(defaultPpe('General Work').goggles, false);
  assert.equal(defaultPpe('General Work').hard_hat, true);
});

test('buildPermitPayload: real details only, no placeholders, type-specific sections present', () => {
  const p = buildPermitPayload(formInput('Hot Work'));
  assert.equal(p.requester.mobile, '0555123456');
  assert.notEqual(p.requester.mobile, '555-0101');
  assert.equal(buildPermitPayload(formInput('Hot Work', { requester: { ...requester, mobile: undefined } })).requester.mobile, '');
  assert.deepEqual(p.attachments, []);
  assert.equal(p.permit_no, '');
  assert.deepEqual(p.fire_watcher, { name: '', mobile: '' });
  assert.equal(p.post_watch_minutes, 30);
  assert.deepEqual(buildPermitPayload(formInput('Confined Space Entry')).gas_tests, []);
  assert.deepEqual(buildPermitPayload(formInput('Confined Space Entry')).isolation, []);
  assert.equal(buildPermitPayload(formInput('Lifting')).load_calculation.utilization_percent, '');
  assert.equal(buildPermitPayload(formInput('General Work', { externalRef: ' P-1234 ' })).external_ref, 'P-1234');
  assert.equal(p.work.number_of_workers, 4);
  assert.equal(buildPermitPayload(formInput('General Work', { numberOfWorkers: 0 })).work.number_of_workers, undefined);
});

test('a freshly built permit fails the submit gate ONLY because nothing has been answered yet', () => {
  const fresh = (type: any) => ({ id: 'p', project_id: 'proj', type, status: 'DRAFT', title: 'Replace ceiling tiles', payload: buildPermitPayload(formInput(type, { startDate: ymd(NOW + H), startTime: hm(NOW + H), endDate: ymd(NOW + 5 * H), endTime: hm(NOW + 5 * H) })) } as any);
  const blocks = (type: any) => evaluateGates('submit', { permit: fresh(type), now: NOW, ...noExternal }).filter(r => r.level === 'block').map(r => r.id);
  assert.deepEqual(blocks('General Work'), ['checklist.unanswered']);
  // type-specific requirements show up as their own blocks rather than passing silently
  assert.ok(blocks('Hot Work').includes('firewatch'));
  assert.ok(blocks('Lifting').includes('lift.docs') && blocks('Lifting').includes('lift.util'));
  assert.ok(blocks('Confined Space Entry').includes('isolation.plan'));
});

test('local date and time helpers use the device clock, not UTC', () => {
  const ms = new Date(2026, 10, 14, 23, 30).getTime();
  assert.equal(localDateTimeInput(ms), '2026-11-14T23:30');
  assert.deepEqual(splitLocalInput('2026-11-14T23:30'), { date: '2026-11-14', time: '23:30' });
  assert.deepEqual(splitLocalInput(''), { date: '', time: '' });
  assert.equal(parseLocal(splitLocalInput(localDateTimeInput(ms)).date, splitLocalInput(localDateTimeInput(ms)).time), ms);
});

const wizard = (over: any = {}) => ({
  type: 'HOT_WORK', description: 'Welding of 150mm pipe flange on the cooling water line', location: 'Plant room B4', project_id: 'proj',
  planned_start: '2026-11-14T08:00', planned_end: '2026-11-14T12:30',
  hazards: ['Fire', ''], controls: ['Fire blanket'], ppe_required: ['Hard hat', 'Safety glasses', 'Hearing protection', 'Full body harness'],
  receiver_name: 'Rob', receiver_company: 'ACME', team_members: 'Ali, Omar\nSami', ...over,
});

test('wizard: every wizard type code maps to a real permit type', () => {
  for (const [code, type] of Object.entries(WIZARD_TYPE_MAP)) assert.ok(type in TYPE_RULES, `${code} -> ${type}`);
  assert.equal(Object.keys(WIZARD_TYPE_MAP).length, 9);
});

test('wizard: answers become the standard permit shape', () => {
  const r = wizardToPermitData(wizard(), requester, { now: 1 });
  assert.ok(r.ok === true);
  if (r.ok === true) {
    assert.equal(r.data.type, 'Hot Work');
    assert.equal(r.data.project_id, 'proj');
    assert.equal(r.data.payload.work.coverage.start_time, '08:00');
    assert.equal(r.data.payload.work.coverage.end_time, '12:30');
    assert.equal(r.data.payload.ppe.goggles, true);
    assert.equal(r.data.payload.ppe.safety_harness, true);
    assert.deepEqual(r.data.payload.wizard.other_ppe, ['Hearing protection']);
    assert.deepEqual(r.data.payload.team.map((m: any) => m.name), ['Ali', 'Omar', 'Sami']);
    assert.deepEqual(r.data.payload.wizard.hazards, ['Fire']);
    assert.ok(r.data.payload.safety_requirements.every((i: any) => i.response === ''), 'checklist unanswered');
    assert.ok(r.data.title.length <= 80);
  }
});

test('wizard: missing end defaults to 8 hours later in local time, across midnight', () => {
  const r = wizardToPermitData(wizard({ planned_start: '2026-11-14T20:15', planned_end: '' }), requester);
  assert.ok(r.ok === true);
  if (r.ok === true) { assert.equal(r.data.payload.work.coverage.end_date, '2026-11-15'); assert.equal(r.data.payload.work.coverage.end_time, '04:15'); }
});

test('wizard: bad input is refused with a clear reason', () => {
  assert.ok(wizardToPermitData(wizard({ type: 'WIZARDRY' }), requester).ok === false);
  assert.ok(wizardToPermitData(wizard({ project_id: '' }), requester).ok === false);
  assert.ok(wizardToPermitData(wizard({ planned_start: '' }), requester).ok === false);
});

// ─── concurrent editing: leaf-level diff, three-way merge, appended rows ──

test('diffPayload writes LEAF paths, so two people editing different fields of one section do not collide', () => {
  const base = { work: { location: 'A', emergency_contact: '1', coverage: { start_time: '08:00', end_time: '12:00' } }, notes: 'x' };
  const mine = { work: { location: 'B', emergency_contact: '1', coverage: { start_time: '08:00', end_time: '12:00' } }, notes: 'x' };
  assert.deepEqual(diffPayload(base, mine), { 'payload.work.location': 'B' });
  assert.deepEqual(diffPayload(base, { ...mine, work: { ...mine.work, coverage: { start_time: '09:00', end_time: '12:00' } } }), { 'payload.work.location': 'B', 'payload.work.coverage.start_time': '09:00' });
  assert.deepEqual(diffPayload(base, base), {});
});

test('diffPayload: lists are written whole; unsafe key names fall back to the whole object; deletions only against the editor\'s own base', () => {
  assert.deepEqual(diffPayload({ gas: [1] }, { gas: [1, 2] }), { 'payload.gas': [1, 2] });
  const odd = diffPayload({ eq: { 'Scaffold (type A)': true } }, { eq: { 'Scaffold (type A)': false } });
  assert.deepEqual(odd, { 'payload.eq': { 'Scaffold (type A)': false } }, 'a key that is not a safe field name is never put in a field path');
  assert.deepEqual(diffPayload({ a: { b: 1 }, c: 2 }, { a: { b: 1 } }), { 'payload.c': DELETE_FIELD });
  assert.deepEqual(diffPayload({ a: { b: 1 }, c: 2 }, { a: { b: 1 } }, false), {}, 'against the live copy, a missing section is not a deletion');
  assert.deepEqual(diffPayload({}, { fresh: { x: 1 } }), { 'payload.fresh': { x: 1 } });
});

test('mergeThreeWay: keeps what I typed, takes what others saved, keeps both when we both added rows', () => {
  const base = { work: { location: 'A', emergency_contact: '1' }, gas: [{ t: 1 }], team: [] };
  const mine = { work: { location: 'MINE', emergency_contact: '1' }, gas: [{ t: 1 }, { t: 'mine' }], team: [] };
  const theirs = { work: { location: 'A', emergency_contact: 'THEIRS' }, gas: [{ t: 1 }, { t: 'theirs' }], team: [{ n: 1 }] };
  const m = mergeThreeWay(base, mine, theirs);
  assert.equal(m.work.location, 'MINE');
  assert.equal(m.work.emergency_contact, 'THEIRS');
  assert.deepEqual(m.gas, [{ t: 1 }, { t: 'theirs' }, { t: 'mine' }]);
  assert.deepEqual(m.team, [{ n: 1 }]);
  // untouched on my side: simply follows the saved copy
  assert.deepEqual(mergeThreeWay(base, base, theirs), theirs);
  // untouched on their side: mine
  assert.deepEqual(mergeThreeWay(base, mine, base), mine);
  // the same value changed by both: mine wins on screen
  assert.equal(mergeThreeWay({ v: 1 }, { v: 2 }, { v: 3 }).v, 2);
  // a section somebody else removed, which I did not touch, goes
  assert.deepEqual(mergeThreeWay({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }), { a: 1 });
});

test('planContentWrite: rows I appended are rebased onto the list as saved now, and never duplicated', () => {
  const row = (t: string) => ({ time: t, o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: 'T' });
  const loaded = { gas_tests: [row('09:00')] };
  const saved = { ...basePermit(), payload: { gas_tests: [row('09:00'), row('09:20')] } };           // somebody added 09:20 meanwhile
  const plan = planContentWrite(saved as any, { payload: { gas_tests: [row('09:00'), row('09:30')] } }, NOW, loaded);
  assert.deepEqual((plan.permit['payload.gas_tests'] as any[]).map(r => r.time), ['09:00', '09:20', '09:30']);
  // saving the same append twice (a retried request) does not duplicate it
  const again = planContentWrite({ ...saved, payload: { gas_tests: [row('09:00'), row('09:20'), row('09:30')] } } as any, { payload: { gas_tests: [row('09:00'), row('09:30')] } }, NOW, loaded);
  assert.deepEqual((again.permit['payload.gas_tests'] as any[]).map(r => r.time), ['09:00', '09:20', '09:30']);
  // a list that was EDITED (not just appended to) is written as the editor has it
  const edited = planContentWrite(saved as any, { payload: { gas_tests: [row('08:00')] } }, NOW, loaded);
  assert.deepEqual((edited.permit['payload.gas_tests'] as any[]).map(r => r.time), ['08:00']);
});

function basePermit() { return { id: 'p', project_id: 'proj', type: 'Confined Space Entry', status: 'ACTIVE', title: 't', permit_no: 'PTW-2026-0001' }; }
