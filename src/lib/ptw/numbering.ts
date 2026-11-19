// Permit numbers: PTW-YYYY-NNNN, one counter per organisation per year.

export function counterDocId(orgId: string, year: number): string {
  return `ptw_${orgId}_${year}`;
}

export function formatPermitNo(year: number, n: number): string {
  return `PTW-${year}-${String(n).padStart(4, '0')}`;
}

export function parsePermitNo(s: string): { year: number; n: number } | null {
  const m = /^PTW-(\d{4})-(\d{4,})$/.exec(String(s || '').trim().toUpperCase());
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
}
