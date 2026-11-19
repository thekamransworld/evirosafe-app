// The formal permit-to-work PDF: A4 portrait, paginated, with a QR code that opens the
// permit's public status page. It replaces printing the on-screen modal (window.print),
// which came out shifted and clipped.
//
// Everything is real text and vector shapes (selectable, small, sharp when printed).
// The built-in PDF fonts cannot draw Arabic or other non-Latin scripts. Rather than refuse
// to print a permit, such characters are shown as "?" and the first page says so, so nobody
// mistakes a printed copy for the full record.

import { makeQrMatrix } from '../qr';
import { INK, MUTED, NAVY, SLATE, WHITE, drawLogo, type JsPdfCtor, type PdfDoc, type RGB } from '../pdfKit';
import { ACTIONS, COMPETENCY_LABEL, STAGE_LABEL, TYPE_RULES, normalizeStage, type ActionId } from './model';
import { effectiveStatus, firstActivatedMs, formatRemaining, msOf, remainingMs, requestedWindow, validFromMs, validUntilMs } from './validity';
import { liftUtilisation } from './gates';
import { evaluateGasReading, isCompleteRow } from './gas';
import { buildPermitUrl } from './publicUrl';

export interface PermitPdfInput {
  /** The permit document (see the Ptw type). */
  permit: any;
  orgName: string;
  projectName: string;
  /** e.g. https://app.example.com, so the QR opens the public status page. */
  baseUrl: string;
  /** epoch ms: when it is printed, and the moment the status is stated as at. */
  now: number;
  /** For turning a user id in the log into a name when the entry has none. */
  users?: Array<{ id: string; name: string }>;
}

const W = 210;
const H = 297;
const MX = 14;
const CW = W - 2 * MX;
const BODY_BOTTOM = 280;
const BAND = [30, 39, 97] as RGB;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtStamp = (ms: number) => {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── text that is safe to draw ────────────────────────────────────────────

const DASHES = /[\u2010-\u2015\u2212]/g;
const SQ = /[\u2018\u2019\u201A\u2032]/g;
const DQ = /[\u201C\u201D\u201E\u201F\u2033]/g;

class Ink {
  replaced = 0;
  /** Latin text stays as it is; anything the built-in fonts cannot draw becomes "?" (and is counted). */
  t(value: unknown, max = 700): string {
    const s = String(value ?? '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '').replace(DASHES, '-').replace(SQ, "'").replace(DQ, '"')
      .replace(/\u2026/g, '...').replace(/[\u00A0\u2009\u202F]/g, ' ')
      .replace(/[\u2080-\u2089]/g, d => String(d.charCodeAt(0) - 0x2080)) // O\u2082 -> O2, H\u2082S -> H2S
      .replace(/\s+/g, ' ').trim().slice(0, max);
    let out = '';
    for (const ch of s) {
      if (ch.charCodeAt(0) > 0xff) { out += '?'; this.replaced++; } else out += ch;
    }
    return out;
  }
}

// ─── the document ─────────────────────────────────────────────────────────

class Layout {
  y = 0;
  constructor(public doc: PdfDoc, private continued: string) {}

  newPage() {
    this.doc.addPage();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...SLATE);
    this.doc.text(this.continued, MX, 14);
    this.doc.setDrawColor(...NAVY);
    this.doc.setLineWidth(0.4);
    this.doc.line(MX, 16, W - MX, 16);
    this.y = 22;
  }
  need(h: number) { if (this.y + h > BODY_BOTTOM) this.newPage(); }

  heading(title: string) {
    this.need(16);
    this.y += 3;
    this.doc.setFillColor(...NAVY);
    this.doc.rect(MX, this.y, CW, 6.2, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.6);
    this.doc.setTextColor(...WHITE);
    this.doc.text(title.toUpperCase(), MX + 2.5, this.y + 4.3);
    this.y += 9;
  }

  note(text: string, color: RGB = MUTED, size = 7.6) {
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines: string[] = this.doc.splitTextToSize(text, CW);
    this.need(lines.length * 3.5 + 1.5);
    lines.forEach((l, i) => this.doc.text(l, MX, this.y + 3 + i * 3.5));
    this.y += lines.length * 3.5 + 2;
  }

  paragraph(text: string, size = 8.8) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);
    const lines: string[] = this.doc.splitTextToSize(text || '-', CW);
    for (const l of lines) { this.need(4.4); this.doc.text(l, MX, this.y + 3.2); this.y += 4.2; }
    this.y += 1.5;
  }

  /** Label / value pairs in two columns. */
  facts(items: Array<[string, string]>) {
    const colW = CW / 2;
    for (let i = 0; i < items.length; i += 2) {
      const row = items.slice(i, i + 2);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.4);
      const lines = row.map(([, v]) => this.doc.splitTextToSize(v || '-', colW - 6) as string[]);
      const h = Math.max(...lines.map(l => l.length)) * 4 + 5.5;
      this.need(h);
      row.forEach(([label], k) => {
        const x = MX + k * colW;
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(6.3);
        this.doc.setTextColor(...MUTED);
        this.doc.text(label.toUpperCase(), x, this.y + 3);
        this.doc.setFontSize(8.4);
        this.doc.setTextColor(...INK);
        lines[k].forEach((l, j) => this.doc.text(l, x, this.y + 7.2 + j * 4));
      });
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.15);
      this.doc.line(MX, this.y + h - 0.6, W - MX, this.y + h - 0.6);
      this.y += h;
    }
    this.y += 1;
  }

  table(cols: Array<{ label: string; w: number }>, rows: string[][], empty = 'None recorded.') {
    const drawHeader = () => {
      this.doc.setFillColor(238, 241, 248);
      this.doc.rect(MX, this.y, CW, 5.6, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.6);
      this.doc.setTextColor(...SLATE);
      let x = MX;
      for (const c of cols) { this.doc.text(c.label.toUpperCase(), x + 1.5, this.y + 3.9); x += c.w; }
      this.y += 5.6;
    };
    if (rows.length === 0) { this.note(empty); return; }
    this.need(14);
    drawHeader();
    rows.forEach((row, ri) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.6);
      const cells = row.map((v, i) => this.doc.splitTextToSize(v || '-', cols[i].w - 3) as string[]);
      const h = Math.max(...cells.map(c => c.length)) * 3.5 + 2.6;
      if (this.y + h > BODY_BOTTOM) { this.newPage(); drawHeader(); }
      if (ri % 2 === 1) { this.doc.setFillColor(248, 249, 252); this.doc.rect(MX, this.y, CW, h, 'F'); }
      this.doc.setTextColor(...INK);
      let x = MX;
      cells.forEach((lines, i) => { lines.forEach((l, j) => this.doc.text(l, x + 1.5, this.y + 3.7 + j * 3.5)); x += cols[i].w; });
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.12);
      this.doc.line(MX, this.y + h, W - MX, this.y + h);
      this.y += h;
    });
    this.y += 2;
  }
}

function drawQr(doc: PdfDoc, url: string, x: number, y: number, size: number) {
  const matrix = makeQrMatrix(url, 'M');
  const n = matrix.length;
  const m = size / n;
  doc.setFillColor(...INK);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!matrix[r][c]) { c++; continue; }
      let end = c;
      while (end < n && matrix[r][end]) end++;
      doc.rect(x + c * m, y + r * m, (end - c) * m + 0.02, m + 0.02, 'F');
      c = end;
    }
  }
}

const STATUS_COLOR: Record<string, RGB> = {
  ACTIVE: [4, 120, 87], HOLD: [180, 83, 9], EXPIRED: [185, 28, 28], REJECTED: [185, 28, 28],
};

export function permitPdfFileName(permit: { permit_no?: string; id?: string }): string {
  const safe = String(permit.permit_no || permit.id || 'permit').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'permit';
  return `EviroSafe-${safe}.pdf`;
}

export function buildPermitPdf(JsPdf: JsPdfCtor, input: PermitPdfInput): PdfDoc {
  const { permit: p, now } = input;
  const ink = new Ink();
  const payload = p.payload ?? {};
  const rule = (TYPE_RULES as Record<string, any>)[p.type];
  const stage = effectiveStatus(p, now) ?? normalizeStage(p.status);
  const url = p.public_token ? buildPermitUrl(p.public_token, input.baseUrl) : '';
  const nameOf = (id?: string) => input.users?.find(u => u.id === id)?.name || id || '';

  const doc = new JsPdf({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({ title: `Permit to Work ${p.permit_no ?? ''}`, subject: p.type, author: 'EviroSafe' });
  const L = new Layout(doc, `${p.permit_no ?? 'Permit'} · ${ink.t(p.type)} (continued)`);

  // ── page 1: header band ────────────────────────────────────────────────
  doc.setFillColor(...BAND);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...WHITE);
  doc.roundedRect(MX - 1, 6, 30, 30, 2, 2, 'F');
  drawLogo(doc, MX + 2.5, 11, 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.text('PERMIT TO WORK', MX + 36, 12);
  doc.setFontSize(21);
  doc.text(p.permit_no ?? 'LEGACY PERMIT', MX + 36, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(ink.t(p.type), MX + 36, 29);
  doc.setFontSize(8);
  doc.text(ink.t(`${input.orgName}${input.projectName ? ` · ${input.projectName}` : ''}`, 90), MX + 36, 35.5);

  if (url) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(W - MX - 34, 5, 34, 36, 2, 2, 'F');
    drawQr(doc, url, W - MX - 31.5, 7.5, 29);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.6);
    doc.setTextColor(...INK);
    doc.text('SCAN: CURRENT STATUS', W - MX - 17, 39, { align: 'center' });
  }

  // ── status line ────────────────────────────────────────────────────────
  L.y = 48;
  const label = stage ? STATUS_LABEL_UP(stage) : String(p.status ?? 'UNKNOWN');
  const left = remainingMs(p, now);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...(STATUS_COLOR[stage ?? ''] ?? NAVY));
  doc.text(`STATUS WHEN PRINTED: ${label}`, MX, L.y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  const sub = [
    `Printed ${fmtStamp(now)}`,
    left !== null ? formatRemaining(left) : '',
    url ? 'A printed copy can be out of date: scan the QR code to check the current status.' : '',
  ].filter(Boolean).join('  ·  ');
  doc.text(doc.splitTextToSize(sub, CW) as string[], MX, L.y + 9);
  L.y += 15;

  // ── particulars ────────────────────────────────────────────────────────
  const w = payload.work ?? {};
  const req = requestedWindow(payload);
  const vFrom = validFromMs(p), vUntil = validUntilMs(p), first = firstActivatedMs(p);
  L.heading('Permit particulars');
  L.facts([
    ['Location', ink.t(w.location)],
    ['Project', ink.t(input.projectName)],
    ['Requested window', req ? `${fmtStamp(req.start)}  to  ${fmtStamp(req.end)}` : ''],
    ['Valid (set at handover)', Number.isFinite(vFrom) && Number.isFinite(vUntil) ? `${fmtStamp(vFrom)}  to  ${fmtStamp(vUntil)}` : 'Not started'],
    ['Raised by', ink.t(nameOf(p.creator_id) || payload.requester?.name)],
    ['Receiver', ink.t(nameOf(p.receiver_id) || 'Same as requester')],
    ['Workers', String(w.number_of_workers ?? '')],
    ['Emergency contact', ink.t(w.emergency_contact)],
    ['Risk assessment ref.', ink.t(w.risk_assessment_ref)],
    ['Risk level', rule ? `${rule.risk} (max ${rule.maxHours} h at a time)` : ''],
    ...(payload.external_ref ? [['Paper permit ref.', ink.t(payload.external_ref)] as [string, string]] : []),
    ...(Number.isFinite(first) ? [['First activated', fmtStamp(first)] as [string, string]] : []),
  ]);
  L.heading('Work description');
  L.paragraph(ink.t(w.description, 1500));

  // ── team, PPE, type-specific ───────────────────────────────────────────
  const team: any[] = payload.team ?? [];
  L.heading('Team');
  L.table(
    [{ label: 'Name', w: 52 }, { label: 'Role on permit', w: 32 }, { label: 'Company', w: 44 }, { label: 'Account', w: 26 }, { label: 'Mobile', w: 28 }],
    team.map(m => [ink.t(m.name), ink.t(String(m.role ?? '').replace(/_/g, ' ')), ink.t(m.company), m.user_id ? 'Linked' : 'Not linked', ink.t(m.mobile)]),
    'No team members listed.',
  );

  const ppe = Object.entries(payload.ppe ?? {}).filter(([, v]) => v === true).map(([k]) => k.replace(/_/g, ' '));
  L.heading('Personal protective equipment');
  L.paragraph(ppe.length ? ppe.join(', ') : 'None ticked.');

  if (p.type === 'Hot Work') {
    L.heading('Fire watch');
    L.facts([['Fire watcher', ink.t(payload.fire_watcher?.name)], ['Mobile', ink.t(payload.fire_watcher?.mobile)], ['Post-work watch', `${payload.post_watch_minutes ?? ''} minutes`]]);
  }
  if (p.type === 'Lifting') {
    const lc = payload.load_calculation ?? {};
    const util = liftUtilisation(lc);
    L.heading('Lift plan');
    L.facts([
      ['Lift plan ref.', ink.t(lc.lift_plan_ref)], ['Crane certificate no.', ink.t(lc.crane_certification_no)],
      ['Operator certificate no.', ink.t(lc.operator_certification_no)], ['Crane capacity at radius', String(lc.crane_capacity_at_radius ?? '')],
      ['Load weight', String(lc.load_weight ?? '')], ['Hook and rigging weight', String(lc.hook_rigging_weight ?? '')],
      ['Utilisation (recomputed)', util === null ? 'Not calculated' : `${util.toFixed(0)} %`],
    ]);
  }

  const iso: any[] = payload.isolation ?? [];
  if (iso.length > 0 || rule?.isolation) {
    L.heading('Isolation register');
    const st = (by?: string, at?: string) => (by ? `${ink.t(by)}\n${fmtStamp(msOf(at))}` : '-');
    L.table(
      [{ label: 'Point', w: 42 }, { label: 'Method', w: 28 }, { label: 'Lock / tag', w: 18 }, { label: 'Applied', w: 32 }, { label: 'Verified', w: 32 }, { label: 'Removed', w: 30 }],
      iso.map(i => [ink.t(i.point), ink.t(i.method), ink.t(i.lock_no), st(i.applied_by, i.applied_at), st(i.verified_by, i.verified_at), st(i.removed_by, i.removed_at)]),
      'No isolation points recorded.',
    );
  }

  const gas: any[] = payload.gas_tests ?? [];
  if (gas.length > 0 || rule?.gasMaxAgeMin) {
    L.heading('Gas tests');
    L.table(
      [{ label: 'Time', w: 18 }, { label: 'O2 %', w: 18 }, { label: 'LEL %', w: 18 }, { label: 'H2S ppm', w: 20 }, { label: 'CO ppm', w: 20 }, { label: 'Tester', w: 38 }, { label: 'Result', w: 50 }],
      gas.map(g => {
        const ok = isCompleteRow(g, now);
        const ev = ok ? evaluateGasReading(g) : null;
        return [ink.t(g.time), String(g.o2 ?? ''), String(g.lel ?? ''), String(g.h2s ?? ''), String(g.co ?? ''), ink.t(g.tester_name), !ev ? 'Incomplete (ignored)' : ev.pass ? 'PASS' : ink.t(`FAIL: ${ev.failures.join('; ')}`)];
      }),
      'No gas tests recorded.',
    );
  }
  const entries: any[] = payload.entry_log ?? [];
  if (entries.length > 0) {
    L.heading('Personnel entry and exit');
    L.table([{ label: 'Name', w: 90 }, { label: 'Time in', w: 46 }, { label: 'Time out', w: 46 }], entries.map(e => [ink.t(e.name), ink.t(e.time_in), e.time_out ? ink.t(e.time_out) : 'STILL INSIDE']));
  }

  // ── checklist ──────────────────────────────────────────────────────────
  const items: any[] = payload.safety_requirements ?? [];
  L.heading('Safety requirements checklist');
  L.table(
    [{ label: '#', w: 9 }, { label: 'Requirement', w: 131 }, { label: 'Answer', w: 20 }, { label: '', w: 22 }],
    items.map((i, k) => [String(k + 1), ink.t(i.text), i.response || 'Unanswered', i.is_critical ? 'CRITICAL' : '']),
    'No checklist.',
  );

  // ── stoppages and extensions ───────────────────────────────────────────
  L.heading('Work stoppages');
  L.table(
    [{ label: 'Stopped', w: 32 }, { label: 'Reason', w: 66 }, { label: 'By', w: 34 }, { label: 'Resumed', w: 50 }],
    (payload.holding_or_stoppage ?? []).map((s: any) => [fmtStamp(msOf(s.time)), ink.t(s.reason), ink.t(s.stopped_by), s.restarted_time ? `${fmtStamp(msOf(s.restarted_time))}${s.resumed_by ? ` by ${ink.t(s.resumed_by)}` : ''}` : 'STILL ON HOLD']),
    'No stoppages.',
  );
  L.heading('Extensions');
  L.table(
    [{ label: 'When', w: 32 }, { label: 'By', w: 36 }, { label: 'Reason', w: 70 }, { label: 'New end', w: 44 }],
    (p.extensions ?? []).map((e: any) => [fmtStamp(msOf(e.at)), ink.t(e.by_name), ink.t(e.reason), fmtStamp(msOf(e.to_until))]),
    'Not extended.',
  );

  // ── sign-offs ──────────────────────────────────────────────────────────
  const SLOTS: Array<[string, string]> = [
    ['requester', 'Submitted by'], ['prescreen', 'Pre-screen'], ['inspection', 'Site inspection'], ['approval', 'Approved by'],
    ['handover', 'Handover accepted'], ['completion_request', 'Completion requested'], ['closure', 'Closed by'],
  ];
  L.heading('System sign-offs (the signed-in person who did each step)');
  L.table(
    [{ label: 'Step', w: 38 }, { label: 'Name', w: 52 }, { label: 'Role', w: 40 }, { label: 'When', w: 52 }],
    SLOTS.filter(([k]) => p.signatures?.[k]).map(([k, lab]) => { const s = p.signatures[k]; return [lab, ink.t(s.name), ink.t(String(s.role ?? '').replace(/_/g, ' ').toLowerCase()), fmtStamp(msOf(s.signed_at))]; }),
    'No steps signed yet.',
  );

  const ext: Array<[string, string]> = [];
  const so = payload.signoffs ?? {};
  if (payload.requester?.signature) ext.push(['Permit requester (typed)', ink.t(payload.requester.signature)]);
  if (so.client_proponent?.name || so.client_proponent?.signature) ext.push(['Client proponent (typed)', ink.t([so.client_proponent.name, so.client_proponent.designation, so.client_proponent.signature].filter(Boolean).join(' / '))]);
  if (so.client_hs?.name || so.client_hs?.signature) ext.push(['Client HSE (typed)', ink.t([so.client_hs.name, so.client_hs.signature].filter(Boolean).join(' / '))]);
  const ji = payload.joint_inspection;
  if (ji?.remarks || ji?.requester?.signature) ext.push(['Joint inspection', ink.t([ji.remarks, ji.requester?.signature && `requester ${ji.requester.signature}`, ji.client_proponent?.signature && `proponent ${ji.client_proponent.signature}`, ji.client_hs?.signature && `HSE ${ji.client_hs.signature}`].filter(Boolean).join('; '))]);
  if (payload.closure?.note) ext.push(['Closure note', ink.t(payload.closure.note)]);
  L.heading('External records (typed names, not system signatures)');
  L.table([{ label: 'Record', w: 50 }, { label: 'Entered text', w: 132 }], ext.map(([a, b]) => [a, b]), 'None.');

  // ── activity log ───────────────────────────────────────────────────────
  L.heading('Activity log');
  L.table(
    [{ label: 'When', w: 30 }, { label: 'Step', w: 34 }, { label: 'By', w: 40 }, { label: 'Became', w: 28 }, { label: 'Note', w: 50 }],
    (p.workflow_log ?? []).map((e: any) => {
      const def = ACTIONS[e.action as ActionId];
      const st = normalizeStage(e.stage);
      const note = [e.comments, e.override ? `OVERRIDE: ${e.justification ?? ''}` : ''].filter(Boolean).join(' ');
      return [fmtStamp(msOf(e.timestamp)), e.action === 'create' ? 'Created' : def?.label ?? ink.t(e.action), ink.t(e.user_name || nameOf(e.user_id)), st ? STAGE_LABEL[st] : ink.t(e.stage), ink.t(note, 400)];
    }),
    'No activity.',
  );

  // ── competency keys, only as a reference for the reader ────────────────
  if (rule?.competency?.length) L.note(`Training certificates are checked for: ${rule.competency.map((k: string) => (COMPETENCY_LABEL as Record<string, string>)[k] ?? k).join(', ')}.`);

  if (ink.replaced > 0) {
    // Said at the top of page 1 so a printed copy is never mistaken for the whole record.
    doc.setPage(1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(185, 28, 28);
    doc.text(`NOTE: ${ink.replaced} character(s) (for example Arabic) cannot be printed here and appear as "?". See the permit in EviroSafe for the original text.`, MX, 46);
  }

  // ── footer on every page ───────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(MX, 286, W - MX, 286);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(`${p.permit_no ?? 'Permit'} · printed ${fmtStamp(now)}${url ? ` · ${url}` : ''}`, MX, 290.2);
    doc.text(`Page ${n} of ${pages}`, W - MX, 290.2, { align: 'right' });
  }
  return doc;
}

function STATUS_LABEL_UP(stage: keyof typeof STAGE_LABEL) { return STAGE_LABEL[stage].toUpperCase(); }

/** Browser entry point: loads jsPDF on demand so it stays out of the main bundle. */
export async function downloadPermitPdf(input: PermitPdfInput): Promise<void> {
  const { jsPDF } = await import('jspdf');
  buildPermitPdf(jsPDF, input).save(permitPdfFileName(input.permit));
}
