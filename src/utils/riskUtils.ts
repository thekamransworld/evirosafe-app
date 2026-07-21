/**
 * EviroSafe — Unified Risk Matrix (ISO 31000 / AS/NZS 4360 5x5)
 * Single source of truth. Delete risk functions from helpers.ts.
 */

import type { RiskMatrix } from '../types';

export type RiskLevel  = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskColor  = 'green' | 'yellow' | 'orange' | 'red';

export interface RiskResult {
  score:    number;
  level:    RiskLevel;
  color:    RiskColor;
  cssColor: string;
  action:   string;
}

export const SEVERITY_LABELS: Record<number, string> = {
  1: 'Negligible — No injury, minor property damage',
  2: 'Minor — First aid, reversible health effect',
  3: 'Moderate — Medical treatment, lost time < 3 days',
  4: 'Major — Serious injury, LTI > 3 days, major damage',
  5: 'Catastrophic — Fatality, permanent disability, major release',
};

export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: 'Rare — Once in 10+ years',
  2: 'Unlikely — Once in 1–10 years',
  3: 'Possible — Once in 1 month–1 year',
  4: 'Likely — Weekly occurrence',
  5: 'Almost Certain — Daily occurrence',
};

const THRESHOLDS = [
  { min: 15, level: 'Critical' as RiskLevel, color: 'red'    as RiskColor, cssColor: '#ef4444', action: 'STOP WORK — immediate corrective action required before resuming' },
  { min: 8,  level: 'High'     as RiskLevel, color: 'orange' as RiskColor, cssColor: '#f97316', action: 'Senior HSE management approval required — implement controls immediately' },
  { min: 4,  level: 'Medium'   as RiskLevel, color: 'yellow' as RiskColor, cssColor: '#eab308', action: 'HSE Officer to manage — additional controls and monitoring required' },
  { min: 1,  level: 'Low'      as RiskLevel, color: 'green'  as RiskColor, cssColor: '#22c55e', action: 'Accept with standard controls — review at next scheduled inspection' },
];

export const getRiskResult = (matrix: RiskMatrix): RiskResult => {
  if (
    !matrix ||
    typeof matrix.severity   !== 'number' ||
    typeof matrix.likelihood !== 'number' ||
    matrix.severity   < 1 || matrix.severity   > 5 ||
    matrix.likelihood < 1 || matrix.likelihood > 5
  ) {
    return { score: 0, level: 'Low', color: 'green', cssColor: '#22c55e', action: 'Invalid matrix values — please re-assess' };
  }
  const score = matrix.severity * matrix.likelihood;
  const threshold = THRESHOLDS.find(t => score >= t.min)!;
  return { score, ...threshold };
};

export const getRiskLevel = (matrix: RiskMatrix): RiskLevel =>
  getRiskResult(matrix).level;

export const getRiskColor = (matrix: RiskMatrix): RiskColor =>
  getRiskResult(matrix).color;

export const getRiskScore = (matrix: RiskMatrix): number =>
  (matrix?.severity ?? 0) * (matrix?.likelihood ?? 0);

export const getRiskReduction = (before: RiskMatrix, after: RiskMatrix): number => {
  const scoreBefore = getRiskScore(before);
  if (scoreBefore === 0) return 0;
  return Math.round(((scoreBefore - getRiskScore(after)) / scoreBefore) * 100);
};

export interface StepRisk {
  risk_before: RiskMatrix;
  risk_after:  RiskMatrix;
}

// Fixed: proper reduce with explicit accumulator type
export const calculateOverallRisk = (steps: StepRisk[]): { before: RiskResult; after: RiskResult } => {
  const fallback = getRiskResult({ severity: 1, likelihood: 1 });
  if (!steps || steps.length === 0) return { before: fallback, after: fallback };

  const worstBeforeMatrix = steps.reduce<RiskMatrix>((worst, step) => {
    return getRiskScore(step.risk_before) > getRiskScore(worst) ? step.risk_before : worst;
  }, steps[0].risk_before);

  const worstAfterMatrix = steps.reduce<RiskMatrix>((worst, step) => {
    return getRiskScore(step.risk_after) > getRiskScore(worst) ? step.risk_after : worst;
  }, steps[0].risk_after);

  return { before: getRiskResult(worstBeforeMatrix), after: getRiskResult(worstAfterMatrix) };
};

export interface MatrixCell {
  severity:   number;
  likelihood: number;
  score:      number;
  level:      RiskLevel;
  cssColor:   string;
}

// Fixed: cast to number to avoid Severity/Likelihood type conflicts
export const generateRiskMatrixGrid = (): MatrixCell[][] => {
  return Array.from({ length: 5 }, (_, sIdx) => {
    const severity = 5 - sIdx;
    return Array.from({ length: 5 }, (_, lIdx) => {
      const likelihood = lIdx + 1;
      const matrix     = { severity: severity as RiskMatrix['severity'], likelihood: likelihood as RiskMatrix['likelihood'] };
      const result     = getRiskResult(matrix);
      return { severity, likelihood, score: result.score, level: result.level, cssColor: result.cssColor };
    });
  });
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const daysBetween = (a: string | Date, b: string | Date = new Date()): number =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));