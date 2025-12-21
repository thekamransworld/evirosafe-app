// src/utils/ramsUtils.ts
import type { RamsStatus } from '../types';

export const getStatusColor = (status: RamsStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
  switch (status) {
    case 'published': return 'green';
    case 'approved': return 'blue';
    case 'under_review': return 'yellow';
    case 'archived': return 'gray';
    case 'draft':
    default: return 'gray';
  }
};

export const getStatusDisplayText = (status: RamsStatus): string => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getRiskColor = (riskScore: number): 'green' | 'yellow' | 'red' => {
  if (riskScore >= 13) return 'red';
  if (riskScore >= 7) return 'yellow';
  return 'green';
};

export const getRiskLevel = (riskScore: number): 'Low' | 'Medium' | 'High' => {
  if (riskScore >= 13) return 'High';
  if (riskScore >= 7) return 'Medium';
  return 'Low';
};

export const formatDate = (date: Date | string): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const calculateOverallRisk = (steps: any[]): { before: number, after: number } => {
  if (steps.length === 0) return { before: 0, after: 0 };
  const beforeScores = steps.map((s: any) => s.risk_before.severity * s.risk_before.likelihood);
  const afterScores = steps.map((s: any) => s.risk_after.severity * s.risk_after.likelihood);
  return {
    before: Math.max(...beforeScores),
    after: Math.max(...afterScores)
  };
};