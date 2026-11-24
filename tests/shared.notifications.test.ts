// The notification builder and service: the documents carry what the rules and the notification screen need,
// and are accepted by the generated rules. (This is the bug that told nobody anything.)
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { fake } from './helpers/fakeFirestore';
import { P, T0, newWorld } from './helpers/actionFixtures';
import { NOTIFICATION_KEYS, NOTIFICATION_REQUIRED, buildNotification, severityFromTone } from '../src/lib/shared/notifications';
import { notifyRole, sendNotification, writeNotifications } from '../src/services/notificationService';
import { toNotificationInput } from '../src/lib/ptw/notify';

beforeEach(() => {
  fake.world = newWorld();
  fake.uid = P.creator.uid;
  fake.serverNow = T0;
  fake.notifications = [];
  fake.deniedNotifications = [];
});

const input = { org_id: 'org1', user_id: 'rev', type: 'action_assigned' as const, severity: 'info' as const, title: 'T', message: 'M' };

test('buildNotification: both field families, clipped, and nothing the rules do not allow', () => {
  const d: any = buildNotification({ ...input, title: 'x'.repeat(300), message: 'y'.repeat(900), link_page: 'actions', link_id: 'a1' }, T0);
  assert.equal(d.title.length, 200);
  assert.equal(d.message.length, 600);
  assert.equal(d.read, false); assert.equal(d.is_read, false);
  assert.equal(d.created_at, new Date(T0).toISOString());
  assert.equal(d.timestamp, d.created_at);
  assert.equal(d.org_id, 'org1');
  for (const k of Object.keys(d)) assert.ok((NOTIFICATION_KEYS as readonly string[]).includes(k), `key ${k}`);
  for (const k of NOTIFICATION_REQUIRED) assert.ok(k in d, `required ${k}`);
  assert.ok(!('link_page' in buildNotification(input, T0)), 'no link, no link fields');
  assert.equal(severityFromTone('error'), 'critical');
  assert.equal(severityFromTone('warning'), 'warning');
});

test('sendNotification: one document, carrying org_id, accepted by the rules for an ordinary member', async () => {
  for (const who of [P.creator, P.reviewer, P.worker, P.approver]) {
    fake.notifications = []; fake.deniedNotifications = [];
    fake.uid = who.uid;
    await sendNotification('org1', 'someone', 'Your action was closed', 'success', { type: 'action_assigned', title: 'ACT-2026-0001', link_page: 'actions', link_id: 'a1' });
    assert.equal(fake.deniedNotifications.length, 0, `${who.role}: the database accepted it`);
    assert.equal(fake.notifications.length, 1, who.role);
    const n = fake.notifications[0];
    assert.equal(n.org_id, 'org1');
    assert.equal(n.user_id, 'someone');
    assert.equal(n.severity, 'success');
    assert.equal(n.title, 'ACT-2026-0001');
    assert.equal(n.link_page, 'actions');
  }
});

test('sendNotification / notifyRole: nothing is written without an organisation or recipient; a refusal never throws', async () => {
  await sendNotification('', 'someone', 'x');
  await sendNotification('org1', '', 'x');
  await notifyRole('', 'HSE_MANAGER', 'x');
  assert.equal(fake.notifications.length + fake.deniedNotifications.length, 0);
  // a client viewer is refused by the rules: logged, not thrown
  fake.uid = P.viewer.uid;
  const orig = console.error; const logged: unknown[][] = [];
  console.error = (...a: unknown[]) => { logged.push(a); };
  try { await sendNotification('org1', 'someone', 'x'); } finally { console.error = orig; }
  assert.equal(fake.notifications.length, 0);
  assert.equal(fake.deniedNotifications.length, 1);
  assert.ok(logged.some(l => String(l[0]).includes('[notifications] write failed')));
});

test('notifyRole: every active person with the role in the organisation, nobody else', async () => {
  const w = fake.world;
  w.seed('/users/m1', { org_id: 'org1', role: 'HSE_MANAGER', status: 'active' });
  w.seed('/users/m2', { org_id: 'org1', role: 'HSE_MANAGER' }); // no status recorded: counts as active
  w.seed('/users/m3', { org_id: 'org1', role: 'HSE_MANAGER', status: 'suspended' });
  w.seed('/users/m4', { org_id: 'org2', role: 'HSE_MANAGER', status: 'active' });
  w.seed('/users/m5', { org_id: 'org1', role: 'WORKER', status: 'active' });
  fake.uid = P.creator.uid;
  await notifyRole('org1', 'HSE_MANAGER', 'New incident report: Near Miss', 'warning', { type: 'incident_submitted', title: 'New incident', link_page: 'reports' });
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['m1', 'm2']);
  assert.ok(fake.notifications.every(n => n.org_id === 'org1' && n.type === 'incident_submitted' && n.severity === 'warning' && n.link_page === 'reports'));
  assert.equal(fake.deniedNotifications.length, 0);
});

test('writeNotifications: a batch where one is refused still delivers the rest', async () => {
  fake.uid = P.creator.uid;
  const orig = console.error; console.error = () => {};
  try {
    await writeNotifications([{ ...input, user_id: 'a' }, { ...input, user_id: 'b', org_id: 'org2' }, { ...input, user_id: 'c' }], T0);
  } finally { console.error = orig; }
  assert.deepEqual(fake.notifications.map(n => n.user_id).sort(), ['a', 'c']);
  assert.equal(fake.deniedNotifications.length, 1);
});

test('permit notifications map onto the notification screen: type, title, link', () => {
  const permit = { id: 'p1', org_id: 'org1', permit_no: 'PTW-2026-0001', type: 'Hot Work', project_id: 'proj', creator_id: 'c', receiver_id: 'r' } as any;
  const make = (to: any, tone: any = 'info') => toNotificationInput(permit, to, { user_id: 'u', message: 'm', type: tone });
  assert.equal(make('SITE_HANDOVER', 'success').type, 'ptw_approved');
  assert.equal(make('CLOSED', 'success').type, 'ptw_approved');
  assert.equal(make('REJECTED', 'error').type, 'ptw_rejected');
  assert.equal(make('REJECTED', 'error').severity, 'critical');
  assert.equal(make('CANCELLED', 'warning').type, 'ptw_rejected');
  assert.equal(make('EXPIRED', 'warning').type, 'ptw_expiring');
  assert.equal(make('SUBMITTED').type, 'system');
  const n = make('APPROVAL');
  assert.deepEqual([n.org_id, n.user_id, n.title, n.link_page, n.link_id], ['org1', 'u', 'PTW-2026-0001 · Hot Work', 'ptw', 'p1']);
  assert.ok(!('link_id' in toNotificationInput({ ...permit, id: undefined }, 'APPROVAL', { user_id: 'u', message: 'm', type: 'info' })));
});
