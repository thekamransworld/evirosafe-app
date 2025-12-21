import type { Organization, User, Project, Report, Inspection, ChecklistTemplate, ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, TrainingRecord, Notification, TrainingSession, Ptw, CertificationProfile } from './types';
import { logoSrc } from './config';

// ... (Keep organizations, users, projects, reports as they are) ...
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
    avatar_url: 'https://i.pravatar.cc/150?u=kamran',
    role: 'ADMIN',
    status: 'active',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  // ... add other users if needed
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

export const reports: Report[] = [];
export const inspections: Inspection[] = [];

// --- CHECKLIST TEMPLATES (INCLUDING HOUSEKEEPING) ---
export const checklistTemplates: ChecklistTemplate[] = [
    {
        id: 'ct_1', org_id: 'org_1', category: 'Safety', title: { en: 'Weekly Safety Walkdown' }, 
        items: [{ id: 'i1', text: { en: 'PPE Compliance' }, description: { en: 'Check helmets, boots, vests' } }]
    },
    {
        id: 'ct_15', org_id: 'org_1', category: 'Housekeeping', title: { en: 'General Housekeeping Checklist', ar: 'قائمة فحص النظافة العامة' }, items: [
            { id: 'hk_1_1', text: { en: 'Floors clean and dry', ar: 'الأرضيات نظيفة وجافة' }, description: { en: '', ar: '' } },
            { id: 'hk_1_2', text: { en: 'Aisles & walkways clear', ar: 'الممرات والمشايات خالية' }, description: { en: '', ar: '' } },
            { id: 'hk_1_3', text: { en: 'No debris, no nails', ar: 'لا يوجد حطام أو مسامير' }, description: { en: '', ar: '' } },
            { id: 'hk_1_4', text: { en: 'Stored material stacked safely', ar: 'المواد المخزنة مكدسة بأمان' }, description: { en: '', ar: '' } },
            { id: 'hk_1_5', text: { en: 'Tools returned to toolboxes', ar: 'الأدوات أعيدت إلى صناديقها' }, description: { en: '', ar: '' } },
            { id: 'hk_1_6', text: { en: 'Waste bins available and not overflowing', ar: 'صناديق النفايات متوفرة وغير ممتلئة' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_16', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Washroom Checklist', ar: 'قائمة فحص دورات المياه' }, items: [
            { id: 'hk_2_1', text: { en: 'Toilets clean and sanitized', ar: 'المراحيض نظيفة ومعقمة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_2', text: { en: 'Hand wash basin clean', ar: 'حوض غسيل الأيدي نظيف' }, description: { en: '', ar: '' } },
            { id: 'hk_2_3', text: { en: 'Soap available', ar: 'الصابون متوفر' }, description: { en: '', ar: '' } },
            { id: 'hk_2_4', text: { en: 'Tissue available', ar: 'المناديل متوفرة' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_17', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Eating Area / Canteen Checklist', ar: 'قائمة فحص منطقة الطعام / الكافتيريا' }, items: [
            { id: 'hk_3_1', text: { en: 'Tables & chairs clean', ar: 'الطاولات والكراسي نظيفة' }, description: { en: '', ar: '' } },
            { id: 'hk_3_2', text: { en: 'No insects / pests observed', ar: 'لم تتم ملاحظة حشرات / آفات' }, description: { en: '', ar: '' } },
            { id: 'hk_3_3', text: { en: 'Waste bins covered', ar: 'صناديق النفايات مغطاة' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_18', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Rest Area Checklist', ar: 'قائمة فحص منطقة الراحة' }, items: [
            { id: 'hk_4_1', text: { en: 'Benches/chairs clean and in good condition', ar: 'المقاعد/الكراسي نظيفة وفي حالة جيدة' }, description: { en: '', ar: '' } },
            { id: 'hk_4_2', text: { en: 'Air conditioning/fan working effectively', ar: 'التكييف/المروحة تعمل بفعالية' }, description: { en: '', ar: '' } },
            { id: 'hk_4_3', text: { en: 'Drinking water station is clean and functional', ar: 'محطة مياه الشرب نظيفة وتعمل' }, description: { en: '', ar: '' } },
        ]
    },
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
    level: 'Basic',
    role_title: 'HSE Manager',
    safe_working_hours: 0,
    total_years_experience: 0,
    qualifications: [],
    requirements_met: { training: false, experience: false, safe_hours: false, behavior: false }
};