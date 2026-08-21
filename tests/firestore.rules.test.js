// Runs the ENTIRE firestore.rules file against a local emulator - no real
// data, no risk to production, no manual clicking through the Playground.
//
// Run with: npm run test:rules
// (that script starts the emulator, runs this file, then shuts the emulator
// down automatically - see firebase.json / package.json)
//
// If you add a new collection to firestore.rules, add its name to
// ORG_SCOPED_COLLECTIONS below (if it just uses isOrgScoped, like almost
// everything does) and it gets the same 6-test coverage as everything else
// for free. This is also how audit_logs and chemicals should have been
// caught missing in the first place - this suite would have failed loudly
// the moment either collection was queried without a matching rule.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    // "demo-" prefix is Firebase's reserved convention for emulator-only
    // fake projects - guarantees this can never accidentally touch a real
    // project even if credentials or config are wrong.
    projectId: 'demo-evirosafe',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Writes data bypassing security rules entirely, for test setup only.
async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

function asUser(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}

function anon() {
  return testEnv.unauthenticatedContext().firestore();
}

// ─────────────────────────────────────────────────────────────────────────
// users_by_uid - the pointer collection. Only the owner can ever touch it.
// ─────────────────────────────────────────────────────────────────────────

test('users_by_uid: owner can read their own pointer', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'ADMIN' }));
  await assertSucceeds(getDoc(doc(asUser('uid_a'), 'users_by_uid/uid_a')));
});

test('users_by_uid: cannot read someone else\'s pointer', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'ADMIN' }));
  await assertFails(getDoc(doc(asUser('uid_b'), 'users_by_uid/uid_a')));
});

test('users_by_uid: unauthenticated cannot read', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'ADMIN' }));
  await assertFails(getDoc(doc(anon(), 'users_by_uid/uid_a')));
});

// ─────────────────────────────────────────────────────────────────────────
// users - the three-branch read rule, admin-gated create/delete, and the
// "can update yourself but can't change your own org_id" update rule.
// ─────────────────────────────────────────────────────────────────────────

test('users: read allowed via auth_uid match', async () => {
  await seed((db) => setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' }));
  await assertSucceeds(getDoc(doc(asUser('uid_a'), 'users/doc_a')));
});

test('users: read allowed via email match even if auth_uid differs', async () => {
  await seed((db) => setDoc(doc(db, 'users/doc_a'), { auth_uid: 'someone_else', email: 'a@test.com', org_id: 'org_1' }));
  await assertSucceeds(getDoc(doc(asUser('uid_a', { email: 'a@test.com' }), 'users/doc_a')));
});

test('users: read allowed via org membership (isOrgScoped) for a colleague\'s record', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_b'), { docId: 'doc_b', org_id: 'org_1', role: 'SUPERVISOR' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' });
  });
  await assertSucceeds(getDoc(doc(asUser('uid_b'), 'users/doc_a')));
});

test('users: read denied for a member of a different org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_c'), { docId: 'doc_c', org_id: 'org_2', role: 'SUPERVISOR' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' });
  });
  await assertFails(getDoc(doc(asUser('uid_c'), 'users/doc_a')));
});

test('users: admin can create a user in their own org', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_admin'), { docId: 'doc_admin', org_id: 'org_1', role: 'ADMIN' }));
  await assertSucceeds(setDoc(doc(asUser('uid_admin'), 'users/new_user'), { org_id: 'org_1', email: 'new@test.com' }));
});

test('users: admin cannot create a user tagged with a different org', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_admin'), { docId: 'doc_admin', org_id: 'org_1', role: 'ADMIN' }));
  await assertFails(setDoc(doc(asUser('uid_admin'), 'users/new_user'), { org_id: 'org_2', email: 'new@test.com' }));
});

test('users: non-admin cannot create a user at all', async () => {
  await seed((db) => setDoc(doc(db, 'users_by_uid/uid_worker'), { docId: 'doc_worker', org_id: 'org_1', role: 'WORKER' }));
  await assertFails(setDoc(doc(asUser('uid_worker'), 'users/new_user'), { org_id: 'org_1', email: 'new@test.com' }));
});

test('users: a user can update their own record', async () => {
  await seed((db) => setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1', name: 'Old' }));
  await assertSucceeds(updateDoc(doc(asUser('uid_a', { email: 'a@test.com' }), 'users/doc_a'), { name: 'New' }));
});

test('users: admin can update someone else in their own org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_admin'), { docId: 'doc_admin', org_id: 'org_1', role: 'ADMIN' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1', name: 'Old' });
  });
  await assertSucceeds(updateDoc(doc(asUser('uid_admin'), 'users/doc_a'), { name: 'New' }));
});

test('users: cannot change your own org_id via update', async () => {
  await seed((db) => setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' }));
  await assertFails(updateDoc(doc(asUser('uid_a', { email: 'a@test.com' }), 'users/doc_a'), { org_id: 'org_2' }));
});

test('users: non-admin cannot update someone else\'s record', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_worker'), { docId: 'doc_worker', org_id: 'org_1', role: 'WORKER' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' });
  });
  await assertFails(updateDoc(doc(asUser('uid_worker'), 'users/doc_a'), { name: 'Hacked' }));
});

test('users: admin can delete a user in their own org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_admin'), { docId: 'doc_admin', org_id: 'org_1', role: 'ADMIN' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' });
  });
  await assertSucceeds(deleteDoc(doc(asUser('uid_admin'), 'users/doc_a')));
});

test('users: non-admin cannot delete a user', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_worker'), { docId: 'doc_worker', org_id: 'org_1', role: 'WORKER' });
    await setDoc(doc(db, 'users/doc_a'), { auth_uid: 'uid_a', email: 'a@test.com', org_id: 'org_1' });
  });
  await assertFails(deleteDoc(doc(asUser('uid_worker'), 'users/doc_a')));
});

// ─────────────────────────────────────────────────────────────────────────
// organizations - self-scoped by document ID rather than an org_id field,
// plus the deliberately open create path (bootstrapping a brand-new org).
// ─────────────────────────────────────────────────────────────────────────

test('organizations: member can read their own org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'ADMIN' });
    await setDoc(doc(db, 'organizations/org_1'), { name: 'Org One' });
  });
  await assertSucceeds(getDoc(doc(asUser('uid_a'), 'organizations/org_1')));
});

test('organizations: cannot read a different org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'ADMIN' });
    await setDoc(doc(db, 'organizations/org_2'), { name: 'Org Two' });
  });
  await assertFails(getDoc(doc(asUser('uid_a'), 'organizations/org_2')));
});

test('organizations: any signed-in user can create a brand-new org (bootstrap path)', async () => {
  await assertSucceeds(setDoc(doc(asUser('uid_new'), 'organizations/org_new'), { name: 'New Org' }));
});

test('organizations: unauthenticated cannot create an org', async () => {
  await assertFails(setDoc(doc(anon(), 'organizations/org_new'), { name: 'New Org' }));
});

test('organizations: admin can update their own org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_admin'), { docId: 'doc_admin', org_id: 'org_1', role: 'ADMIN' });
    await setDoc(doc(db, 'organizations/org_1'), { name: 'Org One' });
  });
  await assertSucceeds(updateDoc(doc(asUser('uid_admin'), 'organizations/org_1'), { name: 'Renamed' }));
});

test('organizations: non-admin cannot update their org', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'users_by_uid/uid_worker'), { docId: 'doc_worker', org_id: 'org_1', role: 'WORKER' });
    await setDoc(doc(db, 'organizations/org_1'), { name: 'Org One' });
  });
  await assertFails(updateDoc(doc(asUser('uid_worker'), 'organizations/org_1'), { name: 'Hacked' }));
});

// ─────────────────────────────────────────────────────────────────────────
// Every collection using the plain isOrgScoped pattern. This is every
// collection actually referenced in the app's code, cross-checked against
// firestore.rules - see the earlier audit that found chemicals and
// audit_logs missing. Add a name here the moment a new collection is
// introduced in code, same commit as the matching rules line.
// ─────────────────────────────────────────────────────────────────────────

const ORG_SCOPED_COLLECTIONS = [
  'projects', 'reports', 'inspections', 'ptws', 'checklist_templates',
  'checklist_runs', 'plans', 'rams', 'signs', 'actions', 'tbt_sessions',
  'training_courses', 'training_records', 'training_sessions',
  'notifications', 'chemicals', 'audit_logs', 'bbs_observations',
  'hazards', 'contractor_companies', 'contractor_workers', 'ppe_items', 'ppe_assignments',
  'shift_logs', 'ffd_assessments', 'env_readings', 'safety_meetings', 'emergency_plans',
  'controlled_documents', 'dsar_requests', 'retention_policies', 'processing_activities',
  'data_breaches', 'compliance_tracking', 'rca_records',
];

for (const col of ORG_SCOPED_COLLECTIONS) {
  test(`${col}: member of the same org can read`, async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'SUPERVISOR' });
      await setDoc(doc(db, `${col}/item_1`), { org_id: 'org_1' });
    });
    await assertSucceeds(getDoc(doc(asUser('uid_a'), `${col}/item_1`)));
  });

  test(`${col}: member of a different org cannot read`, async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users_by_uid/uid_b'), { docId: 'doc_b', org_id: 'org_2', role: 'SUPERVISOR' });
      await setDoc(doc(db, `${col}/item_1`), { org_id: 'org_1' });
    });
    await assertFails(getDoc(doc(asUser('uid_b'), `${col}/item_1`)));
  });

  test(`${col}: unauthenticated cannot read`, async () => {
    await seed((db) => setDoc(doc(db, `${col}/item_1`), { org_id: 'org_1' }));
    await assertFails(getDoc(doc(anon(), `${col}/item_1`)));
  });

  test(`${col}: member can create a doc tagged with their own org`, async () => {
    await seed((db) => setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'SUPERVISOR' }));
    await assertSucceeds(setDoc(doc(asUser('uid_a'), `${col}/item_new`), { org_id: 'org_1' }));
  });

  test(`${col}: cannot create a doc tagged with a different org`, async () => {
    await seed((db) => setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'SUPERVISOR' }));
    await assertFails(setDoc(doc(asUser('uid_a'), `${col}/item_new`), { org_id: 'org_2' }));
  });

  test(`${col}: member can update and delete a doc in their own org`, async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users_by_uid/uid_a'), { docId: 'doc_a', org_id: 'org_1', role: 'SUPERVISOR' });
      await setDoc(doc(db, `${col}/item_1`), { org_id: 'org_1' });
    });
    const asA = asUser('uid_a');
    await assertSucceeds(updateDoc(doc(asA, `${col}/item_1`), { org_id: 'org_1', touched: true }));
    await assertSucceeds(deleteDoc(doc(asA, `${col}/item_1`)));
  });
}
