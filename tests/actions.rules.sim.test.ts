// The generated ACTIONS rules, run through the in-repo Firestore rules interpreter: against the ENGINE (every
// combination), against the writes the app really makes, and against forged writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ts, World } from './helpers/rulesSim';
import { rules } from './helpers/ptwFixtures';
import {
  ALL_ROLES, P, T0, H, MIN, DAY, actionInStage, actor, createAction, newWorld, resolver, sample, stepAction,
  type Clock, type Person,
} from './helpers/actionFixtures';
import { ACTIONS, STAGES, OVERRIDERS, type ActionId, type Stage } from '../src/lib/actions/model';
import { buildNewAction } from '../src/lib/actions/writes';
import { resolveSentinels } from '../src/lib/shared/writes';
import { checkActor, checkContentEdit } from '../src/lib/actions/engine';

const ok = (r: any, what = '') => assert.ok(r && r.ok === true, `${what}: ${r && r.ok === false ? r.why : 'not committed'}`);
const refused = (r: any, what = '') => assert.ok(r && r.ok === false, `${what}: expected the database to refuse this`);
const STEPS = Object.keys(ACTIONS) as ActionId[];

// ─── the step table equals the engine, for every combination ──────────────

test('the step table in the rules equals the engine: every stage x step x role x relationship x override flag', () => {
  const NOTE = 'a proper written note';
  const JUST = 'written justification text';
  const rels = ['owner', 'creator', 'completer', 'other'] as const;
  const w = new World(rules.functions, rules.matches);
  for (const role of ALL_ROLES) for (const rel of rels) w.pointer(`uid-${rel}-${role}`, { docId: rel, org_id: 'org1', role, project_ids: ['proj'] });
  const pointers = { ...w.docs };

  const mismatches: string[] = [];
  let checked = 0;
  for (const stage of STAGES) {
    const doc: Record<string, any> = {
      org_id: 'org1', project_id: 'proj', number: 'ACT-2026-0001', action_year: 2026, title: 't', kind: 'corrective', priority: 'high',
      status: stage, owner_id: 'owner', creator_id: 'creator', due_date: '2026-11-21', source: { type: 'manual' },
      completion: { by: 'completer', at: new Ts(T0), note: NOTE },
      history: [{ action: 'create', from: 'OPEN', stage: 'OPEN', user_id: 'creator', user_name: 'n', role: 'SUPERVISOR', timestamp: 'x' }],
      stage_times: { OPEN: new Ts(T0) }, last_transition_at: new Ts(T0), created_at: new Ts(T0), updated_at: new Ts(T0),
    };
    for (const stepId of STEPS) {
      const def = ACTIONS[stepId];
      const to: Stage = def.to === 'SAME' ? stage : def.to;
      for (const role of ALL_ROLES) for (const rel of rels) for (const flag of [false, true]) {
        const me = { id: rel, name: 'n', role };
        const stageOk = def.from.includes(stage);
        // what the engine says
        const plain = checkActor(def, doc as any, me);
        const withJust = checkActor(def, doc as any, me, JUST);
        const expected = flag
          ? stageOk && (OVERRIDERS as readonly string[]).includes(role) && withJust.ok === true
          : stageOk && plain.ok === true;
        // the forged write: the history says this step was taken by this person
        const entry: Record<string, any> = {
          action: stepId, from: stage, stage: to, user_id: rel, user_name: 'n', role, timestamp: 'x', note: NOTE,
          ...(flag ? { override: true, justification: JUST } : {}),
          ...(stepId === 'reschedule' ? { changes: { due_date: { from: '2026-11-21', to: '2026-12-01' } } } : {}),
        };
        const after: Record<string, any> = {
          ...doc, history: [...doc.history, entry], status: to, last_transition_at: new Ts(T0 + H), updated_at: new Ts(T0 + H),
          stage_times: to === stage ? doc.stage_times : { ...doc.stage_times, [to]: new Ts(T0 + H) },
        };
        if (def.record) after[def.record] = { by: rel, at: new Ts(T0 + H), note: NOTE };
        if (stepId === 'reschedule') after.due_date = '2026-12-01';
        w.docs = { ...pointers, '/actions/a': doc };
        const rule = w.commit(`uid-${rel}-${role}`, [{ kind: 'update', path: '/actions/a', data: after }], T0 + H).ok === true;
        checked++;
        if (rule !== expected && mismatches.length < 8) mismatches.push(`stage=${stage} step=${stepId} role=${role} as ${rel} flag=${flag}: rules=${rule} engine=${expected}`);
      }
    }
  }
  assert.equal(checked, STAGES.length * STEPS.length * ALL_ROLES.length * 4 * 2);
  assert.deepEqual(mismatches, [], `rules and engine disagree:\n${mismatches.join('\n')}`);
});

// ─── content edits ────────────────────────────────────────────────────────

test('content-edit rights in the rules equal the engine, for every stage x role x relationship', () => {
  const w = new World(rules.functions, rules.matches);
  const rels = ['owner', 'creator', 'other'] as const;
  for (const role of ALL_ROLES) for (const rel of rels) w.pointer(`uid-${rel}-${role}`, { docId: rel, org_id: 'org1', role, project_ids: ['proj'] });
  const pointers = { ...w.docs };
  const mismatches: string[] = [];
  let checked = 0;
  for (const stage of STAGES) {
    const doc: Record<string, any> = {
      org_id: 'org1', project_id: 'proj', number: 'ACT-2026-0001', action_year: 2026, title: 't', kind: 'corrective', priority: 'high',
      status: stage, owner_id: 'owner', creator_id: 'creator', due_date: '2026-11-21', source: { type: 'manual' },
      history: [{ action: 'create', from: 'OPEN', stage: 'OPEN', user_id: 'creator', user_name: 'n', role: 'SUPERVISOR', timestamp: 'x' }],
      stage_times: { OPEN: new Ts(T0) }, last_transition_at: new Ts(T0), created_at: new Ts(T0), updated_at: new Ts(T0),
    };
    for (const role of ALL_ROLES) for (const rel of rels) {
      const verdict = checkContentEdit({ id: 'a', ...doc } as any, { id: rel, name: 'n', role });
      for (const kind of ['title', 'car'] as const) {
        const after = kind === 'title'
          ? { ...doc, title: 'a better title', updated_at: new Ts(T0 + H) }
          : { ...doc, car: { root_cause: 'worn bracket' }, updated_at: new Ts(T0 + H) };
        const expected = verdict.ok === true && (kind === 'car' || verdict.scope === 'all');
        w.docs = { ...pointers, '/actions/a': doc };
        const rule = w.commit(`uid-${rel}-${role}`, [{ kind: 'update', path: '/actions/a', data: after }], T0 + H).ok === true;
        checked++;
        if (rule !== expected && mismatches.length < 8) mismatches.push(`stage=${stage} role=${role} as ${rel} edit=${kind}: rules=${rule} engine=${expected}`);
      }
    }
  }
  assert.equal(checked, STAGES.length * ALL_ROLES.length * 3 * 2);
  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

// ─── the happy path: everything the app writes is accepted ────────────────

test('an action travels the whole route and every write the app makes is accepted', () => {
  const w = newWorld();
  const clk: Clock = { now: T0 };
  const c = createAction(w, P.creator, clk, { owner_id: P.worker.id });
  ok(c.commit, 'create');
  const id = c.id;
  assert.equal(w.docs[`/actions/${id}`].number, 'ACT-2026-0001');
  assert.equal(w.docs[c.counterPath].value, 1);
  let maxAccess = w.lastStats.accessCalls, maxEvals = w.lastStats.evals;
  const go = (who: Person, step: ActionId, o: Parameters<typeof stepAction>[5] = {}) => {
    clk.now += 10 * MIN;
    const r = stepAction(w, who, id, step, clk, o);
    assert.ok(r.commit, `${step}: the engine refused: ${(r.engine as any).reason}`);
    ok(r.commit, step);
    maxAccess = Math.max(maxAccess, w.lastStats.accessCalls); maxEvals = Math.max(maxEvals, w.lastStats.evals);
  };
  go(P.reviewer, 'add_note', { note: 'Contractor confirmed the part is on order' });
  go(P.reviewer, 'reschedule', { note: 'Part delayed by a week', changes: { due_date: '2026-11-28', priority: 'medium' } });
  go(P.worker, 'start');
  go(P.worker, 'complete', { note: 'Rail replaced and load tested' });
  go(P.reviewer, 'send_back', { note: 'Bracket still loose on the west side' });
  go(P.worker, 'complete', { note: 'Bracket re-fixed, checked with the supervisor' });
  go(P.reviewer, 'verify', { note: 'Inspected: rail secure, no movement' });
  go(P.approver, 'reopen', { note: 'Defect found again during the audit' });
  go(P.approver, 'cancel', { note: 'Area demolished, no longer needed' });
  go(P.approver, 'reopen', { note: 'Cancelled by mistake' });
  const doc = w.docs[`/actions/${id}`];
  assert.equal(doc.status, 'OPEN');
  assert.equal(doc.history.length, 11); // create + 10 steps
  assert.equal(doc.due_date, '2026-11-28');
  assert.equal(doc.priority, 'medium');
  assert.ok(doc.last_transition_at instanceof Ts && doc.stage_times.OPEN instanceof Ts);
  assert.equal(doc.verification.by, P.reviewer.id);
  // a second action takes the next number
  const c2 = createAction(w, P.approver, clk, { owner_id: P.creator.id });
  ok(c2.commit, 'second create');
  assert.equal(w.docs[`/actions/${c2.id}`].number, 'ACT-2026-0002');
  assert.ok(maxAccess <= 20, `document lookups per batch: ${maxAccess}`);
  assert.ok(maxEvals <= 1000, `expression evaluations per batch: ${maxEvals}`);
  // Guard against the rules growing past Firestore's per-request expression limit (1,000). These counts are this
  // interpreter's (every node), which over-count what Firestore bills, so the caps leave headroom.
  assert.ok(w.profile.actUpdateOk <= 650, `actUpdateOk costs ${w.profile.actUpdateOk} evaluations`);
  assert.ok(w.profile.actCreateOk <= 520, `actCreateOk costs ${w.profile.actCreateOk} evaluations`);
  console.log(`    (worst batch: ${maxAccess} document lookups, ${maxEvals} evaluations; actUpdateOk=${w.profile.actUpdateOk} actCreateOk=${w.profile.actCreateOk})`);
});

test('an administrator can verify an action they own, with a written justification, and it is flagged', () => {
  const { w, clk, id } = actionInStage('COMPLETED');
  const w2 = w; // the worker owns it; make the administrator the owner by rescheduling first is not allowed in COMPLETED, so seed directly
  w2.docs[`/actions/${id}`] = { ...w2.docs[`/actions/${id}`], owner_id: P.orgAdmin.id };
  clk.now += 10 * MIN;
  const refusedNoText = stepAction(w2, P.orgAdmin, id, 'verify', clk);
  assert.equal(refusedNoText.commit, null, 'the engine asks for a justification');
  const r = stepAction(w2, P.orgAdmin, id, 'verify', clk, { justification: 'Small crew: no one else was on site to verify' });
  ok(r.commit, 'override');
  const last = w2.docs[`/actions/${id}`].history.at(-1);
  assert.equal(last.override, true);
  assert.equal(last.stage, 'CLOSED');
});

// ─── creation: forged actions are refused ─────────────────────────────────

test('creation: forged actions are refused', () => {
  const clk: Clock = { now: T0 };
  const cases: Array<[string, (a: any, c: any) => void, Partial<ReturnType<typeof sample>>?]> = [
    ['not OPEN', a => { a.status = 'CLOSED'; }],
    ['raised in someone else\'s name', a => { a.creator_id = 'someone-else'; }],
    ['client clock for created_at', a => { a.created_at = '2020-01-01T00:00:00Z'; }],
    ['client clock for last_transition_at', a => { a.last_transition_at = '2020-01-01T00:00:00Z'; }],
    ['client clock for stage_times.OPEN', a => { a.stage_times = { OPEN: '2020-01-01' }; }],
    ['extra stage_times key', a => { a.stage_times = { OPEN: a.stage_times.OPEN, CLOSED: a.stage_times.OPEN }; }],
    ['counter not bumped to 1', (a, c) => { c.value = 5; }],
    ['number in the wrong format', a => { a.number = 'ACT-9999'; }],
    ['number for another year', a => { a.number = 'ACT-2020-0001'; }],
    ['action_year far from now', a => { a.action_year = 2031; a.number = 'ACT-2031-0001'; }],
    ['two history entries', a => { a.history = [a.history[0], a.history[0]]; }],
    ['history entry by someone else', a => { a.history[0].user_id = 'someone-else'; }],
    ['history entry with another role', a => { a.history[0].role = 'ADMIN'; }],
    ['history entry in another stage', a => { a.history[0].stage = 'CLOSED'; }],
    ['history entry with an unknown key', a => { a.history[0].secret = 'x'; }],
    ['unknown kind', a => { a.kind = 'urgent'; }],
    ['unknown priority', a => { a.priority = 'asap'; }],
    ['empty title', a => { a.title = ''; }],
    ['title too long', a => { a.title = 'x'.repeat(201); }],
    ['description too long', a => { a.description = 'x'.repeat(4001); }],
    ['no owner', a => { a.owner_id = ''; }],
    ['owner id too long', a => { a.owner_id = 'x'.repeat(129); }],
    ['due date in another format', a => { a.due_date = '21/11/2026'; }],
    ['no project', a => { delete a.project_id; }],
    ['a project the person is not on', a => { a.project_id = 'other'; }],
    ['another organisation', a => { a.org_id = 'org2'; }],
    ['an extra field', a => { a.hacked = true; }],
    ['a missing required field', a => { delete a.kind; }],
    ['unknown source type', a => { a.source = { type: 'rumour', id: 'x' }; }],
    ['linked source without an id', a => { a.source = { type: 'incident' }; }],
    ['source with an extra key', a => { a.source = { type: 'manual', evil: 1 }; }],
    ['CAR section with an unknown key', a => { a.car = { root_cause: 'x', evil: 'y' }; }],
    ['CAR field too long', a => { a.car = { root_cause: 'x'.repeat(2001) }; }],
    ['imported marker on a normal create', a => { a.imported = true; }],
  ];
  for (const [what, tweak] of cases) {
    const w = newWorld();
    const c = createAction(w, P.creator, clk, {}, tweak);
    refused(c.commit, what);
  }
  // the plain version of the same call is accepted (so the refusals above are about the forgery)
  ok(createAction(newWorld(), P.creator, clk).commit, 'control');
});

test('creation: counter forgeries are refused (skipped number, reused number, second bump)', () => {
  const clk: Clock = { now: T0 };
  const w = newWorld();
  ok(createAction(w, P.creator, clk).commit, 'first');
  // bump by 2
  refused(createAction(w, P.creator, clk, {}, (_a, c) => { c.value = 3; }).commit, 'skipped a number');
  // no bump at all
  refused(createAction(w, P.creator, clk, {}, (_a, c) => { c.value = 1; }).commit, 'reused a number');
  // the counter of another organisation / year
  const sneaky = w.commit(P.creator.uid, [{ kind: 'set', path: '/counters/act_org2_2026', data: { org_id: 'org2', year: 2026, value: 1 } }], T0);
  refused(sneaky, 'counter in another organisation');
  // a lone bump (without an action) by a worker is not allowed for the act counter
  refused(w.commit(P.worker.uid, [{ kind: 'update', path: '/counters/act_org1_2026', data: { org_id: 'org1', year: 2026, value: 2 } }], T0), 'worker bumping the act counter');
});

test('creation: an action cannot be made without consuming its own counter number', () => {
  const clk: Clock = { now: T0 };
  const year = new Date(clk.now).getUTCFullYear();
  const build = (who: Person = P.creator) => buildNewAction({ orgId: who.org, actor: actor(who), input: sample(), year, n: 1, now: clk.now });
  const put = (w: World, who: Person, ops: any[]) => w.commit(who.uid, ops, clk.now);
  const actionOp = (built: ReturnType<typeof build>) => ({ kind: 'set' as const, path: '/actions/solo', data: resolveSentinels(built.action, resolver(clk.now)) });

  // no counter write at all: a number would be reused
  { const w = newWorld(); refused(put(w, P.creator, [actionOp(build())]), 'no counter write'); }
  // the counter of ANOTHER YEAR is bumped instead of this action's year
  { const w = newWorld(); refused(put(w, P.creator, [{ kind: 'set', path: `/counters/act_org1_${year - 1}`, data: { org_id: 'org1', year: year - 1, value: 1 } }, actionOp(build())]), 'the wrong year\'s counter'); }
  // a second action in a batch that bumps the counter only once
  { const w = newWorld();
    ok(put(w, P.creator, [{ kind: 'set', path: `/counters/act_org1_${year}`, data: { org_id: 'org1', year, value: 1 } }, actionOp(build())]), 'control');
    refused(put(w, P.creator, [{ kind: 'set', path: '/actions/second', data: resolveSentinels(build().action, resolver(clk.now)) }]), 'a second action without a bump'); }
  // the control: counter and action together
  ok(createAction(newWorld(), P.creator, clk).commit, 'control: the real route');
});

test('creation: who may raise an action', () => {
  const clk: Clock = { now: T0 };
  const may: Record<string, boolean> = {
    ADMIN: true, ORG_ADMIN: true, HSE_MANAGER: true, HSE_OFFICER: true, SUPERVISOR: true, INSPECTOR: true, CUSTOM_SITE_LEAD: true,
    WORKER: false, CLIENT_VIEWER: false,
  };
  for (const role of ALL_ROLES) {
    const w = newWorld();
    const p = { uid: `uid-x-${role}`, id: `x-${role}`, name: 'x', role, org: 'org1', projects: ['proj'] } as Person;
    w.pointer(p.uid, { docId: p.id, org_id: 'org1', role, project_ids: ['proj'] });
    const r = createAction(w, p, clk, { owner_id: 'someone' }).commit;
    assert.equal(r.ok, may[role], `${role} may create: ${may[role]}`);
  }
  // a person from another organisation, and a person not on the project
  // (an outsider creating into THEIR OWN organisation is fine; into somebody else's is not)
  refused(createAction(newWorld(), P.outsider, clk, {}, a => { a.org_id = 'org1'; }).commit, 'into another organisation');
  refused(createAction(newWorld(), P.otherProj, clk).commit, 'a project the person is not on');
});

// ─── steps: forged writes are refused ─────────────────────────────────────

function forge(stage: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED', who: Person, step: ActionId, tweak: (after: any) => void, o: Parameters<typeof stepAction>[5] = {}) {
  const { w, clk, id } = actionInStage(stage);
  clk.now += 10 * MIN;
  const r = stepAction(w, who, id, step, clk, { ...o, tweak });
  assert.ok(r.commit, `the engine itself refused ${step}: ${(r.engine as any).reason}`);
  return r.commit!;
}

test('steps: skipped stages, rewritten history and forged fields are refused', () => {
  // skipping a stage: the history says "verify" on an OPEN action
  {
    const { w, clk, id } = actionInStage('OPEN');
    const before = w.docs[`/actions/${id}`];
    const after = {
      ...before, status: 'CLOSED', last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
      stage_times: { ...before.stage_times, CLOSED: new Ts(clk.now) }, verification: { by: P.reviewer.id, at: new Ts(clk.now), note: 'verified without any work' },
      history: [...before.history, { action: 'verify', from: 'OPEN', stage: 'CLOSED', user_id: P.reviewer.id, user_name: 'n', role: P.reviewer.role, timestamp: 'x', note: 'verified without any work' }],
    };
    refused(w.commit(P.reviewer.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now), 'OPEN -> CLOSED');
  }
  const tamper: Array<[string, (a: any) => void]> = [
    ['rewrite an earlier history entry', a => { a.history[0].user_name = 'someone else'; }],
    ['delete the last earlier entry', a => { a.history.splice(0, 1); }],
    ['drop the new entry', a => { a.history.pop(); }],
    ['append two entries', a => { a.history.push(a.history.at(-1)); }],
    ['history entry by someone else', a => { a.history.at(-1).user_id = 'someone-else'; }],
    ['history entry with another role', a => { a.history.at(-1).role = 'ADMIN'; }],
    ['history entry with the wrong "from"', a => { a.history.at(-1).from = 'CLOSED'; }],
    ['history entry with the wrong "stage"', a => { a.history.at(-1).stage = 'CLOSED'; }],
    ['history entry with an unknown key', a => { a.history.at(-1).secret = 'x'; }],
    ['client clock for last_transition_at', a => { a.last_transition_at = '2020-01-01T00:00:00Z'; }],
    ['old time for last_transition_at', a => { a.last_transition_at = new Ts(T0 - DAY); }],
    ['client clock for updated_at', a => { a.updated_at = new Ts(T0 - DAY); }],
    ['client clock for the new stage time', a => { a.stage_times = { ...a.stage_times, IN_PROGRESS: new Ts(T0 - DAY) }; }],
    ['rewrite an earlier stage time', a => { a.stage_times = { ...a.stage_times, OPEN: new Ts(T0 - DAY) }; }],
    ['change the creator', a => { a.creator_id = 'someone-else'; }],
    ['change the number', a => { a.number = 'ACT-2026-0099'; }],
    ['change the organisation', a => { a.org_id = 'org2'; }],
    ['change the project', a => { a.project_id = 'other'; }],
    ['change the kind', a => { a.kind = 'improvement'; }],
    ['change the source', a => { a.source = { type: 'manual' }; }],
    ['change the creation time', a => { a.created_at = new Ts(T0 - DAY); }],
    ['change the title', a => { a.title = 'a different task'; }],
    ['smuggle a field in', a => { a.admin_approved = true; }],
  ];
  for (const [what, fn] of tamper) refused(forge('OPEN', P.worker, 'start', fn), `start + ${what}`);
  // the control: the same step, untouched
  ok(forge('OPEN', P.worker, 'start', () => {}), 'control');
});

test('steps: signatures cannot be forged', () => {
  refused(forge('IN_PROGRESS', P.worker, 'complete', a => { a.completion.by = P.creator.id; }), 'completion signed as someone else');
  refused(forge('IN_PROGRESS', P.worker, 'complete', a => { a.completion.at = new Ts(T0 - DAY); }), 'completion with a client time');
  refused(forge('IN_PROGRESS', P.worker, 'complete', a => { a.completion.note = 'a different note than the history'; }), 'completion note differs from the history');
  refused(forge('IN_PROGRESS', P.worker, 'complete', a => { a.completion.extra = 1; }), 'completion with an extra key');
  refused(forge('IN_PROGRESS', P.worker, 'complete', a => { delete a.completion; }), 'completion not recorded');
  refused(forge('COMPLETED', P.reviewer, 'verify', a => { a.verification.by = P.approver.id; }), 'verification signed as someone else');
  refused(forge('COMPLETED', P.reviewer, 'verify', a => { a.verification.at = new Ts(T0 - DAY); }), 'verification with a client time');
  refused(forge('COMPLETED', P.reviewer, 'verify', a => { delete a.verification; }), 'verification not recorded');
  // a step may not write the OTHER record
  refused(forge('OPEN', P.worker, 'start', a => { a.completion = { by: P.worker.id, at: new Ts(T0 + 1), note: 'sneaky completion' }; }), 'start that also records a completion');
});

test('steps: segregation of duties holds in the database', () => {
  // the owner cannot verify; neither can the person who recorded the completion
  {
    const { w, clk, id } = actionInStage('COMPLETED');
    w.docs[`/actions/${id}`] = { ...w.docs[`/actions/${id}`], owner_id: P.reviewer.id };
    clk.now += MIN;
    const forged = stepAction(w, P.reviewer, id, 'verify', clk, { tweak: () => {} });
    assert.equal(forged.commit, null, 'the engine refuses (and so would the screen)');
    // force the same write past the engine
    const before = w.docs[`/actions/${id}`];
    const after = {
      ...before, status: 'CLOSED', last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
      stage_times: { ...before.stage_times, CLOSED: new Ts(clk.now) }, verification: { by: P.reviewer.id, at: new Ts(clk.now), note: 'verified my own work' },
      history: [...before.history, { action: 'verify', from: 'COMPLETED', stage: 'CLOSED', user_id: P.reviewer.id, user_name: 'n', role: P.reviewer.role, timestamp: 'x', note: 'verified my own work' }],
    };
    refused(w.commit(P.reviewer.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now), 'owner verifies own work');
  }
  {
    const { w, clk, id } = actionInStage('COMPLETED');
    // the worker (owner) completed it; make a reviewer the completer by an override-free path: seed completion.by
    w.docs[`/actions/${id}`] = { ...w.docs[`/actions/${id}`], completion: { by: P.reviewer.id, at: new Ts(T0), note: 'recorded by the reviewer' } };
    clk.now += MIN;
    const before = w.docs[`/actions/${id}`];
    const after = {
      ...before, status: 'CLOSED', last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
      stage_times: { ...before.stage_times, CLOSED: new Ts(clk.now) }, verification: { by: P.reviewer.id, at: new Ts(clk.now), note: 'verified what I recorded' },
      history: [...before.history, { action: 'verify', from: 'COMPLETED', stage: 'CLOSED', user_id: P.reviewer.id, user_name: 'n', role: P.reviewer.role, timestamp: 'x', note: 'verified what I recorded' }],
    };
    refused(w.commit(P.reviewer.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now), 'the person who recorded the completion verifies it');
    // someone else can
    const r = stepAction(w, P.approver, id, 'verify', clk);
    ok(r.commit, 'a different reviewer verifies');
  }
  // an override needs an administrator AND a written justification
  {
    const { w, clk, id } = actionInStage('COMPLETED');
    w.docs[`/actions/${id}`] = { ...w.docs[`/actions/${id}`], owner_id: P.approver.id };
    clk.now += MIN;
    const before = w.docs[`/actions/${id}`];
    const mk = (who: Person, justification?: string) => ({
      ...before, status: 'CLOSED', last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
      stage_times: { ...before.stage_times, CLOSED: new Ts(clk.now) }, verification: { by: who.id, at: new Ts(clk.now), note: 'verified by an override' },
      history: [...before.history, { action: 'verify', from: 'COMPLETED', stage: 'CLOSED', user_id: who.id, user_name: 'n', role: who.role, timestamp: 'x', note: 'verified by an override', override: true, ...(justification ? { justification } : {}) }],
    });
    refused(w.commit(P.approver.uid, [{ kind: 'update', path: `/actions/${id}`, data: mk(P.approver, 'I am the HSE manager and I own it') }], clk.now), 'an approver is not an administrator');
    refused(w.commit(P.orgAdmin.uid, [{ kind: 'update', path: `/actions/${id}`, data: mk(P.orgAdmin) }], clk.now), 'an override without a justification');
    refused(w.commit(P.orgAdmin.uid, [{ kind: 'update', path: `/actions/${id}`, data: mk(P.orgAdmin, 'too short') }], clk.now), 'a justification that is too short');
    ok(w.commit(P.orgAdmin.uid, [{ kind: 'update', path: `/actions/${id}`, data: mk(P.orgAdmin, 'No other reviewer on this small site') }], clk.now), 'a proper override');
  }
});

test('steps: a written note is required, and a read-only viewer cannot do anything', () => {
  for (const step of ['complete', 'verify', 'send_back', 'add_note', 'reschedule', 'withdraw', 'cancel', 'reopen'] as ActionId[]) {
    const def = ACTIONS[step];
    const stage = def.from[0] as any;
    const who = (def.roles as readonly string[]).includes('WORKER') ? P.worker : def.actor === 'creator' ? P.creator : (def.roles as readonly string[]).includes('HSE_OFFICER') ? P.reviewer : P.approver;
    for (const note of ['', 'abc']) {
      const { w, clk, id } = actionInStage(stage);
      if (step === 'reopen') continue;
      clk.now += MIN;
      const before = w.docs[`/actions/${id}`];
      const to = def.to === 'SAME' ? stage : def.to;
      const entry: any = { action: step, from: stage, stage: to, user_id: who.id, user_name: 'n', role: who.role, timestamp: 'x', ...(note ? { note } : {}) };
      const after: any = {
        ...before, history: [...before.history, entry], status: to, last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
        stage_times: to === stage ? before.stage_times : { ...before.stage_times, [to]: new Ts(clk.now) },
      };
      if (def.record) after[def.record] = { by: who.id, at: new Ts(clk.now), note };
      if (step === 'reschedule') after.due_date = '2026-12-31';
      // the owner of a verifiable action must not be the actor
      if (step === 'verify' || step === 'send_back') { /* P.reviewer is neither owner nor completer */ }
      refused(w.commit(who.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now), `${step} with note "${note}"`);
    }
  }
  // a client viewer can do nothing at all
  const { w, clk, id } = actionInStage('OPEN');
  const before = w.docs[`/actions/${id}`];
  const after = { ...before, status: 'IN_PROGRESS', last_transition_at: new Ts(clk.now + 1), updated_at: new Ts(clk.now + 1), stage_times: { ...before.stage_times, IN_PROGRESS: new Ts(clk.now + 1) },
    history: [...before.history, { action: 'start', from: 'OPEN', stage: 'IN_PROGRESS', user_id: P.viewer.id, user_name: 'v', role: 'CLIENT_VIEWER', timestamp: 'x' }] };
  refused(w.commit(P.viewer.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now + 1), 'client viewer');
  refused(w.commit(P.outsider.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now + 1), 'another organisation');
  refused(w.commit(P.otherProj.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now + 1), 'a project the person is not on');
});

test('reschedule: only real, valid changes are accepted', () => {
  const mkRes = (mut: (a: any) => void) => {
    const { w, clk, id } = actionInStage('IN_PROGRESS');
    clk.now += MIN;
    const before = w.docs[`/actions/${id}`];
    const after: any = {
      ...before, last_transition_at: new Ts(clk.now), updated_at: new Ts(clk.now),
      history: [...before.history, { action: 'reschedule', from: 'IN_PROGRESS', stage: 'IN_PROGRESS', user_id: P.reviewer.id, user_name: 'n', role: P.reviewer.role, timestamp: 'x', note: 'moved because of the delay' }],
    };
    mut(after);
    return w.commit(P.reviewer.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now);
  };
  ok(mkRes(a => { a.due_date = '2026-12-31'; }), 'new due date');
  ok(mkRes(a => { a.owner_id = P.creator.id; }), 'new owner');
  ok(mkRes(a => { a.priority = 'critical'; }), 'new priority');
  refused(mkRes(() => {}), 'nothing changed');
  refused(mkRes(a => { a.due_date = 'tomorrow'; }), 'due date not a date');
  refused(mkRes(a => { a.owner_id = ''; }), 'no owner');
  refused(mkRes(a => { a.priority = 'urgent'; }), 'unknown priority');
  refused(mkRes(a => { a.due_date = '2026-12-31'; a.title = 'new title smuggled in'; }), 'a title change inside a reschedule');
});

// ─── content edits: forged ────────────────────────────────────────────────

test('content edits: cannot touch status, history, owner or anything but the definition', () => {
  const edit = (who: Person, mut: (a: any) => void, stage: any = 'OPEN') => {
    const { w, clk, id } = actionInStage(stage);
    clk.now += MIN;
    const before = w.docs[`/actions/${id}`];
    const after: any = { ...before, updated_at: new Ts(clk.now) };
    mut(after);
    return w.commit(who.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now);
  };
  ok(edit(P.creator, a => { a.title = 'Replace the guard rail and the toe board'; }), 'creator edits the title');
  ok(edit(P.approver, a => { a.description = 'Longer description'; }), 'an approver edits the description');
  ok(edit(P.reviewer, a => { a.car = { root_cause: 'Corroded bracket', effectiveness_plan: 'Re-inspect in 30 days' }; }), 'a reviewer who is not the owner fills the CAR section');
  refused(edit(P.worker, a => { a.title = 'my own title'; }), 'the owner edits the title');
  refused(edit(P.reviewer, a => { a.title = 'a reviewer edits the title'; }), 'a reviewer (not creator) edits the title');
  refused(edit(P.creator, a => { a.status = 'CLOSED'; }), 'status via a content edit');
  refused(edit(P.creator, a => { a.owner_id = 'x'; }), 'owner via a content edit');
  refused(edit(P.creator, a => { a.due_date = '2030-01-01'; }), 'due date via a content edit');
  refused(edit(P.creator, a => { a.history = []; }), 'history via a content edit');
  refused(edit(P.creator, a => { a.title = ''; }), 'empty title');
  refused(edit(P.creator, a => { a.car = { root_cause: 'x', bogus: 'y' }; }), 'CAR section with an unknown key');
  refused(edit(P.creator, a => { a.description = 'x'.repeat(4001); }), 'description too long');
  refused(edit(P.creator, a => { a.updated_at = new Ts(T0 - DAY); }), 'client clock for updated_at');
  refused(edit(P.creator, a => { a.title = 'closed one'; }, 'CLOSED'), 'a closed action is locked');
});

// ─── deletes and old documents ────────────────────────────────────────────

test('deletes: numbered actions are never deleted; old unnumbered ones only by an administrator and never edited', () => {
  const { w, id } = actionInStage('OPEN');
  for (const p of Object.values(P)) refused(w.commit(p.uid, [{ kind: 'delete', path: `/actions/${id}` }], T0 + DAY), `delete by ${p.id}`);
  // a pre-rebuild document: no number
  const legacy = { org_id: 'org1', project_id: 'proj', action: 'Fix the exit sign', owner_id: P.worker.id, due_date: '2026-01-01', status: 'Open', priority: 'High' };
  for (const [p, may] of [[P.admin, true], [P.orgAdmin, true], [P.approver, false], [P.creator, false], [P.worker, false], [P.viewer, false], [P.outsider, false]] as Array<[Person, boolean]>) {
    const w2 = newWorld();
    w2.seed('/actions/old', legacy);
    assert.equal(w2.commit(p.uid, [{ kind: 'delete', path: '/actions/old' }], T0).ok, may, `legacy delete by ${p.id}`);
  }
  // and it cannot be edited or progressed by anyone (it was imported)
  const w3 = newWorld();
  w3.seed('/actions/old', legacy);
  for (const p of [P.admin, P.orgAdmin, P.approver, P.creator, P.worker]) refused(w3.commit(p.uid, [{ kind: 'update', path: '/actions/old', data: { ...legacy, status: 'Closed' } }], T0), `legacy edit by ${p.id}`);
});
