// Simultaneous-operations (SIMOPS) conflict detection.
//
// Old behaviour this replaces: the check was optional, only looked at
// ACTIVE permits, matched by raw substring, ignored time entirely, and an
// empty location matched everything.

import { OCCUPYING_STAGES, normalizeStage } from './model';
import { effectiveStatus, requestedWindow, validFromMs, validUntilMs, type Window } from './validity';

export interface SimopsPermit {
  id: string;
  project_id?: string;
  type?: string;
  title?: string;
  status?: string;
  permit_no?: string;
  valid_from?: string;
  valid_until?: string;
  valid_from_ts?: unknown;
  valid_until_ts?: unknown;
  first_activated_ts?: unknown;
  payload?: any;
}

const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Do two free-text locations refer to the same area?
 * exact, one contains the other (on word boundaries), or >= 60% of the
 * shorter one's words appear in the other. An empty location never matches:
 * "unknown" is not "everywhere".
 */
export function sameArea(a: unknown, b: unknown): boolean {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 3 && ` ${long} `.includes(` ${short} `)) return true;
  const ts = new Set(short.split(' ')), tl = new Set(long.split(' '));
  let hit = 0;
  ts.forEach(t => { if (tl.has(t)) hit++; });
  return hit / Math.min(ts.size, tl.size) >= 0.6;
}

/** Half-open overlap, so it also catches one window fully enclosing another. */
export function windowsOverlap(a: Window, b: Window): boolean {
  return a.start < b.end && b.start < a.end;
}

const BLOCKING_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Hot Work', 'Confined Space Entry'],
  ['Hot Work', 'Chemical Handling'],
  ['Hot Work', 'Excavation'],
  ['Lifting', 'Work at Height'],
  ['Lifting', 'Confined Space Entry'],
  ['Electrical Work', 'Confined Space Entry'],
];

export function isBlockingPair(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return BLOCKING_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** The time a permit occupies: its granted validity if it has one, else what was requested. */
export function permitWindow(p: SimopsPermit): Window | null {
  const s = validFromMs(p), e = validUntilMs(p);
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) return { start: s, end: e };
  return requestedWindow(p.payload);
}

export interface SimopsConflict {
  other_id: string;
  other_no?: string;
  other_type?: string;
  other_title?: string;
  location: string;
  severity: 'block' | 'warn';
  reason: string;
}

export function findConflicts(permit: SimopsPermit, others: SimopsPermit[], now: number): SimopsConflict[] {
  const mine = permitWindow(permit);
  const loc = permit.payload?.work?.location;
  const out: SimopsConflict[] = [];
  for (const o of others) {
    if (o.id === permit.id) continue;
    if (!permit.project_id || !o.project_id || o.project_id !== permit.project_id) continue;
    const stage = normalizeStage(o.status);
    if (!stage || !(OCCUPYING_STAGES as readonly string[]).includes(stage)) continue;
    const eff = effectiveStatus(o, now) ?? stage;
    const oloc = o.payload?.work?.location;
    if (!sameArea(loc, oloc)) continue;

    // The area is not free until the permit is CLOSED, not when its clock runs out:
    // people may still be inside, or isolation still applied. So an expired permit,
    // one waiting to be closed, or one on hold past its window, occupies the area
    // open-endedly until someone closes or cancels it.
    let theirs = permitWindow(o);
    if (theirs) {
      const open = eff === 'EXPIRED' || eff === 'COMPLETION_PENDING' || (eff === 'HOLD' && theirs.end < now);
      if (open) theirs = { start: theirs.start, end: Infinity };
    }
    // Unknown window on either side: assume overlap (the safe direction).
    if (mine && theirs && !windowsOverlap(mine, theirs)) continue;

    const blocking = isBlockingPair(permit.type, o.type);
    const ref = o.permit_no || o.title || o.id;
    out.push({
      other_id: o.id,
      other_no: o.permit_no,
      other_type: o.type,
      other_title: o.title,
      location: String(oloc ?? ''),
      severity: blocking ? 'block' : 'warn',
      reason: blocking
        ? `${o.type} permit ${ref} (${eff}) overlaps this ${permit.type} permit in the same area. These work types must not run together.`
        : `${o.type} permit ${ref} (${eff}) is working in the same area at an overlapping time. Coordinate before starting.`,
    });
  }
  return out;
}
