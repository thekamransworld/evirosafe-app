// Shared building blocks for the generated PDFs (certificate, competency
// record): brand colours, safe text handling, the vector logo, and a few
// ornaments. Everything is drawn as vector shapes with the built-in fonts.

import {
  BRAND_GREEN,
  BRAND_NAVY,
  LOGO_GREEN_PATH,
  LOGO_HEIGHT,
  LOGO_NAVY_PATH,
  parseLogoPath,
} from './brandLogo';

export type JsPdfCtor = typeof import('jspdf').jsPDF;
export type PdfDoc = InstanceType<JsPdfCtor>;
export type RGB = [number, number, number];

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

export const NAVY = hex(BRAND_NAVY);
export const GREEN = hex(BRAND_GREEN);
export const GOLD: RGB = [166, 130, 66];
export const GOLD_LIGHT: RGB = [212, 188, 138];
export const INK: RGB = [17, 24, 39];
export const SLATE: RGB = [71, 85, 105];
export const MUTED: RGB = [113, 123, 140];
export const PATTERN: RGB = [221, 227, 240];
export const PAPER: RGB = [253, 252, 249];
export const WHITE: RGB = [255, 255, 255];


// Typographic characters that commonly arrive via copy/paste from Word or the
// web. They have plain-ASCII equivalents, so they're normalised instead of
// being treated as "unsupported script".
const DASHES = /[\u2010-\u2015\u2212]/g;
const SINGLE_QUOTES = /[\u2018\u2019\u201A\u2032]/g;
const DOUBLE_QUOTES = /[\u201C\u201D\u201E\u2033]/g;
const SPACE_LIKE = /[\u00A0\u2009\u202F]/g;
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

export function toPdfText(value: string, field: string): string {
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

// ─── Drawing primitives ───────────────────────────────────────────────────

export function drawLogo(doc: PdfDoc, x: number, y: number, height: number) {
  const s = height / LOGO_HEIGHT;
  const paint = (path: string, color: RGB) => {
    const shape = parseLogoPath(path);
    doc.setFillColor(...color);
    doc.lines(shape.segments, x + shape.start[0] * s, y + shape.start[1] * s, [s, s], 'F', true);
  };
  paint(LOGO_NAVY_PATH, NAVY);
  paint(LOGO_GREEN_PATH, GREEN);
}

/** Stroke a polyline given absolute points. */
export function polyline(doc: PdfDoc, pts: [number, number][], closed = false) {
  if (pts.length < 2) return;
  const segs: number[][] = [];
  for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'S', closed);
}

export function diamond(doc: PdfDoc, cx: number, cy: number, r: number, color: RGB) {
  doc.setFillColor(...color);
  doc.lines([[r, r], [-r, r], [-r, -r]], cx, cy - r, [1, 1], 'F', true);
}

/** Short rule with a diamond in the middle, used under headings. */
export function flourish(doc: PdfDoc, cx: number, y: number, halfWidth: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.line(cx - halfWidth, y, cx - 4.2, y);
  doc.line(cx + 4.2, y, cx + halfWidth, y);
  diamond(doc, cx, y, 1.5, GOLD);
  diamond(doc, cx - 5.6, y, 0.55, GOLD);
  diamond(doc, cx + 5.6, y, 0.55, GOLD);
}

/**
 * jsPDF ignores letter-spacing when aligning text, which pushes centred or
 * right-aligned captions off position. This measures the spaced width itself
 * and always draws left-aligned.
 */
export function drawSpaced(
  doc: PdfDoc, text: string, x: number, y: number, charSpace: number,
  align: 'left' | 'center' | 'right' = 'left',
) {
  const visual = doc.getTextWidth(text) + charSpace * Math.max(text.length - 1, 0);
  const left = align === 'left' ? x : align === 'center' ? x - visual / 2 : x - visual;
  doc.text(text, left, y, { charSpace });
}

/** Shrinks the font until the text fits on one line (never below minSize). */
export function fitFontSize(doc: PdfDoc, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}


/**
 * The issuer's name, centred. Shrinks and tightens the tracking first, then
 * splits into two balanced lines. Never clipped; throws if it still can't fit.
 * `baselineY` is the baseline of a single line (two lines straddle it).
 */
export function drawIssuer(doc: PdfDoc, org: string, cx: number, baselineY: number, maxWidth: number) {
  doc.setFont('times', 'bold');
  doc.setTextColor(...NAVY);
  const upper = org.toUpperCase();
  let lines = [upper];
  let size = 15;
  let space = 3;
  const widthOf = (t: string) => {
    doc.setFontSize(size);
    return doc.getTextWidth(t) + space * Math.max(t.length - 1, 0);
  };
  const fits = () => lines.every(l => widthOf(l) <= maxWidth);
  while (!fits() && size > 11) {
    size -= 0.5;
    space = Math.max(1.4, space - 0.15);
  }
  if (!fits()) {
    const words = upper.split(' ');
    let best: string[] | null = null;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      if (Math.abs(a.length - b.length) < bestDiff) {
        bestDiff = Math.abs(a.length - b.length);
        best = [a, b];
      }
    }
    lines = best ?? [upper];
    size = 12.5;
    space = 2.2;
    if (!fits()) throw new Error('Organisation name is too long to fit on the certificate.');
  }
  doc.setFontSize(size);
  if (lines.length === 1) drawSpaced(doc, lines[0], cx, baselineY, space, 'center');
  else {
    drawSpaced(doc, lines[0], cx, baselineY - 3.4, space, 'center');
    drawSpaced(doc, lines[1], cx, baselineY + 3, space, 'center');
  }
}
