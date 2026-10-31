// Vector geometry of the EviroSafe mark - identical to public/logo.svg.
// Kept as data here so PDFs can draw the logo as crisp vector shapes instead
// of a blurry raster. If public/logo.svg ever changes, regenerate these.

export const LOGO_WIDTH = 445;
export const LOGO_HEIGHT = 540;
export const BRAND_NAVY = '#1E2761';
export const BRAND_GREEN = '#18B07F';

export const LOGO_NAVY_PATH =
  'M76.7 441.0C35.6 398.7 13.5 355.2 9.0 307.5C7.4 290.0 7.7 97.0 9.4 89.9C11.7 79.7 18.0 71.6 26.8 67.1C28.8 66.1 38.6 62.7 48.5 59.5C66.2 54.0 103.4 42.1 168.0 21.4C219.1 5.0 222.6 4.4 242.0 10.5C309.2 31.5 411.9 64.7 416.7 67.1C424.0 70.7 429.2 76.1 432.9 83.9L435.5 89.5L435.5 134.0C435.5 184.5 435.5 184.3 427.0 195.7C413.2 213.9 389.7 222.6 322.9 234.0C244.6 247.4 204.8 262.7 168.3 293.3C127.2 327.8 100.0 384.3 93.4 448.4C93.0 452.0 92.4 455.3 92.0 455.5C91.6 455.8 84.7 449.3 76.7 441.0Z';

export const LOGO_GREEN_PATH =
  'M211.7 532.4C200.7 529.4 165.4 510.3 142.1 494.8C133.0 488.8 130.2 486.0 133.2 486.0C134.0 486.0 140.2 483.7 147.1 481.0C227.0 448.7 298.5 395.4 347.1 332.0C357.9 317.9 357.7 317.7 344.9 330.1C306.0 367.8 253.8 403.6 197.5 431.0C179.0 440.0 170.4 444.0 169.5 444.0C169.3 444.0 166.5 445.2 163.3 446.6C154.0 450.9 125.6 461.1 119.2 462.5L116.0 463.2L116.0 457.2C116.0 451.4 116.3 449.6 119.6 431.5C135.2 346.5 181.0 294.6 260.8 271.6C282.4 265.4 299.1 261.9 335.0 256.0C385.5 247.8 417.3 236.7 432.7 222.1C433.9 220.9 435.2 220.0 435.5 220.0C436.8 220.0 435.9 306.6 434.5 316.0C431.8 334.5 429.3 344.3 423.2 359.5C397.9 423.1 336.7 481.5 250.5 524.6C231.7 533.9 223.4 535.6 211.7 532.4Z';

export interface PdfPathShape {
  /** Absolute start point in logo units. */
  start: [number, number];
  /** Segments in the relative form jsPDF's doc.lines() expects. */
  segments: number[][];
}

/**
 * Converts an absolute-coordinate path made of M / L / C / Z commands (all this
 * logo needs) into jsPDF doc.lines() segments, which are relative to the
 * previous point. Throws on any other command so a future logo that uses
 * arcs or relative commands fails loudly instead of drawing garbage.
 */
export function parseLogoPath(d: string): PdfPathShape {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let start: [number, number] | null = null;
  const segments: number[][] = [];
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      cx = num();
      cy = num();
      if (start === null) start = [cx, cy];
    } else if (cmd === 'L') {
      const x = num();
      const y = num();
      segments.push([x - cx, y - cy]);
      cx = x;
      cy = y;
    } else if (cmd === 'C') {
      const x1 = num();
      const y1 = num();
      const x2 = num();
      const y2 = num();
      const x = num();
      const y = num();
      segments.push([x1 - cx, y1 - cy, x2 - cx, y2 - cy, x - cx, y - cy]);
      cx = x;
      cy = y;
    } else if (cmd === 'Z') {
      // closed by the `closed` flag when drawing
    } else {
      throw new Error(`Unsupported SVG path command "${cmd}" in logo`);
    }
  }
  if (!start) throw new Error('Logo path has no start point');
  return { start, segments };
}
