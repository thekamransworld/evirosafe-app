// Builds the certificate PDF: A4 landscape, drawn as vector shapes and real
// text (selectable, tiny file, sharp at any print size). The QR code is drawn
// from its module matrix as vector squares, so it scans cleanly when printed.

import {
  BRAND_GREEN,
  BRAND_NAVY,
  LOGO_GREEN_PATH,
  LOGO_HEIGHT,
  LOGO_NAVY_PATH,
  parseLogoPath,
} from './brandLogo';
import { formatDateOnly, formatVerificationCode } from './certificates';
import { makeQrMatrix } from './qr';

type JsPdfCtor = typeof import('jspdf').jsPDF;
type PdfDoc = InstanceType<JsPdfCtor>;
type RGB = [number, number, number];

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

/**
 * Thrown when a name or title contains characters the built-in PDF fonts can't
 * draw (e.g. Arabic). Failing loudly beats printing a wrong name on an official
 * document; supporting those scripts needs an embedded font.
 */
export class UnsupportedCharactersError extends Error {
  constructor(public field: string) {
    super(`"${field}" contains characters the certificate PDF can't render yet (non-Latin script).`);
    this.name = 'UnsupportedCharactersError';
  }
}

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const NAVY = hex(BRAND_NAVY);
const GREEN = hex(BRAND_GREEN);
const INK: RGB = [15, 23, 42];
const SLATE: RGB = [100, 116, 139];
const MUTED: RGB = [148, 163, 184];
const RULE: RGB = [226, 232, 240];
const PANEL_TEXT: RGB = [199, 210, 254];
const WHITE: RGB = [255, 255, 255];

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN_X = 18;
const PANEL_X = 205;
const MAIN_RIGHT = 190;
const MAIN_W = MAIN_RIGHT - MARGIN_X;

// Typographic characters that commonly arrive via copy/paste from Word or the
// web. They have plain-ASCII equivalents, so they're normalised instead of
// being treated as "unsupported script".
const DASHES = /[\u2010-\u2015\u2212]/g;
const SINGLE_QUOTES = /[\u2018\u2019\u201A\u2032]/g;
const DOUBLE_QUOTES = /[\u201C\u201D\u201E\u2033]/g;
const SPACE_LIKE = /[\u00A0\u2009\u202F]/g;
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

function toPdfText(value: string, field: string): string {
  const mapped = (value ?? '')
    .replace(INVISIBLE, '')
    .replace(DASHES, '-')
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(/\u2026/g, '...')
    .replace(SPACE_LIKE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < mapped.length; i++) {
    if (mapped.charCodeAt(i) > 0xff) throw new UnsupportedCharactersError(field);
  }
  return mapped;
}

function drawLogo(doc: PdfDoc, x: number, y: number, height: number) {
  const s = height / LOGO_HEIGHT;
  const paint = (path: string, color: RGB) => {
    const shape = parseLogoPath(path);
    doc.setFillColor(...color);
    doc.lines(shape.segments, x + shape.start[0] * s, y + shape.start[1] * s, [s, s], 'F', true);
  };
  paint(LOGO_NAVY_PATH, NAVY);
  paint(LOGO_GREEN_PATH, GREEN);
}

function withOpacity(doc: PdfDoc, opacity: number, draw: () => void) {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity, 'stroke-opacity': opacity }));
  draw();
  doc.restoreGraphicsState();
}

/** Shrinks the font until the text fits on one line (never below minSize). */
function fitFontSize(doc: PdfDoc, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
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

/**
 * jsPDF ignores letter-spacing when aligning text, which pushes centred or
 * right-aligned captions off position (or off the page). This measures the
 * spaced width itself and always draws left-aligned.
 */
function drawSpaced(
  doc: PdfDoc, text: string, x: number, y: number, charSpace: number,
  align: 'left' | 'center' | 'right' = 'left',
) {
  const visual = doc.getTextWidth(text) + charSpace * Math.max(text.length - 1, 0);
  const left = align === 'left' ? x : align === 'center' ? x - visual / 2 : x - visual;
  doc.text(text, left, y, { charSpace });
}

/**
 * Small caption + value. Long values shrink a little, then wrap onto extra
 * lines. They are never truncated: a certificate must show the full text.
 */
function labelValue(
  doc: PdfDoc, x: number, y: number, maxW: number, label: string, value: string,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  drawSpaced(doc, label, x, y, 0.9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  const size = fitFontSize(doc, value, maxW, 10.5, 8.5);
  doc.setFontSize(size);
  const lines: string[] = doc.getTextWidth(value) > maxW ? doc.splitTextToSize(value, maxW) : [value];
  if (lines.length > 3) throw new Error(`"${label}" is too long to fit on the certificate.`);
  const lineHeight = size * 0.3528 * 1.2;
  lines.forEach((line, i) => doc.text(line, x, y + 6.2 + i * lineHeight));
}

export function certificateFileName(data: Pick<CertificatePdfData, 'holderName' | 'courseTitle'>): string {
  const slug = (s: string) => s.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  const name = `EviroSafe-Certificate-${slug(data.holderName)}-${slug(data.courseTitle)}`.slice(0, 90);
  return `${name}.pdf`;
}

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

  // ── Page ────────────────────────────────────────────────────────────────
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── Right panel (navy) with the verification QR ─────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(PANEL_X, 0, PAGE_W - PANEL_X, PAGE_H, 'F');

  // Geometric accents, clipped to the panel.
  doc.saveGraphicsState();
  doc.rect(PANEL_X, 0, PAGE_W - PANEL_X, PAGE_H, null as any);
  (doc as any).clip();
  (doc as any).discardPath?.();
  withOpacity(doc, 0.10, () => {
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.5);
    doc.circle(PANEL_X + 4, 8, 44, 'S');
    doc.circle(PANEL_X + 4, 8, 60, 'S');
  });
  doc.setFillColor(...GREEN);
  doc.circle(PAGE_W + 2, PAGE_H + 2, 50, 'F');
  doc.setFillColor(...NAVY);
  doc.circle(PAGE_W + 2, PAGE_H + 2, 36, 'F');
  doc.restoreGraphicsState();

  const panelCx = PANEL_X + (PAGE_W - PANEL_X) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  drawSpaced(doc, 'VERIFY THIS CERTIFICATE', panelCx, 22, 1.2, 'center');

  const cardW = 66;
  const cardX = panelCx - cardW / 2;
  const cardY = 29;
  doc.setFillColor(...WHITE);
  doc.roundedRect(cardX, cardY, cardW, cardW, 4, 4, 'F');
  const qrSize = 50;
  drawQr(doc, data.verifyUrl, cardX + (cardW - qrSize) / 2, cardY + (cardW - qrSize) / 2, qrSize);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Scan with your phone camera', panelCx, cardY + cardW + 9, { align: 'center' });

  const visitText = data.verifyUrl.replace(/^https?:\/\//, '').replace(/\/[^/]+$/, '');
  doc.setFontSize(8);
  doc.setTextColor(...PANEL_TEXT);
  doc.text(`or visit ${visitText}`, panelCx, cardY + cardW + 15, { align: 'center', maxWidth: 76 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  drawSpaced(doc, 'VERIFICATION CODE', panelCx, cardY + cardW + 26, 0.9, 'center');
  doc.setFont('courier', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...WHITE);
  doc.text(formatVerificationCode(data.verificationCode), panelCx, cardY + cardW + 33, { align: 'center' });

  // ── Header: logo + wordmark, certificate number ─────────────────────────
  drawLogo(doc, MARGIN_X, 15, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text('EviroSafe', MARGIN_X + 14.5, 26.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  drawSpaced(doc, 'CERTIFICATE NO.', MAIN_RIGHT, 19, 0.9, 'right');
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(data.certificateNo, MAIN_RIGHT, 25.2, { align: 'right' });

  // ── Title block ─────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.roundedRect(MARGIN_X, 55, 14, 1.4, 0.7, 0.7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GREEN);
  drawSpaced(doc, 'CERTIFICATE OF COMPLETION', MARGIN_X, 66, 2.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...SLATE);
  doc.text('This is to certify that', MARGIN_X, 80);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const nameSize = fitFontSize(doc, holder, MAIN_W, 34, 14);
  doc.setFontSize(nameSize);
  if (doc.getTextWidth(holder) > MAIN_W) throw new Error('Holder name is too long to fit on the certificate.');
  doc.text(holder, MARGIN_X, 96);

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, 103, MAIN_RIGHT, 103);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...SLATE);
  doc.text('has successfully completed the training course', MARGIN_X, 115);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  // Shrink until the title fits on two lines. If even the smallest size needs
  // more, every word is still printed (never clipped) on extra lines.
  let courseSize = 21;
  let courseLines: string[] = [];
  for (const size of [21, 19, 17, 16, 15, 14, 13, 12]) {
    courseSize = size;
    doc.setFontSize(size);
    courseLines = doc.splitTextToSize(course, MAIN_W);
    if (courseLines.length <= 2) break;
  }
  if (courseLines.length > 5) throw new Error('Course title is too long to fit on the certificate.');
  const courseLineHeight = courseSize * 0.3528 * 1.25;
  courseLines.forEach((line, i) => doc.text(line, MARGIN_X, 127 + i * courseLineHeight));

  // ── Details row ─────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE);
  doc.line(MARGIN_X, 154, MAIN_RIGHT, 154);

  const lastLabel = trainer ? 'TRAINER' : result ? 'RESULT' : '';
  const lastValue = trainer || result;
  labelValue(doc, MARGIN_X, 162, 58, 'ISSUED BY', org);
  labelValue(doc, 80, 162, 34, 'DATE ISSUED', issued);
  labelValue(doc, 118, 162, 34, 'VALID UNTIL', expires);
  if (lastLabel) labelValue(doc, 156, 162, 34, lastLabel, lastValue);

  // ── Footer ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);
  const footer = doc.splitTextToSize(
    'Authenticity can be confirmed at any time by scanning the QR code or entering the verification code on the EviroSafe verification page. ' +
      'This certificate is valid only while its status shows as valid in EviroSafe records. Always confirm the holder\'s identity with photo ID.',
    MAIN_W,
  );
  doc.text(footer, MARGIN_X, 189);

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
