import type { RiskMatrix } from '../types';

export const getRiskLevel = (matrix: RiskMatrix): { level: 'Low' | 'Medium' | 'High' | 'Critical', color: 'green' | 'yellow' | 'red' } => {
    // Safety check
    if (!matrix || typeof matrix.severity !== 'number' || typeof matrix.likelihood !== 'number') {
        return { level: 'Low', color: 'green' };
    }
    
    const riskScore = matrix.severity * matrix.likelihood;
    if (riskScore >= 15) return { level: 'Critical', color: 'red' };
    if (riskScore >= 9) return { level: 'High', color: 'red' };
    if (riskScore >= 4) return { level: 'Medium', color: 'yellow' };
    return { level: 'Low', color: 'green' };
};