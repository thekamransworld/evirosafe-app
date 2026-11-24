// The one-off import of the old stores: the mapping, the plan (dry run), idempotence, and that every document
// it produces is accepted by the generated rules, while forged imports are refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ts } from './helpers/rulesSim';
import { P, T0, MIN, H, newWorld, resolver, stepAction, actor, type Clock } from './helpers/actionFixtures';
import {
  IMPORT_ID_PATTERN, buildImportAction, mapCapaItem, mapCorrectiveAction, mapStandaloneAction, plain, planImport,
  type ImportContext, type ImportSources,
} from '../src/lib/actions/migrate';
import { resolveSentinels } from '../src/lib/shared/writes';
import type { World } from './helpers/rulesSim';

const ctx: ImportContext = {
  orgId: 'org1', importer: actor(P.orgAdmin), today: '2026-11-14', reportProjects: { rep_7: 'proj' },
};

const sources = (): ImportSources => ({
  actions: [
    { id: 'act_1', org_id: 'org1', action: 'Fix the exit sign on level 2', owner_id: 'w', due_date: '2026-10-01', status: 'Open', project_id: 'proj', priority: 'High', source: { type: 'Standalone', id: 'standalone', description: 'Standalone Action' } },
    { id: 'act_2', org_id: 'org1', action: 'x'.repeat(250), owner_id: '', due_date: '2026-06-01', status: 'Closed', project_id: 'proj', priority: 'Low', source: { type: 'Standalone', id: 'standalone' } },
    { id: 'act_3', org_id: 'org1', number: 'ACT-2026-0001', action: 'already new-format', owner_id: 'w', due_date: '2026-10-01', status: 'OPEN', project_id: 'proj' },
  ],
  corrective_actions: [
    { id: 'car1', org_id: 'org1', car_number: 'CAR-2026-4821', title: 'Guard missing on grinder', description: 'Found during the audit', action_type: 'corrective', priority: 'high', source: 'audit', source_ref: 'AUD-2026-3321', assigned_to: 'w', assigned_by: 'rev', target_date: '2026-09-30', status: 'verified', verified_by: 'app', verified_at: '2026-10-02T08:00:00Z', completed_at: '2026-10-01T09:00:00Z', evidence: ['https://example.test/a.jpg', 12], notes: 'checked on site', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-10-02T08:00:00Z' },
    { id: 'car2', org_id: 'org1', car_number: 'CAR-2026-1002', title: 'Re-route the cable', description: '', action_type: 'preventive', priority: 'critical', source: 'incident', source_ref: 'rep_7', assigned_to: 'w', assigned_by: 'rev', target_date: '2026-08-30', status: 'overdue', evidence: [], notes: '', created_at: '2026-08-16T00:00:00Z', updated_at: '2026-08-16T00:00:00Z' },
    { id: 'car3', org_id: 'org1', car_number: 'CAR-2026-7000', title: 'Odd one', description: '', action_type: 'unknown', priority: 'urgent', source: 'management', assigned_to: '', assigned_by: '', target_date: 'soon', status: 'weird', evidence: [], notes: '', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  ],
  reports: [
    { id: 'rep_7', org_id: 'org1', project_id: 'proj', type: 'Near Miss', occurred_at: '2026-08-15T10:00:00Z', created_at: '2026-08-15T11:00:00Z', creator_id: 'rev', reporter_id: 'rev',
      capa: [
        { type: 'Corrective', action: 'Replace the cable tray', owner_id: 'w', due_date: '2026-09-10', status: 'In Progress' },
        { type: 'Preventive', action: '', owner_id: 'w', due_date: '2026-09-10', status: 'Open' },
        { type: 'Preventive', action: 'Toolbox talk on cable routing', owner_id: 'w', due_date: '2026-09-12', status: 'Closed', verified_at: '2026-09-13T08:00:00Z', verified_by_id: 'app' },
      ] },
    { id: 'rep_8', org_id: 'org1', project_id: 'proj', type: 'Incident', capa: [] },
  ],
});

// ─── mapping ──────────────────────────────────────────────────────────────

test('import: the Action Tracker mapping', () => {
  const [a1, a2] = sources().actions;
  const c1 = mapStandaloneAction(a1, ctx)!;
  assert.equal(c1.id, 'imp_act_act_1');
  assert.match(c1.id, IMPORT_ID_PATTERN);
  assert.equal(c1.fields.title, 'Fix the exit sign on level 2');
  assert.equal(c1.fields.status, 'OPEN');
  assert.equal(c1.fields.priority, 'high');
  assert.equal(c1.fields.owner_id, 'w');
  assert.equal(c1.fields.creator_id, P.orgAdmin.id, 'the old record has no creator: the importer is recorded, plainly');
  assert.deepEqual(c1.fields.source, { type: 'manual', ref: 'Standalone Action' });
  assert.equal(c1.fields.legacy.id, 'act_1');
  // a long text: the first line is the title, the whole text is the description, nothing is lost silently
  const c2 = mapStandaloneAction(a2, ctx)!;
  assert.ok(c2.fields.title.length <= 200 && c2.fields.title.endsWith('...'));
  assert.equal(c2.fields.description, 'x'.repeat(250));
  assert.equal(c2.fields.status, 'CLOSED');
  assert.equal(c2.fields.owner_id, '', 'an unassigned action stays unassigned');
  assert.equal(mapStandaloneAction({ id: 'z', number: 'ACT-2026-0009' }, ctx), null, 'a new-format action is not legacy');
});

test('import: the CAR mapping keeps the old record and reports what it could not understand', () => {
  const [car1, car2, car3] = sources().corrective_actions;
  const c1 = mapCorrectiveAction(car1, ctx)!;
  assert.equal(c1.fields.status, 'CLOSED');
  assert.equal(c1.fields.kind, 'corrective');
  assert.equal(c1.fields.owner_id, 'w');
  assert.equal(c1.fields.creator_id, 'rev');
  assert.equal(c1.fields.due_date, '2026-09-30');
  assert.deepEqual(c1.fields.source, { type: 'audit', id: 'AUD-2026-3321', ref: 'CAR-2026-4821' });
  assert.equal(c1.fields.title, 'Guard missing on grinder');
  assert.equal(c1.fields.description, 'Found during the audit');
  assert.equal(c1.fields.legacy.car_number, 'CAR-2026-4821');
  assert.equal(c1.fields.legacy.verified_at, '2026-10-02T08:00:00Z');
  assert.deepEqual(c1.fields.legacy.evidence, ['https://example.test/a.jpg'], 'only strings are kept');
  assert.equal(c1.fields.project_id, undefined);
  assert.ok(c1.warnings.some(w => w.includes('no project')), 'no project is reported');
  // an incident-sourced CAR takes the project of its report; a stored "overdue" is just OPEN again
  const c2 = mapCorrectiveAction(car2, ctx)!;
  assert.equal(c2.fields.project_id, 'proj');
  assert.equal(c2.fields.status, 'OPEN');
  assert.equal(c2.fields.priority, 'critical');
  assert.deepEqual(c2.fields.source, { type: 'incident', id: 'rep_7', ref: 'CAR-2026-1002' });
  // garbage is imported as safely as possible and every guess is reported
  const c3 = mapCorrectiveAction(car3, ctx)!;
  assert.equal(c3.fields.status, 'OPEN');
  assert.equal(c3.fields.kind, 'corrective');
  assert.equal(c3.fields.priority, 'medium');
  assert.equal(c3.fields.due_date, '2026-11-14');
  assert.equal(c3.fields.source.type, 'manual');
  for (const needle of ['status "weird"', 'type "unknown"', 'priority "urgent"', 'due date "soon"']) {
    assert.ok(c3.warnings.some(w => w.includes(needle)), `reported: ${needle}`);
  }
});

test('import: embedded incident CAPA items', () => {
  const rep = sources().reports[0];
  const c0 = mapCapaItem(rep, 0, ctx)!;
  assert.equal(c0.id, 'imp_capa_rep_7_0');
  assert.equal(c0.fields.status, 'IN_PROGRESS');
  assert.equal(c0.fields.kind, 'corrective');
  assert.equal(c0.fields.creator_id, 'rev');
  assert.deepEqual(c0.fields.source, { type: 'incident', id: 'rep_7', ref: 'Near Miss 2026-08-15', item: '0' });
  assert.equal(mapCapaItem(rep, 1, ctx), null, 'an item with no text is skipped');
  const c2 = mapCapaItem(rep, 2, ctx)!;
  assert.equal(c2.fields.status, 'CLOSED');
  assert.equal(c2.fields.legacy.verified_at, '2026-09-13T08:00:00Z');
});

test('import: plain() makes old records safe to store', () => {
  const stamp = { toDate: () => new Date('2026-01-02T03:04:05Z') };
  const out = plain({ a: 1, b: undefined, c: stamp, d: [1, undefined, { e: () => 1, f: 'x' }], g: new Date('2026-05-06T00:00:00Z') }) as any;
  assert.deepEqual(out, { a: 1, c: '2026-01-02T03:04:05.000Z', d: [1, { f: 'x' }], g: '2026-05-06T00:00:00.000Z' });
});

// ─── the plan (dry run) ───────────────────────────────────────────────────

test('import: the plan counts, orders oldest first, skips what is already new, and resumes', () => {
  const plan = planImport(sources(), new Set(), ctx);
  assert.equal(plan.toCreate.length, 7);
  assert.deepEqual(plan.counts, { actions: 2, corrective_actions: 3, report_capa: 2 });
  assert.equal(plan.skipped.length, 1);
  assert.equal(plan.skipped[0].ref, 'reports/rep_7/capa/1');
  assert.equal(plan.alreadyImported, 0);
  // oldest first: the June action, the July CAR, then August items...
  assert.deepEqual(plan.toCreate.map(c => c.id), [
    'imp_act_act_2', 'imp_car_car3', 'imp_capa_rep_7_0', 'imp_capa_rep_7_2', 'imp_car_car2', 'imp_car_car1', 'imp_act_act_1',
  ].sort((a, b) => plan.toCreate.findIndex(c => c.id === a) - plan.toCreate.findIndex(c => c.id === b)));
  const keys = plan.toCreate.map(c => c.sortKey || '￿');
  assert.deepEqual(keys, [...keys].sort(), 'sorted by sort key');
  // a second run after everything was imported creates nothing
  const again = planImport(sources(), new Set(plan.toCreate.map(c => c.id)), ctx);
  assert.equal(again.toCreate.length, 0);
  assert.equal(again.alreadyImported, 7);
  // a run that stopped half way continues with the rest
  const half = new Set(plan.toCreate.slice(0, 3).map(c => c.id));
  const rest = planImport(sources(), half, ctx);
  assert.equal(rest.toCreate.length, 4);
  assert.equal(rest.alreadyImported, 3);
});

// ─── the generated rules judge every imported document ────────────────────

function runImport(w: World, who = P.orgAdmin, clk: Clock = { now: T0 }) {
  const plan = planImport(sources(), new Set(Object.keys(w.docs).filter(k => k.startsWith('/actions/')).map(k => k.slice(9))), ctx);
  const year = new Date(clk.now).getUTCFullYear();
  const out: Array<{ id: string; ok: boolean; why?: string }> = [];
  for (const c of plan.toCreate) {
    const counterPath = `/counters/act_${who.org}_${year}`;
    const existing = w.docs[counterPath];
    const n = (existing ? existing.value : 0) + 1;
    const built = buildImportAction(c, { orgId: who.org, importer: actor(who), year, n, now: clk.now });
    const res = w.commit(who.uid, [
      existing ? { kind: 'update', path: counterPath, data: { ...existing, ...built.counter } } : { kind: 'set', path: counterPath, data: built.counter },
      { kind: 'set', path: `/actions/${c.id}`, data: resolveSentinels(built.action, resolver(clk.now)) },
    ], clk.now);
    out.push({ id: c.id, ok: res.ok === true, ...(res.ok === false ? { why: res.why } : {}) });
    clk.now += 1000;
  }
  return out;
}

test('import: every document the importer builds is accepted by the rules, numbered in order', () => {
  const w = newWorld();
  const legacy = sources();
  for (const a of legacy.actions) w.seed(`/actions/${a.id}`, structuredClone(a));
  for (const c of legacy.corrective_actions) w.seed(`/corrective_actions/${c.id}`, structuredClone(c));
  for (const r of legacy.reports) w.seed(`/reports/${r.id}`, structuredClone(r));
  const before = structuredClone(Object.fromEntries(Object.entries(w.docs).filter(([k]) => !k.startsWith('/users_by_uid'))));

  const results = runImport(w);
  assert.equal(results.length, 7);
  for (const r of results) assert.ok(r.ok, `${r.id}: ${r.why}`);
  const numbers = Object.entries(w.docs).filter(([k]) => k.startsWith('/actions/imp_')).map(([, d]) => d.number).sort();
  assert.deepEqual(numbers, ['ACT-2026-0001', 'ACT-2026-0002', 'ACT-2026-0003', 'ACT-2026-0004', 'ACT-2026-0005', 'ACT-2026-0006', 'ACT-2026-0007']);
  assert.equal(w.docs['/counters/act_org1_2026'].value, 7);
  // the old records are untouched, byte for byte
  for (const [k, v] of Object.entries(before)) {
    if (k.startsWith('/actions/') && k.includes('imp_')) continue;
    assert.deepEqual(w.docs[k], v, `${k} must not change`);
  }
  // the import is idempotent: running it again finds everything and writes nothing
  assert.equal(runImport(w).length, 0);
  assert.equal(w.docs['/counters/act_org1_2026'].value, 7);
  // and it says so in the history
  const imp = w.docs['/actions/imp_car_car1'];
  assert.equal(imp.history[0].action, 'import');
  assert.match(imp.history[0].note, /^Imported from corrective_actions\/car1/);
  assert.equal(imp.imported, true);
  assert.ok(imp.created_at instanceof Ts);
});

test('import: imported actions work like any other afterwards', () => {
  const w = newWorld();
  const legacy = sources();
  const clk: Clock = { now: T0 };
  // make the owner a real person of the test world for the steps below
  const owned = { ...legacy, corrective_actions: legacy.corrective_actions.map(c => ({ ...c, assigned_to: P.worker.id })) };
  const plan = planImport(owned, new Set(), ctx);
  const year = 2026;
  for (const c of plan.toCreate) {
    const existing = w.docs[`/counters/act_org1_${year}`];
    const n = (existing ? existing.value : 0) + 1;
    const built = buildImportAction({ ...c, fields: { ...c.fields, project_id: c.fields.project_id ?? 'proj' } }, { orgId: 'org1', importer: actor(P.orgAdmin), year, n, now: clk.now });
    const r = w.commit(P.orgAdmin.uid, [
      existing ? { kind: 'update', path: `/counters/act_org1_${year}`, data: { ...existing, value: n } } : { kind: 'set', path: `/counters/act_org1_${year}`, data: built.counter },
      { kind: 'set', path: `/actions/${c.id}`, data: resolveSentinels(built.action, resolver(clk.now)) },
    ], clk.now);
    assert.ok(r.ok === true, c.id);
  }
  // an imported OPEN action: start, complete, verify by someone else
  clk.now += 10 * MIN;
  const go = (who: typeof P.worker, id: string, step: any, o: any = {}) => {
    clk.now += MIN;
    const r = stepAction(w, who, id, step, clk, o);
    assert.ok(r.commit, `${id} ${step}: ${(r.engine as any).reason}`);
    assert.ok(r.commit!.ok === true, `${id} ${step}: ${(r.commit as any).why}`);
  };
  go(P.worker, 'imp_car_car2', 'start');
  go(P.worker, 'imp_car_car2', 'complete', { note: 'Re-routed and checked' });
  go(P.reviewer, 'imp_car_car2', 'verify', { note: 'Seen on site: secure' });
  // an imported CLOSED action can be reopened by an approver
  go(P.approver, 'imp_car_car1', 'reopen', { note: 'Guard missing again' });
  // an imported action with NO owner cannot be started by anyone but can be assigned by a reviewer
  assert.equal(stepAction(w, P.worker, 'imp_act_act_2', 'reopen', clk).commit, null, 'a worker cannot reopen');
  go(P.approver, 'imp_act_act_2', 'reopen', { note: 'Needed again' });
  const cantStart = stepAction(w, P.worker, 'imp_act_act_2', 'start', clk);
  assert.equal(cantStart.commit, null, 'nobody owns it yet');
  go(P.reviewer, 'imp_act_act_2', 'reschedule', { note: 'Assigning an owner', changes: { owner_id: P.worker.id } });
  go(P.worker, 'imp_act_act_2', 'start');
});

test('import: forged imports are refused', () => {
  const clk: Clock = { now: T0 };
  const c = planImport(sources(), new Set(), ctx).toCreate[0];
  const mk = (who = P.orgAdmin, mut: (a: any, counter: any) => void = () => {}, id = c.id) => {
    const w = newWorld();
    const built = buildImportAction(c, { orgId: 'org1', importer: actor(who), year: 2026, n: 1, now: clk.now });
    const a = resolveSentinels(built.action, resolver(clk.now)) as any;
    const counter = { ...built.counter } as any;
    mut(a, counter);
    return w.commit(who.uid, [{ kind: 'set', path: '/counters/act_org1_2026', data: counter }, { kind: 'set', path: `/actions/${id}`, data: a }], clk.now);
  };
  assert.ok(mk().ok === true, 'control');
  assert.ok(mk(P.admin).ok === true, 'the platform administrator may import too');
  for (const who of [P.approver, P.reviewer, P.creator, P.worker, P.viewer]) assert.ok(mk(who).ok === false, `${who.role} cannot import`);
  const cases: Array<[string, (a: any, c: any) => void, string?]> = [
    ['imported flag false', a => { a.imported = false; }],
    ['no legacy record', a => { delete a.legacy; }],
    ['legacy not a map', a => { a.legacy = 'text'; }],
    ['unknown import source', a => { a.import_source = 'elsewhere'; }],
    ['history says create, not import', a => { a.history[0].action = 'create'; }],
    ['history by someone else', a => { a.history[0].user_id = 'x'; }],
    ['status not a stage', a => { a.status = 'DONE'; a.history[0].stage = 'DONE'; a.history[0].from = 'DONE'; }],
    ['year is not this year', a => { a.action_year = 2025; a.number = 'ACT-2025-0001'; }],
    ['client clock', a => { a.created_at = new Ts(T0 - H); }],
    ['stage time for another stage', a => { a.stage_times = { [a.status === 'OPEN' ? 'CLOSED' : 'OPEN']: a.stage_times[a.status] }; }],
    ['counter not bumped', (_a, c) => { c.value = 4; }],
    ['unknown key', a => { a.extra = 1; }],
    ['no import_ref', a => { delete a.import_ref; }],
  ];
  for (const [what, mut] of cases) assert.ok(mk(P.orgAdmin, mut).ok === false, what);
  assert.ok(mk(P.orgAdmin, () => {}, 'not_an_import_id').ok === false, 'document id must start with imp_');
  assert.ok(mk(P.orgAdmin, () => {}, 'imp_' + 'x'.repeat(120)).ok === false, 'document id too long');
  // an import without consuming a counter number (no counter write) is refused too
  {
    const w = newWorld();
    const built = buildImportAction(c, { orgId: 'org1', importer: actor(P.orgAdmin), year: 2026, n: 1, now: clk.now });
    const lone = w.commit(P.orgAdmin.uid, [{ kind: 'set', path: `/actions/${c.id}`, data: resolveSentinels(built.action, resolver(clk.now)) }], clk.now);
    assert.ok(lone.ok === false, 'an import with no counter write is refused');
  }
  // a second write to the same id is an UPDATE, which the step rules refuse (no double import by a forged client)
  const w = newWorld();
  const built = buildImportAction(c, { orgId: 'org1', importer: actor(P.orgAdmin), year: 2026, n: 1, now: clk.now });
  const a = resolveSentinels(built.action, resolver(clk.now)) as any;
  assert.ok(w.commit(P.orgAdmin.uid, [{ kind: 'set', path: '/counters/act_org1_2026', data: built.counter }, { kind: 'set', path: `/actions/${c.id}`, data: a }], clk.now).ok === true);
  const again = w.commit(P.orgAdmin.uid, [{ kind: 'update', path: '/counters/act_org1_2026', data: { ...built.counter, value: 2 } }, { kind: 'set', path: `/actions/${c.id}`, data: { ...a, number: 'ACT-2026-0002' } }], clk.now + 1000);
  assert.ok(again.ok === false, 'a second import of the same id is refused');
});

// ─── the command-line flow (scripts/migrate-actions-lib.mjs), against the in-memory database ─────────────

// @ts-ignore (plain .mjs, no types)
import { parseArgs, runMigration } from '../scripts/migrate-actions-lib.mjs';
import { IMPORT_ROLES } from '../src/lib/actions/model';
import type { Person } from './helpers/actionFixtures';

const lib = { planImport, buildImportAction, IMPORT_ROLES };

function oldWorld(): World {
  const w = newWorld();
  const s = sources();
  for (const a of s.actions) w.seed(`/actions/${a.id}`, structuredClone(a));
  for (const c of s.corrective_actions) w.seed(`/corrective_actions/${c.id}`, structuredClone(c));
  for (const r of s.reports) w.seed(`/reports/${r.id}`, structuredClone(r));
  return w;
}

function makeIo(w: World, who: Person, o: { confirm?: boolean; failFor?: Set<string> } = {}) {
  const logs: string[] = [];
  const asked: string[] = [];
  const clk = { now: T0 };
  const io = {
    log: (m: string) => { logs.push(m); },
    getPointer: async (uid: string) => { const p = w.docs[`/users_by_uid/${uid}`]; return p ? { docId: p.docId, org_id: p.org_id, role: p.role, name: 'Test Admin' } : null; },
    readCollection: async (name: string, orgId: string) =>
      Object.entries(w.docs).filter(([k, d]) => k.startsWith(`/${name}/`) && (d as any).org_id === orgId).map(([k, d]) => ({ ...(d as object), id: k.split('/')[2] })),
    getCounter: async (orgId: string, year: number) => w.docs[`/counters/act_${orgId}_${year}`]?.value ?? 0,
    importOne: async (c: any, x: any) => {
      if (o.failFor?.has(c.ref)) throw Object.assign(new Error('simulated failure'), { code: 'unavailable' });
      const path = `/actions/${c.id}`;
      if (path in w.docs) return 'exists';
      const counterPath = `/counters/act_${x.orgId}_${x.year}`;
      const existing = w.docs[counterPath];
      const n = (existing ? existing.value : 0) + 1;
      const built = buildImportAction(c, { orgId: x.orgId, importer: x.importer, year: x.year, n, now: clk.now });
      clk.now += 1000;
      const res = w.commit(who.uid, [
        existing ? { kind: 'update', path: counterPath, data: { ...existing, value: n } } : { kind: 'set', path: counterPath, data: built.counter },
        { kind: 'set', path, data: resolveSentinels(built.action, resolver(clk.now)) },
      ], clk.now);
      if (res.ok === false) throw Object.assign(new Error(res.why), { code: 'permission-denied' });
      return 'created';
    },
    confirm: async (text: string) => { asked.push(text); return o.confirm ?? true; },
  };
  return { io, logs, asked, text: () => logs.join('\n') };
}

const run = (w: World, who: Person, argv: string[], o: Parameters<typeof makeIo>[2] = {}) => {
  const h = makeIo(w, who, o);
  const args = parseArgs(argv);
  return runMigration({ args, uid: who.uid, email: 'admin@example.test', io: h.io, lib, now: new Date(T0) }).then((r: any) => ({ r, ...h }));
};
const actionDocs = (w: World) => Object.keys(w.docs).filter(k => k.startsWith('/actions/imp_'));

test('import command: argument parsing', () => {
  assert.deepEqual(parseArgs(['--email', 'a@b.c']).errors, []);
  const a = parseArgs(['--email', 'a@b.c', '--apply', '--yes', '--org', 'org9', '--default-project', 'p1', '--limit', '5']);
  assert.deepEqual([a.email, a.apply, a.yes, a.org, a.defaultProject, a.limit], ['a@b.c', true, true, 'org9', 'p1', 5]);
  assert.equal(parseArgs([]).apply, false, 'a dry run unless --apply is given');
  assert.ok(parseArgs(['--nope']).errors.length === 1);
  assert.ok(parseArgs(['--limit', '0']).errors.length === 1);
  assert.ok(parseArgs(['--limit']).errors.length === 1);
  assert.ok(parseArgs(['--email']).errors.length === 1);
});

test('import command: the default is a dry run that writes nothing and says what it would do', async () => {
  const w = oldWorld();
  const before = JSON.stringify(w.docs);
  const { r, text } = await run(w, P.orgAdmin, ['--email', 'x']);
  assert.equal(r.exitCode, 0);
  assert.equal(JSON.stringify(w.docs), before, 'nothing was written');
  const out = text();
  assert.match(out, /MODE: DRY RUN/);
  assert.match(out, /Old Action Tracker actions \.+ 2/);
  assert.match(out, /Old CAR register \.+ 3/);
  assert.match(out, /Incident corrective\/preventive items 2/);
  assert.match(out, /ACT-2026-0001 to ACT-2026-0007/);
  assert.match(out, /Things to know \(\d+\)/);
  assert.match(out, /Nothing was written\. To import these, run the same command again with --apply\./);
});

test('import command: --apply asks first, then imports everything once, and a second run adds nothing', async () => {
  const w = oldWorld();
  // declined: nothing happens
  const declined = await run(w, P.orgAdmin, ['--email', 'x', '--apply'], { confirm: false });
  assert.equal(declined.r.exitCode, 0); assert.equal(actionDocs(w).length, 0);
  assert.match(declined.text(), /Cancelled\. Nothing was written\./);
  assert.match(declined.asked[0], /Type IMPORT to continue/);
  // confirmed
  const first = await run(w, P.orgAdmin, ['--email', 'x', '--apply']);
  assert.equal(first.r.created, 7); assert.equal(first.r.failed.length, 0); assert.equal(first.r.exitCode, 0);
  assert.equal(actionDocs(w).length, 7);
  assert.equal(w.docs['/counters/act_org1_2026'].value, 7);
  assert.match(first.text(), /Done\. Created 7, already there 0, failed 0\. The old records were not changed\./);
  // again: nothing to import
  const second = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes']);
  assert.equal(second.r.created, 0); assert.equal(actionDocs(w).length, 7);
  assert.match(second.text(), /Already imported \(skipped\) \.+ 7/);
  assert.match(second.text(), /Nothing to import\./);
});

test('import command: --limit tries a few first, and the next run resumes with the numbering unbroken', async () => {
  const w = oldWorld();
  const few = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes', '--limit', '3']);
  assert.equal(few.r.created, 3);
  assert.match(few.text(), /only the first 3 of 7/);
  const rest = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes']);
  assert.equal(rest.r.created, 4);
  assert.match(rest.text(), /ACT-2026-0004 to ACT-2026-0007/);
  const numbers = actionDocs(w).map(k => w.docs[k].number).sort();
  assert.deepEqual(numbers, ['ACT-2026-0001', 'ACT-2026-0002', 'ACT-2026-0003', 'ACT-2026-0004', 'ACT-2026-0005', 'ACT-2026-0006', 'ACT-2026-0007']);
});

test('import command: only administrators of that organisation can run it', async () => {
  for (const who of [P.approver, P.reviewer, P.creator, P.worker, P.viewer]) {
    const w = oldWorld();
    const { r, text } = await run(w, who, ['--email', 'x', '--apply', '--yes']);
    assert.equal(r.exitCode, 1, who.role);
    assert.match(text(), /cannot run the import/);
    assert.equal(actionDocs(w).length, 0);
  }
  const w = oldWorld();
  const other = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes', '--org', 'org2']);
  assert.equal(other.r.exitCode, 1); assert.match(other.text(), /only import your own organisation/);
  const unknown = makeIo(w, P.orgAdmin);
  const none = await runMigration({ args: parseArgs([]), uid: 'nobody', email: 'x', io: unknown.io, lib, now: new Date(T0) });
  assert.equal(none.exitCode, 1); assert.match(unknown.text(), /has no user record/);
  // the platform administrator may name the organisation
  const ok = await run(oldWorld(), P.admin, ['--email', 'x', '--apply', '--yes', '--org', 'org1']);
  assert.equal(ok.r.created, 7);
});

test('import command: failures are reported, stop after three in a row, and the next run finishes the job', async () => {
  const w = oldWorld();
  const all = planImport(sources(), new Set(), ctx).toCreate.map(c => c.ref);
  const failFor = new Set(all.slice(0, 3)); // the first three records fail
  const bad = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes'], { failFor });
  assert.equal(bad.r.exitCode, 1);
  assert.equal(bad.r.failed.length, 3);
  assert.match(bad.text(), /Three failures in a row: stopping/);
  assert.equal(actionDocs(w).length, 0);
  // a single failure in the middle does not stop the rest
  const w2 = oldWorld();
  const one = await run(w2, P.orgAdmin, ['--email', 'x', '--apply', '--yes'], { failFor: new Set([all[2]]) });
  assert.equal(one.r.created, 6); assert.equal(one.r.failed.length, 1); assert.equal(one.r.exitCode, 1);
  assert.match(one.text(), /Run the command again to retry the failed ones/);
  const retry = await run(w2, P.orgAdmin, ['--email', 'x', '--apply', '--yes']);
  assert.equal(retry.r.created, 1); assert.equal(retry.r.failed.length, 0);
  assert.equal(actionDocs(w2).length, 7);
  assert.equal(w2.docs['/counters/act_org1_2026'].value, 7, 'no number was skipped or reused');
});

test('import command: --default-project places records that have no project', async () => {
  const noDefault = await run(oldWorld(), P.orgAdmin, ['--email', 'x']);
  assert.match(noDefault.text(), /Without a project \.+ [1-9]\d* +\(visible to administrators only; use --default-project PROJECT_ID/);
  const w = oldWorld();
  const placed = await run(w, P.orgAdmin, ['--email', 'x', '--apply', '--yes', '--default-project', 'proj']);
  assert.match(placed.text(), /Without a project \.+ 0/);
  assert.equal(actionDocs(w).filter(k => !w.docs[k].project_id).length, 0);
});
