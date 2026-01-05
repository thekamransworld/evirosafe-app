import type { Ptw, PtwType, PtwRiskAnalysis, SimopsConflict } from '../types';

// Mock Asset Database
export const ASSETS = [
    { id: 'PUMP-001', name: 'Main Feed Pump A', location: 'Zone 1', status: 'Running' },
    { id: 'TANK-505', name: 'Crude Storage Tank', location: 'Zone 3', status: 'Maintenance' },
    { id: 'SUB-B', name: 'Substation B', location: 'Zone 2', status: 'Live' },
];

// 1. Algorithmic Risk Scoring
export const calculateDynamicRisk = (
    type: PtwType, 
    isNightWork: boolean, 
    weatherCondition: 'Clear' | 'Rain' | 'Windy' | 'Hot'
): PtwRiskAnalysis => {
    let baseScore = 10;
    let complexity = 1;
    
    // Base Risk by Type
    switch(type) {
        case 'Hot Work': baseScore = 40; complexity = 1.5; break;
        case 'Confined Space Entry': baseScore = 50; complexity = 2.0; break;
        case 'Lifting': baseScore = 35; complexity = 1.8; break;
        case 'Electrical Work': baseScore = 45; complexity = 1.9; break;
        case 'Excavation': baseScore = 30; complexity = 1.4; break;
        default: baseScore = 10;
    }

    // Environmental Factors
    let weatherFactor = 1.0;
    if (weatherCondition === 'Windy' && type === 'Lifting') weatherFactor = 1.5;
    if (weatherCondition === 'Rain' && type === 'Electrical Work') weatherFactor = 2.0;
    if (weatherCondition === 'Hot') weatherFactor = 1.2;

    // Time Factor
    const timeFactor = isNightWork ? 1.4 : 1.0;

    // Calculation
    const totalScore = Math.min(100, Math.round(baseScore * complexity * weatherFactor * timeFactor));
    
    let level: PtwRiskAnalysis['risk_level'] = 'Low';
    if (totalScore > 75) level = 'Critical';
    else if (totalScore > 50) level = 'High';
    else if (totalScore > 25) level = 'Medium';

    // AI Suggestions
    const suggestions = [];
    if (level === 'Critical') suggestions.push('Mandatory Independent Verification (IV) required.');
    if (isNightWork) suggestions.push('Ensure auxiliary lighting towers are deployed.');
    if (weatherCondition === 'Hot') suggestions.push('Implement heat stress management plan (15/45 cycle).');

    return {
        base_score: baseScore,
        complexity_factor: complexity,
        weather_factor: weatherFactor,
        time_factor: timeFactor,
        total_risk_score: totalScore,
        risk_level: level,
        auto_controls: suggestions
    };
};

// 2. SIMOPS Detection (Spatial Conflict)
export const checkSimopsConflicts = (
    currentLocation: string, 
    activePermits: Ptw[]
): SimopsConflict[] => {
    const conflicts: SimopsConflict[] = [];
    
    // Simple string matching for demo (In real life, use GIS coordinates)
    const nearbyPermits = activePermits.filter(p => 
        p.status === 'ACTIVE' && 
        p.payload.work.location.toLowerCase().includes(currentLocation.toLowerCase())
    );

    nearbyPermits.forEach(p => {
        conflicts.push({
            conflicting_ptw_id: p.id,
            conflict_type: 'Spatial',
            description: `Conflict with active permit #${p.payload.permit_no} (${p.type}) in same location.`
        });
    });

    return conflicts;
};

// 3. Competency Check (Mock)
export const verifyCompetency = (_userId: string, role: string, _ptwType: string): boolean => {
    // In a real app, check database for valid certificates
    // For demo, we assume everyone is competent except "Guest"
    return role !== 'GUEST';
};