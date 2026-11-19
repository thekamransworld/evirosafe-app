// Gas-test evaluation. The LATEST complete test decides; incomplete rows are
// ignored so a half-typed row can never mask a failing reading or fake a pass.

export interface GasLimits { o2Min: number; o2Max: number; lelMax: number; h2sMax: number; coMax: number }

// DEFAULTS: confirm against the client's procedure.
export const DEFAULT_GAS_LIMITS: GasLimits = { o2Min: 19.5, o2Max: 23.5, lelMax: 10, h2sMax: 10, coMax: 25 };

export interface GasRow {
  time?: string;
  o2?: number | string | null;
  lel?: number | string | null;
  co?: number | string | null;
  h2s?: number | string | null;
  tester_name?: string;
}

function num(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** HH:mm (today, rolling back a day if that would be in the future) or an ISO string. */
export function parseTestTime(time: string | undefined, now: number): number | null {
  const s = String(time ?? '').trim();
  if (!s) return null;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (hm) {
    const h = Number(hm[1]), m = Number(hm[2]);
    if (h > 23 || m > 59) return null;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    let t = d.getTime();
    // A test "at 23:50" read at 00:10 happened yesterday. Allow 5 minutes of clock slack.
    if (t > now + 5 * 60_000) t -= 24 * 60 * 60_000;
    return t;
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

export function isCompleteRow(r: GasRow, now: number): boolean {
  return (
    parseTestTime(r.time, now) !== null &&
    num(r.o2) !== null && num(r.lel) !== null && num(r.co) !== null && num(r.h2s) !== null &&
    String(r.tester_name ?? '').trim().length > 0
  );
}

export function evaluateGasReading(r: GasRow, limits: GasLimits = DEFAULT_GAS_LIMITS): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const o2 = num(r.o2), lel = num(r.lel), co = num(r.co), h2s = num(r.h2s);
  if (o2 === null || lel === null || co === null || h2s === null) {
    return { pass: false, failures: ['Reading is incomplete.'] };
  }
  if (o2 < limits.o2Min || o2 > limits.o2Max) failures.push(`O₂ ${o2}% outside ${limits.o2Min}–${limits.o2Max}%`);
  if (lel > limits.lelMax) failures.push(`LEL ${lel}% above ${limits.lelMax}%`);
  if (h2s > limits.h2sMax) failures.push(`H₂S ${h2s} ppm above ${limits.h2sMax}`);
  if (co > limits.coMax) failures.push(`CO ${co} ppm above ${limits.coMax}`);
  return { pass: failures.length === 0, failures };
}

export type GasStatus =
  | { status: 'none' }
  | { status: 'stale'; ageMin: number }
  | { status: 'fail'; ageMin: number; failures: string[] }
  | { status: 'pass'; ageMin: number };

export function gasTestStatus(
  rows: GasRow[] | undefined,
  now: number,
  maxAgeMin: number,
  limits: GasLimits = DEFAULT_GAS_LIMITS,
): GasStatus {
  const complete = (rows ?? [])
    .filter(r => isCompleteRow(r, now))
    .map(r => ({ r, t: parseTestTime(r.time, now) as number }))
    .sort((a, b) => a.t - b.t);
  if (complete.length === 0) return { status: 'none' };
  const latest = complete[complete.length - 1];
  const ageMin = Math.max(0, Math.round((now - latest.t) / 60_000));
  // A failing latest reading always wins, however old: it must be re-tested.
  const ev = evaluateGasReading(latest.r, limits);
  if (!ev.pass) return { status: 'fail', ageMin, failures: ev.failures };
  if (ageMin > maxAgeMin) return { status: 'stale', ageMin };
  return { status: 'pass', ageMin };
}
