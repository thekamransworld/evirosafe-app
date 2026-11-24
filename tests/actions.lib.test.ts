// The actions library: the model's integrity, the engine, overdue and summaries, write plans, notifications.
// Pure code, no Firebase. Run in several time zones by the test runner.
import test from 'node:test';
import assert from 'node:assert/strict';

import * as model from '../src/lib/actions/model';
import {
  ACTIONS, CREATE_KEYS, CREATE_REQUIRED, FORWARD_ACTIONS, HISTORY_KEYS, IMPORT_KEYS, IMPORT_REQUIRED, KINDS,
  PRIORITIES, PRIORITY_DUE_DAYS, SOURCE_TYPES, SOURCE_VIEW, STAGES, STAGE_GROUPS, STAGE_LABEL, TERMINAL_STAGES,
  STAFF, REVIEWERS, APPROVERS, OVERRIDERS, targetStage, type ActionId, type Stage,
} from '../src/lib/actions/model';
import {
  availableActions, awaitingFor, canCreate, checkActor, checkContentEdit, isValidDate, prepareTransition,
  validateNewAction, type ActionDoc,
} from '../src/lib/actions/engine';
import { addDays, closedOnTime, daysUntil, isOverdue, summarize, toMillis, ymd } from '../src/lib/actions/overdue';
import { buildNewAction, planContentWrite, planTransitionWrite, validateContent } from '../src/lib/actions/writes';
import { planNotifications, type NotifyUser } from '../src/lib/actions/notify';
import { counterDocId, formatNumber, parseNumber } from '../src/lib/shared/counters';
import { counterDocId as ptwCounterId, formatPermitNo, parsePermitNo } from '../src/lib/ptw/numbering';
import { SERVER_TIME } from '../src/lib/shared/writes';

const W = { id: 'w', name: 'Worker', role: 'WORKER' };
const REV = { id: 'rev', name: 'Reviewer', role: 'HSE_OFFICER' };
const APP = { id: 'app', name: 'Manager', role: 'HSE_MANAGER' };
const ADM = { id: 'adm', name: 'Admin', role: 'ORG_ADMIN' };
const CRE = { id: 'creator', name: 'Creator', role: 'SUPERVISOR' };
const VIEW = { id: 'v', name: 'Viewer', role: 'CLIENT_VIEWER' };

const doc = (over: Partial<ActionDoc> = {}): ActionDoc => ({
  id: 'a1', org_id: 'org1', project_id: 'proj', number: 'ACT-2026-0001', title: 'Replace guard rail', kind: 'corrective', priority: 'high',
  status: 'OPEN', owner_id: 'w', creator_id: 'creator', due_date: '2026-11-21', source: { type: 'incident', id: 'rep_1' },
  history: [{ action: 'create', from: 'OPEN', stage: 'OPEN', user_id: 'creator', user_name: 'Creator', role: 'SUPERVISOR', timestamp: '2026-11-14T07:00:00.000Z' }],
  ...over,
});
const NOW = Date.UTC(2026, 10, 14, 8, 0, 0);

// ─── the model ────────────────────────────────────────────────────────────

test('model: every step is well-formed and the table has no dead ends', () => {
  const stageSet = new Set<string>(STAGES);
  for (const [id, def] of Object.entries(ACTIONS)) {
    assert.equal(def.id, id);
    assert.ok(def.from.length > 0 && def.from.every(s => stageSet.has(s)), `${id}: from`);
    assert.ok(def.to === 'SAME' || stageSet.has(def.to), `${id}: to`);
    assert.ok(def.roles.length > 0, `${id}: roles`);
    assert.ok(['any', 'owner', 'verifier', 'creator'].includes(def.actor), `${id}: actor`);
    assert.ok(def.label.length > 3);
    for (const w of def.writes) assert.ok(typeof w === 'string' && w.length > 0);
    if (def.record) assert.ok(def.writes.includes(def.record), `${id}: a signed record is one of its writes`);
  }
  // every stage can be reached, and every stage has a way out (a closed or cancelled action can be reopened)
  for (const s of STAGES) {
    assert.ok(Object.values(ACTIONS).some(d => d.to === s || (d.to === 'SAME' && d.from.includes(s))), `${s} is reachable`);
    assert.ok(Object.values(ACTIONS).some(d => d.from.includes(s) && targetStage(d, s) !== s), `${s} has a way out`);
  }
  for (const s of TERMINAL_STAGES) assert.ok(ACTIONS.reopen.from.includes(s));
  // the stage groups partition the stages
  const grouped = Object.values(STAGE_GROUPS).flat();
  assert.deepEqual([...grouped].sort(), [...STAGES].sort());
  assert.equal(new Set(grouped).size, grouped.length);
  // forward steps exist and are possible from their stage
  for (const [stage, ids] of Object.entries(FORWARD_ACTIONS)) for (const id of ids as ActionId[]) assert.ok(ACTIONS[id].from.includes(stage as Stage));
  // labels and tables are complete
  for (const s of STAGES) assert.ok(STAGE_LABEL[s]);
  for (const p of PRIORITIES) assert.ok(PRIORITY_DUE_DAYS[p] >= 1);
  assert.ok(PRIORITY_DUE_DAYS.critical < PRIORITY_DUE_DAYS.high && PRIORITY_DUE_DAYS.high < PRIORITY_DUE_DAYS.medium && PRIORITY_DUE_DAYS.medium < PRIORITY_DUE_DAYS.low);
  for (const t of SOURCE_TYPES) assert.ok(t in SOURCE_VIEW);
  // roles: the nesting the rules rely on
  for (const r of OVERRIDERS) assert.ok((APPROVERS as readonly string[]).includes(r));
  for (const r of APPROVERS) assert.ok((REVIEWERS as readonly string[]).includes(r));
  for (const r of REVIEWERS) assert.ok((STAFF as readonly string[]).includes(r));
  assert.ok(!(STAFF as readonly string[]).includes('CLIENT_VIEWER'));
});

test('model: the field contract with the database is consistent', () => {
  for (const k of CREATE_REQUIRED) assert.ok((CREATE_KEYS as readonly string[]).includes(k));
  for (const k of CREATE_KEYS) assert.ok((IMPORT_KEYS as readonly string[]).includes(k));
  for (const k of IMPORT_REQUIRED) assert.ok((IMPORT_KEYS as readonly string[]).includes(k));
  assert.ok(!(IMPORT_REQUIRED as readonly string[]).includes('project_id'), 'an old action may have no project');
  // everything the engine writes into a history entry is a key the rules allow
  const r = prepareTransition({ action: doc(), step: 'reschedule', actor: REV, now: NOW, note: 'Moved because of the delay', changes: { due_date: '2026-12-01' } });
  assert.ok(r.ok === true);
  for (const k of Object.keys((r as any).log)) assert.ok((HISTORY_KEYS as readonly string[]).includes(k), `history key ${k}`);
  // and a new action's fields are exactly the keys the rules allow
  const built = buildNewAction({ orgId: 'org1', actor: CRE, input: { project_id: 'proj', title: 't', kind: 'corrective', priority: 'low', owner_id: 'w', due_date: '2026-12-01', source: { type: 'manual' } }, year: 2026, n: 1, now: NOW });
  for (const k of Object.keys(built.action)) assert.ok((CREATE_KEYS as readonly string[]).includes(k), `create key ${k}`);
  for (const k of CREATE_REQUIRED) assert.ok(k in built.action, `required ${k}`);
});

// ─── numbering (shared) ───────────────────────────────────────────────────

test('numbering: permits keep their ids, actions use their own counter', () => {
  assert.equal(counterDocId('act', 'org1', 2026), 'act_org1_2026');
  assert.equal(counterDocId('ptw', 'org1', 2026), 'ptw_org1_2026');
  assert.equal(ptwCounterId('org1', 2026), 'ptw_org1_2026', 'the live permit counters keep working');
  assert.equal(formatPermitNo(2026, 7), 'PTW-2026-0007');
  assert.equal(formatNumber('act', 2026, 12), 'ACT-2026-0012');
  assert.equal(formatNumber('act', 2026, 12345), 'ACT-2026-12345');
  assert.deepEqual(parseNumber('act', 'act-2026-0012'), { year: 2026, n: 12 });
  assert.equal(parseNumber('act', 'PTW-2026-0012'), null);
  assert.deepEqual(parsePermitNo('PTW-2026-0007'), { year: 2026, n: 7 });
});

// ─── dates ────────────────────────────────────────────────────────────────

test('dates: only real calendar dates are valid', () => {
  for (const ok of ['2026-11-21', '2024-02-29', '2026-12-31']) assert.ok(isValidDate(ok), ok);
  for (const bad of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-1-1', '21/11/2026', '', 'tomorrow', null, 20261121, '2026-11-21T00:00:00Z']) assert.ok(!isValidDate(bad), String(bad));
});

test('overdue: computed from the due date and today, never stored; in every time zone', () => {
  // local-time moments: the same calendar answer wherever the test runs
  const lateEvening = new Date(2026, 10, 14, 23, 59, 59).getTime();
  const justAfterMidnight = new Date(2026, 10, 15, 0, 0, 1).getTime();
  assert.equal(ymd(lateEvening), '2026-11-14');
  assert.equal(ymd(justAfterMidnight), '2026-11-15');
  const today = ymd(lateEvening);
  assert.equal(isOverdue({ status: 'OPEN', due_date: '2026-11-14' }, today), false, 'due today is not overdue');
  assert.equal(isOverdue({ status: 'OPEN', due_date: '2026-11-13' }, today), true);
  assert.equal(isOverdue({ status: 'IN_PROGRESS', due_date: '2026-11-13' }, today), true);
  for (const s of ['COMPLETED', 'CLOSED', 'CANCELLED']) assert.equal(isOverdue({ status: s, due_date: '2020-01-01' }, today), false, s);
  assert.equal(isOverdue({ status: 'OPEN', due_date: '' as any }, today), false, 'no date, no overdue');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysUntil('2026-11-21', '2026-11-14'), 7);
  assert.equal(daysUntil('2026-11-13', '2026-11-14'), -1);
  assert.equal(daysUntil('2026-11-14', '2026-11-14'), 0);
  assert.equal(daysUntil('2027-03-01', '2026-03-01'), 365, 'no daylight-saving drift');
});

test('overdue: closing times and the summary', () => {
  assert.equal(toMillis({ toMillis: () => 5 }), 5);
  assert.equal(toMillis({ seconds: 2 }), 2000);
  assert.equal(toMillis('2026-11-14T08:00:00Z'), Date.UTC(2026, 10, 14, 8));
  assert.ok(Number.isNaN(toMillis(undefined)));
  const closedLocal = new Date(2026, 10, 10, 12, 0).getTime();
  const base = { status: 'CLOSED', due_date: '2026-11-12' };
  assert.equal(closedOnTime({ ...base, verification: { at: { toMillis: () => closedLocal } } }), true);
  assert.equal(closedOnTime({ ...base, due_date: '2026-11-09', verification: { at: { toMillis: () => closedLocal } } }), false);
  assert.equal(closedOnTime({ ...base, legacy: { verified_at: new Date(closedLocal).toISOString() } }), true, 'an imported action uses its old record');
  assert.equal(closedOnTime({ ...base }), false, 'unknown close time is not counted as on time');
  const list = [
    { status: 'OPEN', due_date: '2026-11-01' }, { status: 'IN_PROGRESS', due_date: '2026-12-01' }, { status: 'COMPLETED', due_date: '2026-10-01' },
    { status: 'CLOSED', due_date: '2026-11-12', verification: { at: { toMillis: () => closedLocal } } }, { status: 'CANCELLED', due_date: '2026-10-01' },
  ];
  const s = summarize(list as any, '2026-11-14');
  assert.deepEqual({ total: s.total, live: s.live, overdue: s.overdue, closed: s.closed, closedOnTime: s.closedOnTime }, { total: 5, live: 2, overdue: 1, closed: 1, closedOnTime: 1 });
  assert.equal(s.byStage.COMPLETED, 1);
});

// ─── new actions ──────────────────────────────────────────────────────────

test('validateNewAction: cleans what it can and reports every problem in plain words', () => {
  const good = validateNewAction({ project_id: ' proj ', title: '  Fix the rail  ', description: ' ', kind: 'corrective', priority: 'high', owner_id: 'w', due_date: '2026-11-21', source: { type: 'incident', id: ' rep_1 ', ref: ' Near miss ' }, car: { root_cause: '  worn ', effectiveness_plan: '' } });
  assert.ok(good.ok === true);
  assert.deepEqual((good as any).value, {
    project_id: 'proj', title: 'Fix the rail', kind: 'corrective', priority: 'high', owner_id: 'w', due_date: '2026-11-21',
    source: { type: 'incident', id: 'rep_1', ref: 'Near miss' }, car: { root_cause: 'worn' },
  });
  const manual = validateNewAction({ project_id: 'p', title: 't', kind: 'preventive', priority: 'low', owner_id: 'w', due_date: '2026-11-21' });
  assert.ok(manual.ok === true && (manual as any).value.source.type === 'manual');
  const bad = validateNewAction({ title: '', kind: 'urgent', priority: 'asap', due_date: '2026-02-30', source: { type: 'incident' } });
  assert.ok(bad.ok === false);
  const text = (bad as any).problems.join(' | ');
  for (const needle of ['title', 'project', 'owner', 'due date', 'type', 'priority', 'source']) assert.match(text, new RegExp(needle, 'i'), needle);
  const long = validateNewAction({ project_id: 'p', title: 'x'.repeat(201), description: 'x'.repeat(4001), kind: 'corrective', priority: 'low', owner_id: 'w', due_date: '2026-11-21', car: { root_cause: 'x'.repeat(2001) } });
  assert.ok(long.ok === false && (long as any).problems.length === 3);
  assert.ok(canCreate(REV) && canCreate(ADM) && !canCreate(W) && !canCreate(VIEW));
});

// ─── actors and available steps ───────────────────────────────────────────

test('checkActor: roles, the owner, the creator, and segregation of duties', () => {
  const a = doc({ status: 'COMPLETED', completion: { by: 'rev' } });
  assert.ok(checkActor(ACTIONS.start, doc(), W).ok === true);
  const notOwner = checkActor(ACTIONS.start, doc(), CRE);
  assert.ok(notOwner.ok === false && /assigned to/.test((notOwner as any).reason));
  const noOwner = checkActor(ACTIONS.start, doc({ owner_id: '' }), W);
  assert.ok(noOwner.ok === false && /no owner/.test((noOwner as any).reason));
  const viewer = checkActor(ACTIONS.add_note, doc(), VIEW);
  assert.ok(viewer.ok === false && /role/.test((viewer as any).reason));
  // the person who recorded the completion cannot verify it, nor can the owner
  const self = checkActor(ACTIONS.verify, a, REV);
  assert.ok(self.ok === false && /recorded its completion/.test((self as any).reason));
  const owner = checkActor(ACTIONS.verify, { ...a, owner_id: 'app' }, APP);
  assert.ok(owner.ok === false && /You own this action/.test((owner as any).reason));
  assert.ok(checkActor(ACTIONS.verify, a, APP).ok === true);
  // an administrator can override, in writing
  const adminOwned = { ...a, owner_id: 'adm' };
  const need = checkActor(ACTIONS.verify, adminOwned, ADM);
  assert.ok(need.ok === false && (need as any).overridable === true && /written justification/.test((need as any).reason));
  assert.ok(checkActor(ACTIONS.verify, adminOwned, ADM, 'short').ok === false, 'a short justification is not enough');
  const ok = checkActor(ACTIONS.verify, adminOwned, ADM, 'No other reviewer on this small site');
  assert.ok(ok.ok === true && (ok as any).override === true);
  // an approver is not an administrator
  const mgr = checkActor(ACTIONS.verify, { ...a, owner_id: 'app' }, APP, 'I own it but I am the manager');
  assert.ok(mgr.ok === false && !(mgr as any).overridable);
  // only the creator can withdraw
  assert.ok(checkActor(ACTIONS.withdraw, doc(), CRE).ok === true);
  assert.ok(checkActor(ACTIONS.withdraw, doc(), REV).ok === false);
});

test('availableActions: what is offered at each stage, and why the rest is not', () => {
  const ids = (a: ActionDoc, who: typeof W) => availableActions(a, who).filter(o => o.enabled).map(o => o.def.id).sort();
  assert.deepEqual(ids(doc(), W), ['add_note', 'complete', 'start']);
  assert.deepEqual(ids(doc(), CRE), ['add_note', 'reschedule', 'withdraw']);
  assert.deepEqual(ids(doc({ status: 'IN_PROGRESS' }), W), ['add_note', 'complete']);
  assert.deepEqual(ids(doc({ status: 'COMPLETED', completion: { by: 'w' } }), REV), ['add_note', 'send_back', 'verify']);
  assert.deepEqual(ids(doc({ status: 'COMPLETED', completion: { by: 'w' } }), W), ['add_note'], 'the owner cannot verify');
  assert.deepEqual(ids(doc({ status: 'CLOSED' }), APP), ['reopen']);
  assert.deepEqual(ids(doc({ status: 'CANCELLED' }), REV), []);
  assert.deepEqual(ids(doc({ status: 'OPEN' }), VIEW), []);
  const w = availableActions(doc({ status: 'COMPLETED', completion: { by: 'w' } }), W).find(o => o.def.id === 'verify')!;
  assert.ok(!w.enabled && /role|own this/.test(w.reason!));
  assert.deepEqual(availableActions(doc({ status: 'NONSENSE' }), W), []);
});

test('awaitingFor: the "Awaiting me" tab', () => {
  assert.equal(awaitingFor(doc(), W), 'do');
  assert.equal(awaitingFor(doc({ status: 'IN_PROGRESS' }), W), 'do');
  assert.equal(awaitingFor(doc(), REV), null);
  assert.equal(awaitingFor(doc({ status: 'COMPLETED', completion: { by: 'w' } }), REV), 'verify');
  assert.equal(awaitingFor(doc({ status: 'COMPLETED', completion: { by: 'w' } }), W), null);
  assert.equal(awaitingFor(doc({ status: 'COMPLETED', completion: { by: 'rev' } }), REV), null, 'not the person who recorded the completion');
  assert.equal(awaitingFor(doc({ status: 'COMPLETED', owner_id: 'adm' }), ADM), null, 'an administrator who owns it is not "awaited" to verify it');
  assert.equal(awaitingFor(doc({ status: 'CLOSED' }), W), null);
});

// ─── transitions ──────────────────────────────────────────────────────────

test('prepareTransition: the result, the log entry, and nothing mutated', () => {
  const a = Object.freeze(doc({ history: Object.freeze([...doc().history!]) as any }));
  const r = prepareTransition({ action: a, step: 'complete', actor: W, now: NOW, note: '  Rail replaced and tested  ' });
  assert.ok(r.ok === true);
  const t = r as Extract<typeof r, { ok: true }>;
  assert.equal(t.from, 'OPEN'); assert.equal(t.to, 'COMPLETED'); assert.equal(t.override, false);
  assert.deepEqual(t.record, { field: 'completion', by: 'w', note: 'Rail replaced and tested' });
  assert.deepEqual(t.log, { action: 'complete', from: 'OPEN', stage: 'COMPLETED', user_id: 'w', user_name: 'Worker', role: 'WORKER', timestamp: new Date(NOW).toISOString(), note: 'Rail replaced and tested' });
  const start = prepareTransition({ action: a, step: 'start', actor: W, now: NOW }) as any;
  assert.ok(start.ok === true && !('note' in start.log) && !start.record);
  // refusals say why
  const cases: Array<[string, Parameters<typeof prepareTransition>[0], RegExp]> = [
    ['unknown step', { action: a, step: 'nope' as any, actor: W, now: NOW }, /Unknown step/],
    ['an old action', { action: { ...a, number: undefined }, step: 'start', actor: W, now: NOW }, /read-only/],
    ['an unknown status', { action: { ...a, status: 'WEIRD' }, step: 'start', actor: W, now: NOW }, /unrecognised status/],
    ['the wrong stage', { action: a, step: 'verify', actor: REV, now: NOW, note: 'a good note' }, /not available while/],
    ['no note', { action: a, step: 'complete', actor: W, now: NOW }, /written note/],
    ['a short note', { action: a, step: 'complete', actor: W, now: NOW, note: 'ok' }, /written note/],
    ['a note that is too long', { action: a, step: 'add_note', actor: W, now: NOW, note: 'x'.repeat(1001) }, /too long/],
    ['the wrong person', { action: a, step: 'start', actor: REV, now: NOW }, /assigned to/],
  ];
  for (const [what, input, re] of cases) { const x: any = prepareTransition(input); assert.ok(x.ok === false && re.test(x.reason), `${what}: ${x.reason}`); }
  assert.deepEqual(a.history!.length, 1, 'the history of the input was not touched');
});

test('prepareTransition: reschedule validates and records exactly what changed', () => {
  const run = (changes: any, who = REV) => prepareTransition({ action: doc(), step: 'reschedule', actor: who, now: NOW, note: 'Moving it as agreed', changes }) as any;
  const r = run({ due_date: '2026-12-01', owner_id: 'creator', priority: 'critical', title: 'ignored' });
  assert.ok(r.ok === true && r.to === 'OPEN' && r.from === 'OPEN');
  assert.deepEqual(r.patch, { due_date: '2026-12-01', owner_id: 'creator', priority: 'critical' });
  assert.deepEqual(r.log.changes, { due_date: { from: '2026-11-21', to: '2026-12-01' }, owner_id: { from: 'w', to: 'creator' }, priority: { from: 'high', to: 'critical' } });
  assert.deepEqual(run({ due_date: '2026-11-21', priority: 'high' }).reason, 'Nothing to change: pick a different owner, due date or priority.');
  assert.match(run({ due_date: '2026-02-30' }).reason, /real date/);
  assert.match(run({ owner_id: '  ' }).reason, /owner/);
  assert.match(run({ priority: 'urgent' }).reason, /priority/);
  assert.ok(run({ due_date: '2026-12-01' }, W).ok === false, 'a worker cannot reschedule');
  assert.deepEqual(run({ due_date: ' 2026-12-01 ' }).patch, { due_date: '2026-12-01' }, 'values are trimmed');
});

test('checkContentEdit: mirrors the database rule', () => {
  assert.deepEqual(checkContentEdit(doc(), CRE), { ok: true, scope: 'all' });
  assert.deepEqual(checkContentEdit(doc(), APP), { ok: true, scope: 'all' });
  assert.deepEqual(checkContentEdit(doc(), REV), { ok: true, scope: 'car' });
  assert.ok(checkContentEdit(doc(), W).ok === false, 'the owner may not rewrite the task');
  assert.ok(checkContentEdit(doc({ owner_id: 'rev' }), REV).ok === false, 'a reviewer who owns it may not edit it either');
  assert.ok(checkContentEdit(doc(), VIEW).ok === false);
  assert.ok(checkContentEdit(doc({ status: 'CLOSED' }), CRE).ok === false);
  assert.ok(checkContentEdit(doc({ status: 'COMPLETED' }), CRE).ok === true);
  assert.ok(checkContentEdit(doc({ number: undefined }), CRE).ok === false);
});

// ─── write plans ──────────────────────────────────────────────────────────

test('planTransitionWrite: appends to the history, stamps server time, and touches the stage time only when the stage changes', () => {
  const a = doc({ status: 'IN_PROGRESS' });
  const complete = prepareTransition({ action: a, step: 'complete', actor: W, now: NOW, note: 'Done and tested' }) as any;
  const { update } = planTransitionWrite(a, complete);
  assert.equal(update.status, 'COMPLETED');
  assert.equal((update.history as any[]).length, 2);
  assert.equal(update.last_transition_at, SERVER_TIME);
  assert.equal(update.updated_at, SERVER_TIME);
  assert.equal(update['stage_times.COMPLETED'], SERVER_TIME);
  assert.deepEqual(update.completion, { by: 'w', at: SERVER_TIME, note: 'Done and tested' });
  const note = prepareTransition({ action: a, step: 'add_note', actor: REV, now: NOW, note: 'Checked the progress' }) as any;
  const n = planTransitionWrite(a, note).update;
  assert.ok(!('status' in n) && !Object.keys(n).some(k => k.startsWith('stage_times')), 'a note leaves the stage and its time alone');
  assert.equal(a.history!.length, 1, 'the input history is not mutated');
});

test('planContentWrite: only what the editor changed, leaf by leaf; nothing when nothing changed', () => {
  const a = doc({ description: 'Level 3', car: { root_cause: 'Worn bracket', effectiveness_plan: 'Re-inspect' } });
  assert.equal(planContentWrite(a, { title: a.title, description: 'Level 3' }).changed, false);
  const t = planContentWrite(a, { title: '  New title  ' });
  assert.deepEqual(Object.keys(t.update).sort(), ['title', 'updated_at']);
  assert.equal(t.update.title, 'New title');
  // the editor changed one CAR leaf; the other leaf changed on the server meanwhile and is not overwritten
  const base = { car: { root_cause: 'Worn bracket', effectiveness_plan: 'Re-inspect' } };
  const serverNow = doc({ car: { root_cause: 'Worn bracket', effectiveness_plan: 'Re-inspect in 14 days' } });
  const c = planContentWrite(serverNow, { car: { root_cause: 'Corroded bracket', effectiveness_plan: 'Re-inspect' } }, base);
  assert.deepEqual(Object.keys(c.update).sort(), ['car.root_cause', 'updated_at']);
  // clearing a field deletes just that leaf
  const d = planContentWrite(a, { car: { root_cause: 'Worn bracket' } });
  assert.ok(d.changed && 'car.effectiveness_plan' in d.update);
  assert.ok(validateContent({ title: '' }).ok === false && validateContent({ title: 'ok', description: 'x'.repeat(4001) }).ok === false && validateContent({ car: { root_cause: 'x'.repeat(2001) } }).ok === false);
  assert.ok(validateContent({ title: 'ok', description: '', car: {} }).ok === true);
});

// ─── notifications ────────────────────────────────────────────────────────

test('planNotifications: who is told, never the person who acted, never the wrong organisation', () => {
  const users: NotifyUser[] = [
    { id: 'w', org_id: 'org1', role: 'WORKER', project_ids: ['proj'], status: 'active' },
    { id: 'creator', org_id: 'org1', role: 'SUPERVISOR', project_ids: ['proj'], status: 'active' },
    { id: 'rev', org_id: 'org1', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'active' },
    { id: 'rev2', org_id: 'org1', role: 'HSE_OFFICER', project_ids: ['elsewhere'], status: 'active' },
    { id: 'gone', org_id: 'org1', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'suspended' },
    { id: 'app', org_id: 'org1', role: 'HSE_MANAGER', project_ids: ['proj'], status: 'active' },
    { id: 'adm', org_id: 'org1', role: 'ORG_ADMIN', project_ids: [], status: 'active' },
    { id: 'v', org_id: 'org1', role: 'CLIENT_VIEWER', project_ids: ['proj'], status: 'active' },
    { id: 'other', org_id: 'org2', role: 'HSE_MANAGER', project_ids: ['proj'], status: 'active' },
  ];
  const a = { ...doc(), id: 'a1' };
  const who = (step: any, o: Record<string, unknown> = {}) => planNotifications({ action: a, step, to: 'OPEN', actorId: 'nobody', users, ...o }).map(n => n.user_id).sort();
  assert.deepEqual(who('create'), ['w']);
  assert.deepEqual(who('start'), ['creator']);
  assert.deepEqual(who('complete'), ['adm', 'app', 'creator', 'rev'], 'the creator and the reviewers of the project (not the owner, not viewers, not other projects, not other organisations)');
  assert.deepEqual(who('verify'), ['creator', 'w']);
  assert.deepEqual(who('send_back'), ['w']);
  assert.deepEqual(who('cancel'), ['creator', 'w']);
  assert.deepEqual(who('reschedule', { prevOwnerId: 'rev' }), ['rev', 'w']);
  assert.deepEqual(who('complete', { actorId: 'creator' }), ['adm', 'app', 'rev'], 'never the person who did it');
  const n = planNotifications({ action: a, step: 'cancel', to: 'CANCELLED', actorId: 'app', users, note: 'Area demolished, no longer needed' });
  assert.ok(n.every(x => x.org_id === 'org1' && x.link_page === 'actions' && x.link_id === 'a1' && x.title.startsWith('ACT-2026-0001')));
  assert.match(n[0].message, /was cancelled\. Reason: Area demolished/);
  assert.equal(n[0].severity, 'warning');
  assert.equal(planNotifications({ action: a, step: 'create', to: 'OPEN', actorId: 'x', users })[0].type, 'capa_assigned', 'raised from an incident');
  assert.equal(planNotifications({ action: { ...a, source: { type: 'manual' } }, step: 'create', to: 'OPEN', actorId: 'x', users })[0].type, 'action_assigned');
  assert.equal(planNotifications({ action: a, step: 'verify', to: 'CLOSED', actorId: 'x', users })[0].severity, 'success');
  // a large organisation: capped
  const crowd: NotifyUser[] = Array.from({ length: 60 }, (_, i) => ({ id: `r${i}`, org_id: 'org1', role: 'HSE_OFFICER', project_ids: ['proj'], status: 'active' }));
  assert.equal(planNotifications({ action: a, step: 'complete', to: 'COMPLETED', actorId: 'x', users: crowd }).length, 25);
});
