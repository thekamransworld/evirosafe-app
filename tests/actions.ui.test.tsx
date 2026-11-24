// The action screens, rendered on the server with realistic fixtures. This is NOT a browser: it proves every
// screen renders without throwing for every stage and role, and that the right controls (and the right reasons)
// appear for the right people. Clicking and typing are not exercised here.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// React's server renderer puts <!-- --> between adjacent text nodes; strip it so text assertions read naturally.
const rts = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '');

import { ctx } from './helpers/fakeContexts';
import { ACTIONS, STAGES, type Stage } from '../src/lib/actions/model';
import { availableActions, checkContentEdit, type ActionDoc } from '../src/lib/actions/engine';
import { ActionsScreen } from '../src/components/actions/ActionsScreen';
import { ActionDetailModal } from '../src/components/actions/ActionDetailModal';
import { ActionCreateModal } from '../src/components/actions/ActionCreateModal';
import { LinkedActions } from '../src/components/actions/LinkedActions';
import { ActionBar } from '../src/components/actions/ActionBar';
import { ActionHistory } from '../src/components/actions/ActionHistory';
import { dueText, fmtDate, safeHref } from '../src/components/actions/actionsUi';
import { ymd, addDays } from '../src/lib/actions/overdue';

(globalThis as any).window = { location: { href: 'http://localhost/' }, confirm: () => true };

// ─── fixtures ─────────────────────────────────────────────────────────────

const people = {
  creator: { id: 'creator', name: 'Cathy Creator', role: 'SUPERVISOR' },
  reviewer: { id: 'rev', name: 'Rita Reviewer', role: 'HSE_OFFICER' },
  approver: { id: 'app', name: 'Ali Approver', role: 'HSE_MANAGER' },
  orgAdmin: { id: 'oadm', name: 'Olga Org', role: 'ORG_ADMIN' },
  admin: { id: 'adm', name: 'Ada Admin', role: 'ADMIN' },
  worker: { id: 'w', name: 'Wasim Worker', role: 'WORKER' },
  viewer: { id: 'v', name: 'Client Viewer', role: 'CLIENT_VIEWER' },
  inspector: { id: 'ins', name: 'Ina Inspector', role: 'INSPECTOR' },
  lead: { id: 'lead', name: 'Lee Lead', role: 'CUSTOM_SITE_LEAD' },
} as const;
type Who = keyof typeof people;
const ROLES = Object.keys(people) as Who[];
const usersList = Object.values(people).map(p => ({ id: p.id, org_id: 'org1', name: p.name, role: p.role, email: `${p.id}@x.com`, status: 'active', project_ids: ['proj'] }));
const projects = [{ id: 'proj', name: 'Tower A' }, { id: 'proj2', name: 'Villa B' }];

const today = ymd(Date.now());
const ts = (ms: number) => ({ toMillis: () => ms });
const NOW = Date.now();

function actionDoc(stage: Stage, over: Record<string, any> = {}): ActionDoc {
  const base: any = {
    id: 'a1', org_id: 'org1', project_id: 'proj', number: 'ACT-2026-0001', action_year: 2026,
    title: 'Replace damaged guard rail', description: 'Level 3 east stairwell', kind: 'corrective', priority: 'high',
    status: stage, owner_id: 'w', creator_id: 'creator', due_date: addDays(today, 5),
    source: { type: 'incident', id: 'rep_1', ref: 'Near Miss 2026-11-10' },
    history: [{ action: 'create', from: 'OPEN', stage: 'OPEN', user_id: 'creator', user_name: 'Cathy Creator', role: 'SUPERVISOR', timestamp: new Date(NOW - 5e6).toISOString() }],
    stage_times: { OPEN: ts(NOW - 5e6) }, last_transition_at: ts(NOW - 1e6), created_at: ts(NOW - 5e6), updated_at: ts(NOW - 1e6),
  };
  if (stage !== 'OPEN') base.history.push({ action: stage === 'CANCELLED' ? 'cancel' : 'start', from: 'OPEN', stage: stage === 'CANCELLED' ? 'CANCELLED' : 'IN_PROGRESS', user_id: 'w', user_name: 'Wasim Worker', role: 'WORKER', timestamp: new Date(NOW - 4e6).toISOString(), note: stage === 'CANCELLED' ? 'Area demolished' : undefined });
  if (stage === 'COMPLETED' || stage === 'CLOSED') {
    base.completion = { by: 'w', at: ts(NOW - 3e6), note: 'Rail replaced and tested' };
    base.history.push({ action: 'complete', from: 'IN_PROGRESS', stage: 'COMPLETED', user_id: 'w', user_name: 'Wasim Worker', role: 'WORKER', timestamp: new Date(NOW - 3e6).toISOString(), note: 'Rail replaced and tested' });
  }
  if (stage === 'CLOSED') {
    base.verification = { by: 'rev', at: ts(NOW - 2e6), note: 'Seen on site, secure' };
    base.history.push({ action: 'verify', from: 'COMPLETED', stage: 'CLOSED', user_id: 'rev', user_name: 'Rita Reviewer', role: 'HSE_OFFICER', timestamp: new Date(NOW - 2e6).toISOString(), note: 'Seen on site, secure' });
  }
  return { ...base, ...over };
}

function setup(who: Who, list: ActionDoc[] | any[], o: { ready?: boolean; projectIds?: string[] | null } = {}) {
  const p = people[who];
  ctx.app = { usersList, activeOrg: { id: 'org1' }, activeUser: usersList.find(u => u.id === p.id) };
  ctx.data = {
    actionItems: list, projects, actionActor: { id: p.id, name: p.name, role: p.role }, actionProjectIds: o.projectIds ?? null,
    actionsReady: o.ready ?? true,
    handleCreateAction: async () => ({ ok: true }), handleActionStep: async () => ({ ok: true }), handleSaveActionContent: async () => ({ ok: true }),
  };
}

const MAY_RAISE: Who[] = ['creator', 'reviewer', 'approver', 'orgAdmin', 'admin', 'inspector', 'lead'];

// ─── the tracker ──────────────────────────────────────────────────────────

test('the tracker renders for every role and every state, and shows the raise button only to those who may raise', () => {
  const full = STAGES.map((s, i) => actionDoc(s, { id: `a${i}`, number: `ACT-2026-000${i + 1}`, title: `Task in ${s}` }));
  for (const who of ROLES) {
    for (const [label, list] of [['empty', []], ['all stages', full]] as const) {
      setup(who, list as ActionDoc[]);
      const html = rts(<ActionsScreen />);
      assert.ok(html.includes('Action Tracker'), `${who}/${label}: title`);
      assert.equal(html.includes('data-testid="raise-action"'), MAY_RAISE.includes(who), `${who}/${label}: raise button`);
      for (const t of ['me', 'todo', 'verify', 'done', 'all']) assert.ok(html.includes(`data-testid="tab-${t}"`), `${who}: tab ${t}`);
    }
  }
});

test('the tracker: loading, empty, legacy notice, awaiting-me default, overdue and ordering', () => {
  setup('worker', [], { ready: false });
  assert.ok(rts(<ActionsScreen />).includes('Loading actions'));
  setup('worker', [], { ready: true });
  assert.ok(rts(<ActionsScreen />).includes('data-testid="actions-empty"'));

  // the worker owns an OPEN action: the "Awaiting me" tab is the default and shows it
  const mine = actionDoc('OPEN', { id: 'm1', number: 'ACT-2026-0010', title: 'My task' });
  const other = actionDoc('OPEN', { id: 'o1', number: 'ACT-2026-0011', title: 'Somebody else task', owner_id: 'rev' });
  setup('worker', [mine, other]);
  let html = rts(<ActionsScreen />);
  assert.ok(html.includes('My task') && !html.includes('Somebody else task'), 'awaiting me shows only mine');
  assert.match(html, /aria-selected="true"[^>]*data-testid="tab-me"/);
  // a viewer owns nothing: the default is "To do", which shows both
  setup('viewer', [mine, other]);
  html = rts(<ActionsScreen />);
  assert.ok(html.includes('My task') && html.includes('Somebody else task'));
  assert.match(html, /aria-selected="true"[^>]*data-testid="tab-todo"/);

  // overdue is highlighted and live work sorts before finished work
  const late = actionDoc('IN_PROGRESS', { id: 'l1', number: 'ACT-2026-0012', title: 'Late task', due_date: addDays(today, -3) });
  const done = actionDoc('CLOSED', { id: 'd1', number: 'ACT-2026-0013', title: 'Finished task', due_date: addDays(today, -30) });
  setup('approver', [done, late, mine]);
  html = rts(<ActionsScreen />);
  assert.ok(html.includes('Overdue by 3 days'), 'overdue text');
  assert.ok(html.indexOf('Late task') < html.indexOf('Finished task') || !html.includes('Finished task'), 'live before finished');

  // the old, unimported actions: a notice, never silently hidden
  const old = { id: 'old1', org_id: 'org1', project_id: 'proj', action: 'Fix the exit sign', owner_id: 'w', due_date: '2026-01-01', status: 'Open' };
  setup('approver', [mine, old, { ...old, id: 'old2' }]);
  html = rts(<ActionsScreen />);
  assert.ok(html.includes('data-testid="legacy-notice"') && html.includes('2 older actions'));
  assert.ok(!html.includes('Fix the exit sign'), 'the old ones are collapsed until asked for');
});

test('the tracker: the summary counts match the list', () => {
  const list = [actionDoc('OPEN', { id: '1' }), actionDoc('IN_PROGRESS', { id: '2', due_date: addDays(today, -1) }), actionDoc('COMPLETED', { id: '3' }), actionDoc('CLOSED', { id: '4' }), actionDoc('CANCELLED', { id: '5' })]
    .map((a, i) => ({ ...a, number: `ACT-2026-00${i + 1}` }));
  setup('approver', list);
  const html = rts(<ActionsScreen />);
  const chip = (label: string) => new RegExp(`>(\\d+)</p><p[^>]*>${label}<`).exec(html)?.[1];
  assert.equal(chip('Open or in progress'), '2');
  assert.equal(chip('Awaiting verification'), '1');
  assert.equal(chip('Overdue'), '1');
  assert.equal(chip('Closed'), '1');
});

// ─── the detail dialog ────────────────────────────────────────────────────

test('the detail dialog: for every stage, role and relationship, the buttons are exactly what the engine allows', () => {
  let checked = 0;
  for (const stage of STAGES) {
    for (const who of ROLES) {
      for (const rel of ['owner', 'creator', 'other'] as const) {
        const p = people[who];
        // make the person the owner / the creator / neither, by editing the action, not the person
        const a = actionDoc(stage, rel === 'owner' ? { owner_id: p.id } : rel === 'creator' ? { creator_id: p.id } : {});
        const actor = { id: p.id, name: p.name, role: p.role };
        setup(who, [a]);
        const html = rts(<ActionDetailModal actionId="a1" onClose={() => {}} />);
        const options = availableActions(a, actor);
        for (const id of Object.keys(ACTIONS)) {
          const o = options.find(x => x.def.id === id);
          assert.equal(html.includes(`data-testid="step-${id}"`), !!o, `${stage}/${who}/${rel}: button ${id}`);
          assert.equal(html.includes(`data-testid="blocked-${id}"`), !!o && !o.enabled, `${stage}/${who}/${rel}: reason for ${id}`);
          if (o && !o.enabled) assert.ok(html.includes(String(o.reason).replace(/&/g, '&amp;').replace(/'/g, '&#x27;')), `${stage}/${who}/${rel}: the reason text for ${id}`);
        }
        const edit = checkContentEdit(a, actor);
        assert.equal(html.includes('data-testid="edit-start"'), edit.ok === true, `${stage}/${who}/${rel}: edit button`);
        checked++;
      }
    }
  }
  assert.equal(checked, STAGES.length * ROLES.length * 3);
});

test('the detail dialog: content, records, history, and the not-found / old-action cases', () => {
  const closed = actionDoc('CLOSED', { car: { root_cause: 'Corroded bracket', effectiveness_plan: 'Re-inspect in 30 days' } });
  setup('approver', [closed]);
  let html = rts(<ActionDetailModal actionId="a1" onClose={() => {}} />);
  for (const needle of ['ACT-2026-0001', 'Replace damaged guard rail', 'Level 3 east stairwell', 'Wasim Worker', 'Cathy Creator', 'Tower A', 'Incident: Near Miss 2026-11-10',
    'Corroded bracket', 'Re-inspect in 30 days', 'Completed by Wasim Worker', 'Rail replaced and tested', 'Verified by Ritа Reviewer'.replace('а', 'a'), 'Seen on site, secure']) {
    assert.ok(html.includes(needle), `missing: ${needle}`);
  }
  // history newest first, and each step named
  const h = rts(<ActionHistory action={closed} users={usersList} />);
  assert.ok(h.indexOf('Verify and close') < h.indexOf('Mark completed') && h.indexOf('Mark completed') < h.indexOf('Start work') && h.indexOf('Start work') < h.indexOf('Raised'));
  assert.ok(h.includes('stamped the latest change'), 'the server-time note');

  setup('approver', []);
  assert.ok(rts(<ActionDetailModal actionId="gone" onClose={() => {}} />).includes('no longer available'));

  const old = { id: 'old1', org_id: 'org1', project_id: 'proj', action: 'Fix the exit sign', owner_id: 'w', due_date: '2026-01-01', status: 'Open' };
  setup('approver', [old]);
  html = rts(<ActionDetailModal actionId="old1" onClose={() => {}} />);
  assert.ok(html.includes('data-testid="detail-legacy"') && !html.includes('data-testid="action-bar"') && html.includes('not yet imported'));
});

test('the detail dialog: an imported action says so and shows the old record safely', () => {
  const imported = actionDoc('CLOSED', {
    imported: true, import_source: 'corrective_actions', import_ref: 'corrective_actions/car1 (CAR-2026-4821)',
    legacy: { car_number: 'CAR-2026-4821', notes: 'checked on site', evidence: ['https://example.test/a.jpg', 'javascript:alert(1)', 'http://insecure.test/x', 42] },
  });
  setup('approver', [imported]);
  const html = rts(<ActionDetailModal actionId="a1" onClose={() => {}} />);
  assert.ok(html.includes('data-testid="detail-imported"') && html.includes('data-testid="detail-imported-record"'));
  assert.ok(html.includes('CAR-2026-4821') && html.includes('checked on site'));
  assert.ok(html.includes('href="https://example.test/a.jpg"'));
  assert.ok(!html.includes('javascript:') && !html.includes('http://insecure.test'), 'only https links become links');
  assert.equal(safeHref('https://x.test/y'), 'https://x.test/y');
  assert.equal(safeHref('javascript:alert(1)'), null);
  assert.equal(safeHref('data:text/html,x'), null);
});

test('the history shows overrides with their written justification, notes and what changed', () => {
  const a = actionDoc('IN_PROGRESS');
  a.history!.push({ action: 'reschedule', from: 'IN_PROGRESS', stage: 'IN_PROGRESS', user_id: 'rev', user_name: 'Rita Reviewer', role: 'HSE_OFFICER', timestamp: new Date(NOW - 1000).toISOString(), note: 'Moved to night shift',
    changes: { owner_id: { from: 'w', to: 'ins' }, due_date: { from: '2026-11-21', to: '2026-12-01' } } });
  a.history!.push({ action: 'verify', from: 'COMPLETED', stage: 'CLOSED', user_id: 'oadm', user_name: 'Olga Org', role: 'ORG_ADMIN', timestamp: new Date(NOW).toISOString(), note: 'Looks fine', override: true, justification: 'No other reviewer on this small site' });
  const h = rts(<ActionHistory action={a} users={usersList} />);
  assert.ok(h.includes('Override') && h.includes('Written justification:') && h.includes('No other reviewer on this small site'));
  assert.ok(h.includes('Moved to night shift') && h.includes('Wasim Worker → Ina Inspector') && h.includes('2026-11-21 → 2026-12-01'));
  assert.ok(rts(<ActionHistory action={{ ...a, history: [] }} users={usersList} />).includes('No activity recorded yet.'));
});

// ─── the action bar ───────────────────────────────────────────────────────

test('the action bar tells the owner why they cannot verify, and an administrator that they can override', () => {
  const completed = actionDoc('COMPLETED', { owner_id: 'oadm' });
  const bar = (who: Who) => rts(<ActionBar action={completed} actor={people[who]} users={usersList} onStep={async () => ({ ok: true } as any)} />);
  const adminHtml = bar('orgAdmin');
  assert.ok(adminHtml.includes('data-testid="step-verify"') && adminHtml.includes('written justification'), 'the administrator is offered the override');
  assert.ok(!/data-testid="step-verify"[^>]*\sdisabled=""/.test(adminHtml), 'and it is not disabled');
  const workerHtml = rts(<ActionBar action={actionDoc('COMPLETED')} actor={people.worker} users={usersList} onStep={async () => ({ ok: true } as any)} />);
  assert.ok(/data-testid="step-verify"[^>]*\sdisabled=""/.test(workerHtml), 'the owner\'s verify button is disabled');
  assert.ok(workerHtml.includes('data-testid="blocked-verify"'));
  const viewerHtml = rts(<ActionBar action={actionDoc('OPEN')} actor={people.viewer} users={usersList} onStep={async () => ({ ok: true } as any)} />);
  assert.ok(viewerHtml.includes('data-testid="blocked-start"') && viewerHtml.includes('data-testid="blocked-complete"'));
  const closedHtml = rts(<ActionBar action={actionDoc('CANCELLED')} actor={people.worker} users={usersList} onStep={async () => ({ ok: true } as any)} />);
  assert.ok(closedHtml.includes('data-testid="blocked-reopen"'), 'a worker is told only an approver can reopen');
});

// ─── raising an action ────────────────────────────────────────────────────

test('raise an action: closed renders nothing; open has the fields, a linked source, and only the right people and projects', () => {
  setup('creator', []);
  assert.equal(rts(<ActionCreateModal isOpen={false} onClose={() => {}} />), '');
  let html = rts(<ActionCreateModal isOpen onClose={() => {}} />);
  for (const id of ['create-title', 'create-description', 'create-project', 'create-owner', 'create-kind', 'create-priority', 'create-due', 'create-car-toggle', 'create-submit']) {
    assert.ok(html.includes(`data-testid="${id}"`), id);
  }
  assert.ok(!html.includes('data-testid="create-source"'), 'raised directly: no linked source');
  html = rts(<ActionCreateModal isOpen onClose={() => {}} initial={{ project_id: 'proj', source: { type: 'incident', id: 'rep_1', ref: 'Near Miss 2026-11-10' } }} />);
  assert.ok(html.includes('data-testid="create-source"') && html.includes('Linked to: Incident: Near Miss 2026-11-10'));
  assert.ok(html.includes('Tower A') && html.includes('Villa B'), 'an organisation-wide person sees every project');
  // a project-restricted person only sees their projects; owners are active staff only (never a client viewer)
  setup('creator', [], { projectIds: ['proj'] });
  ctx.app.usersList = [...usersList, { id: 'sus', org_id: 'org1', name: 'Suspended Sam', role: 'WORKER', status: 'suspended', email: 's@x.com' }];
  html = rts(<ActionCreateModal isOpen onClose={() => {}} />);
  assert.ok(html.includes('Tower A') && !html.includes('Villa B'), 'only their project');
  assert.ok(html.includes('Wasim Worker') && !html.includes('Client Viewer') && !html.includes('Suspended Sam'), 'owners: active staff only');
});

// ─── an incident's linked actions ─────────────────────────────────────────

test('linked actions: only this incident\'s numbered actions, with progress, and the raise button only for those who may', () => {
  const mine = actionDoc('OPEN', { id: 'x1', number: 'ACT-2026-0021', title: 'Fix A' });
  const closed = actionDoc('CLOSED', { id: 'x2', number: 'ACT-2026-0022', title: 'Fix B' });
  const other = actionDoc('OPEN', { id: 'x3', number: 'ACT-2026-0023', title: 'Not this incident', source: { type: 'incident', id: 'rep_OTHER' } });
  const insp = actionDoc('OPEN', { id: 'x4', number: 'ACT-2026-0024', title: 'From an inspection', source: { type: 'inspection', id: 'rep_1' } });
  const oldOne = { id: 'x5', title: 'Unnumbered', source: { type: 'incident', id: 'rep_1' }, status: 'OPEN', due_date: '2026-01-01', owner_id: 'w' };
  setup('approver', [mine, closed, other, insp, oldOne]);
  let html = rts(<LinkedActions source={{ type: 'incident', id: 'rep_1', ref: 'Near Miss' }} projectId="proj" />);
  assert.ok(html.includes('Fix A') && html.includes('Fix B'));
  assert.ok(!html.includes('Not this incident') && !html.includes('From an inspection') && !html.includes('Unnumbered'));
  assert.ok(html.includes('1/2 closed') && html.includes('data-testid="linked-raise"'));
  setup('worker', [mine]);
  html = rts(<LinkedActions source={{ type: 'incident', id: 'rep_1', ref: 'Near Miss' }} projectId="proj" />);
  assert.ok(!html.includes('data-testid="linked-raise"'), 'a worker cannot raise');
  setup('approver', []);
  assert.ok(rts(<LinkedActions source={{ type: 'incident', id: 'rep_1' }} />).includes('data-testid="linked-empty"'));
});

// ─── helpers ──────────────────────────────────────────────────────────────

test('due text and dates read naturally', () => {
  const t = ymd(Date.now());
  assert.deepEqual(dueText(addDays(t, -1), t), { text: 'Overdue by 1 day', overdue: true, soon: false });
  assert.deepEqual(dueText(addDays(t, -10), t), { text: 'Overdue by 10 days', overdue: true, soon: false });
  assert.deepEqual(dueText(t, t), { text: 'Due today', overdue: false, soon: true });
  assert.deepEqual(dueText(addDays(t, 1), t), { text: 'Due in 1 day', overdue: false, soon: true });
  assert.deepEqual(dueText(addDays(t, 9), t), { text: 'Due in 9 days', overdue: false, soon: false });
  assert.equal(dueText('', t).text, 'No due date');
  assert.equal(fmtDate('not a date'), 'not a date');
  assert.notEqual(fmtDate('2026-11-21'), '2026-11-21');
});
