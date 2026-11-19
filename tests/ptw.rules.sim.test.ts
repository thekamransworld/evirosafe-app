// Runs the GENERATED Firestore rules text for permits against the permit
// engine's own writes, using the interpreter in tests/helpers/rulesSim.ts.
//
// What this proves: the rules accept every write the app makes, and refuse
// the forged ones (skipped stages, rewritten logs, client clocks, stretched
// validity, other people's signatures...). Every refusal test has a control
// that is ACCEPTED, so a refusal cannot be an accident of a broken test.
//
// What it does not prove: that the real Firestore engine agrees. For that run
// `npm run test:rules` (emulator, needs Java).
import test from 'node:test';
import assert from 'node:assert/strict';

import * as model from '../src/lib/ptw/model';
import { ACTIONS, STAGES, TYPE_RULES, type ActionId, type Stage } from '../src/lib/ptw/model';
import { checkActor, checkContentEdit, prepareTransition } from '../src/lib/ptw/engine';
import {
  applyUpdate, buildNewPermit, generatePublicToken, mirrorFor, planContentWrite, planTransitionWrite,
  resolveSentinels,
} from '../src/lib/ptw/writes';
import { RulesSim, Ts, World, type Op } from './helpers/rulesSim';
import { DAY, H, MIN, P, T0, hm, mk, newWorld, payload, resolver, rules, ymd, type Person } from './helpers/ptwFixtures';

const ext = { others: [] as any[], competency: { records: [], courses: [] } };

interface Clock { now: number }

function createPermit(w: World, who: Person, clk: Clock, o: { type?: string; hours?: number; tamper?: (d: any) => void; skipCounter?: boolean; skipMirror?: boolean; receiverId?: string; payloadOver?: any; mirrorTamper?: (m: any) => void } = {}) {
  const permitId = `p${Object.keys(w.docs).length}`;
  const year = new Date(clk.now).getFullYear();
  const counterPath = `/counters/ptw_${who.org}_${year}`;
  const existing = w.docs[counterPath];
  const n = existing ? existing.value + 1 : 1;
  const token = generatePublicToken(k => Uint8Array.from({ length: k }, (_, i) => (i * 37 + permitId.length * 11 + Object.keys(w.docs).length) % 251));
  const built = buildNewPermit(permitId, {
    orgId: who.org, projectId: 'proj', type: (o.type ?? 'General Work') as any, title: 'Replace ceiling tiles',
    payload: payload(clk.now, o.payloadOver ?? {}, o.hours ?? 5), creator: who, receiverId: o.receiverId, year, n, token, now: clk.now,
  });
  const permit = resolveSentinels(built.permit, resolver(clk.now));
  o.tamper?.(permit);
  const mirror = { ...mirrorFor(permitId, permit) };
  o.mirrorTamper?.(mirror);
  const ops: Op[] = [];
  if (!o.skipCounter) ops.push({ kind: 'set', path: counterPath, data: built.counter });
  ops.push({ kind: 'set', path: `/ptws/${permitId}`, data: permit });
  if (!o.skipMirror) ops.push({ kind: 'set', path: `/ptw_public/${token}`, data: mirror });
  return { permitId, token, commit: w.commit(who.uid, ops, clk.now) };
}

interface StepOpts {
  note?: string; justification?: string; clientSkewMin?: number; asUid?: string;
  tamper?: (after: any) => void; tamperMirror?: (m: any) => void; reauth?: boolean;
}

function step(w: World, who: Person, id: string, action: ActionId, clk: Clock, o: StepOpts = {}) {
  const path = `/ptws/${id}`;
  const before = w.docs[path];
  const permit: any = { id, ...before };
  const clientNow = clk.now + (o.clientSkewMin ?? 0) * MIN;
  const r = prepareTransition({
    permit, action, actor: { id: who.id, name: who.name, role: who.role }, now: clientNow,
    note: o.note ?? 'a reason that is long enough', justification: o.justification, reauthenticated: o.reauth ?? true, gateInputs: ext,
  });
  if (r.ok === false) return { engine: r, commit: undefined as undefined | ReturnType<World['commit']> };
  const plan = planTransitionWrite(permit, r);
  const res = resolver(clk.now);
  const after = applyUpdate(before, plan.permit, res);
  o.tamper?.(after);
  const mPath = `/ptw_public/${before.public_token}`;
  const mirror = applyUpdate(w.docs[mPath], plan.mirror, res);
  // A forger would keep the mirror consistent with the forged permit; otherwise the MIRROR rule
  // refuses the batch and the permit rule is never really tested.
  mirror.status = after.status;
  if (after.valid_until_ts !== undefined) mirror.valid_until_ts = after.valid_until_ts; else delete mirror.valid_until_ts;
  o.tamperMirror?.(mirror);
  const commit = w.commit(o.asUid ?? who.uid, [{ kind: 'update', path, data: after }, { kind: 'update', path: mPath, data: mirror }], clk.now);
  return { engine: r, commit };
}

const allowed = (r: { engine: any; commit?: any }, label = '') => {
  assert.ok(r.engine.ok === true, `${label} engine refused: ${r.engine.reason}`);
  assert.ok(r.commit && r.commit.ok === true, `${label} rules refused: ${r.commit?.why}`);
};
const denied = (r: { engine: any; commit?: any }, label = '', by = 'ptws') => {
  assert.ok(r.engine.ok === true, `${label} (setup) engine refused: ${r.engine.reason}`);
  assert.ok(r.commit && r.commit.ok === false, `${label}: rules ACCEPTED a forged write`);
  const refusedBy = r.commit.op.path.split('/')[1];
  if (process.env.PTW_SIM_VERBOSE) console.log(`    refused: ${label} -> ${refusedBy}: ${r.commit.why}`);
  assert.equal(refusedBy, by, `${label}: refused by the ${refusedBy} rule, expected the ${by} rule`);
};

/** The normal route a permit takes; each entry is [stage reached, action, who]. */
const ROUTE: Array<[Stage, ActionId, Person]> = [
  ['SUBMITTED', 'submit', P.creator],
  ['SITE_INSPECTION', 'prescreen_pass', P.reviewer],
  ['APPROVAL', 'site_inspection_pass', P.reviewer],
  ['SITE_HANDOVER', 'approve', P.approver],
  ['ACTIVE', 'accept_handover', P.creator],
];

function advanceTo(w: World, id: string, stage: Stage, clk: Clock) {
  if (stage === 'DRAFT') return;
  for (const [reached, action, who] of ROUTE) {
    clk.now += 10 * MIN;
    allowed(step(w, who, id, action, clk), `advance:${action}`);
    if (reached === stage) return;
  }
  const more: Array<[Stage, ActionId, Person]> = [
    ['HOLD', 'stop_work', P.worker], ['COMPLETION_PENDING', 'request_completion', P.creator],
  ];
  for (const [reached, action, who] of more) {
    clk.now += 10 * MIN;
    if (action === 'request_completion') jointInspection(w, id, clk);
    allowed(step(w, who, id, action, clk), `advance:${action}`);
    if (reached === stage) return;
  }
  throw new Error(`cannot advance to ${stage}`);
}

function jointInspection(w: World, id: string, clk: Clock) {
  const before = w.docs[`/ptws/${id}`];
  const after = { ...before, payload: { ...before.payload, joint_inspection: { remarks: 'All clear', requester: { signature: 'Cathy', signed_at: 'x' } } }, updated_at: new Date(clk.now).toISOString() };
  const res = w.commit(P.creator.uid, [{ kind: 'update', path: `/ptws/${id}`, data: after }], clk.now);
  assert.ok(res.ok === true, `joint inspection edit: ${res.ok === false ? res.why : ''}`);
}

function fresh(stage: Stage, o: { type?: string; hours?: number } = {}) {
  const w = newWorld();
  const clk: Clock = { now: T0 };
  const c = createPermit(w, P.creator, clk, o);
  assert.ok(c.commit.ok === true, `create: ${c.commit.ok === false ? c.commit.why : ''}`);
  advanceTo(w, c.permitId, stage, clk);
  return { w, clk, id: c.permitId, token: c.token };
}

// ─── the generated text itself ────────────────────────────────────────────

test('generated rules parse with the interpreter, and respect Firestore language limits', () => {
  const sim = new RulesSim();
  sim.load(rules.functions);
  assert.ok(sim.funcs.size >= 20);
  for (const f of sim.funcs.values()) {
    assert.ok(f.params.length <= 7, `${f.name}: >7 parameters`);
    assert.ok(f.lets.length <= 10, `${f.name}: >10 let bindings`);
  }
  assert.ok(!/\bmath\./.test(rules.functions) && !/\bhash\./.test(rules.functions), 'uses an unsupported namespace');
});

test('the transition table in the rules equals the engine for all 6,084 combinations', () => {
  const sim = new RulesSim();
  sim.load(rules.functions);
  const roles = ['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR', 'WORKER', 'CLIENT_VIEWER', 'CUSTOM_SITE_LEAD'];
  let n = 0, allowedCount = 0;
  for (const from of STAGES) for (const to of STAGES) for (const role of roles) for (const isReq of [false, true]) for (const ov of [false, true]) {
    const permit: any = { id: 'p', status: from, creator_id: 'creator', receiver_id: 'receiver' };
    const actor = { id: isReq ? 'creator' : 'stranger', name: 'x', role };
    const truth = Object.values(ACTIONS).some(def =>
      (def.from as readonly string[]).includes(from) && def.to === to &&
      checkActor(def, permit, actor, ov ? 'a long enough written justification' : '').ok === true);
    const rule = sim.call('ptwTransitionOk', [from, to, role, isReq, ov]);
    assert.equal(rule, truth, `${from}->${to} role=${role} requester=${isReq} override=${ov}`);
    n++; if (truth) allowedCount++;
  }
  assert.equal(n, 6084);
  assert.ok(allowedCount > 100 && allowedCount < n / 2, 'sanity: some, but not most, combinations are allowed');
});

test('max validity per type matches the table (+ clock-skew allowance); unknown types get none', () => {
  const sim = new RulesSim();
  sim.load(rules.functions);
  for (const [type, r] of Object.entries(TYPE_RULES)) {
    assert.equal(sim.call('ptwMaxMinutes', [type]), r.maxHours * 60 + model.CLOCK_SKEW_MINUTES, type);
  }
  assert.equal(sim.call('ptwMaxMinutes', ['Space Walk']), 0);
});

test('content-edit rights in the rules equal the engine, for every stage x role x relationship', () => {
  const people: Array<{ p: Person; tag: string }> = [];
  for (const role of ['ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR', 'WORKER', 'CLIENT_VIEWER', 'CUSTOM_SITE_LEAD']) {
    people.push({ p: mk('creator', role), tag: 'creator' }, { p: mk('receiver', role), tag: 'receiver' }, { p: mk('someone', role), tag: 'other' });
  }
  let checked = 0;
  for (const stage of STAGES) {
    for (const { p, tag } of people) {
      const w = new World(rules.functions, rules.matches);
      w.pointer(p.uid, { docId: p.id, org_id: 'org1', role: p.role, project_ids: ['proj'] });
      const doc: any = {
        org_id: 'org1', project_id: 'proj', type: 'General Work', status: stage, title: 't', payload: { work: { location: 'x' } },
        approvals: [], audit_log: [], updated_at: 'x', workflow_log: [{ stage: 'DRAFT', user_id: 'creator', action: 'create', timestamp: 'x' }],
        permit_no: 'PTW-2026-0001', permit_year: 2026, public_token: 'T'.repeat(24), creator_id: 'creator', receiver_id: 'receiver',
        last_transition_at: new Ts(T0), stage_times: { DRAFT: new Ts(T0) }, signatures: {}, extensions: [],
      };
      w.seed('/ptws/a', doc);
      const after = { ...doc, payload: { ...doc.payload, notes: 'edited' }, updated_at: 'y' };
      const rule = w.commit(p.uid, [{ kind: 'update', path: '/ptws/a', data: after }], T0 + H).ok === true;
      const engine = checkContentEdit({ id: 'a', ...doc }, { id: p.id, name: 'n', role: p.role }).ok === true;
      assert.equal(rule, engine, `stage=${stage} role=${p.role} as ${tag}`);
      checked++;
    }
  }
  assert.equal(checked, STAGES.length * 27);
});

// ─── the happy path: everything the app writes must be accepted ───────────

test('a permit travels the whole route and every write the app makes is accepted', () => {
  const w = newWorld();
  const clk: Clock = { now: T0 };
  const c = createPermit(w, P.creator, clk, { receiverId: P.receiver.id });
  assert.ok(c.commit.ok === true, c.commit.ok === false ? c.commit.why : '');
  const id = c.permitId;
  let maxAccess = w.lastStats.accessCalls, maxEvals = w.lastStats.evals;
  const go = (who: Person, action: ActionId, o: StepOpts = {}) => {
    clk.now += 10 * MIN;
    const r = step(w, who, id, action, clk, o);
    allowed(r, action);
    maxAccess = Math.max(maxAccess, w.lastStats.accessCalls); maxEvals = Math.max(maxEvals, w.lastStats.evals);
    return r;
  };
  go(P.creator, 'submit');
  go(P.reviewer, 'prescreen_pass');
  go(P.reviewer, 'site_inspection_pass');
  go(P.approver, 'approve');
  go(P.creator, 'accept_handover');
  go(P.worker, 'stop_work', { note: 'Gas smell reported near riser' });
  go(P.reviewer, 'resume', { note: 'Source found, area ventilated' });
  go(P.reviewer, 'revalidate', { note: 'Works running over; area re-checked' });
  jointInspection(w, id, clk);
  go(P.creator, 'request_completion');
  go(P.reviewer, 'inspection_fail', { note: 'Debris left in the duct' });
  go(P.reviewer, 'resume', { note: 'Debris removed, re-inspected' });
  go(P.creator, 'request_completion');
  go(P.reviewer, 'close');
  go(P.approver, 'archive');

  const doc = w.docs[`/ptws/${id}`];
  assert.equal(doc.status, 'ARCHIVED');
  assert.equal(doc.workflow_log.length, 15); // create + 14 transitions
  assert.equal(doc.extensions.length, 1);
  assert.ok(doc.valid_until_ts instanceof Ts && doc.first_activated_ts instanceof Ts);
  assert.equal(w.docs[`/ptw_public/${c.token}`].status, 'ARCHIVED');
  // Firestore allows 20 document lookups per batched write, and 1,000 expression evaluations.
  assert.ok(maxAccess <= 20, `document lookups per batch: ${maxAccess}`);
  assert.ok(maxEvals <= 1000, `expression evaluations per batch: ${maxEvals}`);
  console.log(`    (worst batch: ${maxAccess} document lookups, ${maxEvals} evaluations)`);
  // Guard against the rules growing past Firestore's per-request expression limit. The counts are
  // this interpreter's (every node), which over-count what Firestore bills, so these caps leave headroom.
  assert.ok(w.profile.ptwUpdateOk <= 650, `ptwUpdateOk costs ${w.profile.ptwUpdateOk} evaluations`);
  assert.ok(w.profile.ptwCreateOk <= 400, `ptwCreateOk costs ${w.profile.ptwCreateOk} evaluations`);
  console.log('    heaviest functions: ' + Object.entries(w.profile).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k}=${v}`).join('  '));
});

test('send back, reject and withdraw are accepted from the stages the table allows', () => {
  for (const [stage, action, who] of [
    ['SUBMITTED', 'send_back', P.reviewer], ['SITE_INSPECTION', 'reject', P.reviewer], ['APPROVAL', 'send_back', P.approver],
    ['SUBMITTED', 'withdraw', P.creator], ['SITE_HANDOVER', 'cancel', P.approver], ['HOLD', 'cancel', P.approver],
  ] as Array<[Stage, ActionId, Person]>) {
    const { w, clk, id } = fresh(stage);
    clk.now += 10 * MIN;
    allowed(step(w, who, id, action, clk), `${action} from ${stage}`);
  }
});

test('an expired permit is marked by anyone on site, and can then be completed', () => {
  const { w, clk, id } = fresh('ACTIVE', { hours: 2 });
  clk.now += 3 * H; // past the 2 h window
  allowed(step(w, P.worker, id, 'expire', clk), 'expire');
  assert.equal(w.docs[`/ptws/${id}`].status, 'EXPIRED');
  clk.now += 10 * MIN;
  jointInspection(w, id, clk);
  allowed(step(w, P.creator, id, 'request_completion', clk), 'complete');
});

test('segregation override: an administrator may approve their own permit with a written reason, and it is flagged', () => {
  const w = newWorld(); const clk: Clock = { now: T0 };
  const c = createPermit(w, P.admin, clk);
  assert.ok(c.commit.ok === true);
  for (const [action, who] of [['submit', P.admin], ['prescreen_pass', P.reviewer], ['site_inspection_pass', P.reviewer]] as Array<[ActionId, Person]>) { clk.now += 10 * MIN; allowed(step(w, who, c.permitId, action, clk), action); }
  clk.now += 10 * MIN;
  const refused = step(w, P.admin, c.permitId, 'approve', clk);
  assert.ok(refused.engine.ok === false, 'engine should refuse without justification');
  const r = step(w, P.admin, c.permitId, 'approve', clk, { justification: 'Sole administrator on site; urgent shutdown work' });
  allowed(r, 'override approve');
  const last = w.docs[`/ptws/${c.permitId}`].workflow_log.slice(-1)[0];
  assert.equal(last.override, true);
});

// ─── forged creation ──────────────────────────────────────────────────────

function createPair(label: string, who: Person, o: Parameters<typeof createPermit>[3], opts: { control?: Parameters<typeof createPermit>[3] } = {}) {
  const wC = newWorld();
  const control = createPermit(wC, who, { now: T0 }, opts.control ?? {});
  assert.ok(control.commit.ok === true, `${label}: control must be accepted: ${control.commit.ok === false ? control.commit.why : ''}`);
  const wT = newWorld();
  const forged = createPermit(wT, who, { now: T0 }, o);
  assert.ok(forged.commit.ok === false, `${label}: rules ACCEPTED a forged creation`);
  if (forged.commit.ok === false) assert.equal(forged.commit.op.path.split('/')[1], 'ptws', `${label}: refused by the wrong rule (${forged.commit.why})`);
}

test('creation: forged permits are refused', () => {
  createPair('born ACTIVE', P.creator, { tamper: d => { d.status = 'ACTIVE'; } });
  createPair('someone else as creator', P.creator, { tamper: d => { d.creator_id = 'rev'; } });
  createPair('log written as someone else', P.creator, { tamper: d => { d.workflow_log[0].user_id = 'rev'; } });
  createPair('counter not consumed', P.creator, { skipCounter: true });
  createPair('no public mirror created with it', P.creator, { skipMirror: true });
  createPair('client clock for last_transition_at', P.creator, { tamper: d => { d.last_transition_at = new Ts(T0 - DAY); } });
  createPair('client clock for stage time', P.creator, { tamper: d => { d.stage_times.DRAFT = new Ts(T0 - DAY); } });
  createPair('validity smuggled in', P.creator, { tamper: d => { d.valid_until_ts = new Ts(T0 + DAY); } });
  createPair('signatures pre-filled', P.creator, { tamper: d => { d.signatures = { approval: { user_id: 'app', name: 'x', role: 'HSE_MANAGER', signed_at: 'x', action: 'approve' } }; } });
  createPair('unknown permit type', P.creator, { tamper: d => { d.type = 'Space Walk'; } });
  createPair('empty title', P.creator, { tamper: d => { d.title = ''; } });
  createPair('permit number from the wrong year', P.creator, { tamper: d => { d.permit_no = 'PTW-2031-0001'; } });
  createPair('short public token', P.creator, { tamper: d => { d.public_token = 'short'; } });
  createPair('mirror points at another permit', P.creator, { mirrorTamper: m => { m.permit_id = 'someone-elses'; } });
  createPair('mirror token mismatch', P.creator, { mirrorTamper: m => { m.token = 'X'.repeat(24); } });
});

test('creation: who may create', () => {
  for (const who of [P.viewer, P.outsider, P.otherProj]) {
    const w = newWorld();
    const r = createPermit(w, who, { now: T0 });
    // outsider tries to create inside org1/proj with org2 credentials; others by role / project
    assert.ok(r.commit.ok === false || who.org !== 'org1', `${who.id} should not create in org1/proj`);
  }
  const w = newWorld();
  assert.ok(createPermit(w, P.viewer, { now: T0 }).commit.ok === false, 'client viewer');
  const w2 = newWorld();
  const forged = createPermit(w2, P.outsider, { now: T0 }, { tamper: d => { d.org_id = 'org1'; } });
  assert.ok(forged.commit.ok === false, 'another organisation writing into org1');
  const w3 = newWorld();
  assert.ok(createPermit(w3, P.otherProj, { now: T0 }).commit.ok === false, 'user not assigned to the project');
});

// ─── forged transitions ───────────────────────────────────────────────────

function pair(label: string, stage: Stage, who: Person, action: ActionId, tamper: StepOpts, o: { type?: string; hours?: number; pre?: (w: World, clk: Clock, id: string) => void; control?: StepOpts } = {}) {
  const a = fresh(stage, o);
  o.pre?.(a.w, a.clk, a.id);
  a.clk.now += 10 * MIN;
  allowed(step(a.w, who, a.id, action, a.clk, o.control ?? {}), `${label} (control)`);
  const b = fresh(stage, o);
  o.pre?.(b.w, b.clk, b.id);
  b.clk.now += 10 * MIN;
  denied(step(b.w, who, b.id, action, b.clk, tamper), label, tamper.tamperMirror ? 'ptw_public' : 'ptws');
}

test('transitions: forged stages, roles and logs are refused', () => {
  pair('skip straight to ACTIVE', 'DRAFT', P.creator, 'submit', { tamper: a => { a.status = 'ACTIVE'; a.workflow_log[a.workflow_log.length - 1].stage = 'ACTIVE'; a.stage_times = { DRAFT: new Ts(T0), ACTIVE: new Ts(T0 + 10 * MIN) }; } });
  pair('a worker carrying out an approval', 'APPROVAL', P.approver, 'approve', { asUid: P.worker.uid });
  pair('someone using the approver\'s write under their own login', 'APPROVAL', P.approver, 'approve', { asUid: P.reviewer.uid });
  pair('log entry dropped', 'DRAFT', P.creator, 'submit', { tamper: a => { a.workflow_log = a.workflow_log.slice(0, 1); } });
  pair('two log entries added', 'DRAFT', P.creator, 'submit', { tamper: a => { a.workflow_log.push({ ...a.workflow_log[a.workflow_log.length - 1] }); } });
  pair('earlier log entry rewritten', 'SUBMITTED', P.reviewer, 'prescreen_pass', { tamper: a => { a.workflow_log[0] = { ...a.workflow_log[0], user_name: 'someone else' }; } });
  pair('log entry names another person', 'DRAFT', P.creator, 'submit', { tamper: a => { a.workflow_log[a.workflow_log.length - 1].user_id = 'rev'; } });
  pair('log stage does not match status', 'DRAFT', P.creator, 'submit', { tamper: a => { a.workflow_log[a.workflow_log.length - 1].stage = 'APPROVAL'; } });
  pair('client clock for last_transition_at', 'DRAFT', P.creator, 'submit', { tamper: a => { a.last_transition_at = new Ts(T0 - DAY); } });
  pair('client clock for the stage time', 'DRAFT', P.creator, 'submit', { tamper: a => { a.stage_times.SUBMITTED = new Ts(T0 - DAY); } });
  pair('another person\'s name on a signature', 'APPROVAL', P.approver, 'approve', { tamper: a => { a.signatures.approval.user_id = 'adm'; } });
  pair('a signature slot nobody uses', 'DRAFT', P.creator, 'submit', { tamper: a => { a.signatures.god_mode = { user_id: 'creator' }; } });
  pair('payload rewritten during a transition', 'DRAFT', P.creator, 'submit', { tamper: a => { a.payload.work.location = 'Somewhere else'; } });
  pair('project moved during a transition', 'DRAFT', P.creator, 'submit', { tamper: a => { a.project_id = 'other'; } });
  pair('permit type changed during a transition', 'DRAFT', P.creator, 'submit', { tamper: a => { a.type = 'General Work'; a.permit_no = 'PTW-2026-9999'; } });
  pair('stop work that records no stoppage', 'ACTIVE', P.worker, 'stop_work', { tamper: a => { a.payload.holding_or_stoppage = []; } });
  pair('stop work that adds two stoppage records', 'ACTIVE', P.worker, 'stop_work', { tamper: a => { const r = a.payload.holding_or_stoppage; a.payload.holding_or_stoppage = [...r, { ...r[0] }]; } });
  pair('mirror claims a different status', 'DRAFT', P.creator, 'submit', { tamperMirror: m => { m.status = 'ACTIVE'; } });
  pair('mirror carries a person\'s name', 'DRAFT', P.creator, 'submit', { tamperMirror: m => { m.requester_name = 'Cathy Creator'; } });
});

test('transitions: send-back may clear signatures, nothing else may', () => {
  const a = fresh('SUBMITTED');
  a.clk.now += 10 * MIN;
  allowed(step(a.w, P.reviewer, a.id, 'send_back', a.clk), 'send back');
  assert.deepEqual(a.w.docs[`/ptws/${a.id}`].signatures, {});
  const b = fresh('APPROVAL');
  b.clk.now += 10 * MIN;
  denied(step(b.w, P.approver, b.id, 'approve', b.clk, { tamper: x => { x.signatures = {}; } }), 'approve that wipes earlier signatures');
});

test('overrides: need an approver role and a written justification', () => {
  pair('override flag with no justification', 'APPROVAL', P.approver, 'approve', { tamper: a => { const l = a.workflow_log[a.workflow_log.length - 1]; l.override = true; l.justification = 'no'; } });
  // a reviewer-role person flagging an override on a plain transition
  pair('override flag by a non-approver', 'SUBMITTED', P.reviewer, 'prescreen_pass', { tamper: a => { const l = a.workflow_log[a.workflow_log.length - 1]; l.override = true; l.justification = 'I just want to'; } });
});

test('validity: server-stamped, capped by type, never extended by resume, refused after expiry', () => {
  // activation
  pair('valid_from from the device clock', 'SITE_HANDOVER', P.creator, 'accept_handover', { tamper: a => { a.valid_from_ts = new Ts(T0 - 5 * H); } });
  pair('first_activated from the device clock', 'SITE_HANDOVER', P.creator, 'accept_handover', { tamper: a => { a.first_activated_ts = new Ts(T0 - 5 * H); } });
  pair('Hot Work stretched beyond 8 hours', 'SITE_HANDOVER', P.creator, 'accept_handover',
    { tamper: a => { a.valid_until_ts = new Ts(a.valid_from_ts.ms + 9 * H); } }, { type: 'Hot Work', hours: 12 });
  pair('validity already in the past', 'SITE_HANDOVER', P.creator, 'accept_handover', { tamper: a => { a.valid_until_ts = new Ts(a.valid_from_ts.ms - 1); } });
  pair('activation without any validity', 'SITE_HANDOVER', P.creator, 'accept_handover', { tamper: a => { delete a.valid_until_ts; } });
  // a Hot Work permit asked for 12 h is capped at 8 h and that IS accepted (control inside pair)
});

test('validity cannot be changed by any transition except activation and revalidation', () => {
  // before activation: validity smuggled into an approval
  pair('validity smuggled into an approval', 'APPROVAL', P.approver, 'approve', { tamper: a => { a.valid_until_ts = new Ts(a.last_transition_at.ms + 5 * H); a.valid_from_ts = new Ts(a.last_transition_at.ms); } });
  // after activation: stopping work, completing or cancelling must not stretch or shrink the window
  pair('stop work that stretches validity', 'ACTIVE', P.worker, 'stop_work', { tamper: a => { a.valid_until_ts = new Ts(a.valid_until_ts.ms + 6 * H); } });
  pair('stop work that shortens validity', 'ACTIVE', P.worker, 'stop_work', { tamper: a => { a.valid_until_ts = new Ts(a.valid_until_ts.ms - H); } });
  pair('completion request that rewrites validity', 'ACTIVE', P.creator, 'request_completion', { tamper: a => { a.valid_until_ts = new Ts(a.valid_until_ts.ms + 6 * H); } },
    { pre: (w, clk, id) => jointInspection(w, id, clk) });
  pair('cancel that rewrites the start time', 'ACTIVE', P.reviewer, 'cancel', { tamper: a => { a.valid_from_ts = new Ts(a.valid_from_ts.ms - DAY); } });
  pair('ISO twin of the end time rewritten', 'ACTIVE', P.worker, 'stop_work', { tamper: a => { a.valid_until = new Date(T0 + 30 * DAY).toISOString(); } });
});

test('a "revalidation" must actually extend the permit', () => {
  const a = activeAt({ type: 'Hot Work', hours: 2 });
  a.clk.now += 30 * MIN;
  denied(step(a.w, P.reviewer, a.id, 'revalidate', a.clk, { note: 'Work running over, re-checked', tamper: x => { x.valid_until_ts = new Ts(a.w.docs[`/ptws/${a.id}`].valid_until_ts.ms - H); } }), 'revalidation that shortens');
  const b = activeAt({ type: 'Hot Work', hours: 2 });
  b.clk.now += 30 * MIN;
  denied(step(b.w, P.reviewer, b.id, 'revalidate', b.clk, { note: 'Work running over, re-checked', tamper: x => { x.valid_until_ts = new Ts(b.w.docs[`/ptws/${b.id}`].valid_until_ts.ms); } }), 'revalidation that changes nothing');
});

test('validity: the 10-minute clock-skew allowance', () => {
  // a device 5 minutes fast is tolerated, 11 minutes fast is refused (the permit would last longer than allowed)
  for (const [skew, ok] of [[0, true], [5, true], [-30, true], [11, false]] as Array<[number, boolean]>) {
    const { w, clk, id } = fresh('SITE_HANDOVER', { type: 'Hot Work', hours: 12 });
    clk.now += 10 * MIN;
    const r = step(w, P.creator, id, 'accept_handover', clk, { clientSkewMin: skew });
    assert.ok(r.engine.ok === true);
    assert.equal(r.commit!.ok, ok, `device clock ${skew} min ahead`);
  }
});

function activeAt(o: { type?: string; hours?: number } = {}) { return fresh('ACTIVE', o); }

test('revalidation: extends once, stamped from the server, refused after expiry and past 7 days', () => {
  // control + forged beyond type maximum
  const a = activeAt({ type: 'Hot Work', hours: 2 });
  a.clk.now += 30 * MIN;
  allowed(step(a.w, P.reviewer, a.id, 'revalidate', a.clk, { note: 'Work running over, re-checked' }), 'revalidate');
  const b = activeAt({ type: 'Hot Work', hours: 2 });
  b.clk.now += 30 * MIN;
  denied(step(b.w, P.reviewer, b.id, 'revalidate', b.clk, { note: 'Work running over, re-checked', tamper: x => { x.valid_until_ts = new Ts(b.clk.now + 9 * H); } }), 'revalidate beyond the 8 h maximum');
  // extension record missing
  const c = activeAt({ type: 'Hot Work', hours: 2 });
  c.clk.now += 30 * MIN;
  denied(step(c.w, P.reviewer, c.id, 'revalidate', c.clk, { note: 'Work running over, re-checked', tamper: x => { x.extensions = []; } }), 'revalidate without an extension record');
  // changing the original start
  const d = activeAt({ type: 'Hot Work', hours: 2 });
  d.clk.now += 30 * MIN;
  denied(step(d.w, P.reviewer, d.id, 'revalidate', d.clk, { note: 'Work running over, re-checked', tamper: x => { x.first_activated_ts = new Ts(d.clk.now); } }), 'revalidate that resets the first activation');
});

test('revalidation: refused once the SERVER clock says the permit has expired, even if the device clock disagrees', () => {
  const { w, clk, id } = activeAt({ type: 'Hot Work', hours: 2 });
  clk.now += 3 * H; // server: expired
  const r = step(w, P.reviewer, id, 'revalidate', clk, { note: 'Work running over, re-checked', clientSkewMin: -(3 * 60 - 30) }); // device clock set back to 30 min in
  assert.ok(r.engine.ok === true, 'a device with its clock set back fools the engine...');
  assert.equal(r.commit!.ok, false, '...but not the database');
});

function lateStage() {
  // General Work, valid 20 h at a time; extend every 18 h (before each expiry) until the 7-day wall is near.
  const f = activeAt({ type: 'General Work', hours: 20 });
  const first = f.w.docs[`/ptws/${f.id}`].first_activated_ts.ms;
  for (let k = 1; k <= 7; k++) {
    f.clk.now += 18 * H;
    allowed(step(f.w, P.reviewer, f.id, 'revalidate', f.clk, { note: `Daily extension ${k}, area re-checked` }), `extension ${k}`);
  }
  f.clk.now = first + 6 * DAY + 2 * H; // day 6 + 2 h: still inside the last extension
  return { ...f, first };
}

test('revalidation: never beyond 7 days in total', () => {
  const a = lateStage();
  allowed(step(a.w, P.reviewer, a.id, 'revalidate', a.clk, { note: 'Near the end of the seven days' }), 'last extension');
  const until = a.w.docs[`/ptws/${a.id}`].valid_until_ts.ms;
  assert.ok(until <= a.first + 7 * DAY + model.CLOCK_SKEW_MINUTES * MIN, 'the engine stops at 7 days');
  assert.ok(until > a.first + 6 * DAY + 2 * H, 'and it did extend');
  const b = lateStage();
  denied(step(b.w, P.reviewer, b.id, 'revalidate', b.clk, { note: 'Trying for more than seven days', tamper: x => { x.valid_until_ts = new Ts(b.first + 7 * DAY + H); } }), 'revalidate beyond 7 days');
  assert.equal(b.w.docs[`/ptws/${b.id}`].extensions.length, 7, 'refused write changed nothing');
});

test('stoppage records are append-only: earlier ones cannot be rewritten or removed', () => {
  // HOLD -> resume -> stop again: the first record is history
  const f = fresh('HOLD');
  f.clk.now += 10 * MIN; allowed(step(f.w, P.reviewer, f.id, 'resume', f.clk, { note: 'Source found and fixed' }), 'resume');
  f.clk.now += 10 * MIN;
  denied(step(f.w, P.worker, f.id, 'stop_work', f.clk, { note: 'Second stoppage', tamper: a => { a.payload.holding_or_stoppage[0] = { ...a.payload.holding_or_stoppage[0], reason: 'nothing happened' }; } }), 'rewriting the first stoppage');
  const g = fresh('HOLD');
  g.clk.now += 10 * MIN;
  denied(step(g.w, P.reviewer, g.id, 'resume', g.clk, { note: 'Source found and fixed', tamper: a => { a.payload.holding_or_stoppage = []; } }), 'resume that erases the stoppage');
  const h = fresh('HOLD');
  h.clk.now += 10 * MIN;
  denied(step(h.w, P.reviewer, h.id, 'resume', h.clk, { note: 'Source found and fixed', tamper: a => { a.payload.holding_or_stoppage = [...a.payload.holding_or_stoppage, { time: 'x' }]; } }), 'resume that adds a record');
});

test('resume never extends validity; expire only after the end', () => {
  pair('resume that quietly extends', 'HOLD', P.reviewer, 'resume', { tamper: a => { a.valid_until_ts = new Ts(a.valid_until_ts.ms + 5 * H); } });
  // expire early: device clock ahead (engine thinks it expired), server clock says not yet
  const { w, clk, id } = activeAt({ hours: 2 });
  const r = step(w, P.worker, id, 'expire', clk, { clientSkewMin: 3 * 60 });
  assert.ok(r.engine.ok === true && r.commit!.ok === false, 'a fast device clock cannot expire a live permit');
  // resume after the server clock has passed the end
  const h = fresh('HOLD', { hours: 2 });
  h.clk.now += 4 * H;
  const rr = step(h.w, P.reviewer, h.id, 'resume', h.clk, { clientSkewMin: -3 * 60 });
  assert.ok(rr.engine.ok === true && rr.commit!.ok === false, 'cannot resume an expired permit by setting the device clock back');
});

// ─── content edits ────────────────────────────────────────────────────────

function edit(w: World, who: Person, id: string, clk: Clock, mutate: (d: any) => void) {
  const before = w.docs[`/ptws/${id}`];
  const after = { ...before, payload: { ...before.payload }, updated_at: new Date(clk.now).toISOString() };
  mutate(after);
  return w.commit(who.uid, [{ kind: 'update', path: `/ptws/${id}`, data: after }], clk.now);
}

test('content edits: allowed where staff record work, refused elsewhere', () => {
  for (const [stage, expected] of [
    ['DRAFT', true], ['SUBMITTED', false], ['SITE_INSPECTION', true], ['APPROVAL', false], ['SITE_HANDOVER', true], ['ACTIVE', true], ['HOLD', true],
  ] as Array<[Stage, boolean]>) {
    const { w, clk, id } = fresh(stage);
    clk.now += MIN;
    const r = edit(w, P.creator, id, clk, d => { d.payload.gas_tests = [{ time: '10:00', o2: 20.9 }]; });
    assert.equal(r.ok, expected, `${stage}: ${r.ok === false ? r.why : ''}`);
  }
  const done = fresh('COMPLETION_PENDING');
  assert.equal(edit(done.w, P.creator, done.id, done.clk, d => { d.payload.notes = 'x'; }).ok, true);
});

test('content edits: cannot change status, log, signatures, validity, owner or stoppage records', () => {
  const muts: Array<[string, (d: any) => void]> = [
    ['status', d => { d.status = 'CLOSED'; }],
    ['workflow_log', d => { d.workflow_log = []; }],
    ['signatures', d => { d.signatures = { approval: { user_id: 'x' } }; }],
    ['valid_until_ts', d => { d.valid_until_ts = new Ts(T0 + 30 * DAY); }],
    ['creator_id', d => { d.creator_id = 'rev'; }],
    ['org_id', d => { d.org_id = 'org2'; }],
    ['permit_no', d => { d.permit_no = 'PTW-2026-0002'; }],
    ['public_token', d => { d.public_token = 'Z'.repeat(24); }],
    ['stoppage records', d => { d.payload.holding_or_stoppage = [{ time: 'x', reason: 'y', stopped_by: 'z', informed_to: '', restarted_time: '', signature: '' }]; }],
    ['receiver after draft', d => { d.receiver_id = 'rev'; }],
    ['title after draft', d => { d.title = 'Something else'; }],
  ];
  for (const [label, m] of muts) {
    const { w, clk, id } = fresh('ACTIVE');
    clk.now += MIN;
    const ctl = edit(w, P.creator, id, clk, d => { d.payload.gas_tests = []; });
    assert.ok(ctl.ok === true, `control: ${ctl.ok === false ? ctl.why : ''}`);
    assert.equal(edit(w, P.creator, id, clk, m).ok, false, `edit changing ${label} must be refused`);
  }
});

test('content edits: draft owners and approvers, not outsiders or viewers', () => {
  const { w, clk, id } = fresh('DRAFT');
  clk.now += MIN;
  const e = (who: Person) => edit(w, who, id, clk, d => { d.title = 'Updated title'; d.receiver_id = 'receiver'; }).ok;
  assert.equal(e(P.creator), true);
  assert.equal(e(P.approver), true);
  assert.equal(e(P.reviewer), false, 'a reviewer who is not the owner');
  assert.equal(e(P.worker), false);
  assert.equal(e(P.viewer), false);
  assert.equal(e(P.outsider), false);
  assert.equal(e(P.otherProj), false);
});

test('the engine write plans touch only fields the rules allow', () => {
  const { w, clk, id } = fresh('ACTIVE');
  const doc: any = { id, ...w.docs[`/ptws/${id}`] };
  const next = { ...doc.payload, gas_tests: [{ time: '10:10', o2: 20.9 }], work: { ...doc.payload.work, location: 'Level 4' } };
  const plan = planContentWrite(doc, { payload: next }, clk.now);
  assert.deepEqual(Object.keys(plan.permit).sort(), ['payload.gas_tests', 'payload.work.location', 'updated_at']);
  assert.ok(plan.mirror && plan.mirror.location === 'Level 4');
  assert.equal(planContentWrite(doc, { payload: doc.payload }, clk.now).changed, false);
});

// ─── deletes ──────────────────────────────────────────────────────────────

test('deletes: drafts by their creator or an approver; anything else only legacy permits by an administrator', () => {
  const del = (w: World, who: Person, id: string, token: string) =>
    w.commit(who.uid, [{ kind: 'delete', path: `/ptws/${id}` }, { kind: 'delete', path: `/ptw_public/${token}` }], T0 + H).ok;
  { const f = fresh('DRAFT'); assert.equal(del(f.w, P.creator, f.id, f.token), true, 'creator deletes own draft'); }
  { const f = fresh('DRAFT'); assert.equal(del(f.w, P.approver, f.id, f.token), true, 'approver deletes a draft'); }
  { const f = fresh('DRAFT'); assert.equal(del(f.w, P.reviewer, f.id, f.token), false, 'reviewer cannot'); }
  { const f = fresh('DRAFT'); assert.equal(del(f.w, P.worker, f.id, f.token), false, 'worker cannot'); }
  { const f = fresh('DRAFT'); assert.equal(del(f.w, P.outsider, f.id, f.token), false, 'another organisation cannot'); }
  { const f = fresh('SUBMITTED'); assert.equal(del(f.w, P.creator, f.id, f.token), false, 'submitted permit'); }
  { const f = fresh('ACTIVE'); assert.equal(del(f.w, P.admin, f.id, f.token), false, 'even an administrator cannot delete a live permit'); }
  { // the mirror alone cannot be deleted while its permit exists
    const f = fresh('DRAFT');
    assert.equal(f.w.commit(P.creator.uid, [{ kind: 'delete', path: `/ptw_public/${f.token}` }], T0 + H).ok, false); }
  // legacy permits (created before the rebuild) carry no permit_no
  const legacy = () => { const w = newWorld(); w.seed('/ptws/old', { org_id: 'org1', project_id: 'proj', type: 'Hot Work', status: 'ACTIVE', title: 'Old', payload: {}, updated_at: 'x' }); return w; };
  assert.equal(legacy().commit(P.admin.uid, [{ kind: 'delete', path: '/ptws/old' }], T0).ok, true, 'ADMIN deletes legacy');
  assert.equal(legacy().commit(P.orgAdmin.uid, [{ kind: 'delete', path: '/ptws/old' }], T0).ok, true, 'ORG_ADMIN deletes legacy');
  assert.equal(legacy().commit(P.approver.uid, [{ kind: 'delete', path: '/ptws/old' }], T0).ok, false, 'HSE_MANAGER cannot delete legacy');
  const l2 = legacy();
  const upd = l2.commit(P.admin.uid, [{ kind: 'update', path: '/ptws/old', data: { ...l2.docs['/ptws/old'], status: 'CLOSED' } }], T0);
  assert.equal(upd.ok, false, 'legacy permits cannot be progressed, even by an administrator');
  const l3 = legacy();
  const ed = l3.commit(P.admin.uid, [{ kind: 'update', path: '/ptws/old', data: { ...l3.docs['/ptws/old'], payload: { notes: 'edited' }, updated_at: 'y' } }], T0);
  assert.equal(ed.ok, false, 'legacy permits cannot be edited either: only deleted');
});

// ─── public mirror and counters ───────────────────────────────────────────

test('public mirror: readable by exact token only, writable only to agree with its permit', () => {
  const { w, clk, id, token } = fresh('SUBMITTED');
  const sim = w.sim;
  sim.host = { isSignedIn: () => false };
  const mt = rules.matches.find((m: any) => m.path.startsWith('/ptw_public'));
  const get = mt.allows.find((a: any) => a.ops.includes('get')).expr, list = mt.allows.find((a: any) => a.ops.includes('list')).expr;
  assert.equal(sim.evalExpr(get), true);
  assert.equal(sim.evalExpr(list), false);
  // what is public
  const pub = w.docs[`/ptw_public/${token}`];
  for (const k of Object.keys(pub)) assert.ok((model.PUBLIC_MIRROR_KEYS as readonly string[]).includes(k), `unexpected public field ${k}`);
  for (const bad of ['description', 'requester', 'creator_id', 'title', 'payload', 'name', 'phone', 'receiver_id']) assert.ok(!(bad in pub), `public mirror leaks ${bad}`);
  // a lying mirror
  const lie = { ...pub, status: 'ACTIVE' };
  clk.now += MIN;
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path: `/ptw_public/${token}`, data: lie }], clk.now).ok, false, 'mirror cannot claim ACTIVE');
  const ok = { ...pub, location: 'Level 5', updated_at: 'now' };
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path: `/ptw_public/${token}`, data: ok }], clk.now).ok, true, 'location may follow the permit');
  assert.equal(w.commit(P.viewer.uid, [{ kind: 'update', path: `/ptw_public/${token}`, data: ok }], clk.now).ok, false, 'viewers cannot write');
  void id;
});

test('counters: +1 only, one per org and year, no deletes, no peeking at other organisations', () => {
  const w = newWorld();
  const path = '/counters/ptw_org1_2026';
  const c = (over: any = {}) => ({ org_id: 'org1', year: 2026, value: 1, ...over });
  assert.equal(w.commit(P.creator.uid, [{ kind: 'set', path, data: c({ value: 5 }) }], T0).ok, false, 'must start at 1');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'set', path: '/counters/ptw_org1_2027', data: c() }], T0).ok, false, 'id must match org and year');
  assert.equal(w.commit(P.outsider.uid, [{ kind: 'set', path, data: c() }], T0).ok, false, 'another org cannot create it');
  assert.equal(w.commit(P.viewer.uid, [{ kind: 'set', path, data: c() }], T0).ok, false, 'viewers cannot');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'set', path, data: c() }], T0).ok, true);
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path, data: c({ value: 3 }) }], T0).ok, false, 'skipping a number');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path, data: c({ value: 1 }) }], T0).ok, false, 'not moving');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path, data: c({ value: 0 }) }], T0).ok, false, 'going backwards');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path, data: c({ org_id: 'org2', value: 2 }) }], T0).ok, false, 'moving to another org');
  assert.equal(w.commit(P.creator.uid, [{ kind: 'update', path, data: c({ value: 2 }) }], T0).ok, true);
  assert.equal(w.commit(P.creator.uid, [{ kind: 'delete', path }], T0).ok, false, 'no deletes');
});
