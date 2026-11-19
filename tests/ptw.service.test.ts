// ptwService.ts end to end. The service runs unchanged against an in-memory
// Firestore (tests/helpers/fakeFirestore.ts) whose every write is judged by the
// GENERATED rules, so this exercises: the transaction that numbers permits, the
// batch that writes a permit and its public mirror together, server-time stamping,
// fresh reads before acting, section-level saves, and notifications.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { fake } from './helpers/fakeFirestore';
import { Ts } from './helpers/rulesSim';
import { DAY, H, MIN, P, T0, newWorld, payload, type Person } from './helpers/ptwFixtures';
import {
  createPermit, deleteDraftPermit, describePtwError, expireIfDue, fetchPublicPermit,
  performTransition, savePermitContent,
} from '../src/services/ptwService';
import type { ActionId } from '../src/lib/ptw/model';
import { PUBLIC_MIRROR_KEYS, PERMIT_CREATE_KEYS } from '../src/lib/ptw/model';

// The service reads the device clock with Date.now(); tests drive it.
const realNow = Date.now;
const clock = { now: T0 };
beforeEach(() => {
  Date.now = () => clock.now;
  clock.now = T0;
  fake.world = newWorld();
  fake.uid = P.creator.uid;
  fake.serverNow = T0;
  fake.notifications = [];
  fake.lastDenied = null;
});
process.on('exit', () => { Date.now = realNow; });

const actor = (p: Person) => ({ id: p.id, name: p.name, role: p.role });
const orgUsers = Object.values(P).map(p => ({ id: p.id, org_id: p.org, role: p.role, project_ids: p.projects, status: 'active' }));
const gateInputs = { others: [] as any[], competency: { records: [], courses: [] } };

/** The device clock and the server clock agree, and move together. */
function at(ms: number) { clock.now = ms; fake.serverNow = ms; }
const tick = (mins = 10) => at(clock.now + mins * MIN);

async function make(o: { who?: Person; type?: any; hours?: number; receiver?: string } = {}) {
  const who = o.who ?? P.creator;
  fake.uid = who.uid;
  const r = await createPermit({
    actor: actor(who), orgId: who.org, projectId: 'proj', type: o.type ?? 'General Work',
    title: 'Replace ceiling tiles', payload: payload(clock.now, {}, o.hours ?? 5) as any, receiverId: o.receiver,
  });
  assert.ok(r.ok === true, r.ok === false ? r.reason : '');
  return (r as any).permit;
}

async function act(who: Person, id: string, action: ActionId, o: { note?: string; justification?: string; reauth?: boolean } = {}) {
  fake.uid = who.uid;
  tick();
  return performTransition({
    permitId: id, action, actor: actor(who), note: o.note ?? 'a reason that is long enough',
    justification: o.justification, reauthenticated: o.reauth ?? true, gateInputs, orgUsers,
  });
}
const mustOk = (r: any, label: string) => assert.ok(r.ok === true, `${label}: ${r.reason}`);

// ─── creating ─────────────────────────────────────────────────────────────

test('createPermit: numbers permits PTW-YYYY-NNNN in sequence, with a public mirror, as a DRAFT', async () => {
  const a = await make();
  const b = await make();
  assert.equal(a.permit_no, 'PTW-2026-0001');
  assert.equal(b.permit_no, 'PTW-2026-0002');
  assert.equal(a.status, 'DRAFT');
  assert.equal(a.creator_id, 'creator');
  assert.equal(a.workflow_log.length, 1);
  assert.deepEqual(Object.keys(a).filter(k => k !== 'id').every(k => (PERMIT_CREATE_KEYS as readonly string[]).includes(k)), true);
  const mirror = fake.world.docs[`/ptw_public/${a.public_token}`];
  assert.equal(mirror.permit_no, 'PTW-2026-0001');
  assert.equal(mirror.status, 'DRAFT');
  assert.equal(fake.world.docs['/counters/ptw_org1_2026'].value, 2);
});

test('createPermit: the permit number belongs to the organisation and the year', async () => {
  await make();
  const next = (ms: number) => { at(ms); return make(); };
  const jan = await next(Date.UTC(2027, 0, 5, 7));
  assert.equal(jan.permit_no, 'PTW-2027-0001');
  assert.equal(fake.world.docs['/counters/ptw_org1_2026'].value, 1);
});

test('createPermit: refused for a read-only client viewer, with a message a person can act on', async () => {
  fake.uid = P.viewer.uid;
  const r = await createPermit({ actor: actor(P.viewer), orgId: 'org1', projectId: 'proj', type: 'General Work', title: 'x', payload: payload(T0) as any });
  assert.ok(r.ok === false);
  assert.match((r as any).reason, /refused/i);
  assert.equal(Object.keys(fake.world.docs).filter(k => k.startsWith('/ptws/')).length, 0, 'nothing was written');
});

test('a refused write leaves the real error in the console, naming the operation (the screen only gets a plain message)', async () => {
  const lines: any[][] = [];
  const original = console.error;
  console.error = (...a: any[]) => { lines.push(a); };
  try {
    fake.uid = P.viewer.uid;
    const r = await createPermit({ actor: actor(P.viewer), orgId: 'org1', projectId: 'proj', type: 'General Work', title: 'x', payload: payload(T0) as any });
    assert.ok(r.ok === false);
    const p = await make();                                          // a real draft, then an action the database refuses
    fake.uid = P.worker.uid; tick();
    const bad = await performTransition({ permitId: p.id, action: 'submit', actor: { ...actor(P.creator), role: 'WORKER' }, reauthenticated: true, gateInputs, orgUsers });
    assert.ok(bad.ok === false);
  } finally {
    console.error = original;
  }
  const create = lines.find(l => String(l[0]).includes('create permit failed'));
  assert.ok(create, 'create failure was logged');
  assert.equal(create![1].code, 'permission-denied');
  assert.equal(create![1].actor.role, 'CLIENT_VIEWER');
  assert.equal(create![1].type, 'General Work');
  const action = lines.find(l => String(l[0]).includes('action "submit" failed'));
  assert.ok(action, 'the refused action was logged');
  assert.equal(action![1].from, 'DRAFT');
  assert.ok(action![1].permitId);
});

test('createPermit: tokens are unguessable and unique', async () => {
  const toks = new Set<string>();
  for (let i = 0; i < 20; i++) toks.add((await make()).public_token);
  assert.equal(toks.size, 20);
  for (const t of toks) assert.match(t, /^[A-Za-z0-9]{24}$/);
});

// ─── the whole route, through the service ─────────────────────────────────

test('performTransition: a permit goes from draft to archived, the mirror follows, and the right people are told', async () => {
  const p = await make({ receiver: P.receiver.id });
  const id = p.id;
  mustOk(await act(P.creator, id, 'submit'), 'submit');
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['adm', 'app', 'oadm', 'rev']); // reviewers, not the requesters
  fake.notifications = [];
  mustOk(await act(P.reviewer, id, 'prescreen_pass'), 'prescreen');
  mustOk(await act(P.reviewer, id, 'site_inspection_pass'), 'inspection');
  fake.notifications = [];
  mustOk(await act(P.approver, id, 'approve'), 'approve');
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['creator', 'receiver']);
  const handover = await act(P.creator, id, 'accept_handover');
  mustOk(handover, 'handover');
  const live = (handover as any).permit;
  assert.equal(live.status, 'ACTIVE');
  assert.equal(live.valid_until_ts.toMillis(), T0 + 5 * H, 'valid until the end the requester asked for (not a full 5 h: handover was later)');
  assert.equal(live.valid_from_ts.toMillis(), clock.now, 'start stamped from the SERVER clock');
  mustOk(await act(P.worker, id, 'stop_work', { note: 'Gas smell reported near riser' }), 'stop');
  mustOk(await act(P.reviewer, id, 'resume', { note: 'Source found, ventilated' }), 'resume');
  mustOk(await act(P.reviewer, id, 'revalidate', { note: 'Works running over; re-checked' }), 'revalidate');
  fake.uid = P.creator.uid; tick();
  const saved = await savePermitContent(id, actor(P.creator), { payload: { ...live.payload, joint_inspection: { remarks: 'All clear', requester: { signature: 'Cathy', signed_at: 'x' } } } as any });
  assert.ok(saved.ok === true, saved.ok === false ? saved.reason : '');
  mustOk(await act(P.creator, id, 'request_completion'), 'completion');
  mustOk(await act(P.reviewer, id, 'close'), 'close');
  mustOk(await act(P.approver, id, 'archive'), 'archive');
  const doc = fake.world.docs[`/ptws/${id}`];
  assert.equal(doc.status, 'ARCHIVED');
  assert.equal(doc.workflow_log.length, 12); // create + 11 transitions
  assert.equal(doc.extensions.length, 1);
  assert.equal(fake.world.docs[`/ptw_public/${p.public_token}`].status, 'ARCHIVED');
});

test('notifications always carry the organisation id (without it the rules refuse them and nobody sees them)', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  assert.ok(fake.notifications.length > 0);
  for (const n of fake.notifications) {
    assert.equal(n.org_id, 'org1');
    assert.equal(n.is_read, false);
    assert.ok(n.message.includes('PTW-2026-0001'));
  }
});

test('performTransition: a stale screen cannot act on an old copy', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen by the first reviewer');
  // a second reviewer, whose screen still shows "awaiting pre-screen", presses the same button
  const stale = await act(P.approver, p.id, 'prescreen_pass');
  assert.ok(stale.ok === false);
  assert.match((stale as any).reason, /not available/i);
  assert.equal(fake.world.docs[`/ptws/${p.id}`].workflow_log.length, 3, 'and nothing was written');
});

test('performTransition: engine refusals come back as readable reasons, with the gate results', async () => {
  const p = await make();
  const r = await act(P.creator, p.id, 'prescreen_pass');
  assert.ok(r.ok === false && /raised or received|not available|role/i.test(r.reason), (r as any).reason);
  const bad = await createPermit({ actor: actor(P.creator), orgId: 'org1', projectId: 'proj', type: 'General Work', title: 'No checklist', payload: { ...payload(T0), safety_requirements: [] } as any });
  assert.ok(bad.ok === true);
  fake.uid = P.creator.uid; tick();
  const sub = await performTransition({ permitId: (bad as any).permit.id, action: 'submit', actor: actor(P.creator), gateInputs, orgUsers });
  assert.ok(sub.ok === false && /checklist/i.test(sub.reason));
  assert.ok(sub.ok === false && (sub.gates ?? []).some(g => g.level === 'block'));
});

test('performTransition: signature steps are refused without password confirmation', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen');
  mustOk(await act(P.reviewer, p.id, 'site_inspection_pass'), 'inspection');
  const r = await act(P.approver, p.id, 'approve', { reauth: false });
  assert.ok(r.ok === false && /password/i.test(r.reason));
});

test('performTransition: a database refusal (device clock far off) is explained, not hidden', async () => {
  const p = await make({ type: 'Hot Work', hours: 12 });
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen');
  mustOk(await act(P.reviewer, p.id, 'site_inspection_pass'), 'inspection');
  mustOk(await act(P.approver, p.id, 'approve'), 'approve');
  fake.uid = P.creator.uid;
  tick();
  fake.serverNow = clock.now - 15 * MIN;  // the device clock is 15 minutes FAST
  const r = await performTransition({ permitId: p.id, action: 'accept_handover', actor: actor(P.creator), reauthenticated: true, gateInputs, orgUsers });
  assert.ok(r.ok === false);
  assert.match((r as any).reason, /clock/i);
  assert.equal(fake.world.docs[`/ptws/${p.id}`].status, 'SITE_HANDOVER', 'the permit did not start');
});

test('performTransition: legacy permits (made before the rebuild) are refused plainly', async () => {
  fake.world.seed('/ptws/old', { org_id: 'org1', project_id: 'proj', type: 'Hot Work', status: 'PENDING_APPROVAL', title: 'Old', payload: {}, updated_at: 'x' });
  fake.uid = P.approver.uid;
  const r = await performTransition({ permitId: 'old', action: 'approve', actor: actor(P.approver), reauthenticated: true, gateInputs, orgUsers });
  assert.ok(r.ok === false && /before the new permit system/i.test(r.reason));
  const gone = await performTransition({ permitId: 'missing', action: 'approve', actor: actor(P.approver), gateInputs, orgUsers });
  assert.ok(gone.ok === false && /no longer exists/i.test(gone.reason));
});

// ─── SIMOPS from the server, not from a screen's copy ─────────────────────

test('simops: conflicting permits are fetched fresh when the caller does not supply them', async () => {
  // somebody else's confined-space permit is already running in the same area
  fake.world.seed('/ptws/theirs', {
    org_id: 'org1', project_id: 'proj', type: 'Confined Space Entry', status: 'ACTIVE', permit_no: 'PTW-2026-9001', title: 'Tank entry',
    payload: { work: { location: 'Level 3 corridor', description: 'x', coverage: {} } }, workflow_log: [],
    valid_from_ts: new Ts(T0 - H), valid_until_ts: new Ts(T0 + 8 * H),
  });
  const p = await make({ type: 'Hot Work', hours: 5 });
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen');
  // the reviewer's screen has no idea about the other permit (others: []), but the server does
  fake.uid = P.reviewer.uid; tick();
  const blocked = await performTransition({ permitId: p.id, action: 'site_inspection_pass', actor: actor(P.reviewer), note: 'inspected', gateInputs: { competency: { records: [], courses: [] } }, orgUsers });
  assert.ok(blocked.ok === false, 'a Hot Work permit beside a live confined-space permit must be stopped');
  assert.match((blocked as any).reason, /PTW-2026-9001|same area|must not run together|approver/i);
  // with the (stale) empty list a screen might hold, the conflict is invisible: that is the bug this prevents
  const stale = await performTransition({ permitId: p.id, action: 'site_inspection_pass', actor: actor(P.reviewer), note: 'inspected', gateInputs: { others: [], competency: { records: [], courses: [] } }, orgUsers });
  assert.ok(stale.ok === true, 'control: with no neighbours supplied the same step passes');
});

// ─── expiry ───────────────────────────────────────────────────────────────

async function activePermit(hours = 2) {
  const p = await make({ hours });
  for (const [who, a] of [[P.creator, 'submit'], [P.reviewer, 'prescreen_pass'], [P.reviewer, 'site_inspection_pass'], [P.approver, 'approve'], [P.creator, 'accept_handover']] as Array<[Person, ActionId]>) mustOk(await act(who, p.id, a), a);
  return p.id as string;
}

test('expireIfDue: an overdue permit is marked EXPIRED once; a live one is left alone', async () => {
  const id = await activePermit(2);
  fake.uid = P.worker.uid;
  const read = () => ({ id, ...fake.world.docs[`/ptws/${id}`] }) as any;
  assert.equal(await expireIfDue(read(), actor(P.worker), clock.now), false, 'still valid');
  at(clock.now + 3 * H);
  assert.equal(await expireIfDue(read(), actor(P.worker), clock.now, orgUsers), true);
  assert.equal(fake.world.docs[`/ptws/${id}`].status, 'EXPIRED');
  assert.equal(await expireIfDue(read(), actor(P.worker), clock.now), false, 'already expired: nothing more to do');
  assert.ok(fake.notifications.some(n => /EXPIRED/.test(n.message)), 'the people responsible are told');
});

test('expireIfDue: two browsers racing to expire the same permit produce one expiry, not an error storm', async () => {
  const id = await activePermit(2);
  at(clock.now + 3 * H);
  const stale = { id, ...fake.world.docs[`/ptws/${id}`] } as any; // both browsers hold the same ACTIVE copy
  fake.uid = P.worker.uid;
  const [a, b] = await Promise.all([expireIfDue(stale, actor(P.worker), clock.now), expireIfDue(stale, actor(P.receiver), clock.now)]);
  assert.equal(Number(a) + Number(b), 1, 'exactly one of them did it');
  assert.equal(fake.world.docs[`/ptws/${id}`].workflow_log.filter((l: any) => l.action === 'expire').length, 1);
});

// ─── content edits ────────────────────────────────────────────────────────

test('savePermitContent: only the sections the editor changed are written, so nobody reverts anybody', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen');          // SITE_INSPECTION: staff may record work
  const loaded = { id: p.id, ...fake.world.docs[`/ptws/${p.id}`] }.payload;     // both people open the permit at this moment
  fake.uid = P.worker.uid; tick();
  const a = await savePermitContent(p.id, actor(P.worker), { payload: { ...loaded, gas_tests: [{ time: '10:10', o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: 'Tariq' }] } as any }, loaded);
  assert.ok(a.ok === true, a.ok === false ? a.reason : '');
  fake.uid = P.reviewer.uid; tick();
  // the second person still holds the OLD copy and saves a different section
  const b = await savePermitContent(p.id, actor(P.reviewer), { payload: { ...loaded, isolation: [{ id: '1', point: 'Valve V-12', method: 'Blank' }] } as any }, loaded);
  assert.ok(b.ok === true, b.ok === false ? b.reason : '');
  const now = fake.world.docs[`/ptws/${p.id}`].payload;
  assert.equal(now.gas_tests.length, 1, 'the first person\'s section survived');
  assert.equal(now.isolation.length, 1, 'and so did the second person\'s');
});

test('savePermitContent: a stale copy that lacks a newer section is never taken to mean "delete it"', async () => {
  const id = await activePermit(4);
  const stale = { id, ...fake.world.docs[`/ptws/${id}`] }.payload;               // loaded before anything was stopped
  mustOk(await act(P.worker, id, 'stop_work', { note: 'Gas smell reported near riser' }), 'stop');
  mustOk(await act(P.reviewer, id, 'resume', { note: 'Source found, ventilated' }), 'resume');
  assert.equal(fake.world.docs[`/ptws/${id}`].payload.holding_or_stoppage.length, 1);
  fake.uid = P.creator.uid; tick();
  const r = await savePermitContent(id, actor(P.creator), { payload: { ...stale, notes: 'Added from an old screen' } as any });
  assert.ok(r.ok === true, r.ok === false ? r.reason : '');
  const now = fake.world.docs[`/ptws/${id}`].payload;
  assert.equal(now.notes, 'Added from an old screen');
  assert.equal(now.holding_or_stoppage.length, 1, 'the stoppage record survived');
});

test('savePermitContent: two people adding gas tests at the same moment both keep their rows', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');
  mustOk(await act(P.reviewer, p.id, 'prescreen_pass'), 'prescreen');
  const loaded = { id: p.id, ...fake.world.docs[`/ptws/${p.id}`] }.payload;       // both open the permit now
  const row = (time: string, who: string) => ({ time, o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: who });
  fake.uid = P.worker.uid; tick();
  mustOk(await savePermitContent(p.id, actor(P.worker), { payload: { ...loaded, gas_tests: [row('09:00', 'Tariq')] } as any }, loaded) as any, 'first');
  fake.uid = P.reviewer.uid; tick();
  mustOk(await savePermitContent(p.id, actor(P.reviewer), { payload: { ...loaded, gas_tests: [row('09:05', 'Rita')] } as any }, loaded) as any, 'second, from the same starting point');
  const tests = fake.world.docs[`/ptws/${p.id}`].payload.gas_tests;
  assert.deepEqual(tests.map((r: any) => r.tester_name), ['Tariq', 'Rita'], 'neither person\'s test was lost');
});

test('savePermitContent: different fields of the same section saved from stale screens both survive', async () => {
  const p = await make();
  const loaded = { id: p.id, ...fake.world.docs[`/ptws/${p.id}`] }.payload;
  const a = await savePermitContent(p.id, actor(P.creator), { payload: { ...loaded, work: { ...loaded.work, location: 'Level 9' } } as any }, loaded);
  assert.ok(a.ok === true);
  fake.uid = P.approver.uid; tick();
  const b = await savePermitContent(p.id, actor(P.approver), { payload: { ...loaded, work: { ...loaded.work, emergency_contact: 'Site office 0511111111' } } as any }, loaded);
  assert.ok(b.ok === true, b.ok === false ? b.reason : '');
  const w = fake.world.docs[`/ptws/${p.id}`].payload.work;
  assert.equal(w.location, 'Level 9');
  assert.equal(w.emergency_contact, 'Site office 0511111111');
});

test('savePermitContent: refuses locked stages and the wrong people before touching the database', async () => {
  const p = await make();
  mustOk(await act(P.creator, p.id, 'submit'), 'submit');                       // SUBMITTED: content is frozen
  const locked = await savePermitContent(p.id, actor(P.creator), { payload: { ...p.payload, notes: 'x' } as any });
  assert.ok(locked.ok === false && /locked/i.test(locked.reason), (locked as any).reason);
  const d = await make();
  const wrong = await savePermitContent(d.id, actor(P.reviewer), { title: 'Hijacked title' });
  assert.ok(wrong.ok === false && /raised this draft|receiver|approver/i.test(wrong.reason), (wrong as any).reason);
  assert.equal(fake.world.docs[`/ptws/${d.id}`].title, 'Replace ceiling tiles');
});

test('savePermitContent: changing the location also updates the public page; unchanged content writes nothing', async () => {
  const p = await make();
  const commits = fake.commits;
  const same = await savePermitContent(p.id, actor(P.creator), { payload: p.payload }, p.payload);
  assert.ok(same.ok === true && same.changed === false);
  assert.equal(fake.commits, commits, 'no write for an unchanged save');
  const moved = await savePermitContent(p.id, actor(P.creator), { payload: { ...p.payload, work: { ...p.payload.work, location: 'Level 7 plant room' } } }, p.payload);
  assert.ok(moved.ok === true && moved.changed === true);
  assert.equal(fake.world.docs[`/ptw_public/${p.public_token}`].location, 'Level 7 plant room');
});

test('savePermitContent: a draft can be re-pointed at a different receiver by its owner', async () => {
  const p = await make();
  const r = await savePermitContent(p.id, actor(P.creator), { receiver_id: P.receiver.id });
  assert.ok(r.ok === true, r.ok === false ? r.reason : '');
  assert.equal(fake.world.docs[`/ptws/${p.id}`].receiver_id, 'receiver');
});

// ─── deleting ─────────────────────────────────────────────────────────────

test('deleteDraftPermit: removes the draft and its public page; refuses anything already submitted', async () => {
  const d = await make();
  const del = await deleteDraftPermit(d);
  assert.ok(del.ok === true);
  assert.equal(fake.world.docs[`/ptws/${d.id}`], undefined);
  assert.equal(fake.world.docs[`/ptw_public/${d.public_token}`], undefined);
  const s = await make();
  mustOk(await act(P.creator, s.id, 'submit'), 'submit');
  fake.uid = P.creator.uid;
  const refused = await deleteDraftPermit({ id: s.id, public_token: s.public_token });
  assert.ok(refused.ok === false && /refused/i.test(refused.reason));
  assert.ok(fake.world.docs[`/ptws/${s.id}`], 'still there');
});

// ─── public page and error messages ───────────────────────────────────────

test('fetchPublicPermit: returns the public status only, and rejects malformed tokens without asking the database', async () => {
  const p = await make();
  const r = await fetchPublicPermit(p.public_token);
  assert.ok(r.ok === true);
  if (r.ok === true) {
    for (const k of Object.keys(r.permit)) assert.ok((PUBLIC_MIRROR_KEYS as readonly string[]).includes(k), `unexpected public field ${k}`);
    assert.equal(r.permit.status, 'DRAFT');
  }
  const bad = await fetchPublicPermit('../ptws/abc');
  assert.ok(bad.ok === false && bad.reason === 'not-found');
  const missing = await fetchPublicPermit('A'.repeat(24));
  assert.ok(missing.ok === false && missing.reason === 'not-found');
});

test('describePtwError: plain-language messages, and the clock hint appears for refusals', () => {
  assert.match(describePtwError({ code: 'permission-denied' }), /clock/i);
  assert.match(describePtwError({ code: 'permission-denied' }), /refresh/i);
  assert.match(describePtwError({ code: 'unavailable' }), /connection/i);
  assert.match(describePtwError({ code: 'not-found' }), /no longer exists/i);
  assert.match(describePtwError({ code: 'aborted' }), /another change/i);
  assert.equal(describePtwError(new Error('boom')), 'boom');
});

void DAY;
