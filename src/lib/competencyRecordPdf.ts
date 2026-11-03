// A person's competency record: a formal, paginated A4 document listing the
// certificates they hold, in the same visual style as the certificates. It
// replaces printing the on-screen profile, which came out shifted, clipped and
// unreadable on paper.

import { formatDateOnly, formatVerificationCode, type CertificateStatus } from './certificates';
import {
  GOLD, GOLD_LIGHT, INK, MUTED, NAVY, PAPER, SLATE, WHITE,
  diamond, drawIssuer, drawLogo, drawSpaced, fitFontSize, flourish, toPdfText,
  type JsPdfCtor, type PdfDoc, type RGB,
} from './pdfKit';

export interface CompetencyRow {
  title: string;
  certificateNo?: string;
  /** Canonical 20-character verification code. */
  code?: string;
  /** YYYY-MM-DD */
  issuedOn?: string;
  /** YYYY-MM-DD, '' = no expiry. */
  expiresOn?: string;
  /** 'recorded' = a free-text entry that was typed in by hand, not verifiable online. */
  status: CertificateStatus | 'recorded';
}

export interface CompetencyRecordData {
  holderName: string;
  email?: string;
  role?: string;
  department?: string;
  employeeId?: string;
  /** 'EMPLOYEE ID' for a real number, 'PROFILE ID' for a generated reference. */
  idLabel?: string;
  orgName: string;
  /** YYYY-MM-DD: the date statuses are stated as at. */
  generatedOn: string;
  /** e.g. "your-domain.com", shown in the footer. */
  verifyHost: string;
  rows: CompetencyRow[];
}

const W = 210;
const H = 297;
const CX = W / 2;
const TABLE_X = 20;
const TABLE_W = 170;
const COLS = [
  { key: 'no', label: '#', w: 8 },
  { key: 'course', label: 'COURSE', w: 52 },
  { key: 'cert', label: 'CERTIFICATE NO.', w: 44 },
  { key: 'issued', label: 'ISSUED', w: 22 },
  { key: 'valid', label: 'VALID UNTIL', w: 27 },
  { key: 'status', label: 'STATUS', w: 17 },
] as const;
const BODY_BOTTOM = 264;

const STATUS_STYLE: Record<CompetencyRow['status'], { label: string; color: RGB }> = {
  valid: { label: 'VALID', color: [4, 120, 87] },
  expiring: { label: 'EXPIRING', color: [180, 83, 9] },
  expired: { label: 'EXPIRED', color: [185, 28, 28] },
  revoked: { label: 'REVOKED', color: [185, 28, 28] },
  recorded: { label: 'RECORDED', color: [100, 116, 139] },
};

function drawFrame(doc: PdfDoc) {
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.0);
  doc.rect(7, 7, W - 14, H - 14, 'S');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(9.2, 9.2, W - 18.4, H - 18.4, 'S');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.2);
  doc.rect(11, 11, W - 22, H - 22, 'S');
  for (const [x, y] of [[9.2, 9.2], [W - 9.2, 9.2], [9.2, H - 9.2], [W - 9.2, H - 9.2]]) {
    doc.setFillColor(...PAPER);
    doc.circle(x, y, 2.7, 'F');
    diamond(doc, x, y, 2.2, GOLD);
    diamond(doc, x, y, 1.1, PAPER);
  }
}

function drawTableHeader(doc: PdfDoc, y: number) {
  doc.setFillColor(...NAVY);
  doc.rect(TABLE_X, y, TABLE_W, 7, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...WHITE);
  let x = TABLE_X;
  for (const c of COLS) {
    drawSpaced(doc, c.label, x + 2.2, y + 4.6, 0.55, 'left');
    x += c.w;
  }
}

function particulars(doc: PdfDoc, y: number, cells: { label: string; value: string }[]) {
  const BOX_X = TABLE_X;
  const BOX_H = 33;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(BOX_X, y, TABLE_W, BOX_H, 'FD');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  doc.rect(BOX_X + 0.9, y + 0.9, TABLE_W - 1.8, BOX_H - 1.8, 'S');
  doc.setDrawColor(...GOLD_LIGHT);
  doc.line(BOX_X + TABLE_W / 2, y + 3, BOX_X + TABLE_W / 2, y + BOX_H - 3);
  doc.line(BOX_X + 3, y + BOX_H / 3 + 0.3, BOX_X + TABLE_W - 3, y + BOX_H / 3 + 0.3);
  doc.line(BOX_X + 3, y + (BOX_H * 2) / 3 - 0.3, BOX_X + TABLE_W - 3, y + (BOX_H * 2) / 3 - 0.3);

  cells.forEach((cell, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = BOX_X + col * (TABLE_W / 2) + 6;
    const cy = y + row * (BOX_H / 3);
    doc.setFont('times', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...MUTED);
    drawSpaced(doc, cell.label, cx, cy + 4.6, 0.8, 'left');
    doc.setTextColor(...INK);
    doc.setFont('times', 'bold');
    const size = fitFontSize(doc, cell.value, TABLE_W / 2 - 12, 10.5, 7.5);
    doc.setFontSize(size);
    if (doc.getTextWidth(cell.value) > TABLE_W / 2 - 12) throw new Error(`"${cell.label}" is too long to fit on the record.`);
    doc.text(cell.value, cx, cy + 9.4);
  });
}

export function buildCompetencyRecordPdf(JsPDF: JsPdfCtor, data: CompetencyRecordData): PdfDoc {
  const holder = toPdfText(data.holderName, 'Holder name');
  const org = toPdfText(data.orgName, 'Organisation name');
  const rows = data.rows.map(r => ({
    ...r,
    title: toPdfText(r.title, 'Course title'),
  }));
  const cells = [
    { label: 'NAME', value: holder },
    { label: toPdfText(data.idLabel || 'EMPLOYEE ID', 'ID label'), value: toPdfText(data.employeeId || '-', 'Employee ID') },
    { label: 'ROLE', value: toPdfText((data.role || '-').replace(/_/g, ' '), 'Role') },
    { label: 'DEPARTMENT', value: toPdfText(data.department || '-', 'Department') },
    { label: 'EMAIL', value: toPdfText(data.email || '-', 'Email') },
    { label: 'STATUS AS AT', value: formatDateOnly(data.generatedOn) },
  ];

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Competency record - ${holder}`,
    subject: 'Competency record',
    author: org,
    creator: 'EviroSafe',
  });

  // ── Page 1 header ───────────────────────────────────────────────────────
  drawFrame(doc);
  drawLogo(doc, CX - (13 * 445) / 540 / 2, 17, 13);
  drawIssuer(doc, org, CX, 41, 160);

  doc.setFont('times', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...NAVY);
  drawSpaced(doc, 'COMPETENCY RECORD', CX, 56, 3, 'center');
  flourish(doc, CX, 61.5, 42);

  particulars(doc, 69, cells);

  // Summary line.
  const count = (s: CompetencyRow['status']) => rows.filter(r => r.status === s).length;
  const parts: string[] = [];
  const validNow = count('valid') + count('expiring');
  if (validNow) parts.push(`${validNow} valid${count('expiring') ? ` (${count('expiring')} expiring within 30 days)` : ''}`);
  if (count('expired')) parts.push(`${count('expired')} expired`);
  if (count('revoked')) parts.push(`${count('revoked')} revoked`);
  if (count('recorded')) parts.push(`${count('recorded')} recorded manually`);
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(
    rows.length === 0 ? 'No certificates are on record.' : `${rows.length} certificate${rows.length === 1 ? '' : 's'} on record: ${parts.join(', ')}.`,
    CX, 111, { align: 'center' },
  );

  // ── Table ───────────────────────────────────────────────────────────────
  let y = 118;
  drawTableHeader(doc, y);
  y += 7;

  const newPage = () => {
    doc.addPage();
    drawFrame(doc);
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`Competency record (continued): ${holder}`, CX, 24, { align: 'center' });
    y = 30;
    drawTableHeader(doc, y);
    y += 7;
  };

  if (rows.length === 0) {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('Certificates appear here once training sessions have been completed and certificates issued.', CX, y + 14, { align: 'center', maxWidth: 150 });
  }

  rows.forEach((row, i) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    const lines: string[] = doc.splitTextToSize(row.title, COLS[1].w - 4);
    if (lines.length > 3) throw new Error('A course title is too long to fit on the record.');
    const height = Math.max(12, lines.length * 3.9 + 6);
    if (y + height > BODY_BOTTOM) newPage();

    if (i % 2 === 0) {
      doc.setFillColor(248, 246, 239);
      doc.rect(TABLE_X, y, TABLE_W, height, 'F');
    }
    doc.setDrawColor(226, 222, 210);
    doc.setLineWidth(0.15);
    doc.line(TABLE_X, y + height, TABLE_X + TABLE_W, y + height);

    let x = TABLE_X;
    const mid = y + height / 2;

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(String(i + 1), x + 2.2, mid + 1);
    x += COLS[0].w;

    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...INK);
    const textTop = mid - ((lines.length - 1) * 3.9) / 2 + 1;
    lines.forEach((l, j) => doc.text(l, x + 2.2, textTop + j * 3.9));
    x += COLS[1].w;

    if (row.certificateNo) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.3);
      doc.setTextColor(...INK);
      doc.text(row.certificateNo, x + 2.2, mid - (row.code ? 0.6 : -1));
      if (row.code) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(5.7);
        doc.setTextColor(...MUTED);
        doc.text(formatVerificationCode(row.code), x + 2.2, mid + 3);
      }
    } else {
      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text('Not verifiable online', x + 2.2, mid + 1);
    }
    x += COLS[2].w;

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(row.issuedOn ? formatDateOnly(row.issuedOn, 'short') : '-', x + 2.2, mid + 1);
    x += COLS[3].w;
    doc.text(row.expiresOn ? formatDateOnly(row.expiresOn, 'short') : row.issuedOn ? 'No expiry' : '-', x + 2.2, mid + 1);
    x += COLS[4].w;

    const st = STATUS_STYLE[row.status];
    doc.setFont('times', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...st.color);
    drawSpaced(doc, st.label, x + 1.8, mid + 1, 0.25, 'left');

    y += height;
  });

  // ── Footer on every page ────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(TABLE_X, 269, TABLE_X + TABLE_W, 269);
    doc.setFont('times', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Each EviroSafe certificate listed here can be verified at ${data.verifyHost}/verify using its verification code or QR code.`,
      CX, 273.6, { align: 'center' },
    );
    doc.text(
      `Statuses are stated as at ${formatDateOnly(data.generatedOn)}. The verification page always shows the current status.`,
      CX, 277, { align: 'center' },
    );
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(`Page ${p} of ${pages}`, CX, 281.4, { align: 'center' });
  }

  return doc;
}

/** Browser entry point: loads jsPDF on demand so it stays out of the main bundle. */
export async function downloadCompetencyRecordPdf(data: CompetencyRecordData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = buildCompetencyRecordPdf(jsPDF, data);
  const slug = data.holderName.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  doc.save(`EviroSafe-Competency-Record-${slug}.pdf`);
}
