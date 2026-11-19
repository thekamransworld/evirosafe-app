// Time logic for permits. Pure: every function takes `now` explicitly.

import { MAX_TOTAL_DAYS, normalizeStage, typeRule, type Stage } from './model';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** 'YYYY-MM-DD' + 'HH:mm' in the device's local time zone → epoch ms (NaN if invalid). */
export function parseLocal(date: string | undefined, time: string | undefined): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? '').trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? '').trim());
  if (!d || !t) return NaN;
  const [y, mo, da] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [h, mi] = [Number(t[1]), Number(t[2])];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return NaN;
  const out = new Date(y, mo - 1, da, h, mi, 0, 0);
  // Reject roll-overs such as 31 February.
  if (out.getMonth() !== mo - 1 || out.getDate() !== da) return NaN;
  return out.getTime();
}

export interface Window { start: number; end: number }

/** The window the requester asked for, or null if missing / unparseable / end <= start. */
export function requestedWindow(payload: any): Window | null {
  const c = payload?.work?.coverage;
  if (!c) return null;
  const start = parseLocal(c.start_date, c.start_time);
  const end = parseLocal(c.end_date, c.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

interface PermitTimes {
  status?: string;
  type?: string;
  valid_from?: string;
  valid_until?: string;
  first_activated_at?: string;
  /** Server-stamped twins. When present they are authoritative; the ISO strings are display only. */
  valid_from_ts?: unknown;
  valid_until_ts?: unknown;
  first_activated_ts?: unknown;
  payload?: any;
}

/** epoch ms from a Firestore Timestamp, Date, ISO string or number; NaN if unusable. */
export function msOf(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : NaN; }
  if (v instanceof Date) return v.getTime();
  const o = v as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  if (typeof o.seconds === 'number') return o.seconds * 1000 + Math.floor((o.nanoseconds ?? 0) / 1e6);
  return NaN;
}

const pick = (ts: unknown, iso: unknown) => { const a = msOf(ts); return Number.isFinite(a) ? a : msOf(iso); };
export const validUntilMs = (p: PermitTimes) => pick(p.valid_until_ts, p.valid_until);
export const validFromMs = (p: PermitTimes) => pick(p.valid_from_ts, p.valid_from);
export const firstActivatedMs = (p: PermitTimes) => pick(p.first_activated_ts, p.first_activated_at);

/**
 * The stage to SHOW. A stored ACTIVE permit whose valid_until has passed
 * reads as EXPIRED even before anything has written that to the database.
 */
export function effectiveStatus(p: PermitTimes, now: number): Stage | null {
  const stage = normalizeStage(p.status);
  if (stage === 'ACTIVE') {
    const until = validUntilMs(p);
    if (Number.isFinite(until) && now > until) return 'EXPIRED';
  }
  return stage;
}

/** Milliseconds left on an ACTIVE permit; null when not applicable. Negative = overdue. */
export function remainingMs(p: PermitTimes, now: number): number | null {
  if (normalizeStage(p.status) !== 'ACTIVE') return null;
  const until = validUntilMs(p);
  return Number.isFinite(until) ? until - now : null;
}

export function formatRemaining(msLeft: number | null): string {
  if (msLeft === null) return '';
  const abs = Math.abs(msLeft);
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / MIN);
  const body = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  return msLeft < 0 ? `expired ${body} ago` : `${body} left`;
}

export type WindowResult =
  | { ok: true; from: number; until: number; cappedByType: boolean }
  | { ok: false; reason: string };

/**
 * Validity granted at handover: from now until the EARLIER of the type's
 * maximum duration and the end the requester asked for.
 */
export function activationWindow(p: PermitTimes, now: number): WindowResult {
  const rule = typeRule(p.type);
  if (!rule) return { ok: false, reason: `Unknown permit type "${p.type}".` };
  const req = requestedWindow(p.payload);
  if (!req) return { ok: false, reason: 'The requested start and end time are missing or invalid.' };
  if (req.end <= now) return { ok: false, reason: 'The requested end time has already passed. Send the permit back and set a new window.' };
  const typeMax = now + rule.maxHours * HOUR;
  const until = Math.min(typeMax, req.end);
  return { ok: true, from: now, until, cappedByType: typeMax < req.end };
}

/**
 * Revalidation: at most the type maximum from now, and never beyond 7 days
 * from first activation. Not allowed once the permit has already expired.
 */
export function revalidationWindow(p: PermitTimes, now: number): WindowResult {
  const rule = typeRule(p.type);
  if (!rule) return { ok: false, reason: `Unknown permit type "${p.type}".` };
  const first = Number.isFinite(firstActivatedMs(p)) ? firstActivatedMs(p) : validFromMs(p);
  if (!Number.isFinite(first)) return { ok: false, reason: 'This permit has no recorded activation time.' };
  const currentUntil = validUntilMs(p);
  if (Number.isFinite(currentUntil) && now > currentUntil) {
    return { ok: false, reason: 'The permit has already expired. It cannot be extended: request completion or cancel it and raise a new permit.' };
  }
  const hardStop = first + MAX_TOTAL_DAYS * DAY;
  if (now >= hardStop) return { ok: false, reason: `A permit cannot run longer than ${MAX_TOTAL_DAYS} days in total. Close it and raise a new one.` };
  const typeMax = now + rule.maxHours * HOUR;
  const until = Math.min(typeMax, hardStop);
  if (Number.isFinite(currentUntil) && until <= currentUntil) {
    return { ok: false, reason: 'Revalidating would not extend the permit any further.' };
  }
  return { ok: true, from: now, until, cappedByType: typeMax < hardStop };
}
