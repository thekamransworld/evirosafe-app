// Dates, overdue and summaries for actions. Pure. Overdue is COMPUTED from the due date and today's date, never
// stored: a stored flag is wrong the moment midnight passes.

import { STAGES, type Stage } from './model';

const pad = (n: number) => String(n).padStart(2, '0');

/** The calendar date of a moment in the reader's own time zone, as YYYY-MM-DD. */
export function ymd(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD plus a number of days (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Whole days from `today` to `due`: negative when overdue. */
export function daysUntil(due: string, today: string): number {
  const a = due.split('-').map(Number), b = today.split('-').map(Number);
  return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 86_400_000);
}

/** Still on the owner: open or in progress, and the due date has passed. */
export function isOverdue(a: { status: string; due_date: string }, today: string): boolean {
  return (a.status === 'OPEN' || a.status === 'IN_PROGRESS') && typeof a.due_date === 'string' && a.due_date.length > 0 && a.due_date < today;
}

/** A Firestore Timestamp, a number, an ISO string or {seconds}: milliseconds, or NaN. */
export function toMillis(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Date.parse(v);
  const o = v as { toMillis?: () => number; seconds?: number } | null | undefined;
  if (o && typeof o.toMillis === 'function') return o.toMillis();
  if (o && typeof o.seconds === 'number') return o.seconds * 1000;
  return NaN;
}

/** When the action was verified and closed (the signed record, or, for imported ones, the old record). */
export function closedAtMs(a: { status: string; verification?: { at?: unknown }; legacy?: Record<string, unknown>; stage_times?: Record<string, unknown> }): number {
  if (a.status !== 'CLOSED') return NaN;
  const candidates = [a.verification?.at, a.legacy?.verified_at, a.legacy?.completed_at, a.legacy?.closed_at, a.stage_times?.CLOSED];
  for (const c of candidates) {
    const ms = toMillis(c);
    if (Number.isFinite(ms)) return ms;
  }
  return NaN;
}

/** Closed no later than the end of its due date (local). False when the close time is not known. */
export function closedOnTime(a: Parameters<typeof closedAtMs>[0] & { due_date: string }): boolean {
  const ms = closedAtMs(a);
  return Number.isFinite(ms) && ymd(ms) <= a.due_date;
}

export interface ActionSummary {
  total: number;
  byStage: Record<Stage, number>;
  /** Open or in progress. */
  live: number;
  overdue: number;
  /** Closed no later than their due date. */
  closedOnTime: number;
  closed: number;
}

export function summarize(list: Array<Parameters<typeof closedAtMs>[0] & { due_date: string }>, today: string): ActionSummary {
  const byStage = Object.fromEntries(STAGES.map(s => [s, 0])) as Record<Stage, number>;
  let overdue = 0, onTime = 0;
  for (const a of list) {
    if ((STAGES as readonly string[]).includes(a.status)) byStage[a.status as Stage]++;
    if (isOverdue(a, today)) overdue++;
    if (a.status === 'CLOSED' && closedOnTime(a)) onTime++;
  }
  return { total: list.length, byStage, live: byStage.OPEN + byStage.IN_PROGRESS, overdue, closedOnTime: onTime, closed: byStage.CLOSED };
}
