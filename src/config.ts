import type { Role, Resource, Action, Scope, PlanType, PlanContentSection, Rams as RamsType, PtwSignoff, PtwSignature, PtwExtension, PtwClosure, SignCategory, PtwSafetyRequirement, PtwType } from './types';

// Neon Gradient Shield Logo (ES Monogram)
export const logoSrc = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMGYzZmYiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iIzM0ZDM5OSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y0NzJiNiIvPjwvbGluZWFyR3JhZGllbnQ+PGZpbHRlciBpZD0iZiI+PGZlRHJvcFNoYWRvdyBkeD0iMCIgZHk9IjAiIHN0ZERldmlhdGlvbj0iMTAiIGZsb29kLWNvbG9yPSIjMDBmM2ZmIiBmbG9vZC1vcGFjaXR5PSIwLjUiLz48L2ZpbHRlcj48L2RlZnM+PHBhdGggZD0iTTI1NiAzMkMxNjAgMzIgNjQgODAgNjQgMTkydjExMmMwIDE0NCAxOTIgMTkyIDE5MiAxOTJzMTkyLTQ4IDE5Mi0xOTJWMTkyYzAtMTEyLTk2LTE2MC0xOTItMTYweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI2cpIiBzdHJva2Utd2lkdGg9IjI4IiBmaWx0ZXI9InVybCgjZikiLz48dGV4dCB4PSI1MCUiIHk9IjUyJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmb250LXNpemU9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0idXJsKCNnKSIgZmlsdGVyPSJ1cmwoI2YpIj5FUzwvdGV4dD48L3N2Zz4=';

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
  },
};

const allActions: Action[] = ['read', 'create', 'update', 'approve', 'delete', 'export', 'assign'];
const readCreateUpdate: Action[] = ['read', 'create', 'update'];

// --- THIS WAS MISSING IN YOUR FILE ---
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
    permissions: [
      { resource: 'dashboard', actions: ['read'] as Action[], scope: 'org' },
      { resource: 'projects', actions: readCreateUpdate, scope: 'org' },
      { resource: 'people', actions: ['read', 'create', 'update', 'delete'] as Action[], scope: 'org' },
      { resource: 'roles', actions: ['read', 'create', 'update'] as Action[], scope: 'org' },
      { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'org' },
      ...['reports', 'inspections', 'ptw', 'checklists', 'housekeeping', 'plans', 'rams', 'signage', 'tbt', 'training', 'actions', 'site-map', 'certification'].map(r => ({
          resource: r as Resource, actions: allActions, scope: 'org' as Scope
      }))
    ]
  },
  { 
    org_id: null, key: 'HSE_MANAGER', label: 'HSE Manager', is_system: true,
    permissions: [
      { resource: 'dashboard', actions: ['read'] as Action[], scope: 'org' },
      { resource: 'projects', actions: ['read'] as Action[], scope: 'org' },
      { resource: 'people', actions: ['read'] as Action[], scope: 'org' },
      { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'own' },
       ...['reports', 'inspections', 'ptw', 'checklists', 'housekeeping', 'plans', 'rams', 'signage', 'tbt', 'training', 'actions', 'site-map', 'certification'].map(r => ({
          resource: r as Resource, actions: ['read', 'create', 'update', 'approve', 'export', 'assign'] as Action[], scope: 'org' as Scope
      }))
    ]
  },
  {
    org_id: null, key: 'SUPERVISOR', label: 'Supervisor', is_system: true,
    permissions: [
      { resource: 'dashboard', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'projects', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'people', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'own' },
      ...['reports', 'inspections', 'ptw', 'checklists', 'housekeeping', 'tbt', 'actions', 'site-map', 'certification'].map(r => ({
          resource: r as Resource, actions: ['read', 'create', 'update', 'assign'] as Action[], scope: 'project' as Scope
      })),
       ...['plans', 'rams', 'signage', 'training'].map(r => ({
          resource: r as Resource, actions: ['read'] as Action[], scope: 'project' as Scope
      })),
    ]
  },
  {
    org_id: null, key: 'HSE_OFFICER', label: 'HSE Officer', is_system: true,
    permissions: [
      { resource: 'dashboard', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'people', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'own' },
      ...['reports', 'inspections', 'ptw', 'checklists', 'housekeeping', 'tbt', 'actions', 'site-map', 'certification'].map(r => ({
          resource: r as Resource, actions: ['read', 'create', 'update'] as Action[], scope: 'project' as Scope
      })),
       ...['plans', 'rams', 'signage', 'training'].map(r => ({
          resource: r as Resource, actions: ['read'] as Action[], scope: 'project' as Scope
      })),
    ]
  },
  {
    org_id: null, key: 'INSPECTOR', label: 'Inspector', is_system: true,
    permissions: [
      { resource: 'dashboard', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'inspections', actions: ['read', 'create', 'update'] as Action[], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create'] as Action[], scope: 'project' },
      { resource: 'reports', actions: ['read', 'create'] as Action[], scope: 'project' },
      { resource: 'actions', actions: ['read', 'update'] as Action[], scope: 'own' },
      { resource: 'site-map', actions: ['read'] as Action[], scope: 'project' },
      { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'own' },
      { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
    ]
  },
  {
    org_id: null, key: 'WORKER', label: 'Worker', is_system: true,
    permissions: [
        { resource: 'dashboard', actions: ['read'] as Action[], scope: 'own' },
        { resource: 'reports', actions: ['read', 'create'] as Action[], scope: 'own' },
        { resource: 'tbt', actions: ['read'] as Action[], scope: 'project' },
        { resource: 'training', actions: ['read'] as Action[], scope: 'own' },
        { resource: 'actions', actions: ['read', 'update'] as Action[], scope: 'own' },
        { resource: 'settings', actions: ['read', 'update'] as Action[], scope: 'own' },
        { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
    ]
  },
  {
    org_id: null, key: 'CLIENT_VIEWER', label: 'Client Viewer', is_system: true,
    permissions: [
        { resource: 'dashboard', actions: ['read'] as Action[], scope: 'project' },
        { resource: 'reports', actions: ['read', 'export'] as Action[], scope: 'project' },
        { resource: 'inspections', actions: ['read', 'export'] as Action[], scope: 'project' },
        { resource: 'ptw', actions: ['read'] as Action[], scope: 'project' },
        { resource: 'plans', actions: ['read', 'approve'] as Action[], scope: 'project' },
        { resource: 'rams', actions: ['read', 'approve'] as Action[], scope: 'project' },
        { resource: 'site-map', actions: ['read'] as Action[], scope: 'project' },
    ]
  }
];

export const planTypes: PlanType[] = ['HSEMP', 'Lifting', 'Work at Height', 'Confined Space', 'Fire', 'ERP', 'EMP', 'Waste'];

export const planTemplates: Record<PlanType, PlanContentSection[]> = {
    'HSEMP': [
        { title: '1. Purpose', content: 'Define the objectives of this plan...', is_complete: false },
        { title: '2. Scope', content: 'This plan covers...', is_complete: false },
        { title: '3. Definitions', content: '', is_complete: false },
        { title: '4. References', content: '', is_complete: false },
        { title: '5. Project Details', content: '', is_complete: false },
        { title: '6. Project HSE Goals', content: '', is_complete: false },
        { title: '7. Project Organization', content: '', is_complete: false },
        { title: '8. Project Planning', content: '', is_complete: false },
        { title: '9. Site Control & Supervision', content: '', is_complete: false },
        { title: '10. Arrangements for Monitoring', content: '', is_complete: false },
    ],
    'Lifting': [
        { title: '1. Lift Details', content: 'Specify the load, location, and equipment.', is_complete: false },
        { title: '2. Personnel', content: 'List the competent persons involved.', is_complete: false },
        { title: '3. Calculations', content: 'Attach load charts and calculations.', is_complete: false },
    ],
    'Work at Height': [
        { title: '1. Access Method', content: 'Describe the method of access (scaffold, MEWP, etc.).', is_complete: false },
        { title: '2. Fall Protection', content: 'Detail the fall protection systems to be used.', is_complete: false },
        { title: '3. Rescue Plan', content: 'Outline the procedure for rescue from height.', is_complete: false },
    ],
    'Confined Space': [],
    'Fire': [],
    'ERP': [],
    'EMP': [],
    'Waste': [],
};

export const tbtTopicsLibrary = {
    'General Safety': [
        'Slips, Trips, and Falls Prevention',
        'Manual Handling Techniques',
        'Personal Protective Equipment (PPE)',
        'Housekeeping on Site',
        'Fire Safety & Prevention',
        'Emergency Procedures',
    ],
    'High Risk': [
        'Working at Height',
        'Confined Space Entry',
        'Lifting Operations & Rigging',
        'Electrical Safety (LOTO)',
        'Excavation Safety',
        'Hot Work (Welding/Cutting/Grinding)',
    ],
    'Environmental': [
        'Waste Segregation',
        'Spill Prevention & Control',
        'Dust Control Measures',
        'Noise Management',
    ],
    'Health': [
        'Heat Stress Prevention',
        'First Aid Awareness',
        'Mental Health & Wellbeing',
        'Hazardous Substance Handling (COSHH)',
    ]
};

export const ramsTemplate: Omit<RamsType, 'id'|'org_id'|'project_id'|'activity'|'location'|'audit_log'|'prepared_by'> = {
    status: 'draft',
    version: 'v0.1',
    reviewed_by: { name: '', email: '', role: '' },
    approved_by_client: { name: '', email: '', role: '' },
    times: {
        created_at: '', updated_at: '', approved_at: '', valid_from: '', valid_until: '',
    },
    method_statement: {
        overview: '', competence: '',
        sequence_of_operations: [],
        emergency_arrangements: '',
    },
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
    'General Work': [
        { id: 'gw_1', text: 'RAMS approved and available' },
        { id: 'gw_2', text: 'Work area is barricaded and has proper signage' },
        { id: 'gw_3', text: 'LOTO applied for any service isolation' },
        { id: 'gw_4', text: 'Toolbox Talk (TBT) conducted' },
        { id: 'gw_5', text: 'First aid kit and drinking water available' },
        { id: 'gw_6', text: 'Weather and environmental conditions suitable for work' },
    ],
    'Hot Work': [
        { id: 'hw_1', text: 'Fire watch assigned and understands duties (incl. 30 min post-work)' },
        { id: 'hw_2', text: 'Flammable materials cleared from 11m radius or covered with fire blankets' },
        { id: 'hw_3', text: 'Correct type (ABC) of fire extinguisher inspected and available' },
        { id: 'hw_4', text: 'Welding machine has valid test certificate' },
        { id: 'hw_5', text: 'Flashback arrestors are fitted on all gas hoses' },
        { id: 'hw_6', text: 'Welder is competent and certified for the task' },
    ],
    'Electrical Work': [
        { id: 'ew_1', text: 'Personnel are qualified/trained for the electrical work' },
        { id: 'ew_2', text: 'Power source isolated and locked out (LOTO procedure)' },
        { id: 'ew_3', text: 'Insulated tools and equipment are in good condition' },
        { id: 'ew_4', text: 'No jewelry or metal objects are worn during the work' },
        { id: 'ew_5', text: 'Dissipative electrical mat available if required' },
        { id: 'ew_6', text: 'Work area is dry and free from flammable materials' },
    ],
    'Excavation': [
        { id: 'ex_1', text: 'Underground service drawings located and available on site' },
        { id: 'ex_2', text: 'Exclusion zones marked (1m for <11kV, 3m for >11kV)' },
        { id: 'ex_3', text: 'Cave-in protection (shoring, benching, shielding) is in place as per soil type' },
        { id: 'ex_4', text: 'Valid third-party certificates for operator and equipment are present' },
        { id: 'ex_5', text: 'Hard barriers installed for excavations next to roadways' },
    ],
    'Lifting': [
        { id: 'li_1', text: 'Approved lifting plan is available' },
        { id: 'li_2', text: 'Crane rotating radius is identified and barricaded' },
        { id: 'li_3', text: 'Crane outriggers are fully extended on outrigger pads' },
        { id: 'li_4', text: 'Valid 3rd-party certificates for equipment, operator, and riggers are available' },
        { id: 'li_5', text: 'Competent banksman is appointed for the task' },
        { id: 'li_6', text: 'Taglines of correct length are fixed to the load' },
    ],
    'Work at Height': [
        { id: 'wah_1', text: 'Third-party certificate for MEWP / BMU is available' },
        { id: 'wah_2', text: 'Personnel are trained and certified for the job' },
        { id: 'wah_3', text: 'Scaffolding is erected, inspected, and tagged by a competent person' },
        { id: 'wah_4', text: 'Full body harness with shock absorber is provided and in good condition' },
        { id: 'wah_5', text: 'Level and sturdy ground for access equipment confirmed' },
    ],
    'Confined Space Entry': [
        { id: 'cs_1', text: 'Gas detector is available and calibrated' },
        { id: 'cs_2', text: 'Gas checks are within limits (O2: 19.5-23.5%, LEL: <5%, CO: <25ppm, H2S: <10ppm)' },
        { id: 'cs_3', text: 'Retrieval equipment (tripod, rope, harness) is available' },
        { id: 'cs_4', text: 'Entrants, standby, and supervisor are identified and trained' },
        { id: 'cs_5', text: 'Adequate explosion-proof lights and tools provided' },
    ],
    'Night Work': [
        { id: 'nw_1', text: 'Adequate lighting, ventilation, and access provided' },
        { id: 'nw_2', text: 'Hi-visibility jackets with reflective strips provided to all employees' },
        { id: 'nw_3', text: 'Continuous supervision maintained at site' },
        { id: 'nw_4', text: 'First aid box available at site' },
    ],
    'Road Closure': [
        { id: 'rc_1', text: 'Alternative route planned and suitable for vehicles' },
        { id: 'rc_2', text: 'Sunflower lights and flashers present every 25 meters on barriers' },
        { id: 'rc_3', text: 'Banksman placed with flags for indication to approaching vehicles' },
        { id: 'rc_4', text: 'Adequate and safe access provided for pedestrians' },
    ],
    'Utility Work': [
        { id: 'uw_1', text: 'Underground service drawings are available' },
        { id: 'uw_2', text: 'Service is isolated and locked as per LOTO procedure' },
        { id: 'uw_3', text: 'Backup plan is in place for shutdown of utility services' },
        { id: 'uw_4', text: 'Equipment to be used is inspected, tested, and tagged' },
    ],
};

export const emptySignoff: PtwSignoff = { name: '', designation: '', email: '', mobile: '', remarks: '', signature: '', signed_at: '' };
export const emptySignature: PtwSignature = { signature: '', signed_at: '' };
export const emptyExtension: PtwExtension = { is_requested: false, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' }, requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };
export const emptyClosure: PtwClosure = { note: '', permit_requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };

export const signageConfig: Record<SignCategory, {
  shape: 'circle' | 'triangle' | 'rectangle';
  bgColor: string;
  textColor: string;
  symbolColor?: string;
  borderColor?: string;
  hasSlash?: boolean;
}> = {
    'Prohibition': { shape: 'circle', bgColor: 'bg-white', textColor: 'text-black', borderColor: 'border-red-600', hasSlash: true },
    'Mandatory': { shape: 'circle', bgColor: 'bg-blue-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Warning': { shape: 'triangle', bgColor: 'bg-yellow-400', textColor: 'text-black', borderColor: 'border-black', symbolColor: 'text-black' },
    'Emergency': { shape: 'rectangle', bgColor: 'bg-green-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Fire': { shape: 'rectangle', bgColor: 'bg-red-600', textColor: 'text-white', symbolColor: 'text-white' },
    'Environmental': { shape: 'rectangle', bgColor: 'bg-green-700', textColor: 'text-white', symbolColor: 'text-white' },
    'Traffic': { shape: 'rectangle', bgColor: 'bg-blue-700', textColor: 'text-white', symbolColor: 'text-white' },
    'Informational': { shape: 'rectangle', bgColor: 'bg-blue-500', textColor: 'text-white', symbolColor: 'text-white' },
};