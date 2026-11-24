// actionsService.ts end to end. The service runs unchanged against an in-memory Firestore
// (tests/helpers/fakeFirestore.ts) whose every write is judged by the GENERATED rules, so this exercises: the
// transaction that numbers actions, server-time stamping, fresh reads before acting, concurrent changes,
// leaf-level saves, the live list's query scope, and notifications.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { fake, onSnapshot } from './helpers/fakeFirestore';
import { Ts } from './helpers/rulesSim';
import { H, MIN, P, T0, newWorld, sample, type Person } from './helpers/actionFixtures';
import {
  createAction, describeActionError, performStep, saveActionContent, subscribeActions,
} from '../src/services/actionsService';
import type { ActionId } from '../src/lib/actions/model';
import { LEGACY_MESSAGE } from '../src/lib/actions/engine';

const realNow = Date.now;
const clock = { now: T0 };
beforeEach(() => {
  Date.now = () => clock.now;
  clock.now = T0;
  fake.world = newWorld();
  fake.uid = P.creator.uid;
  fake.serverNow = T0;
  fake.notifications = [];
  fake.deniedNotifications = [];
  fake.lastDenied = null;
});
process.on('exit', () => { Date.now = realNow; });

const actor = (p: Person) => ({ id: p.id, name: p.name, role: p.role });
const orgUsers = Object.values(P).map(p => ({ id: p.id, org_id: p.org, role: p.role, project_ids: p.projects, status: 'active' }));
function at(ms: number) { clock.now = ms; fake.serverNow = ms; }
const tick = (mins = 10) => at(clock.now + mins * MIN);

async function make(o: { who?: Person; over?: Record<string, unknown> } = {}) {
  const who = o.who ?? P.creator;
  fake.uid = who.uid;
  const r = await createAction({ actor: actor(who), orgId: who.org, input: sample({ owner_id: P.worker.id, ...(o.over as object) }), orgUsers });
  assert.ok(r.ok === true, r.ok === false ? r.reason : '');
  return (r as any).action;
}
async function step(who: Person, id: string, s: ActionId, o: { note?: string; justification?: string; changes?: any } = {}) {
  fake.uid = who.uid;
  tick();
  return performStep({ actionId: id, step: s, actor: actor(who), note: o.note ?? 'a note that is long enough', justification: o.justification, changes: o.changes, orgUsers });
}
const mustOk = (r: any, label: string) => assert.ok(r.ok === true, `${label}: ${r.reason}`);
const settle = () => new Promise(r => setTimeout(r, 0));

/** Captures console.error for the duration of a callback. */
async function withErrors<T>(fn: () => Promise<T>): Promise<{ value: T; errors: unknown[][] }> {
  const orig = console.error;
  const errors: unknown[][] = [];
  console.error = (...a: unknown[]) => { errors.push(a); };
  try { return { value: await fn(), errors }; } finally { console.error = orig; }
}

// ─── creating ─────────────────────────────────────────────────────────────

test('createAction: numbers actions ACT-YYYY-NNNN in sequence, OPEN, server-stamped, owner notified', async () => {
  const a = await make();
  const b = await make({ who: P.approver });
  assert.equal(a.number, 'ACT-2026-0001');
  assert.equal(b.number, 'ACT-2026-0002');
  assert.equal(a.status, 'OPEN');
  assert.equal(a.creator_id, 'creator');
  assert.equal(a.history.length, 1);
  assert.ok(a.created_at instanceof Ts && a.last_transition_at instanceof Ts && a.stage_times.OPEN instanceof Ts);
  assert.equal(fake.world.docs['/counters/act_org1_2026'].value, 2);
  await settle();
  // the owner (worker) is told; the creator is not told about their own action
  const first = fake.notifications.filter(n => n.message.includes('ACT-2026-0001'));
  assert.deepEqual(first.map(n => n.user_id), [P.worker.id]);
  const n0 = first[0];
  assert.equal(n0.org_id, 'org1');
  assert.equal(n0.type, 'capa_assigned', 'an action raised from an incident');
  assert.equal(n0.read, false);
  assert.equal(n0.link_page, 'actions');
  assert.ok(n0.link_id);
  assert.equal(fake.deniedNotifications.length, 0, 'the database accepted every notification');
});

test('createAction: refuses a role that cannot raise actions, and bad input, before touching the database', async () => {
  fake.uid = P.worker.uid;
  const denied = await createAction({ actor: actor(P.worker), orgId: 'org1', input: sample() });
  assert.ok(denied.ok === false && /cannot raise actions/.test(denied.reason));
  fake.uid = P.creator.uid;
  const bad = await createAction({ actor: actor(P.creator), orgId: 'org1', input: sample({ title: '', owner_id: '', due_date: 'soon' }) });
  assert.ok(bad.ok === false);
  assert.match((bad as any).reason, /title/i);
  assert.match((bad as any).reason, /owner/i);
  assert.match((bad as any).reason, /due date/i);
  assert.equal(Object.keys(fake.world.docs).filter(k => k.startsWith('/actions/')).length, 0);
  assert.equal(fake.world.docs['/counters/act_org1_2026'], undefined, 'no number was consumed');
});

test('createAction: a database refusal is logged with its code and explained to the person', async () => {
  // a project the person is not on: the engine allows it, the database does not
  fake.uid = P.otherProj.uid;
  const { value, errors } = await withErrors(() => createAction({ actor: actor(P.otherProj), orgId: 'org1', input: sample({ project_id: 'proj' }) }));
  assert.ok(value.ok === false);
  assert.match((value as any).reason, /database refused/i);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0][0]), /^\[ACTIONS\] create action failed/);
  assert.equal((errors[0][1] as any).code, 'permission-denied');
  assert.equal(fake.world.docs['/counters/act_org1_2026'], undefined, 'the counter did not move');
});

// ─── steps ────────────────────────────────────────────────────────────────

test('performStep: the whole route, and the right people are told at each step', async () => {
  const a = await make();
  const id = a.id;
  fake.notifications = [];
  mustOk(await step(P.worker, id, 'start'), 'start');
  await settle();
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['creator'], 'the creator hears that work started');

  fake.notifications = [];
  mustOk(await step(P.reviewer, id, 'add_note', { note: 'Contractor confirmed the delivery date' }), 'note');
  await settle();
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['creator', 'w'], 'owner and creator hear about a note');

  fake.notifications = [];
  mustOk(await step(P.worker, id, 'complete', { note: 'Rail replaced and load tested' }), 'complete');
  await settle();
  const told = fake.notifications.map(n => n.user_id).sort();
  assert.ok(told.includes('creator') && told.includes('rev') && told.includes('app'), `creator and reviewers hear it needs verifying: ${told}`);
  assert.ok(!told.includes('w'), 'not the owner who did it');
  assert.ok(!told.includes('v'), 'never a client viewer');

  const sent = await step(P.reviewer, id, 'send_back', { note: 'Bracket still loose' });
  mustOk(sent, 'send back');
  mustOk(await step(P.worker, id, 'complete', { note: 'Bracket re-fixed' }), 'complete again');
  fake.notifications = [];
  const verified = await step(P.reviewer, id, 'verify', { note: 'Inspected, secure' });
  mustOk(verified, 'verify');
  await settle();
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['creator', 'w'], 'owner and creator hear it is closed');
  const closed = (verified as any).action;
  assert.equal(closed.status, 'CLOSED');
  assert.equal(closed.verification.by, P.reviewer.id);
  assert.ok(closed.verification.at instanceof Ts, 'the verification time is the SERVER time');
  assert.equal(closed.history.length, 7);
  assert.deepEqual(closed.history.map((h: any) => h.action), ['create', 'start', 'add_note', 'complete', 'send_back', 'complete', 'verify']);
  assert.equal(fake.deniedNotifications.length, 0);

  mustOk(await step(P.approver, id, 'reopen', { note: 'Defect found again' }), 'reopen');
  const r = await step(P.approver, id, 'cancel', { note: 'Area demolished' });
  mustOk(r, 'cancel');
  assert.equal((r as any).action.status, 'CANCELLED');
});

test('performStep: the engine refuses, with the reason, before the database is asked', async () => {
  const a = await make();
  const before = JSON.stringify(fake.world.docs[`/actions/${a.id}`]);
  let r: any = await step(P.creator, a.id, 'start'); // the creator is not the owner
  assert.ok(r.ok === false && /assigned to/.test(r.reason), r.reason);
  r = await step(P.worker, a.id, 'verify'); // wrong stage
  assert.ok(r.ok === false && /not available while/.test(r.reason), r.reason);
  r = await step(P.worker, a.id, 'complete', { note: 'ok' }); // note too short
  assert.ok(r.ok === false && /written note/.test(r.reason), r.reason);
  r = await step(P.viewer, a.id, 'add_note');
  assert.ok(r.ok === false && /role/.test(r.reason), r.reason);
  assert.equal(JSON.stringify(fake.world.docs[`/actions/${a.id}`]), before, 'nothing was written');
});

test('performStep: segregation of duties, and an administrator override with a written reason', async () => {
  const a = await make({ over: { owner_id: P.orgAdmin.id } });
  mustOk(await step(P.orgAdmin, a.id, 'complete', { note: 'Done by me' }), 'complete');
  let r: any = await step(P.orgAdmin, a.id, 'verify', { note: 'Looks fine to me' });
  assert.ok(r.ok === false && /segregation of duties/.test(r.reason), r.reason);
  r = await step(P.orgAdmin, a.id, 'verify', { note: 'Looks fine to me', justification: 'No other reviewer on this small site' });
  mustOk(r, 'override');
  assert.equal(r.override, true);
  assert.equal(r.action.history.at(-1).override, true);
  assert.equal(r.action.status, 'CLOSED');
});

test('performStep: two people acting at once: one wins, the other is refused and the real error is logged', async () => {
  const a = await make();
  fake.uid = P.worker.uid;
  const { value, errors } = await withErrors(async () => {
    tick();
    // both read the action as OPEN, before either writes
    const p1 = performStep({ actionId: a.id, step: 'start', actor: actor(P.worker), orgUsers });
    fake.uid = P.approver.uid;
    const p2 = performStep({ actionId: a.id, step: 'cancel', actor: actor(P.approver), note: 'Not needed any more', orgUsers });
    return Promise.all([p1, p2]);
  });
  const [r1, r2] = value as any[];
  assert.equal([r1, r2].filter(r => r.ok === true).length, 1, 'exactly one change got in');
  const loser = [r1, r2].find(r => r.ok === false);
  assert.match(loser.reason, /database refused/i);
  assert.ok(errors.some(e => /^\[ACTIONS\] step .* failed/.test(String(e[0]))), 'the refused write is logged');
  // the history is intact: the winner's one entry, nothing lost
  const doc = fake.world.docs[`/actions/${a.id}`];
  assert.equal(doc.history.length, 2);
});

test('performStep: old, unnumbered actions are read-only', async () => {
  fake.world.seed('/actions/old1', { org_id: 'org1', project_id: 'proj', action: 'Fix the exit sign', owner_id: P.worker.id, due_date: '2026-01-01', status: 'Open' });
  const r: any = await step(P.worker, 'old1', 'start');
  assert.ok(r.ok === false && r.reason === LEGACY_MESSAGE);
  const s: any = await saveActionContent('old1', { title: 'x' }, actor(P.creator));
  assert.ok(s.ok === false && s.reason === LEGACY_MESSAGE);
});

test('performStep: rescheduling changes the owner, the due date and the history, and tells both owners', async () => {
  const a = await make();
  fake.notifications = [];
  const r: any = await step(P.reviewer, a.id, 'reschedule', { note: 'Moving to the night shift crew', changes: { owner_id: P.receiver.id, due_date: '2026-12-15', priority: 'critical' } });
  mustOk(r, 'reschedule');
  assert.equal(r.action.owner_id, P.receiver.id);
  assert.equal(r.action.due_date, '2026-12-15');
  assert.equal(r.action.priority, 'critical');
  assert.deepEqual(r.log.changes.owner_id, { from: P.worker.id, to: P.receiver.id });
  await settle();
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['creator', 'receiver', 'w'].filter(x => x !== 'creator'), 'the new owner and the previous owner');
  const gone = fake.notifications.find(n => n.user_id === P.worker.id)!;
  assert.match(gone.message, /reassigned to someone else/);
  const nothing: any = await step(P.reviewer, a.id, 'reschedule', { note: 'No real change here', changes: { priority: 'critical' } });
  assert.ok(nothing.ok === false && /Nothing to change/.test(nothing.reason));
});

// ─── content edits ────────────────────────────────────────────────────────

test('saveActionContent: who may edit what, and only what changed is written', async () => {
  const a = await make();
  fake.uid = P.creator.uid; tick();
  let r: any = await saveActionContent(a.id, { title: 'Replace the guard rail and toe board' }, actor(P.creator));
  mustOk(r, 'creator edits title');
  assert.equal(r.action.title, 'Replace the guard rail and toe board');
  assert.ok(r.changed);
  // no change: nothing written
  fake.uid = P.creator.uid; tick();
  r = await saveActionContent(a.id, { title: 'Replace the guard rail and toe board' }, actor(P.creator));
  assert.ok(r.ok === true && r.changed === false);
  // a reviewer who is not the owner fills in the CAR section; a title change they try is ignored
  fake.uid = P.reviewer.uid; tick();
  r = await saveActionContent(a.id, { title: 'Hijacked title', car: { root_cause: 'Corroded bracket' } }, actor(P.reviewer));
  mustOk(r, 'reviewer edits CAR');
  assert.equal(r.action.title, 'Replace the guard rail and toe board', 'the reviewer cannot change the title');
  assert.equal(r.action.car.root_cause, 'Corroded bracket');
  // the owner may not edit the definition
  fake.uid = P.worker.uid; tick();
  r = await saveActionContent(a.id, { title: 'My own title' }, actor(P.worker));
  assert.ok(r.ok === false && /Only the person who raised/.test(r.reason), r.reason);
  // invalid content
  fake.uid = P.creator.uid; tick();
  r = await saveActionContent(a.id, { title: '   ' }, actor(P.creator));
  assert.ok(r.ok === false && /cannot be empty/.test(r.reason));
});

test('saveActionContent: two people editing different CAR fields do not overwrite each other', async () => {
  const a = await make();
  // both open the editor on the same version
  const base = { title: a.title, description: a.description ?? '', car: {} as Record<string, string> };
  fake.uid = P.reviewer.uid; tick();
  mustOk(await saveActionContent(a.id, { car: { root_cause: 'Corroded bracket' } }, actor(P.reviewer), base), 'first save');
  fake.uid = P.approver.uid; tick();
  const second: any = await saveActionContent(a.id, { car: { effectiveness_plan: 'Re-inspect in 30 days' } }, actor(P.approver), base);
  mustOk(second, 'second save');
  assert.deepEqual(second.action.car, { root_cause: 'Corroded bracket', effectiveness_plan: 'Re-inspect in 30 days' });
});

test('saveActionContent: a finished action is locked', async () => {
  const a = await make();
  mustOk(await step(P.worker, a.id, 'complete', { note: 'All done and checked' }), 'complete');
  mustOk(await step(P.reviewer, a.id, 'verify', { note: 'Seen on site' }), 'verify');
  fake.uid = P.creator.uid; tick();
  const r: any = await saveActionContent(a.id, { title: 'Too late' }, actor(P.creator));
  assert.ok(r.ok === false && /locked/.test(r.reason), r.reason);
});

// ─── the live list ────────────────────────────────────────────────────────

test('subscribeActions: the query is scoped so the database can prove every document readable', async () => {
  await make();
  await make({ over: { project_id: 'other' } as any, who: P.admin });
  const seen = (scope: Parameters<typeof subscribeActions>[0]) => new Promise<any[]>(resolve => {
    const un = subscribeActions(scope, resolve, () => resolve([]));
    un();
  });
  const all = await seen({ orgId: 'org1', projectIds: null });
  assert.equal(all.length, 2, 'an organisation-wide person sees every project');
  const one = await seen({ orgId: 'org1', projectIds: ['proj'] });
  assert.equal(one.length, 1);
  assert.equal(one[0].project_id, 'proj');
  assert.deepEqual(await seen({ orgId: 'org1', projectIds: [] }), [], 'no projects, nothing');
  assert.deepEqual(await seen({ orgId: 'org2', projectIds: null }), [], 'another organisation');
  assert.equal(typeof onSnapshot, 'function');
});

test('describeActionError: every Firebase code gets a plain sentence', () => {
  for (const code of ['permission-denied', 'aborted', 'unavailable', 'deadline-exceeded', 'failed-precondition', 'not-found', 'resource-exhausted', 'weird']) {
    const s = describeActionError({ code });
    assert.ok(s.length > 20 && !/undefined/.test(s), code);
  }
  assert.match(describeActionError({ code: 'weird' }), /\[ACTIONS\]/, 'the fallback tells the person which console line to send');
});
