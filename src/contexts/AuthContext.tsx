import type { Role, Resource, Action, Scope, PlanType, PlanContentSection, Rams as RamsType, PtwType, PtwSafetyRequirement, PtwSignoff, PtwSignature, PtwExtension, PtwClosure, SignCategory } from './types';

// Logo Source - pointing to local file
export const logoSrc = '/logo.svg';

export const supportedLanguages: { code: string; name: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
];

export const translations: Record<string, Record<string, string>> = {
  en: {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.ai_insights': 'AI Insights',
    'sidebar.reporting': 'Reporting',
    'sidebar.inspections': 'Inspections',
    'sidebar.ptw': 'Permit to Work',
    'sidebar.checklists': 'Checklists',
    'sidebar.plans': 'Plans',
    'sidebar.rams': 'RAMS',
    'sidebar.signage': 'Signage',
    'sidebar.tbt': 'Toolbox Talks',
    'sidebar.training': 'Trainings',
    'sidebar.housekeeping': 'Housekeeping',
    'sidebar.actions': 'Action Tracker',
    'sidebar.site_map': 'Site Map',
    'sidebar.certification': 'My Certificate',
    'sidebar.organizations': 'Organizations',
    'sidebar.projects': 'Projects',
    'sidebar.people': 'People & Access',
    'sidebar.roles': 'Roles & Permissions',
    'sidebar.settings': 'Settings & Logs',
    'sidebar.hse-statistics': 'HSE Statistics',
  },
  ar: {
    'sidebar.dashboard': 'لوحة التحكم',
    'sidebar.ai_insights': 'رؤى الذكاء الاصطناعي',
    'sidebar.reporting': 'التقارير',
    'sidebar.inspections': 'التفتيش',
    'sidebar.ptw': 'تصاريح العمل',
    'sidebar.checklists': 'قوائم المراجعة',
    'sidebar.plans': 'الخطط',
    'sidebar.rams': 'تقييم المخاطر',
    'sidebar.signage': 'اللافتات',
    'sidebar.tbt': 'حديث السلامة',
    'sidebar.training': 'التدريب',
    'sidebar.housekeeping': 'التدبير المنزلي',
    'sidebar.actions': 'متتبع الإجراءات',
    'sidebar.site_map': 'خريطة الموقع',
    'sidebar.certification': 'شهادتي',
    'sidebar.organizations': 'المنظمات',
    'sidebar.projects': 'المشاريع',
    'sidebar.people': 'الأفراد والصلاحيات',
    'sidebar.roles': 'الأدوار والصلاحيات',
    'sidebar.settings': 'الإعدادات والسجلات',
    'sidebar.hse-statistics': 'إحصائيات الصحة والسلامة',
  },
};

const allActions: Action[] = ['read', 'create', 'update', 'approve', 'delete', 'export', 'assign'];
const readCreateUpdate: Action[] = ['read', 'create', 'update'];

export const allPossiblePermissions: { resource: Resource; actions: Action[]; scopes: Scope[] }[] = [
    { resource: 'dashboard', actions: ['read'], scopes: ['org'] },
    { resource: 'reports', actions: allActions, scopes: ['org', 'project', 'own'] },
    { resource: 'inspections', actions: allActions, scopes: ['org', 'project', 'own'] },
    { resource: 'ptw', actions: allActions, scopes: ['org', 'project', 'own'] },
    { resource: 'checklists', actions: allActions, scopes: ['org', 'project'] },
    { resource: 'housekeeping', actions: readCreateUpdate, scopes: ['org', 'project'] },
    { resource: 'plans', actions: allActions, scopes: ['org', 'project'] },
    { resource: 'rams', actions: allActions, scopes: ['org', 'project'] },
    { resource: 'signage', actions: readCreateUpdate, scopes: ['org'] },
    { resource: 'tbt', actions: allActions, scopes: ['org', 'project'] },
    { resource: 'training', actions: allActions, scopes: ['org', 'project'] },
    { resource: 'actions', actions: ['read', 'update', 'assign'], scopes: ['org', 'project', 'own'] },
    { resource: 'site-map', actions: ['read'], scopes: ['org', 'project'] },
    { resource: 'certification', actions: ['read', 'update'], scopes: ['own'] },
    { resource: 'organizations', actions: readCreateUpdate, scopes: ['org'] },
    { resource: 'projects', actions: readCreateUpdate, scopes: ['org'] },
    { resource: 'people', actions: ['read', 'create', 'update', 'delete'], scopes: ['org'] },
    { resource: 'roles', actions: ['read', 'create', 'update'], scopes: ['org'] },
    { resource: 'settings', actions: ['read', 'update'], scopes: ['org', 'own'] },
    { resource: 'hse-statistics', actions: ['read'], scopes: ['org'] },
];

export const roles: Role[] = [
  { 
    org_id: null, key: 'ADMIN', label: 'Administrator', is_system: true,
    permissions: allPossiblePermissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        scope: 'org' as Scope,
    }))
  },
  { 
    org_id: null, key: 'ORG_ADMIN', label: 'Organization Admin', is_system: true,
    permissions: allPossiblePermissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        scope: 'org' as Scope,
    }))
  },
  { 
    org_id: null, key: 'HSE_MANAGER', label: 'HSE Manager', is_system: true,
    permissions: allPossiblePermissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        scope: 'org' as Scope,
    }))
  },
  {
    org_id: null, key: 'SUPERVISOR', label: 'Supervisor', is_system: true,
    permissions: allPossiblePermissions.map(p => ({
        resource: p.resource,
        actions: ['read', 'create', 'update'],
        scope: 'project' as Scope,
    }))
  },
  {
    org_id: null, key: 'WORKER', label: 'Worker', is_system: true,
    permissions: [
        { resource: 'dashboard', actions: ['read'], scope: 'own' },
        { resource: 'reports', actions: ['read', 'create'], scope: 'own' },
        { resource: 'training', actions: ['read'], scope: 'own' },
        { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
    ]
  }
];

export const planTypes: PlanType[] = ['HSEMP', 'Lifting', 'Work at Height', 'Confined Space', 'Fire', 'ERP', 'EMP', 'Waste'];

export const planTemplates: Record<PlanType, PlanContentSection[]> = {
    'HSEMP': [
        { title: '1. Purpose', content: 'Define the objectives of this plan...', is_complete: false },
        { title: '2. Scope', content: 'This plan covers...', is_complete: false },
    ],
    'Lifting': [
        { title: '1. Lift Details', content: 'Specify the load, location, and equipment.', is_complete: false },
    ],
    'Work at Height': [
        { title: '1. Access Method', content: 'Describe the method of access.', is_complete: false },
    ],
    'Confined Space': [], 'Fire': [], 'ERP': [], 'EMP': [], 'Waste': [],
};

export const tbtTopicsLibrary = {
    'General Safety': ['Slips, Trips, and Falls', 'PPE'],
    'High Risk': ['Working at Height', 'Confined Space'],
};

export const ramsTemplate: Omit<RamsType, 'id'|'org_id'|'project_id'|'activity'|'location'|'audit_log'|'prepared_by'> = {
    status: 'draft',
    version: 'v0.1',
    reviewed_by: { name: '', email: '', role: '' },
    approved_by_client: { name: '', email: '', role: '' },
    times: { created_at: '', updated_at: '', approved_at: '', valid_from: '', valid_until: '' },
    method_statement: { overview: '', competence: '', sequence_of_operations: [], emergency_arrangements: '' },
    overall_risk_before: 0,
    overall_risk_after: 0,
    attachments: [],
    linked_ptw_types: [],
};

export const ptwTypeDetails: Record<PtwType, { icon: string; description: string; color: string; hex: string; }> = {
    'General Work': { icon: '🔹', description: 'Baseline, low-risk work', color: 'blue-500', hex: '#3B82F6' },
    'Hot Work': { icon: '🔥', description: 'Welding, cutting, sparks', color: 'red-500', hex: '#EF4444' },
    'Electrical Work': { icon: '⚡', description: 'Live electrical systems', color: 'amber-500', hex: '#F59E0B' },
    'Excavation': { icon: '⛏️', description: 'Ground works, trenching', color: 'brown-500', hex: '#78350F' },
    'Lifting': { icon: '🏗️', description: 'Crane lifts, suspended loads', color: 'orange-500', hex: '#F97316' },
    'Work at Height': { icon: '🧗', description: 'Scaffolds, ladders, fall risks', color: 'sky-500', hex: '#0EA5E9' },
    'Confined Space Entry': { icon: '🕳️', description: 'Tanks, pits, enclosed areas', color: 'purple-500', hex: '#8B5CF6' },
    'Night Work': { icon: '🌙', description: 'After-hours, low visibility', color: 'indigo-500', hex: '#6366F1' },
    'Road Closure': { icon: '🚧', description: 'Traffic management', color: 'orange-600', hex: '#EA580C' },
    'Utility Work': { icon: '🛠️', description: 'Service lines, LOTO', color: 'teal-500', hex: '#14B8A6' },
};

export const ptwChecklistData: Record<string, Omit<PtwSafetyRequirement, 'response' | 'is_critical' | 'evidence_urls' | 'comment'>[]> = {
    'General Work': [{ id: 'gw_1', text: 'RAMS approved and available' }],
    'Hot Work': [{ id: 'hw_1', text: 'Fire watch assigned' }],
    'Work at Height': [{ id: 'wah_1', text: 'Scaffolding inspected' }],
};

export const emptySignoff: PtwSignoff = { name: '', designation: '', email: '', mobile: '', remarks: '', signature: '', signed_at: '' };
export const emptySignature: PtwSignature = { signature: '', signed_at: '' };
export const emptyExtension: PtwExtension = { is_requested: false, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' }, requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };
export const emptyClosure: PtwClosure = { note: '', permit_requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };

export const signageConfig: Record<SignCategory, { shape: 'circle' | 'triangle' | 'rectangle'; bgColor: string; textColor: string; symbolColor?: string; borderColor?: string; hasSlash?: boolean; }> = {
    'Prohibition': { shape: 'circle', bgColor: 'bg-white', textColor: 'text-black', borderColor: 'border-red-600', hasSlash: true },
    'Mandatory': { shape: 'circle', bgColor: 'bg-blue-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Warning': { shape: 'triangle', bgColor: 'bg-yellow-400', textColor: 'text-black', borderColor: 'border-black', symbolColor: 'text-black' },
    'Emergency': { shape: 'rectangle', bgColor: 'bg-green-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Fire': { shape: 'rectangle', bgColor: 'bg-red-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Environmental': { shape: 'rectangle', bgColor: 'bg-green-700', textColor: 'text-white', symbolColor: 'text-white' },
    'Traffic': { shape: 'rectangle', bgColor: 'bg-blue-700', textColor: 'text-white', symbolColor: 'text-white' },
    'Informational': { shape: 'rectangle', bgColor: 'bg-blue-500', textColor: 'text-white', symbolColor: 'text-white' },
};