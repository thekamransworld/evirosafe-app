// src/data.ts
import type { 
  Organization, User, Project, Report, Inspection, ChecklistTemplate, 
  ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, 
  TrainingRecord, TrainingSession, Notification, Ptw, CertificationProfile, ActionItem
} from './types';
import { logoSrc } from './config';

// --- ORGANIZATIONS ---
export const organizations: Organization[] = [
  {
    id: 'org_1',
    name: 'Clint Operations',
    slug: 'clint-ops',
    domain: 'clint.com',
    status: 'active',
    timezone: 'GMT+3',
    primaryLanguage: 'en',
    secondaryLanguages: ['ar', 'ur'],
    branding: { logoUrl: logoSrc, primaryColor: '#00A86B' },
    industry: 'Construction',
    country: 'AE',
  }
];

// --- USERS ---
export const users: User[] = [
  {
    id: 'user_kamran',
    org_id: 'org_1',
    email: 'thekamransworld@gmail.com',
    name: 'Kamran (Super Admin)',
    avatar_url: 'https://ui-avatars.com/api/?name=Kamran&background=0D8ABC&color=fff',
    role: 'ADMIN',
    status: 'active',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_alex',
    org_id: 'org_1',
    email: 'alex@clint.com',
    name: 'Alex Johnson',
    avatar_url: 'https://ui-avatars.com/api/?name=Alex&background=random',
    role: 'HSE_MANAGER',
    status: 'active',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  }
];

// --- PROJECTS ---
export const projects: Project[] = [
  {
    id: 'proj_1',
    org_id: 'org_1',
    name: 'Downtown Construction',
    code: 'DTC-001',
    status: 'active',
    location: 'City Center',
    start_date: '2023-01-01',
    finish_date: '2025-12-31',
    manager_id: 'user_kamran',
    type: 'Construction',
  },
  {
    id: 'proj_2',
    org_id: 'org_1',
    name: 'Refinery Maintenance',
    code: 'REF-002',
    status: 'active',
    location: 'Industrial Zone',
    start_date: '2024-02-01',
    finish_date: '2024-11-30',
    manager_id: 'user_alex',
    type: 'Maintenance',
  }
];

// --- CHECKLIST TEMPLATES ---
const createChecklist = (id: string, cat: string, title: string, items: string[]) => ({
    id, org_id: 'org_1', category: cat, title: { en: title },
    items: items.map((text, i) => ({ id: `${id}_${i}`, text: { en: text }, description: { en: 'Verify compliance' } }))
});

export const checklistTemplates: ChecklistTemplate[] = [
    createChecklist('cl_1', 'General', 'Daily Site Safety Inspection', ['PPE compliance', 'Housekeeping', 'Access/Egress clear', 'Signage in place']),
    createChecklist('cl_2', 'General', 'Weekly HSE Walkdown', ['Scaffolding tags', 'Electrical panels locked', 'Fire extinguishers checked', 'Welfare facilities clean']),
    createChecklist('cl_3', 'General', 'PPE Compliance Check', ['Helmets', 'Safety Shoes', 'High-Vis Vests', 'Eye Protection', 'Gloves']),
    createChecklist('cl_6', 'Work at Height', 'Scaffolding Inspection (Weekly)', ['Base plates secure', 'Bracing complete', 'Guardrails installed', 'Tag (Green/Red) updated']),
    createChecklist('cl_11', 'Electrical', 'Portable Power Tools', ['Cables undamaged', 'Guards in place', 'PAT test valid', 'Dead man switch functional']),
    createChecklist('cl_21', 'Fire', 'Fire Extinguisher Monthly', ['Pressure gauge in green', 'Pin & seal intact', 'Hose clear', 'Inspection tag updated']),
    createChecklist('cl_26', 'Excavation', 'Excavation Daily', ['Shoring/Benching intact', 'Access/Egress (ladder)', 'Spoil pile 1m back', 'Barriers & signage']),
    createChecklist('cl_29', 'Confined Space', 'Pre-Entry Check', ['Gas test (O2, LEL, H2S, CO)', 'Ventilation running', 'Attendant at entry', 'Rescue tripod ready']),
    createChecklist('cl_34', 'Environment', 'Waste Management', ['Bins segregated (Gen/Haz)', 'No overflowing', 'Skip covered', 'Collection schedule']),
    createChecklist('cl_37', 'Health', 'First Aid Box', ['Contents complete', 'Nothing expired', 'Box clean/marked', 'Eyewash station check']),
];

// --- SAMPLE PLANS ---
export const plans: Plan[] = [
    {
        id: 'plan_1', org_id: 'org_1', project_id: 'proj_1', type: 'HSEMP', title: 'Project HSE Plan', version: 'v1.0', status: 'approved',
        people: { prepared_by: { name: 'Alex Johnson', email: 'alex@clint.com', signed_at: '2024-01-01' } },
        dates: { created_at: '2024-01-01', updated_at: '2024-01-05', next_review_at: '2024-06-01' },
        content: { body_json: [], attachments: [] }, meta: { tags: ['Master'], change_note: '' }, audit_trail: []
    }
];

// --- SAMPLE RAMS ---
export const rams: Rams[] = [
    {
        id: 'rams_1', org_id: 'org_1', project_id: 'proj_1', activity: 'Excavation for Foundation', location: 'Zone A', status: 'approved', version: 'v1',
        prepared_by: { name: 'Alex Johnson', email: 'alex@clint.com', role: 'HSE Manager', signed_at: '2024-01-15' },
        times: { created_at: '2024-01-10', updated_at: '2024-01-15', valid_from: '2024-01-20', valid_until: '2024-02-20' },
        method_statement: { overview: 'Excavation using 20T excavator...', competence: 'Certified Operator', sequence_of_operations: [], emergency_arrangements: 'Muster Point B' },
        overall_risk_before: 15, overall_risk_after: 5, attachments: [], linked_ptw_types: ['Excavation'], audit_log: []
    }
];

// --- SAMPLE SIGNS ---
export const signs: Sign[] = [
    { id: 's1', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Helmet' }, icon_url: '⛑️', description: { en: 'Safety helmet required' }, matched_activities: [], hazards: [] }
];

// --- EMPTY PLACEHOLDERS ---
export const reports: Report[] = [];
export const inspections: Inspection[] = [];
export const checklistRuns: ChecklistRun[] = [];
export const tbtSessions: TbtSession[] = [];
export const trainingCourses: TrainingCourse[] = [];
export const trainingRecords: TrainingRecord[] = [];
export const trainingSessions: TrainingSession[] = [];
export const notifications: Notification[] = [];
export const ptws: Ptw[] = [];
export const actionItems: ActionItem[] = [];

export const certificationProfile: CertificationProfile = {
    user_id: 'user_kamran',
    org_id: 'org_1',
    level: 'Advanced',
    role_title: 'HSE Manager',
    safe_working_hours: 3680,
    total_years_experience: 7,
    qualifications: [],
    requirements_met: { training: true, experience: true, safe_hours: false, behavior: true }
};