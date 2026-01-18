// src/config/ptw-types.ts

import type { PtwType } from '../types';

export const ptwTypeDetails: Record<PtwType, {
  icon: string;
  hex: string;
  description: string;
  category: 'general' | 'specialized' | 'hazardous';
  max_duration_hours: number;
  requires_risk_assessment: boolean;
  requires_method_statement: boolean;
  requires_loto: boolean;
  global_standards: string[];
}> = {
  'Utility Work': {
    icon: '🔧',
    hex: '#4F46E5',
    description: 'Work involving utility systems, underground services, or public infrastructure',
    category: 'general',
    max_duration_hours: 24,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'OSHA 1926 Subpart P', 'Local Utility Regulations']
  },
  'Work at Height': {
    icon: '🪜',
    hex: '#0EA5E9',
    description: 'Any work at height above 1.8 meters or where fall hazards exist',
    category: 'hazardous',
    max_duration_hours: 12,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: false,
    global_standards: ['ISO 45001', 'OSHA 1926 Subpart M', 'Fall Protection Standards']
  },
  'General Work': {
    icon: '👷',
    hex: '#6B7280',
    description: 'General maintenance, repair, or construction activities',
    category: 'general',
    max_duration_hours: 24,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'OSHA General Industry Standards']
  },
  'Confined Space Entry': {
    icon: '⚠️',
    hex: '#DC2626',
    description: 'Entry into confined spaces with limited entry/exit and hazardous atmosphere',
    category: 'hazardous',
    max_duration_hours: 8,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'OSHA 1910.146', 'Confined Space Regulations']
  },
  'Night Work': {
    icon: '🌙',
    hex: '#1E40AF',
    description: 'Work conducted during night hours with reduced visibility',
    category: 'specialized',
    max_duration_hours: 12,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'Night Work Safety Guidelines']
  },
  'Electrical Work': {
    icon: '⚡',
    hex: '#F59E0B',
    description: 'Work on electrical systems, equipment, or installations',
    category: 'hazardous',
    max_duration_hours: 12,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'NFPA 70E', 'Electrical Safety Standards']
  },
  'Excavation': {
    icon: '⛏️',
    hex: '#92400E',
    description: 'Excavation, trenching, or digging work',
    category: 'hazardous',
    max_duration_hours: 24,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'OSHA 1926 Subpart P', 'Excavation Safety']
  },
  'Hot Work': {
    icon: '🔥',
    hex: '#EF4444',
    description: 'Work involving heat, sparks, or open flame',
    category: 'hazardous',
    max_duration_hours: 8,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'NFPA 51B', 'Hot Work Safety Standards']
  },
  'Road Closure': {
    icon: '🛣️',
    hex: '#10B981',
    description: 'Partial or complete closure of roads or public pathways',
    category: 'specialized',
    max_duration_hours: 24,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: false,
    global_standards: ['ISO 45001', 'MUTCD Standards', 'Traffic Management']
  },
  'Lifting': {
    icon: '🏗️',
    hex: '#8B5CF6',
    description: 'Lifting operations using cranes, hoists, or lifting equipment',
    category: 'hazardous',
    max_duration_hours: 12,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: false,
    global_standards: ['ISO 45001', 'ASME B30', 'Lifting Operations Standards']
  },
  'Mechanical Work': {
    icon: '🔩',
    hex: '#6366F1',
    description: 'Mechanical equipment maintenance and repair',
    category: 'general',
    max_duration_hours: 24,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'Machine Safety Standards']
  },
  'Chemical Handling': {
    icon: '🧪',
    hex: '#8B5CF6',
    description: 'Handling, storage, or use of hazardous chemicals',
    category: 'hazardous',
    max_duration_hours: 8,
    requires_risk_assessment: true,
    requires_method_statement: true,
    requires_loto: true,
    global_standards: ['ISO 45001', 'OSHA 1910.1200', 'GHS Standards']
  }
};