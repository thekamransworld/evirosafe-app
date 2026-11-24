// The shared (COMMON) rules: yearly counters and notifications, run through the rules interpreter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ts } from './helpers/rulesSim';
import { ALL_ROLES, P, T0, newWorld, type Person } from './helpers/actionFixtures';
import { mk } from './helpers/ptwFixtures';
import { buildNotification } from '../src/lib/shared/notifications';

const ok = (r: any, what: string) => assert.ok(r.ok === true, `${what}: ${r.ok === false ? r.why : ''}`);
const no = (r: any, what: string) => assert.ok(r.ok === false, `${what}: should be refused`);

// ─── counters ─────────────────────────────────────────────────────────────

test('counters: who may start one, by kind', () => {
  const kinds: Array<[string, readonly string[]]> = [
    ['ptw', ['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR', 'WORKER', 'CUSTOM_SITE_LEAD']],
    ['act', ['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR', 'CUSTOM_SITE_LEAD']],
  ];
  for (const [kind, allowed] of kinds) {
    for (const role of ALL_ROLES) {
      const w = newWorld();
      const p = mk(`x-${role}`, role);
      w.pointer(p.uid, { docId: p.id, org_id: 'org1', role, project_ids: ['proj'] });
      const r = w.commit(p.uid, [{ kind: 'set', path: `/counters/${kind}_org1_2026`, data: { org_id: 'org1', year: 2026, value: 1 } }], T0);
      assert.equal(r.ok, allowed.includes(role), `${kind} counter by ${role}`);
    }
  }
});

test('counters: forgeries are refused', () => {
  const w = newWorld();
  const make = (path: string, data: any, who: Person = P.creator) => w.commit(who.uid, [{ kind: 'set', path, data }], T0);
  ok(make('/counters/ptw_org1_2026', { org_id: 'org1', year: 2026, value: 1 }), 'control');
  no(make('/counters/ptw_org1_2027', { org_id: 'org1', year: 2026, value: 1 }), 'id does not match the year');
  no(make('/counters/ptw_org2_2026', { org_id: 'org2', year: 2026, value: 1 }), 'another organisation');
  no(make('/counters/xyz_org1_2026', { org_id: 'org1', year: 2026, value: 1 }), 'an unknown kind');
  no(make('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 2 }), 'starting at 2');
  no(make('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 1, extra: true }), 'an extra field');
  no(make('/counters/act_org1_2026', { org_id: 'org1', year: '2026', value: 1 }), 'year not a number');
  no(make('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 1 }, P.viewer), 'a client viewer');
  ok(make('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 1 }), 'the act counter by a reviewer');
  // bumps
  const upd = (path: string, data: any, who: Person = P.creator) => w.commit(who.uid, [{ kind: 'update', path, data }], T0);
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 3 }), 'a bump by 2');
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 1 }), 'no bump');
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 0 }), 'a decrement');
  no(upd('/counters/act_org1_2026', { org_id: 'org2', year: 2026, value: 2 }), 'changing the organisation');
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2025, value: 2 }), 'changing the year');
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 2 }, P.worker), 'a worker bumping the act counter');
  no(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 2 }, P.outsider), 'another organisation bumping it');
  ok(upd('/counters/act_org1_2026', { org_id: 'org1', year: 2026, value: 2 }), 'a bump by 1');
  ok(upd('/counters/ptw_org1_2026', { org_id: 'org1', year: 2026, value: 2 }, P.worker), 'a worker bumping the permit counter');
  // never deleted
  for (const p of Object.values(P)) no(w.commit(p.uid, [{ kind: 'delete', path: '/counters/act_org1_2026' }], T0), `delete by ${p.id}`);
  // reads: a missing counter is readable (the first document of a year creates it), others only in scope
  assert.equal(w.canRead(P.creator.uid, '/counters/act_org1_2099'), true, 'a missing counter');
  assert.equal(w.canRead(P.creator.uid, '/counters/act_org1_2026'), true);
  assert.equal(w.canRead(P.outsider.uid, '/counters/act_org1_2026'), false, 'another organisation');
  assert.equal(w.canRead(null, '/counters/act_org1_2026'), false, 'signed out');
});

// ─── notifications ────────────────────────────────────────────────────────

const doc = (user: string, over: Record<string, unknown> = {}) => ({
  ...buildNotification({ org_id: 'org1', user_id: user, type: 'action_assigned', severity: 'info', title: 'ACT-2026-0001 · Fix it', message: 'ACT-2026-0001 was assigned to you.', link_page: 'actions', link_id: 'abc' }, T0),
  ...over,
});

test('notifications: staff of the organisation can write one for a colleague, and nobody else can', () => {
  for (const role of ALL_ROLES) {
    const w = newWorld();
    const p = mk(`x-${role}`, role);
    w.pointer(p.uid, { docId: p.id, org_id: 'org1', role, project_ids: ['proj'] });
    const r = w.commit(p.uid, [{ kind: 'set', path: '/notifications/n1', data: doc('someone') }], T0);
    assert.equal(r.ok, role !== 'CLIENT_VIEWER', `${role} writes a notification`);
  }
  const w = newWorld();
  const make = (data: any, who: Person = P.creator) => w.commit(who.uid, [{ kind: 'set', path: `/notifications/n${Math.random()}`, data }], T0);
  ok(make(doc('rev')), 'control');
  no(make(doc('rev', { org_id: 'org2' })), 'for another organisation');
  ok(make(doc('o', { org_id: 'org2' }), P.admin), 'the platform administrator may write across organisations');
  no(make({ ...doc('rev'), org_id: undefined }), 'no org_id');
  no(make(doc('rev', { read: true })), 'created as already read');
  no(make((({ read, ...rest }) => rest)(doc('rev'))), 'no read flag');
  no(make(doc('rev', { hacked: 1 })), 'an unknown field');
  no(make(doc('')), 'no recipient');
  no(make(doc('rev', { message: 'x'.repeat(601) })), 'a message that is too long');
  no(make(doc('rev', { title: 'x'.repeat(201) })), 'a title that is too long');
  no(make(doc('rev'), P.outsider), 'a person of another organisation writing into org1');
  // what the screens read and order by
  const d: any = doc('rev');
  assert.equal(d.org_id, 'org1'); assert.equal(typeof d.created_at, 'string'); assert.equal(d.read, false); assert.ok(d.title && d.severity);
});

test('notifications: only the recipient reads, marks read, or deletes', () => {
  const w = newWorld();
  w.seed('/notifications/mine', doc(P.reviewer.id));
  // older documents (no org_id, the old field names) are still the recipient's
  w.seed('/notifications/old', { user_id: P.reviewer.id, message: 'old one', type: 'info', is_read: false, timestamp: '2026-01-01T00:00:00Z' });
  for (const id of ['mine', 'old']) {
    assert.equal(w.canRead(P.reviewer.uid, `/notifications/${id}`), true, `the recipient reads ${id}`);
    for (const other of [P.creator, P.approver, P.admin, P.orgAdmin, P.viewer, P.outsider]) assert.equal(w.canRead(other.uid, `/notifications/${id}`), false, `${other.id} must not read ${id}`);
    assert.equal(w.canRead(null, `/notifications/${id}`), false);
  }
  const mine: any = w.docs['/notifications/mine'];
  // marking read
  const mark = (who: Person, data: any, path = '/notifications/mine') => w.commit(who.uid, [{ kind: 'update', path, data }], T0);
  no(mark(P.creator, { ...mine, read: true }), 'somebody else marks it read');
  no(mark(P.admin, { ...mine, read: true }), 'an administrator marks someone else\'s notification read');
  no(mark(P.reviewer, { ...mine, message: 'rewritten' }), 'rewriting the message');
  no(mark(P.reviewer, { ...mine, user_id: P.creator.id }), 'handing it to someone else');
  no(mark(P.reviewer, { ...mine, org_id: 'org2' }), 'moving it to another organisation');
  ok(mark(P.reviewer, { ...mine, read: true, is_read: true, read_at: new Date(T0).toISOString() }), 'the recipient marks it read');
  ok(mark(P.reviewer, { ...w.docs['/notifications/old'], is_read: true }, '/notifications/old'), 'an old document is marked read');
  // deleting
  for (const other of [P.creator, P.admin, P.viewer, P.outsider]) no(w.commit(other.uid, [{ kind: 'delete', path: '/notifications/mine' }], T0), `delete by ${other.id}`);
  ok(w.commit(P.reviewer.uid, [{ kind: 'delete', path: '/notifications/mine' }], T0), 'the recipient deletes it');
});

test('notifications: the time of a notification is never read as a server timestamp', () => {
  // created_at and timestamp are plain ISO strings: nothing in the document needs a Ts.
  const d: any = doc('rev');
  assert.ok(!(d.created_at instanceof Ts));
  assert.match(d.created_at, /^\d{4}-\d{2}-\d{2}T/);
});
