/**
 * FILE: src/lib/kpiCalculations.ts
 *
 * ── HSE KPI Calculation Engine ────────────────────────────────────────────────
 * Pure functions for computing all standard HSE key performance indicators.
 * No React dependencies — can be used in Cloud Functions for scheduled snapshots.
 *
 * Standards referenced:
 *   • ISO 45001:2018  — OHS Management Systems
 *   • OSHA 300 Log    — Recordable injury/illness tracking
 *   • RIDDOR (UK)     — Reporting of Injuries, Diseases and Dangerous Occurrences
 *   • Safe Work Australia — LTIFR/TRIFR methodology
 *
 * All rate-based KPIs use 1,000,000 exposure hours as the standard denominator
 * (Safe Work Australia / ISO convention). OSHA uses 200,000 hours — a converter
 * is provided at the bottom of this file.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { Report } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KpiSnapshot {
  /** Period this snapshot covers */
  period: { from: string; to: string };

  /** Exposure data */
  totalWorkers: number;
  totalManHours: number;

  /** Incident counts */
  fatalities: number;
  lostTimeInjuries: number;              // LTI
  restrictedWorkCases: number;           // RWC
  medicalTreatmentCases: number;         // MTC
  firstAidCases: number;                 // FAC
  nearMisses: number;
  unsafeActs: number;
  unsafeConditions: number;
  propertyDamage: number;
  environmentalIncidents: number;
  totalRecordableIncidents: number;      // TRI = LTI + RWC + MTC

  /** Lost days */
  totalLostDays: number;
  totalRestrictedDays: number;

  /** Rates (per 1,000,000 exposure hours unless noted) */
  ltifr: number;    // Lost Time Injury Frequency Rate
  trifr: number;    // Total Recordable Injury Frequency Rate
  nmfr: number;     // Near-Miss Frequency Rate
  sr: number;       // Severity Rate (lost days per 1,000,000 hrs)
  mtcr: number;     // Medical Treatment Case Rate
  fafr: number;     // Fatal Accident Frequency Rate
  aifr: number;     // All Injury Frequency Rate (includes FAC)
  dar: number;       // Days Away Rate (OSHA: per 200,000 hrs)

  /** Leading indicators */
  toolboxTalksHeld: number;
  inspectionsCompleted: number;
  actionsOverdue: number;
  actionsOnTime: number;
  actionCompletionRate: number;          // %
  trainingComplianceRate: number;        // %
  safeObservations: number;

  /** Trend vs previous period */
  trends: {
    ltifr:  TrendDirection;
    trifr:  TrendDirection;
    nmfr:   TrendDirection;
    sr:     TrendDirection;
  };
}

export type TrendDirection = 'up' | 'down' | 'flat';
export type IncidentSeverity = 'Fatality' | 'LTI' | 'RWC' | 'MTC' | 'FAC' | 'Near Miss' | 'Unsafe Act' | 'Unsafe Condition' | 'Property Damage' | 'Environmental';

export interface KpiInputs {
  reports: Report[];
  totalManHours: number;
  totalWorkers: number;
  period: { from: Date; to: Date };
  /** Previous period snapshot for trend calculation */
  previousSnapshot?: Partial<KpiSnapshot>;
  /** Leading indicator counts (from other modules) */
  leading?: {
    toolboxTalksHeld?: number;
    inspectionsCompleted?: number;
    actionsOverdue?: number;
    actionsOnTime?: number;
    trainingComplianceRate?: number;
    safeObservations?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Standard denominators */
export const EXPOSURE_BASE_ISO    = 1_000_000; // Safe Work Australia / ISO
export const EXPOSURE_BASE_OSHA   = 200_000;   // OSHA 300 standard

/** Severity type → classification mapping */
const LTI_TYPES   = new Set(['LTI', 'Fatality', 'Fatal', 'Lost Time Injury']);
const RWC_TYPES   = new Set(['RWC', 'Restricted Work', 'Restricted Work Case']);
const MTC_TYPES   = new Set(['MTC', 'Medical Treatment', 'Medical Treatment Case', 'First Aid']);
const FAC_TYPES   = new Set(['FAC', 'First Aid', 'First Aid Case']);
const NM_TYPES    = new Set(['Near Miss', 'Near-Miss', 'Near Miss Incident']);
const UA_TYPES    = new Set(['Unsafe Act', 'Unsafe Behavior', 'Behavioural']);
const UC_TYPES    = new Set(['Unsafe Condition', 'Hazard', 'Condition']);
const PD_TYPES    = new Set(['Property Damage', 'Equipment Damage', 'Material Damage']);
const ENV_TYPES   = new Set(['Environmental', 'Spill', 'Pollution', 'Environmental Incident']);

// ─────────────────────────────────────────────────────────────────────────────
// Classification helpers
// ─────────────────────────────────────────────────────────────────────────────

function classify(type: string): {
  isLTI: boolean; isRWC: boolean; isMTC: boolean; isFAC: boolean;
  isNM: boolean;  isUA: boolean;  isUC: boolean;  isPD: boolean; isEnv: boolean;
  isFatal: boolean;
} {
  const t = type?.trim() ?? '';
  return {
    isFatal: t === 'Fatality' || t === 'Fatal',
    isLTI:   LTI_TYPES.has(t),
    isRWC:   RWC_TYPES.has(t),
    isMTC:   MTC_TYPES.has(t) && !FAC_TYPES.has(t),
    isFAC:   FAC_TYPES.has(t),
    isNM:    NM_TYPES.has(t),
    isUA:    UA_TYPES.has(t),
    isUC:    UC_TYPES.has(t),
    isPD:    PD_TYPES.has(t),
    isEnv:   ENV_TYPES.has(t),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core rate formula
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard HSE rate formula:
 *   rate = (count × base) / manHours
 *
 * Returns 0 if manHours is 0 to avoid division by zero.
 * Result is rounded to 2 decimal places.
 */
export function calcRate(
  count: number,
  manHours: number,
  base: number = EXPOSURE_BASE_ISO,
): number {
  if (!manHours || manHours <= 0) return 0;
  return Math.round(((count * base) / manHours) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual KPI functions (exported for use in widgets/charts)
// ─────────────────────────────────────────────────────────────────────────────

/** Lost Time Injury Frequency Rate (per 1,000,000 exposure hours) */
export function calcLTIFR(ltiCount: number, manHours: number): number {
  return calcRate(ltiCount, manHours);
}

/** Total Recordable Injury Frequency Rate */
export function calcTRIFR(triCount: number, manHours: number): number {
  return calcRate(triCount, manHours);
}

/** Near-Miss Frequency Rate */
export function calcNMFR(nmCount: number, manHours: number): number {
  return calcRate(nmCount, manHours);
}

/**
 * Severity Rate — measures the seriousness of injuries.
 * SR = (total lost days × 1,000,000) / man-hours
 */
export function calcSeverityRate(lostDays: number, manHours: number): number {
  return calcRate(lostDays, manHours);
}

/** Fatal Accident Frequency Rate */
export function calcFAFR(fatalCount: number, manHours: number): number {
  return calcRate(fatalCount, manHours);
}

/**
 * OSHA Dart Rate (Days Away, Restricted or Transferred)
 * Uses OSHA base of 200,000 hours.
 */
export function calcDART(
  ltiCount: number,
  rwcCount: number,
  manHours: number,
): number {
  return calcRate(ltiCount + rwcCount, manHours, EXPOSURE_BASE_OSHA);
}

/** Action completion rate as a percentage */
export function calcActionCompletionRate(
  onTime: number,
  overdue: number,
): number {
  const total = onTime + overdue;
  if (total === 0) return 100;
  return Math.round((onTime / total) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Trend helper
// ─────────────────────────────────────────────────────────────────────────────

function trend(current: number, previous: number | undefined): TrendDirection {
  if (previous === undefined || previous === null) return 'flat';
  if (current > previous + 0.01) return 'up';
  if (current < previous - 0.01) return 'down';
  return 'flat';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main snapshot calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a full KPI snapshot from raw incident reports and exposure data.
 *
 * @example
 * const snapshot = calculateKpiSnapshot({
 *   reports: reportList,
 *   totalManHours: 450000,
 *   totalWorkers: 220,
 *   period: { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
 *   previousSnapshot: lastYearSnapshot,
 *   leading: { toolboxTalksHeld: 48, inspectionsCompleted: 12, actionsOverdue: 3, actionsOnTime: 27 }
 * });
 */
export function calculateKpiSnapshot(inputs: KpiInputs): KpiSnapshot {
  const {
    reports,
    totalManHours,
    totalWorkers,
    period,
    previousSnapshot,
    leading = {},
  } = inputs;

  // Filter reports to the specified period
  const fromMs = period.from.getTime();
  const toMs   = period.to.getTime();

  const periodReports = reports.filter((r) => {
    const d = new Date(r.occurred_at || r.created_at || '').getTime();
    return d >= fromMs && d <= toMs;
  });

  // ── Count by type ─────────────────────────────────────────────────────────
  let fatalities = 0, ltis = 0, rwcs = 0, mtcs = 0, facs = 0;
  let nearMisses = 0, unsafeActs = 0, unsafeConds = 0, propDamage = 0, envInc = 0;
  let totalLostDays = 0, totalRestrictedDays = 0;

  for (const r of periodReports) {
    const c = classify(r.type ?? r.type ?? '');

    if (c.isFatal)  { fatalities++;  ltis++; }
    else if (c.isLTI)  ltis++;
    else if (c.isRWC)  rwcs++;
    else if (c.isMTC)  mtcs++;
    else if (c.isFAC)  facs++;

    if (c.isNM)  nearMisses++;
    if (c.isUA)  unsafeActs++;
    if (c.isUC)  unsafeConds++;
    if (c.isPD)  propDamage++;
    if (c.isEnv) envInc++;

    totalLostDays        += Number((r.details as any)?.days_lost ?? 0);
    totalRestrictedDays  += 0;
  }

  const tri = ltis + rwcs + mtcs; // Total Recordable Incidents

  // ── Rates ─────────────────────────────────────────────────────────────────
  const ltifr = calcLTIFR(ltis, totalManHours);
  const trifr = calcTRIFR(tri, totalManHours);
  const nmfr  = calcNMFR(nearMisses, totalManHours);
  const sr    = calcSeverityRate(totalLostDays, totalManHours);
  const mtcr  = calcRate(mtcs, totalManHours);
  const fafr  = calcFAFR(fatalities, totalManHours);
  const aifr  = calcRate(ltis + rwcs + mtcs + facs, totalManHours);
  const dar   = calcDART(ltis, rwcs, totalManHours);

  // ── Leading indicators ────────────────────────────────────────────────────
  const actionsOnTime  = leading.actionsOnTime  ?? 0;
  const actionsOverdue = leading.actionsOverdue ?? 0;
  const actionCompletionRate = calcActionCompletionRate(actionsOnTime, actionsOverdue);

  // ── Trends vs previous period ─────────────────────────────────────────────
  const prev = previousSnapshot;
  const trends = {
    ltifr: trend(ltifr, prev?.ltifr),
    trifr: trend(trifr, prev?.trifr),
    nmfr:  trend(nmfr,  prev?.nmfr),
    sr:    trend(sr,    prev?.sr),
  };

  return {
    period: {
      from: period.from.toISOString(),
      to:   period.to.toISOString(),
    },
    totalWorkers,
    totalManHours,

    fatalities,
    lostTimeInjuries:         ltis,
    restrictedWorkCases:      rwcs,
    medicalTreatmentCases:    mtcs,
    firstAidCases:            facs,
    nearMisses,
    unsafeActs,
    unsafeConditions:         unsafeConds,
    propertyDamage:           propDamage,
    environmentalIncidents:   envInc,
    totalRecordableIncidents: tri,

    totalLostDays,
    totalRestrictedDays,

    ltifr,
    trifr,
    nmfr,
    sr,
    mtcr,
    fafr,
    aifr,
    dar,

    toolboxTalksHeld:     leading.toolboxTalksHeld     ?? 0,
    inspectionsCompleted: leading.inspectionsCompleted  ?? 0,
    actionsOverdue,
    actionsOnTime,
    actionCompletionRate,
    trainingComplianceRate: leading.trainingComplianceRate ?? 0,
    safeObservations:       leading.safeObservations       ?? 0,

    trends,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly trend series (for line charts)
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthlyKpiPoint {
  month: string;   // e.g. "Jan 2024"
  ltifr: number;
  trifr: number;
  nmfr:  number;
  lti:   number;
  nm:    number;
  manHours: number;
}

/**
 * Break a full year of reports into monthly KPI data points for trend charts.
 *
 * @param reports       Full report list (will be filtered by year)
 * @param year          Year to analyse (e.g. 2024)
 * @param monthlyHours  Array of 12 man-hour figures, index 0 = Jan
 */
export function buildMonthlyTrend(
  reports: Report[],
  year: number,
  monthlyHours: number[],
): MonthlyKpiPoint[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return MONTHS.map((label, monthIdx) => {
    const monthReports = reports.filter((r) => {
      const d = new Date(r.occurred_at || r.created_at || '');
      return d.getFullYear() === year && d.getMonth() === monthIdx;
    });

    const hours = monthlyHours[monthIdx] ?? 0;
    let lti = 0, nm = 0, tri = 0;

    for (const r of monthReports) {
      const c = classify(r.type ?? r.type ?? '');
      if (c.isLTI || c.isFatal) lti++;
      if (c.isNM)  nm++;
      if (c.isLTI || c.isRWC || c.isMTC || c.isFatal) tri++;
    }

    return {
      month: `${label} ${year}`,
      ltifr: calcLTIFR(lti, hours),
      trifr: calcTRIFR(tri, hours),
      nmfr:  calcNMFR(nm, hours),
      lti,
      nm,
      manHours: hours,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Incident pyramid (Heinrich's triangle)
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentPyramid {
  fatalities: number;
  lti: number;
  rwc: number;
  mtc: number;
  fac: number;
  nearMiss: number;
  unsafeActsConditions: number;
}

export function buildIncidentPyramid(reports: Report[]): IncidentPyramid {
  let fatalities = 0, lti = 0, rwc = 0, mtc = 0, fac = 0, nearMiss = 0, unsafe = 0;
  for (const r of reports) {
    const c = classify(r.type ?? r.type ?? '');
    if (c.isFatal) fatalities++;
    else if (c.isLTI) lti++;
    if (c.isRWC) rwc++;
    if (c.isMTC) mtc++;
    if (c.isFAC) fac++;
    if (c.isNM)  nearMiss++;
    if (c.isUA || c.isUC) unsafe++;
  }
  return { fatalities, lti, rwc, mtc, fac, nearMiss, unsafeActsConditions: unsafe };
}

// ─────────────────────────────────────────────────────────────────────────────
// Body part / location / cause analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count incidents grouped by a string field.
 * Returns sorted array of { label, count, percentage }.
 */
export function groupBy(
  reports: Report[],
  field: keyof Report,
): Array<{ label: string; count: number; percentage: number }> {
  const map = new Map<string, number>();
  for (const r of reports) {
    const val = String(r[field] ?? 'Unknown');
    map.set(val, (map.get(val) ?? 0) + 1);
  }
  const total = reports.length || 1;
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// OSHA ↔ ISO converter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an ISO rate (per 1,000,000 hours) to an OSHA rate (per 200,000 hours).
 * Divide by 5.
 */
export function isoToOsha(isoRate: number): number {
  return Math.round((isoRate / 5) * 100) / 100;
}

/**
 * Convert an OSHA rate (per 200,000 hours) to an ISO rate (per 1,000,000 hours).
 * Multiply by 5.
 */
export function oshaToIso(oshaRate: number): number {
  return Math.round(oshaRate * 5 * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks (industry averages for comparison)
// ─────────────────────────────────────────────────────────────────────────────

export interface IndustryBenchmark {
  industry: string;
  ltifr: number;
  trifr: number;
  sr: number;
}

/** Safe Work Australia 2022–23 industry benchmarks (per 1,000,000 hours) */
export const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  { industry: 'Construction',          ltifr: 5.4,  trifr: 18.2, sr: 62.1  },
  { industry: 'Manufacturing',         ltifr: 6.1,  trifr: 21.5, sr: 74.3  },
  { industry: 'Mining',                ltifr: 3.2,  trifr: 11.8, sr: 45.6  },
  { industry: 'Oil & Gas',             ltifr: 1.8,  trifr: 7.2,  sr: 28.4  },
  { industry: 'Utilities',             ltifr: 3.9,  trifr: 14.1, sr: 55.0  },
  { industry: 'Transport & Logistics', ltifr: 7.8,  trifr: 24.6, sr: 88.2  },
  { industry: 'Healthcare',            ltifr: 8.2,  trifr: 28.3, sr: 92.7  },
  { industry: 'Agriculture',           ltifr: 11.3, trifr: 32.1, sr: 104.5 },
  { industry: 'Retail',                ltifr: 4.7,  trifr: 16.9, sr: 58.3  },
  { industry: 'All Industries (Avg)',  ltifr: 5.8,  trifr: 19.4, sr: 68.9  },
];

export function getBenchmark(industry: string): IndustryBenchmark | undefined {
  return INDUSTRY_BENCHMARKS.find(
    (b) => b.industry.toLowerCase() === industry.toLowerCase(),
  ) ?? INDUSTRY_BENCHMARKS.find((b) => b.industry === 'All Industries (Avg)');
}