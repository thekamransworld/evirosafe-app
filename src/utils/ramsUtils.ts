// src/utils/ramsUtils.ts
import type { RamsStatus } from '../types';

export const getStatusColor = (status: RamsStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
  switch (status) {
    case 'published':    return 'green';
    case 'approved':     return 'blue';
    case 'under_review': return 'yellow';
    case 'archived':     return 'gray';
    case 'draft':
    default:             return 'gray';
  }
};

export const getStatusDisplayText = (status: RamsStatus | undefined | null): string => {
  if (!status) return 'Unknown';
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Fixed: was 13/7 (wrong). Now aligned with ISO 31000: 15/8/4
// Also added Critical level which was missing entirely.
export const getRiskColor = (riskScore: number): 'green' | 'yellow' | 'amber' | 'red' => {
  if (riskScore >= 15) return 'red';    // Critical
  if (riskScore >= 8)  return 'amber';  // High
  if (riskScore >= 4)  return 'yellow'; // Medium
  return 'green';                       // Low
};

export const getRiskLevel = (riskScore: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
  if (riskScore >= 15) return 'Critical';
  if (riskScore >= 8)  return 'High';
  if (riskScore >= 4)  return 'Medium';
  return 'Low';
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
};

// Fixed: correctly reads risk_before/risk_after as RiskMatrix objects
export const calculateOverallRisk = (steps: any[]): { before: number; after: number } => {
  if (!steps || steps.length === 0) return { before: 0, after: 0 };
  const beforeScores = steps.map((s: any) => (s.risk_before?.severity ?? 0) * (s.risk_before?.likelihood ?? 0));
  const afterScores  = steps.map((s: any) => (s.risk_after?.severity  ?? 0) * (s.risk_after?.likelihood  ?? 0));
  return {
    before: Math.max(...beforeScores),
    after:  Math.max(...afterScores),
  };
};