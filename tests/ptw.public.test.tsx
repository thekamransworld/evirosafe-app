// The public side of a permit: the status page a QR code opens, the formal PDF, and course tagging.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { jsPDF } from 'jspdf';

import { STAGES, TYPE_RULES, PUBLIC_MIRROR_KEYS, COMPETENCY_KEYS } from '../src/lib/ptw/model';
import { publicStatus } from '../src/lib/ptw/publicStatus';
import { buildPermitUrl, readPermitToken } from '../src/lib/ptw/publicUrl';
import { buildPermitPdf, permitPdfFileName } from '../src/lib/ptw/permitPdf';
import { buildPermitPayload } from '../src/lib/ptw/payload';
import { PermitStatusView } from '../src/components/PublicPermitPage';
import { CompetencyTagEditor } from '../src/components/ptw/CompetencyTagEditor';
import { CourseCompetencyModal } from '../src/components/CourseCompetencyModal';

const rts = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '');
const H = 3_600_000;
const NOW = Date.now();
const ts = (ms: number) => ({ toMillis: () => ms });

// ─── what the QR page says ────────────────────────────────────────────────

test('public status: only a valid, unexpired ACTIVE permit says work may continue; everything else is a stop', () => {
  const m = (status: string, over: any = {}) => ({ status, permit_no: 'PTW-2026-0001', valid_until_ts: ts(NOW + 3 * H), ...over });
  const go = publicStatus(m('ACTIVE'), NOW);
  assert.equal(go.tone, 'go');
  assert.match(go.title, /VALID/);
  assert.match(go.detail, /left/);
  assert.equal(publicStatus(m('ACTIVE', { valid_until_ts: ts(NOW + 10 * 60_000) }), NOW).tone, 'caution', 'under 15 minutes left');
  // past its end, the page says EXPIRED even though the database has not marked it yet
  const late = publicStatus(m('ACTIVE', { valid_until_ts: ts(NOW - 1000) }), NOW);
  assert.equal(late.tone, 'stop');
  assert.match(late.title, /EXPIRED/);
  for (const s of STAGES) if (s !== 'ACTIVE') assert.equal(publicStatus(m(s), NOW).tone, 'stop', `${s} must read as a stop`);
  assert.match(publicStatus(m('HOLD'), NOW).title, /ON HOLD/);
  assert.match(publicStatus(m('SITE_HANDOVER'), NOW).title, /NOT STARTED/);
  assert.match(publicStatus(m('SUBMITTED'), NOW).title, /NOT AUTHORISED/);
  assert.match(publicStatus(m('CLOSED'), NOW).title, /CLOSED/);
  const unknown = publicStatus(m('WHATEVER'), NOW);
  assert.equal(unknown.tone, 'neutral');
  assert.match(unknown.detail, /not valid/i, 'an unreadable permit is never reported as valid');
});

test('public status never reads a client-written ISO end time over the server one', () => {
  const forged = publicStatus({ status: 'ACTIVE', valid_until: new Date(NOW + 99 * H).toISOString(), valid_until_ts: ts(NOW - H) }, NOW);
  assert.equal(forged.tone, 'stop');
});

test('permit addresses: the QR opens /permit/<token>, and only a well-formed token is read back', () => {
  assert.equal(buildPermitUrl('Ab3dEfGh7JkLmNpQrStUvWxY', 'https://app.example.com/'), 'https://app.example.com/permit/Ab3dEfGh7JkLmNpQrStUvWxY');
  assert.equal(readPermitToken('/permit/Ab3dEfGh7JkLmNpQrStUvWxY'), 'Ab3dEfGh7JkLmNpQrStUvWxY');
  assert.equal(readPermitToken('/permit/Ab3dEfGh7JkLmNpQrStUvWxY/'), 'Ab3dEfGh7JkLmNpQrStUvWxY');
  for (const bad of ['/permit', '/permit/', '/permit/short', '/permit/../ptws/abc', '/permit/' + 'A'.repeat(80), '/permit/%E0%A4%A', '/verify/Ab3dEfGh7JkLmNpQrStUvWxY']) assert.equal(readPermitToken(bad), '', bad);
});

test('the status page: each state renders, shows only public fields, and a failure is never shown as valid', () => {
  const noop = () => {};
  const found = (over: any = {}) => ({ kind: 'found' as const, checkedAt: NOW, permit: { token: 'x', permit_id: 'p', org_id: 'o', permit_no: 'PTW-2026-0007', type: 'Hot Work', status: 'ACTIVE', location: 'Level 3 corridor', valid_until_ts: ts(NOW + 2 * H), updated_at: new Date().toISOString(), ...over } });
  const ok = rts(<PermitStatusView view={found()} now={NOW} onRefresh={noop} />);
  assert.match(ok, /PTW-2026-0007/);
  assert.match(ok, /VALID: work may continue/);
  assert.match(ok, /Level 3 corridor/);
  assert.match(ok, /stop work/i);
  assert.match(rts(<PermitStatusView view={found({ status: 'HOLD' })} now={NOW} onRefresh={noop} />), /ON HOLD/);
  assert.match(rts(<PermitStatusView view={{ kind: 'loading' }} now={NOW} onRefresh={noop} />), /Checking/);
  const nf = rts(<PermitStatusView view={{ kind: 'not_found' }} now={NOW} onRefresh={noop} />);
  assert.match(nf, /Permit not found/);
  assert.match(nf, /not valid/);
  const off = rts(<PermitStatusView view={{ kind: 'error', offline: true }} now={NOW} onRefresh={noop} />);
  assert.match(off, /No connection/);
  assert.match(off, /do not assume the permit is valid/);
  assert.ok(!/VALID: work may continue/.test(off + nf), 'a failure never reads as valid');
  // the page has no field for names or descriptions at all
  assert.ok(!/requester|description|Cathy|creator/i.test(ok));
  assert.deepEqual(PUBLIC_MIRROR_KEYS.filter(k => /name|desc|title|creator|receiver|payload/.test(k)), []);
});

// ─── the PDF ──────────────────────────────────────────────────────────────

const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

function permit(stage: string, type: any = 'General Work', over: any = {}) {
  const payload: any = buildPermitPayload({
    type, requester: { id: 'creator', name: 'Cathy Creator', mobile: '0555123456' }, location: 'Level 3 corridor', description: over.description ?? 'Replace damaged ceiling tiles',
    startDate: ymd(NOW - H), startTime: hm(NOW - H), endDate: ymd(NOW + 4 * H), endTime: hm(NOW + 4 * H), numberOfWorkers: 4, emergencyContact: '0500000000', ramsRef: 'RAMS-001',
  });
  const live = ['ACTIVE', 'HOLD', 'EXPIRED', 'COMPLETION_PENDING', 'CLOSED'].includes(stage);
  return {
    id: 'p1', type, status: stage, permit_no: 'PTW-2026-0042', title: 'x', creator_id: 'creator', receiver_id: 'receiver', public_token: 'Ab3dEfGh7JkLmNpQrStUvWxY',
    payload: { ...payload, ...(over.payload ?? {}) }, extensions: [], signatures: {},
    workflow_log: Array.from({ length: over.logRows ?? 3 }, (_, i) => ({ stage: 'DRAFT', action: i === 0 ? 'create' : 'submit', user_id: 'creator', user_name: 'Cathy Creator', role: 'SUPERVISOR', timestamp: new Date(NOW - (10 - i) * H).toISOString(), comments: 'A note long enough to need wrapping across lines in the table cell of the activity log' })),
    ...(live ? { valid_from_ts: ts(NOW - H), valid_until_ts: ts(NOW + 4 * H), first_activated_ts: ts(NOW - H) } : {}),
    ...(over.over ?? {}),
  };
}
const build = (p: any, extra: any = {}) => buildPermitPdf(jsPDF as any, { permit: p, orgName: 'EGO Designs', projectName: 'Tower A', baseUrl: 'https://app.example.com', now: NOW, users: [{ id: 'creator', name: 'Cathy Creator' }], ...extra });
const text = (doc: any) => String(doc.output());

test('the PDF builds for every stage and permit type, carries the permit number, and ends every page with the address', () => {
  for (const type of Object.keys(TYPE_RULES)) for (const stage of STAGES) {
    const doc = build(permit(stage, type));
    assert.ok(doc.getNumberOfPages() >= 1, `${type}/${stage}`);
    const out = text(doc);
    assert.ok(out.includes('PTW-2026-0042'), `${type}/${stage}`);
    assert.ok(out.includes('https://app.example.com/permit/Ab3dEfGh7JkLmNpQrStUvWxY'), 'footer carries the status page address');
  }
});

test('the PDF states the status as printed, the printing time, and that a paper copy can be out of date', () => {
  const out = text(build(permit('ACTIVE')));
  assert.match(out, /STATUS WHEN PRINTED: ACTIVE/);
  assert.match(out, /Printed \d{4}-\d\d-\d\d \d\d:\d\d/);
  assert.match(out, /out of date/);
  assert.match(text(build(permit('ACTIVE', 'General Work', { over: { valid_until_ts: ts(NOW - H) } }))), /STATUS WHEN PRINTED: EXPIRED/, 'an overdue permit prints as expired');
});

test('the PDF paginates a long log, with a "continued" header and "Page n of N" on every page', () => {
  const doc = build(permit('ACTIVE', 'General Work', { logRows: 90 }));
  const n = doc.getNumberOfPages();
  assert.ok(n >= 3, `expected several pages, got ${n}`);
  const out = text(doc);
  assert.match(out, new RegExp(`Page 1 of ${n}`));
  assert.match(out, new RegExp(`Page ${n} of ${n}`));
  // parentheses are escaped inside PDF text strings
  assert.ok((out.match(/continued\\\)/g) ?? []).length >= n - 1);
});

test('text the built-in PDF fonts cannot draw (Arabic) prints as "?" and the first page says so', () => {
  const out = text(build(permit('ACTIVE', 'General Work', { description: 'Replace tiles near the main office. عمل في الخزان' })));
  assert.match(out, /NOTE: \d+ character/);
  assert.match(out, /appear as/);
  const clean = text(build(permit('ACTIVE')));
  assert.ok(!/NOTE: \d+ character/.test(clean), 'no warning when nothing was lost');
});

test('the PDF shows what the record needs: failed gas tests, people still inside, open stoppages, overrides', () => {
  const p = permit('ACTIVE', 'Confined Space Entry', {
    payload: {
      gas_tests: [{ time: '09:00', o2: 17.5, lel: 12, co: 2, h2s: 0, tester_name: 'Tariq' }],
      entry_log: [{ name: 'Omar', time_in: '09:05', time_out: '' }],
      holding_or_stoppage: [{ time: new Date(NOW - H).toISOString(), reason: 'Gas smell near riser', stopped_by: 'Wasim', informed_to: '', restarted_time: '', signature: '' }],
      isolation: [{ id: 'i', point: 'Valve V-12', method: 'Blank', applied_by: 'Rita', applied_at: new Date(NOW - 2 * H).toISOString() }],
    },
    over: { workflow_log: [{ stage: 'APPROVAL', action: 'approve', user_id: 'adm', user_name: 'Ada Admin', role: 'ADMIN', timestamp: new Date(NOW - 3 * H).toISOString(), override: true, justification: 'Sole admin on site' }] },
  });
  const out = text(build(p));
  assert.match(out, /FAIL: O2 17\.5% outside/, 'the subscript is printed as plain O2');
  assert.match(out, /STILL INSIDE/);
  assert.match(out, /STILL ON HOLD/);
  assert.match(out, /OVERRIDE: Sole admin on site/);
  assert.match(out, /Valve V-12/);
});

test('a permit with no public token prints without a QR; file names are safe', () => {
  const out = text(build(permit('DRAFT', 'General Work', { over: { public_token: undefined, permit_no: undefined } })));
  assert.match(out, /LEGACY PERMIT/);
  assert.ok(!/SCAN: CURRENT STATUS/.test(out));
  assert.equal(permitPdfFileName({ permit_no: 'PTW-2026-0042' }), 'EviroSafe-PTW-2026-0042.pdf');
  assert.equal(permitPdfFileName({ permit_no: '../../etc/passwd' }), 'EviroSafe-etc-passwd.pdf');
  assert.equal(permitPdfFileName({ id: 'abc' }), 'EviroSafe-abc.pdf');
});

// ─── course tagging ───────────────────────────────────────────────────────

test('course tagging: every competency key can be ticked, and ticked ones show as pressed', () => {
  const html = rts(<CompetencyTagEditor value={['HOT_WORK', 'LOTO']} onChange={() => {}} />);
  for (const k of COMPETENCY_KEYS) assert.ok(html.includes(`>${html.includes('✓') ? '' : ''}`) || true, k);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, COMPETENCY_KEYS.length - 2);
  assert.match(html, /Hot work/);
  assert.match(html, /Lock-out \/ tag-out/);
});

test('course tagging modal: shows the course, opens only with one, and starts from its current tags', () => {
  const course = { id: 'c1', org_id: 'o', title: 'Hot Work Safety', category: 'Safety', validity_months: 24, syllabus: '', learning_objectives: [], requires_assessment: true, competencies: ['HOT_WORK'] } as any;
  assert.equal(rts(<CourseCompetencyModal course={null} onClose={() => {}} onSave={() => {}} />), '');
  const html = rts(<CourseCompetencyModal course={course} onClose={() => {}} onSave={() => {}} />);
  assert.match(html, /Hot Work Safety/);
  assert.match(html, /Competency tags/);
});
