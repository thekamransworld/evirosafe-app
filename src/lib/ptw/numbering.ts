// Permit numbers: PTW-YYYY-NNNN, one counter per organisation per year (shared numbering code: src/lib/shared/counters.ts).

import { counterDocId as sharedCounterDocId, formatNumber, parseNumber } from '../shared/counters';

export function counterDocId(orgId: string, year: number): string {
  return sharedCounterDocId('ptw', orgId, year);
}

export function formatPermitNo(year: number, n: number): string {
  return formatNumber('ptw', year, n);
}

export function parsePermitNo(s: string): { year: number; n: number } | null {
  return parseNumber('ptw', s);
}
