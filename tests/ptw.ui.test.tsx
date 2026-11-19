// The permit screens, rendered on the server with realistic fixtures. This is NOT a browser:
// it proves every screen renders without throwing for every stage, role and permit type, and
// that the key controls appear (or are absent) for the right people. Clicking and typing are
// not exercised here.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// React's server renderer puts <!-- --> between adjacent text nodes; strip it so text assertions read naturally.
const rts = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '');

import { ctx } from './helpers/fakeContexts';
import { STAGES, TYPE_RULES, type Stage } from '../src/lib/ptw/model';
import { buildPermitPayload } from '../src/lib/ptw/payload';
import { PtwDetailModal, normalizePayload, type SectionKey } from '../src/components/PtwDetailModal';
import { PtwCreationModal } from '../src/components/PtwCreationModal';
import { Ptw as PtwList } from '../src/components/Ptw';
import { ValidityBanner } from '../src/components/ptw/ValidityBanner';
import { PermitTimeline } from '../src/components/ptw/PermitTimeline';
import { PermitActionsPanel } from '../src/components/ptw/PermitActionsPanel';
import { ControlsSection } from '../src/components/ptw/ControlsSection';
import { GasTestLogSection } from '../src/components/ptw/GasTestLogSection';
import { IsolationRegister } from '../src/components/ptw/IsolationRegister';
import { TeamEditor } from '../src/components/ptw/TeamEditor';

(globalThis as any).window = { location: { href: 'http://localhost/' }, confirm: () => true, print: () => {} };

// ─── fixtures ─────────────────────────────────────────────────────────────

const H = 3_600_000;
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ts = (ms: number) => ({ toMillis: () => ms });

const people = {
  creator: { id: 'creator', name: 'Cathy Creator', role: 'SUPERVISOR' },
  reviewer: { id: 'rev', name: 'Rita Reviewer', role: 'HSE_OFFICER' },
  approver: { id: 'app', name: 'Ali Approver', role: 'HSE_MANAGER' },
  admin: { id: 'adm', name: 'Ada Admin', role: 'ADMIN' },
  worker: { id: 'w', name: 'Wasim Worker', role: 'WORKER' },
  viewer: { id: 'v', name: 'Client Viewer', role: 'CLIENT_VIEWER' },
} as const;
type Who = keyof typeof people;

const users = Object.values(people).map(p => ({ id: p.id, org_id: 'org1', name: p.name, role: p.role, email: `${p.id}@x.com`, status: 'active', project_ids: ['proj'] }));
const requester = { id: 'creator', name: 'Cathy Creator', email: 'c@x.com', role: 'Supervisor', mobile: '0555123456', company: 'EGO Designs' };
const LIVE: Stage[] = ['ACTIVE', 'HOLD', 'EXPIRED', 'COMPLETION_PENDING', 'CLOSED', 'ARCHIVED'];

function ptwDoc(stage: string, o: { type?: any; payload?: any; over?: any; endsInH?: number } = {}): any {
  const now = Date.now();
  const type = o.type ?? 'General Work';
  const payload: any = buildPermitPayload({
    type, requester, location: 'Level 3 corridor', description: 'Replace damaged ceiling tiles',
    startDate: ymd(now - H), startTime: hm(now - H), endDate: ymd(now + 4 * H), endTime: hm(now + 4 * H),
    numberOfWorkers: 4, emergencyContact: '0500000000', ramsRef: 'RAMS-001',
  });
  payload.safety_requirements = payload.safety_requirements.map((i: any) => ({ ...i, response: 'Yes' }));
  const live = (LIVE as string[]).includes(stage);
  const until = now + (o.endsInH ?? 3) * H;
  return {
    id: 'p1', org_id: 'org1', project_id: 'proj', type, status: stage, title: 'Replace ceiling tiles',
    payload: { ...payload, ...(o.payload ?? {}) },
    approvals: [], audit_log: [], updated_at: new Date().toISOString(),
    permit_no: 'PTW-2026-0001', permit_year: 2026, public_token: 'T'.repeat(24), creator_id: 'creator', receiver_id: 'receiver',
    workflow_log: [
      { stage: 'DRAFT', from: 'DRAFT', action: 'create', user_id: 'creator', user_name: 'Cathy Creator', role: 'SUPERVISOR', timestamp: new Date(now - 5 * H).toISOString() },
      { stage: 'APPROVAL', from: 'SITE_INSPECTION', action: 'site_inspection_pass', user_id: 'rev', user_name: 'Rita Reviewer', role: 'HSE_OFFICER', timestamp: new Date(now - 2 * H).toISOString(), comments: 'Inspected, all in order' },
      { stage: 'SITE_HANDOVER', from: 'APPROVAL', action: 'approve', user_id: 'adm', user_name: 'Ada Admin', role: 'ADMIN', timestamp: new Date(now - H).toISOString(), override: true, justification: 'Sole admin on site, urgent shutdown work' },
    ],
    signatures: {}, extensions: [],
    ...(live ? { valid_from: new Date(now - H).toISOString(), valid_until: new Date(until).toISOString(), first_activated_at: new Date(now - H).toISOString(), valid_from_ts: ts(now - H), valid_until_ts: ts(until), first_activated_ts: ts(now - H) } : {}),
    ...(o.over ?? {}),
  };
}

function setContext(who: Who | null, list: any[] = []) {
  const actor = who ? people[who] : null;
  ctx.app = { usersList: users, impersonatedUser: null, can: () => true, activeUser: users[0] };
  ctx.data = {
    ptwActor: actor, projects: [{ id: 'proj', name: 'Tower A' }], ptwList: list,
    getPtwGateInputs: () => ({ others: [], competency: { records: [], courses: [] } }),
    handleCreatePtw: async () => ({ ok: true, permit: ptwDoc('DRAFT') }),
    handlePtwTransition: async () => ({ ok: false, reason: 'not in this test' }),
    handleUpdatePtw: async () => ({ ok: true, permit: ptwDoc('DRAFT'), changed: false }),
    handleDeletePtw: async () => {},
  };
  ctx.modal = { setSelectedPtw: () => {} };
}

const modal = (doc: any, who: Who | null, section: SectionKey = 'I') => {
  setContext(who, [doc]);
  return rts(<PtwDetailModal ptw={doc} onClose={() => {}} initialSection={section} />);
};

// ─── the permit window ────────────────────────────────────────────────────

test('every stage x role x permit type renders without throwing', () => {
  const types = Object.keys(TYPE_RULES);
  let n = 0;
  for (const type of types) for (const stage of STAGES) for (const who of Object.keys(people) as Who[]) {
    const html = modal(ptwDoc(stage, { type }), who);
    assert.ok(html.includes('PTW-2026-0001'), `${type}/${stage}/${who}`);
    n++;
  }
  assert.equal(n, types.length * STAGES.length * 6);
});

test('every section renders for every permit type', () => {
  const sections: SectionKey[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (const type of Object.keys(TYPE_RULES)) for (const s of sections) {
    const html = modal(ptwDoc('ACTIVE', { type }), 'reviewer', s);
    assert.ok(html.length > 500, `${type} section ${s}`);
  }
});

test('old permits (no number) are read-only, say why, and only an administrator can delete them', () => {
  const legacy = ptwDoc('PENDING_APPROVAL', { over: { permit_no: undefined, public_token: undefined, creator_id: undefined } });
  const asReviewer = modal(legacy, 'reviewer');
  assert.match(asReviewer, /created before the new permit system/);
  assert.ok(!asReviewer.includes('data-testid="actions-panel"'), 'no workflow buttons on a legacy permit');
  assert.ok(!asReviewer.includes('data-testid="save-changes"'));
  assert.ok(!asReviewer.includes('data-testid="delete-permit"'), 'a reviewer cannot delete');
  assert.ok(modal(legacy, 'admin').includes('data-testid="delete-permit"'), 'an administrator can');
});

test('a draft: its creator can edit and submit; a reviewer, a worker and a viewer cannot edit', () => {
  const d = ptwDoc('DRAFT');
  const mine = modal(d, 'creator');
  assert.ok(mine.includes('data-testid="save-changes"'));
  assert.ok(mine.includes('data-testid="action-submit"'), 'submit button');
  assert.ok(mine.includes('data-testid="delete-permit"'), 'owner can delete a draft');
  assert.match(mine, /Title/);
  for (const who of ['reviewer', 'worker', 'viewer'] as Who[]) {
    const html = modal(d, who);
    assert.ok(!html.includes('data-testid="save-changes"'), `${who} must not see Save`);
    assert.ok(!html.includes('data-testid="action-submit"'), `${who} must not submit`);
  }
});

test('a submitted permit: the creator cannot pre-screen their own, the reviewer can', () => {
  const s = ptwDoc('SUBMITTED');
  assert.ok(!modal(s, 'creator').includes('data-testid="action-prescreen_pass"'));
  assert.match(modal(s, 'creator'), /Not available to you/);
  assert.ok(modal(s, 'reviewer').includes('data-testid="action-prescreen_pass"'));
  assert.ok(!modal(s, 'creator').includes('data-testid="save-changes"'), 'content is frozen while it waits for pre-screen');
});

test('an active permit: anyone on site can stop work, a viewer cannot, and the countdown shows', () => {
  const a = ptwDoc('ACTIVE');
  assert.ok(modal(a, 'worker').includes('data-testid="action-stop_work"'));
  assert.ok(!modal(a, 'viewer').includes('data-testid="action-stop_work"'));
  assert.match(modal(a, 'worker'), /h \d\dm left|\dm left/);
});

test('an overdue permit reads as EXPIRED and offers completion, not stop-work or extension', () => {
  const late = ptwDoc('ACTIVE', { endsInH: -1 });
  const html = modal(late, 'creator');
  assert.match(html, /EXPIRED/);
  assert.ok(html.includes('data-testid="action-request_completion"'));
  assert.ok(!html.includes('data-testid="action-stop_work"'));
  assert.ok(!html.includes('data-testid="action-revalidate"'));
});

test('approval needs an approver role: an inspector sees why, an approver gets the button', () => {
  const a = ptwDoc('APPROVAL');
  assert.ok(!modal(a, 'reviewer').includes('data-testid="action-approve"'));
  assert.ok(modal(a, 'approver').includes('data-testid="action-approve"'));
});

test('typed sign-off sections are labelled as external records, not system signatures', () => {
  for (const s of ['III', 'IV', 'V', 'VI', 'IX'] as SectionKey[]) assert.ok(modal(ptwDoc('SITE_INSPECTION'), 'reviewer', s).includes('data-testid="external-note"'), `section ${s}`);
});

test('stoppages and extensions are read-only records', () => {
  const stop = { time: new Date().toISOString(), reason: 'Gas smell reported', stopped_by: 'Wasim Worker', informed_to: '', restarted_time: '', signature: '' };
  const html = modal(ptwDoc('HOLD', { payload: { holding_or_stoppage: [stop] } }), 'reviewer', 'VII');
  assert.match(html, /Gas smell reported/);
  assert.match(html, /Still on hold/);
  assert.ok(!/<input[^>]*placeholder="Your Name for Signature"/.test(html), 'no typed resume signature');
  const ext = modal(ptwDoc('ACTIVE', { over: { extensions: [{ at: new Date().toISOString(), by_id: 'rev', by_name: 'Rita Reviewer', reason: 'Works running over', from_until: '', to_until: new Date(Date.now() + 5 * H).toISOString() }] } }), 'reviewer', 'VIII');
  assert.match(ext, /Works running over/);
});

test('the activity log shows who did what, and flags overrides with their written reason', () => {
  const html = modal(ptwDoc('SITE_HANDOVER'), 'reviewer', 'XI');
  assert.match(html, /Rita Reviewer/);
  assert.match(html, /Override/);
  assert.match(html, /Sole admin on site/);
});

test('the controls section lists what blocks the next step', () => {
  const d = ptwDoc('DRAFT', { payload: { safety_requirements: [{ id: 'hw_1', text: 'Fire watch', response: 'No' }] } });
  const html = modal(d, 'creator', 'X');
  assert.match(html, /Before it can be submitted/);
  assert.match(html, /Critical item answered/);
});

test('hot work shows the fire-watch fields and PPE; a lifting permit shows the load calculation', () => {
  const hot = modal(ptwDoc('DRAFT', { type: 'Hot Work' }), 'creator', 'II');
  assert.match(hot, /Fire watcher name/);
  assert.match(hot, /Required for Hot Work: Safety goggles, Safety gloves/);
  assert.match(modal(ptwDoc('DRAFT', { type: 'Lifting' }), 'creator', 'II'), /Load|Crane|Lift/i);
  assert.match(modal(ptwDoc('DRAFT', { type: 'Confined Space Entry' }), 'creator', 'II'), /Gas test log/);
  assert.match(modal(ptwDoc('DRAFT', { type: 'Confined Space Entry' }), 'creator', 'II'), /Isolation register/);
});

test('normalizePayload keeps every field it does not know about', () => {
  const n: any = normalizePayload({ team: [{ id: 't', name: 'A', role: 'worker' }], isolation: [{ id: 'i', point: 'V', method: 'M' }], wizard: { hazards: ['x'] }, external_ref: 'P-9', somethingNew: 42 });
  assert.equal(n.team.length, 1);
  assert.equal(n.isolation.length, 1);
  assert.deepEqual(n.wizard, { hazards: ['x'] });
  assert.equal(n.external_ref, 'P-9');
  assert.equal(n.somethingNew, 42);
  assert.deepEqual(n.work.coverage, { start_date: '', end_date: '', start_time: '', end_time: '' });
  assert.deepEqual(normalizePayload(undefined).safety_requirements, []);
  assert.equal((normalizePayload({}, 'Lifting') as any).load_calculation.load_weight, '', 'a lifting permit never defaults to a passing 0% calculation');
});

// ─── creation ─────────────────────────────────────────────────────────────

test('the creation form: local-time defaults, per-type requirements, nothing fake, create disabled until complete', () => {
  setContext('creator', []);
  const html = rts(<PtwCreationModal isOpen onClose={() => {}} mode="new" />);
  assert.match(html, /New permit to work/);
  assert.match(html, /Number of workers/);
  assert.match(html, /Emergency contact/);
  assert.match(html, /Risk assessment/);
  assert.match(html, /Receiver/);
  assert.match(html, /file storage is not enabled/i);
  assert.ok(!/unsplash|placeholder\.com|555-0101/.test(html), 'no stock photos or fake phone numbers');
  assert.match(html, /<button[^>]*disabled[^>]*data-testid="create-permit"|<button[^>]*data-testid="create-permit"[^>]*disabled/, 'Create is disabled while required fields are empty');
  assert.match(rts(<PtwCreationModal isOpen onClose={() => {}} mode="existing" />), /Number on the paper permit/);
  assert.equal(rts(<PtwCreationModal isOpen={false} onClose={() => {}} />), '');
});

// ─── the list ─────────────────────────────────────────────────────────────

test('the list: numbers, "your turn", honest statistics, expired permits are not "active"', () => {
  const list = [
    ptwDoc('ACTIVE', { over: { id: 'a', permit_no: 'PTW-2026-0001' } }),
    ptwDoc('ACTIVE', { endsInH: -2, over: { id: 'b', permit_no: 'PTW-2026-0002' } }),
    ptwDoc('SUBMITTED', { over: { id: 'c', permit_no: 'PTW-2026-0003' } }),
    ptwDoc('SUBMITTED', { over: { id: 'd', permit_no: undefined, public_token: undefined } }),
  ];
  setContext('reviewer', list);
  const html = rts(<PtwList ptws={list} users={users as any} projects={[{ id: 'proj', name: 'Tower A' }] as any} onCreatePtw={() => {}} onAddExistingPtw={() => {}} onSelectPtw={() => {}} />);
  for (const no of ['PTW-2026-0001', 'PTW-2026-0002', 'PTW-2026-0003']) assert.match(html, new RegExp(no));
  assert.match(html, /Legacy permit/);
  assert.match(html, /Expired/);
  assert.match(html, /Your turn/);
  const stat = (label: string) => Number(new RegExp(`(\\d+)</p><p[^>]*>${label}`).exec(html)?.[1]);
  assert.equal(stat('Active now'), 1, 'the overdue permit is not active');
  assert.equal(stat('Waiting for you'), 1, 'the submitted permit waits for a reviewer; the legacy one never does');
  assert.equal(stat('On hold / expired'), 1);
  assert.match(html, /Awaiting me/);
});

test('the list: the creator is not told it is their turn to pre-screen their own permit', () => {
  const list = [ptwDoc('SUBMITTED')];
  setContext('creator', list);
  const html = rts(<PtwList ptws={list} users={users as any} projects={[]} onCreatePtw={() => {}} onAddExistingPtw={() => {}} onSelectPtw={() => {}} />);
  assert.ok(!/Your turn/.test(html));
});

// ─── the pieces ───────────────────────────────────────────────────────────

test('validity banner: each stage says the right thing', () => {
  const html = (doc: any) => rts(<ValidityBanner permit={doc} />);
  assert.match(html(ptwDoc('ACTIVE', { endsInH: 3 })), /left/);
  assert.match(html(ptwDoc('ACTIVE', { endsInH: 0.1 })), /\dm left/);
  assert.match(html(ptwDoc('ACTIVE', { endsInH: -1 })), /EXPIRED/);
  assert.match(html(ptwDoc('HOLD')), /On hold/);
  assert.match(html(ptwDoc('SITE_HANDOVER')), /Validity starts at handover/);
  assert.match(html(ptwDoc('DRAFT')), /Requested:/);
  assert.equal(html(ptwDoc('CLOSED')), '');
});

test('timeline: newest first, with override reasons', () => {
  const html = rts(<PermitTimeline log={ptwDoc('ACTIVE').workflow_log} users={users as any} />);
  assert.ok(html.indexOf('Approve') < html.indexOf('Created'), 'newest first');
  assert.match(html, /Written justification/);
  assert.match(rts(<PermitTimeline log={[]} />), /No activity/);
});

test('actions panel: loading, unsaved changes, nothing to do', () => {
  const gi = { others: [], competency: { records: [], courses: [] } };
  const render = (props: any) => rts(<PermitActionsPanel permit={ptwDoc('SUBMITTED')} actor={people.reviewer} gateInputs={gi} dirty={false} onPerform={async () => ({ ok: true } as any)} {...props} />);
  assert.match(render({ actor: null }), /still loading/);
  assert.match(render({ dirty: true }), /unsaved changes/);
  assert.match(render({ permit: ptwDoc('CLOSED') }), /Nothing for you to do/);
  assert.match(render({ impersonatingAs: 'Someone Else' }), /recorded as <strong>you/);
});

test('gas test log: blank by default, saved rows locked, pass and fail shown, stale reading flagged', () => {
  const now = Date.now();
  const row = (mins: number, o2: number) => ({ time: hm(now - mins * 60_000), o2, lel: 0, co: 0, h2s: 0, tester_name: 'Tariq' });
  const html = (rows: any[], locked = 0, disabled = false) => rts(<GasTestLogSection gasTests={rows} onChange={() => {}} disabled={disabled} lockedCount={locked} permitType="Confined Space Entry" testerName="Tariq" />);
  assert.match(html([]), /No complete gas test recorded yet/);
  assert.match(html([row(10, 20.9)]), /passed \d+ min ago/);
  assert.match(html([row(10, 17)]), /FAILED/);
  assert.match(html([row(120, 20.9)]), /Re-test/);
  const locked = html([row(10, 20.9)], 1);
  assert.match(locked, /disabled=""[^>]*aria-label="Test 1 o2"|aria-label="Test 1 o2"[^>]*disabled=""/);
  assert.match(locked, /Saved/);
  assert.match(html([{ time: '10:00', o2: '', lel: '', co: '', h2s: '', tester_name: '' }]), /Incomplete \(ignored\)/);
  assert.ok(!/Add test/.test(html([], 0, true)), 'no add button when read-only');
});

test('isolation register: stamping buttons appear only when allowed and in order', () => {
  const pts = [{ id: '1', point: 'Valve V-12', method: 'Blank' }];
  const render = (canStamp: boolean, points: any[] = pts) => rts(<IsolationRegister points={points} onChange={() => {}} actorName="Rita" canDefine={false} canStamp={canStamp} required />);
  assert.ok(render(true).includes('data-testid="stamp-applied-0"'));
  assert.ok(!render(true).includes('data-testid="stamp-verified-0"'), 'cannot verify before it is applied');
  assert.ok(!render(false).includes('data-testid="stamp-applied-0"'));
  const applied = render(true, [{ ...pts[0], applied_by: 'Rita', applied_at: new Date().toISOString() }]);
  assert.ok(applied.includes('data-testid="stamp-verified-0"'));
  assert.match(render(true, [{ ...pts[0], applied_by: 'Rita', applied_at: 'x', verified_by: 'rita', verified_at: 'x' }]), /same person/);
});

test('team editor lists people and links them to accounts', () => {
  const html = rts(<TeamEditor team={[{ id: 't1', name: 'Wasim', role: 'worker', user_id: 'w' }]} onChange={() => {}} users={users as any} />);
  assert.match(html, /Wasim/);
  assert.match(html, /Not linked/);
  assert.match(rts(<TeamEditor team={[]} onChange={() => {}} users={[]} disabled />), /No team members/);
});

test('controls section: competency table shows who is certified', () => {
  const gi = { others: [], competency: { records: [], courses: [{ id: 'c', title: 'Hot Work', competencies: ['HOT_WORK'] }] } };
  const doc = ptwDoc('DRAFT', { type: 'Hot Work', payload: { team: [{ id: 't', name: 'Wasim', role: 'worker', user_id: 'w' }, { id: 'u', name: 'Contractor Joe', role: 'worker' }] } });
  const html = rts(<ControlsSection permit={doc} gateInputs={gi as any} />);
  assert.match(html, /Wasim/);
  assert.match(html, /No valid certificate/);
  assert.match(html, /No account: check on site/);
});
