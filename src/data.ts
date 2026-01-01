import type { Organization, User, Project, Report, Inspection, ChecklistTemplate, ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, TrainingRecord, TrainingSession, Notification, Ptw, CertificationProfile } from './types';
import { logoSrc } from './config';

// --- DEFAULT DATA (Prevents Crashes) ---

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
  }
];

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
  }
];

// Ensure these are exported as empty arrays, NEVER undefined
export const reports: Report[] = [];
export const inspections: Inspection[] = [];
export const checklistTemplates: ChecklistTemplate[] = [
    {
        id: 'ct_1', org_id: 'org_1', category: 'Safety', title: { en: 'General Safety Check' }, 
        items: [{ id: 'i1', text: { en: 'PPE Compliance' }, description: { en: 'Check helmets, boots, vests' } }]
    }
];
export const checklistRuns: ChecklistRun[] = [];
export const plans: Plan[] = [];
export const rams: Rams[] = [];
export const signs: Sign[] = [];
export const tbtSessions: TbtSession[] = [];
export const trainingCourses: TrainingCourse[] = [];
export const trainingRecords: TrainingRecord[] = [];
export const trainingSessions: TrainingSession[] = [];
export const notifications: Notification[] = [];
export const ptws: Ptw[] = [];

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