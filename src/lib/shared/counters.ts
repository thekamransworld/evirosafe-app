// Yearly numbering for every module: PTW-2026-0007, ACT-2026-0012, ...
// One counter document per (kind, organisation, year) in the `counters` collection. The number is
// made by READING the counter and WRITING it back +1 in the same transaction that creates the
// document; the Firestore rules refuse a create that does not bump the counter by exactly one.
//
// The ids stay exactly as the permit system already wrote them (ptw_<org>_<year>), so the live
// permit counters keep working.

export type CounterKind = 'ptw' | 'act';

/** Prefix printed in the number, per kind. The rules generator reads each module's COUNTER constant. */
export const COUNTER_PREFIX: Record<CounterKind, string> = { ptw: 'PTW', act: 'ACT' };

export function counterDocId(kind: CounterKind, orgId: string, year: number): string {
  return `${kind}_${orgId}_${year}`;
}

export function formatNumber(kind: CounterKind, year: number, n: number): string {
  return `${COUNTER_PREFIX[kind]}-${year}-${String(n).padStart(4, '0')}`;
}

export function parseNumber(kind: CounterKind, s: string): { year: number; n: number } | null {
  const m = new RegExp(`^${COUNTER_PREFIX[kind]}-(\\d{4})-(\\d{4,})$`).exec(String(s || '').trim().toUpperCase());
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
}

/** What a module declares so the rules generator can emit its counter rules. */
export interface CounterSpec { kind: CounterKind; prefix: string; roles: readonly string[] }
