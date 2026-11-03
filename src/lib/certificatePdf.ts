// Builds the certificate PDF in the style of a formal professional credential
// (think awarding-body certificates): A4 landscape, framed border with a wave
// band, guilloche security pattern, serif type, a details grid, an official
// seal and a verification QR code.
//
// Everything is drawn as vector shapes and real text (selectable, tiny file,
// sharp at any print size). The QR code is drawn from its module matrix as
// vector squares, so it scans cleanly when printed.

import { LOGO_HEIGHT, LOGO_WIDTH } from './brandLogo';
import { formatDateOnly, formatVerificationCode } from './certificates';
import { makeQrMatrix } from './qr';
import {
  GOLD, GOLD_LIGHT, INK, MUTED, NAVY, PAPER, PATTERN, SLATE, WHITE,
  UnsupportedCharactersError, diamond, drawIssuer, drawLogo, drawSpaced, fitFontSize, flourish, polyline, toPdfText,
  type JsPdfCtor, type PdfDoc,
} from './pdfKit';

export { UnsupportedCharactersError, toPdfText };

export interface CertificatePdfData {
  holderName: string;
  courseTitle: string;
  orgName: string;
  certificateNo: string;
  /** Canonical 20-character code. */
  verificationCode: string;
  verifyUrl: string;
  /** YYYY-MM-DD */
  issuedOn: string;
  /** YYYY-MM-DD, or '' when the certificate does not expire. */
  expiresOn: string;
  trainerName?: string;
  /** Assessment result, e.g. 92 → "92%". Omit when there was no assessment. */
  scorePercent?: number;
}

const PAGE_W = 297;
const PAGE_H = 210;
const CX = PAGE_W / 2;

// ─── Drawing primitives ───────────────────────────────────────────────────

/** Overlapping rotated ellipses: the classic rosette of security printing. */
function rosette(doc: PdfDoc, cx: number, cy: number, a: number, b: number, count: number) {
  for (let k = 0; k < count; k++) {
    const rot = (k * Math.PI) / count;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const pts: [number, number][] = [];
    for (let j = 0; j <= 96; j++) {
      const t = (j / 96) * Math.PI * 2;
      const x0 = a * Math.cos(t);
      const y0 = b * Math.sin(t);
      pts.push([cx + x0 * cr - y0 * sr, cy + x0 * sr + y0 * cr]);
    }
    polyline(doc, pts);
  }
}

/** Two interlocking sine waves along a straight edge (a "chain" band). */
function waveBand(doc: PdfDoc, x1: number, y1: number, x2: number, y2: number, amp: number, period: number) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  const nx = -dy;
  const ny = dx;
  const steps = Math.max(2, Math.round(len * 5));
  for (const phase of [0, Math.PI]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * len;
      const off = amp * Math.sin((2 * Math.PI * s) / period + phase);
      pts.push([x1 + dx * s + nx * off, y1 + dy * s + ny * off]);
    }
    polyline(doc, pts);
  }
}

/**
 * Text set along a circle. `baseRadius` is where the glyph baseline sits; top
 * text reads clockwise with glyphs growing outwards, bottom text reads
 * left-to-right with glyphs growing inwards (so both stay upright).
 */
function arcText(
  doc: PdfDoc, text: string, cx: number, cy: number, baseRadius: number,
  where: 'top' | 'bottom', gapDeg = 0.6,
) {
  const widths = [...text].map(ch => doc.getTextWidth(ch));
  const angles = widths.map(w => (w / baseRadius) * (180 / Math.PI));
  const span = angles.reduce((a, b) => a + b, 0) + gapDeg * (text.length - 1);
  let cursor = 0;
  [...text].forEach((ch, i) => {
    const half = angles[i] / 2;
    const theta = where === 'top'
      ? -span / 2 + cursor + half
      : 180 + span / 2 - cursor - half;
    const rad = (theta * Math.PI) / 180;
    const px = cx + baseRadius * Math.sin(rad);
    const py = cy - baseRadius * Math.cos(rad);
    const ccw = where === 'top' ? -theta : 180 - theta;
    const cr = (ccw * Math.PI) / 180;
    // Move back half a glyph along the baseline so it's centred on `theta`.
    const ox = px - (widths[i] / 2) * Math.cos(cr);
    const oy = py + (widths[i] / 2) * Math.sin(cr);
    if (ch !== ' ') doc.text(ch, ox, oy, { angle: ccw });
    cursor += angles[i] + gapDeg;
  });
}

function drawSeal(doc: PdfDoc, cx: number, cy: number, r: number) {
  // Scalloped edge.
  const teeth = 44;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 360; i++) {
    const a = (i * Math.PI) / 180;
    const rr = r + 0.7 * Math.cos(teeth * a);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  const segs: number[][] = [];
  for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  doc.setFillColor(...GOLD);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);

  doc.setFillColor(...NAVY);
  doc.circle(cx, cy, r - 2.1, 'F');
  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, r - 3.0, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(4.6);
  doc.setTextColor(...WHITE);
  const capHeight = 4.6 * 0.3528 * 0.68;
  const mid = r - 5.6;
  arcText(doc, 'EVIROSAFE', cx, cy, mid - capHeight / 2, 'top', 1.1);
  arcText(doc, 'VERIFIED RECORD', cx, cy, mid + capHeight / 2, 'bottom', 0.9);
  diamond(doc, cx - mid, cy, 0.7, GOLD_LIGHT);
  diamond(doc, cx + mid, cy, 0.7, GOLD_LIGHT);

  doc.setFillColor(...WHITE);
  doc.circle(cx, cy, r - 8.1, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r - 8.1, 'S');
  const logoH = (r - 8.1) * 1.45;
  drawLogo(doc, cx - (logoH * LOGO_WIDTH) / LOGO_HEIGHT / 2, cy - logoH / 2, logoH);
}

function drawQr(doc: PdfDoc, url: string, x: number, y: number, size: number) {
  const matrix = makeQrMatrix(url, 'M');
  const n = matrix.length;
  const m = size / n;
  doc.setFillColor(...NAVY);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!matrix[r][c]) { c++; continue; }
      let end = c;
      while (end < n && matrix[r][end]) end++;
      // Merge horizontal runs; the tiny overshoot hides hairline seams some viewers show.
      doc.rect(x + c * m, y + r * m, (end - c) * m + 0.02, m + 0.02, 'F');
      c = end;
    }
  }
}

export function certificateFileName(data: Pick<CertificatePdfData, 'holderName' | 'courseTitle'>): string {
  const slug = (s: string) => s.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  const name = `EviroSafe-Certificate-${slug(data.holderName)}-${slug(data.courseTitle)}`.slice(0, 90);
  return `${name}.pdf`;
}

// ─── The certificate ──────────────────────────────────────────────────────

export function buildCertificatePdf(JsPDF: JsPdfCtor, data: CertificatePdfData): PdfDoc {
  const holder = toPdfText(data.holderName, 'Holder name');
  const course = toPdfText(data.courseTitle, 'Course title');
  const org = toPdfText(data.orgName, 'Organisation name');
  const trainer = data.trainerName ? toPdfText(data.trainerName, 'Trainer name') : '';
  const issued = formatDateOnly(data.issuedOn);
  const expires = data.expiresOn ? formatDateOnly(data.expiresOn) : 'No expiry';
  const result = typeof data.scorePercent === 'number' ? `${Math.round(data.scorePercent)}%` : '';

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Certificate - ${holder} - ${course}`,
    subject: `Certificate of completion ${data.certificateNo}`,
    author: org,
    creator: 'EviroSafe',
    keywords: data.certificateNo,
  });

  // ── Paper, security pattern, frame ──────────────────────────────────────
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  doc.setDrawColor(...PATTERN);
  doc.setLineWidth(0.1);
  rosette(doc, CX, 104, 70, 30, 44);
  rosette(doc, CX, 104, 46, 46, 1); // a plain ring inside the rosette

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.3);
  doc.rect(7, 7, PAGE_W - 14, PAGE_H - 14, 'S');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.45);
  doc.rect(9.6, 9.6, PAGE_W - 19.2, PAGE_H - 19.2, 'S');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.22);
  doc.rect(11.4, 11.4, PAGE_W - 22.8, PAGE_H - 22.8, 'S');

  // Wave band between the frame and the content area.
  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.18);
  const wb = 14.3;
  waveBand(doc, wb + 2, wb, PAGE_W - wb - 2, wb, 1.05, 5);
  waveBand(doc, wb + 2, PAGE_H - wb, PAGE_W - wb - 2, PAGE_H - wb, 1.05, 5);
  waveBand(doc, wb, wb + 2, wb, PAGE_H - wb - 2, 1.05, 5);
  waveBand(doc, PAGE_W - wb, wb + 2, PAGE_W - wb, PAGE_H - wb - 2, 1.05, 5);

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.22);
  doc.rect(17.2, 17.2, PAGE_W - 34.4, PAGE_H - 34.4, 'S');

  for (const [x, y] of [[9.6, 9.6], [PAGE_W - 9.6, 9.6], [9.6, PAGE_H - 9.6], [PAGE_W - 9.6, PAGE_H - 9.6]]) {
    doc.setFillColor(...PAPER);
    doc.circle(x, y, 3.1, 'F');
    diamond(doc, x, y, 2.5, GOLD);
    diamond(doc, x, y, 1.3, PAPER);
  }

  // ── Issuer and title ────────────────────────────────────────────────────
  drawIssuer(doc, org, CX, 32, 200);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  drawSpaced(doc, 'CERTIFICATE OF COMPLETION', CX, 49, 3.4, 'center');
  flourish(doc, CX, 55.5, 52);

  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text('This is to certify that', CX, 67, { align: 'center' });

  // ── Holder ──────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setTextColor(...NAVY);
  const NAME_MAX = 225;
  const nameSize = fitFontSize(doc, holder, NAME_MAX, 36, 14);
  doc.setFontSize(nameSize);
  if (doc.getTextWidth(holder) > NAME_MAX) throw new Error('Holder name is too long to fit on the certificate.');
  doc.text(holder, CX, 83, { align: 'center' });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  const ruleHalf = Math.min(Math.max(doc.getTextWidth(holder) / 2 + 12, 60), NAME_MAX / 2 + 8);
  doc.line(CX - ruleHalf, 88, CX + ruleHalf, 88);

  // ── Course ──────────────────────────────────────────────────────────────
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text('has successfully completed the training course', CX, 98, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setTextColor(...INK);
  // Shrink until the title fits on two lines. If even the smallest size needs
  // more, every word is still printed (never clipped) on extra lines.
  const COURSE_MAX = 225;
  let courseSize = 21;
  let courseLines: string[] = [];
  for (const size of [21, 19, 17, 16, 15, 14, 13, 12]) {
    courseSize = size;
    doc.setFontSize(size);
    courseLines = doc.splitTextToSize(course, COURSE_MAX);
    if (courseLines.length <= 2) break;
  }
  if (courseLines.length > 4) throw new Error('Course title is too long to fit on the certificate.');
  const courseLineHeight = courseSize * 0.3528 * 1.22;
  courseLines.forEach((line, i) => doc.text(line, CX, 110 + i * courseLineHeight, { align: 'center' }));

  // ── Details grid ────────────────────────────────────────────────────────
  const GRID_X = 32;
  const GRID_W = PAGE_W - 2 * GRID_X;
  const GRID_Y = 128;
  const GRID_H = 17;
  const columns: { label: string; value: string; mono?: boolean; weight: number }[] = [
    { label: 'CERTIFICATE NO.', value: data.certificateNo, mono: true, weight: 1.45 },
    { label: 'DATE OF ISSUE', value: issued, weight: 1.15 },
    { label: 'VALID UNTIL', value: expires, weight: 1.15 },
  ];
  if (trainer) columns.push({ label: 'TRAINER', value: trainer, weight: 1.3 });
  if (result) columns.push({ label: 'RESULT', value: result, weight: 0.7 });

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.setFillColor(...WHITE);
  doc.rect(GRID_X, GRID_Y, GRID_W, GRID_H, 'FD');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  doc.rect(GRID_X + 0.9, GRID_Y + 0.9, GRID_W - 1.8, GRID_H - 1.8, 'S');

  const totalWeight = columns.reduce((a, c) => a + c.weight, 0);
  let colX = GRID_X;
  columns.forEach((col, i) => {
    const w = (GRID_W * col.weight) / totalWeight;
    if (i > 0) {
      doc.setDrawColor(...GOLD_LIGHT);
      doc.setLineWidth(0.2);
      doc.line(colX, GRID_Y + 2.6, colX, GRID_Y + GRID_H - 2.6);
    }
    const mid = colX + w / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(...MUTED);
    drawSpaced(doc, col.label, mid, GRID_Y + 5.6, 0.9, 'center');

    doc.setTextColor(...INK);
    doc.setFont(col.mono ? 'courier' : 'times', 'bold');
    const pad = 4;
    let size = fitFontSize(doc, col.value, w - pad * 2, col.mono ? 10.5 : 11.5, 7.5);
    doc.setFontSize(size);
    if (doc.getTextWidth(col.value) > w - pad * 2) {
      const lines: string[] = doc.splitTextToSize(col.value, w - pad * 2);
      if (lines.length > 2) throw new Error(`"${col.label}" is too long to fit on the certificate.`);
      size = 7.5;
      doc.setFontSize(size);
      lines.forEach((l, j) => doc.text(l, mid, GRID_Y + 10 + j * 3.3, { align: 'center' }));
    } else {
      doc.text(col.value, mid, GRID_Y + 11.6, { align: 'center' });
    }
    colX += w;
  });

  // ── Bottom row: signature | seal | QR ───────────────────────────────────
  // Signature block.
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(GRID_X + 2, 176, GRID_X + 62, 176);
  doc.setFont('times', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  drawSpaced(doc, 'AUTHORISED SIGNATORY', GRID_X + 32, 180, 0.8, 'center');
  doc.setFont('times', 'italic');
  doc.setTextColor(...SLATE);
  const SIG_W = 62;
  let sigLines: string[] = [org];
  doc.setFontSize(8.5);
  if (doc.getTextWidth(org) > SIG_W) {
    doc.setFontSize(7);
    sigLines = doc.splitTextToSize(org, SIG_W);
    if (sigLines.length > 2) throw new Error('Organisation name is too long to fit on the certificate.');
  }
  sigLines.forEach((l, i) => doc.text(l, GRID_X + 32, 184.2 + i * 3, { align: 'center' }));

  // Seal.
  drawSeal(doc, CX, 166.5, 15.5);

  // QR block.
  const QR_BOX = 33.5;
  const qrX = PAGE_W - GRID_X - QR_BOX;
  const qrY = 150;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(qrX, qrY, QR_BOX, QR_BOX, 'FD');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  doc.rect(qrX + 0.8, qrY + 0.8, QR_BOX - 1.6, QR_BOX - 1.6, 'S');
  // 27 mm leaves >= 4 modules of quiet zone inside the white box (scanners need it).
  const qrSize = 27;
  drawQr(doc, data.verifyUrl, qrX + (QR_BOX - qrSize) / 2, qrY + (QR_BOX - qrSize) / 2, qrSize);

  doc.setFont('times', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...NAVY);
  drawSpaced(doc, 'SCAN TO VERIFY', qrX + QR_BOX / 2, qrY - 1.8, 0.9, 'center');
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...SLATE);
  doc.text(formatVerificationCode(data.verificationCode), qrX + QR_BOX / 2, qrY + QR_BOX + 3.8, { align: 'center' });

  // Footer statement.
  const host = data.verifyUrl.replace(/^https?:\/\//, '').replace(/\/[^/]+$/, '');
  doc.setFont('times', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  const footer: string[] = doc.splitTextToSize(
    `Issued electronically. Verify this certificate by scanning the QR code or at ${host}. ` +
      'It is valid only while its status shows as valid.',
    104,
  );
  doc.text(footer, CX, 187.6, { align: 'center' });

  return doc;
}

/** Browser entry point: loads jsPDF on demand so it stays out of the main bundle. */
export async function createCertificatePdf(data: CertificatePdfData): Promise<PdfDoc> {
  const { jsPDF } = await import('jspdf');
  return buildCertificatePdf(jsPDF, data);
}

export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const doc = await createCertificatePdf(data);
  doc.save(certificateFileName(data));
}
