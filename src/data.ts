





import type { Organization, User, Project, Report, Inspection, ChecklistTemplate, ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, TrainingRecord, Notification, TrainingSession, ChecklistItem, NearMissDetails, UnsafeConditionDetails, Ptw, PtwType, PtwHotWorkPayload, PtwWorkAtHeightPayload, CertificationProfile } from './types';
import { planTemplates, ramsTemplate, ptwChecklistData, logoSrc } from './config';

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
  },
  {
    id: 'org_2',
    name: 'Facilities Management',
    slug: 'facilities-mgmt',
    domain: 'fm.com',
    status: 'active',
    timezone: 'GMT+4',
    primaryLanguage: 'en',
    secondaryLanguages: ['ar'],
    branding: { logoUrl: 'https://i.imgur.com/sC8b3Qd.png', primaryColor: '#007BFF' },
    industry: 'Facilities Management',
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
    mobile: '555-0000',
    designation: 'Platform Administrator',
    company: 'EviroSafe HQ',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_1',
    org_id: 'org_1',
    email: 'alex.johnson@clint.com',
    name: 'Alex Johnson',
    avatar_url: 'https://i.pravatar.cc/150?u=user_1',
    role: 'HSE_MANAGER',
    status: 'active',
    mobile: '555-0101',
    designation: 'Org QHSE Manager',
    company: 'Clint Operations',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_2',
    org_id: 'org_1',
    email: 'maria.garcia@clint.com',
    name: 'Maria Garcia',
    avatar_url: 'https://i.pravatar.cc/150?u=user_2',
    role: 'SUPERVISOR',
    status: 'active',
    mobile: '555-0102',
    designation: 'Site Supervisor',
    company: 'Clint Operations',
    preferences: { language: 'ar', default_view: 'reports', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_3',
    org_id: 'org_1',
    email: 'chen.wei@clint.com',
    name: 'Chen Wei',
    avatar_url: 'https://i.pravatar.cc/150?u=user_3',
    role: 'INSPECTOR',
    status: 'active',
    mobile: '555-0103',
    designation: 'Safety Inspector',
    company: 'Clint Operations',
    preferences: { language: 'en', default_view: 'inspections', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_5',
    org_id: 'org_1',
    email: 'david.lee@clint.com',
    name: 'David Lee',
    avatar_url: 'https://i.pravatar.cc/150?u=user_5',
    role: 'ORG_ADMIN',
    status: 'active',
    mobile: '555-0105',
    designation: 'Organization Admin',
    company: 'Clint Operations',
    preferences: { language: 'en', default_view: 'projects', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
  {
    id: 'user_4',
    org_id: 'org_2',
    email: 'samantha.jones@fm.com',
    name: 'Samantha Jones',
    avatar_url: 'https://i.pravatar.cc/150?u=user_4',
    role: 'HSE_MANAGER',
    status: 'active',
    mobile: '555-0201',
    designation: 'Facilities Director',
    company: 'Facilities Management',
    preferences: { language: 'en', default_view: 'dashboard', units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' } }
  },
];

export const projects: Project[] = [
  {
    id: 'proj_1',
    org_id: 'org_1',
    name: 'EviroSafe Tower Construction',
    code: 'ETC-001',
    status: 'active',
    location: 'Downtown, Capital City',
    start_date: '2023-01-15',
    finish_date: '2025-12-31',
    manager_id: 'user_2',
    type: 'Construction',
  },
  {
    id: 'proj_2',
    org_id: 'org_2',
    name: 'Corporate Campus Maintenance',
    code: 'CCM-2024',
    status: 'active',
    location: 'Green Valley Business Park',
    start_date: '2024-01-01',
    finish_date: '2024-12-31',
    manager_id: 'user_4',
    type: 'Maintenance',
  }
];

export const reports: Report[] = [
    {
        id: 'REP-2024-001', creator_id: 'user_2', org_id: 'org_1', project_id: 'proj_1', 
        type: 'Near Miss',
        classification: 'Minor',
        status: 'under_review',
        reporter_id: 'user_2', 
        reported_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        work_related: true,
        impacted_party: [],
        occurred_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
        location: { text: 'Level 15, Sector A', specific_area: 'Near crane loading zone', geo: { lat: 0, lng: 0 } },
        description: 'A hammer was dropped from scaffolding, landing in a barricaded zone below. No one was in the area at the time.',
        conditions: 'Clear day, moderate wind.',
        immediate_actions: 'The dropped hammer was retrieved and the area was cleared.',
        further_corrective_action_required: true,
        evidence_urls: ['https://i.imgur.com/dJ4hU5L.jpeg'], 
        risk_pre_control: { severity: 4, likelihood: 2 }, 
        distribution: { user_ids: ['user_1'], send_alert_on_submit: true, notify_on_update: true },
        acknowledgements: [], 
        audit_trail: [],
        capa: [{ type: 'Corrective', action: 'Reinforce tool tethering policy with all scaffolding teams.', owner_id: 'user_2', due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'Open' }],
        details: { potential_consequence: 'Major Injury' } as NearMissDetails,
        identification: { was_fire: false, was_injury: false, was_environment: false },
        classification_codes: ['SFTY']
    },
    {
        id: 'REP-2024-002', creator_id: 'user_3', org_id: 'org_1', project_id: 'proj_1', 
        type: 'Unsafe Condition',
        classification: 'Moderate',
        status: 'closed',
        reporter_id: 'user_3',
        reported_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        work_related: true,
        impacted_party: ['Environment'],
        occurred_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
        location: { text: 'Ground Floor, Entrance B', specific_area: 'Electrical Room E-01' },
        description: 'Water pooling near electrical panel due to a leaking pipe. Temporary bunding has been placed.',
        conditions: 'Normal indoor conditions.',
        immediate_actions: 'Area cordoned off, water contained with absorbent materials. Power to the panel was isolated as a precaution.',
        further_corrective_action_required: false,
        evidence_urls: ['https://i.imgur.com/uEV9l2z.jpeg'], 
        risk_pre_control: { severity: 3, likelihood: 4 }, 
        distribution: { user_ids: ['user_1', 'user_2'], send_alert_on_submit: true, notify_on_update: false },
        acknowledgements: [{ user_id: 'user_1', acknowledged_at: new Date().toISOString() }], 
        audit_trail: [],
        capa: [{ type: 'Corrective', action: 'Plumber to fix leaking pipe. Electrician to verify panel integrity.', owner_id: 'user_2', due_date: new Date().toISOString(), status: 'Closed' }],
        details: { condition_category: 'Structural', temporary_control_applied: 'Absorbent bunding and warning signs placed.' } as UnsafeConditionDetails,
        identification: { was_fire: false, was_injury: false, was_environment: true },
        classification_codes: ['ENVM', 'SFTY']
    },
];

export const inspections: Inspection[] = [];
export const checklistTemplates: ChecklistTemplate[] = [
    // ... (rest of data.ts content omitted for brevity as it remains unchanged, only ReportType impacts are needed) ...
    {
        id: 'ct_1',
        org_id: 'org_1',
        category: 'Work at Height',
        title: { en: 'Work at Height Checklist', ar: 'قائمة التحقق من العمل على ارتفاع' },
        items: [
            { id: 'ct_1_1', text: { en: 'Scaffolding erected by certified scaffolders', ar: 'تم تركيب السقالات بواسطة متخصصين معتمدين' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_2', text: { en: 'Scaffolding tag (Green/Yellow/Red) present', ar: 'بطاقة السقالة (أخضر / أصفر / أحمر) موجودة' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_3', text: { en: 'Ladders in good condition, inspected', ar: 'السلالم في حالة جيدة وتم فحصها' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_4', text: { en: 'Ladder slope correct (4:1)', ar: 'ميل السلم صحيح (4:1)' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_5', text: { en: 'Ladder secured at top and bottom', ar: 'السلم مؤمن من الأعلى والأسفل' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_6', text: { en: 'Mobile Elevated Work Platforms (MEWPs) inspected', ar: 'فحص منصات العمل المرتفعة المتنقلة (MEWPs)' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_7', text: { en: 'Outriggers deployed and stable', ar: 'الأذرع ممتدة ومستقرة' }, description: { en: 'A. Access & Platforms', ar: 'أ. الوصول والمنصات' } },
            { id: 'ct_1_8', text: { en: 'Full-body harness in good condition', ar: 'حزام الأمان لكامل الجسم في حالة جيدة' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_9', text: { en: 'Lanyard double hook inspected', ar: 'تم فحص حبل الأمان ذو الخطاف المزدوج' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_10', text: { en: 'Anchor point certified', ar: 'نقطة التثبيت معتمدة' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_11', text: { en: 'Lifeline installed', ar: 'تم تركيب حبل النجاة' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_12', text: { en: 'Fall arrest block certified and functional', ar: 'جهاز منع السقوط معتمد ويعمل' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_13', text: { en: 'Worker trained for WAHE', ar: 'العامل مدرب على العمل على ارتفاع' }, description: { en: 'B. Fall Protection', ar: 'ب. الحماية من السقوط' } },
            { id: 'ct_1_14', text: { en: 'Guardrails installed', ar: 'تم تركيب حواجز الحماية' }, description: { en: 'C. Edge Protection', ar: 'ج. حماية الحواف' } },
            { id: 'ct_1_15', text: { en: 'Toe boards in place', ar: 'ألواح حماية القدمين في مكانها' }, description: { en: 'C. Edge Protection', ar: 'ج. حماية الحواف' } },
            { id: 'ct_1_16', text: { en: 'Barricading at work area', ar: 'وجود حواجز في منطقة العمل' }, description: { en: 'C. Edge Protection', ar: 'ج. حماية الحواف' } },
            { id: 'ct_1_17', text: { en: 'Warning signage installed', ar: 'تم تركيب لافتات التحذير' }, description: { en: 'C. Edge Protection', ar: 'ج. حماية الحواف' } },
            { id: 'ct_1_18', text: { en: 'Weather suitable (wind, rain, heat)', ar: 'الطقس مناسب (رياح، مطر، حرارة)' }, description: { en: 'D. Environmental & Site Conditions', ar: 'د. الظروف البيئية والموقع' } },
            { id: 'ct_1_19', text: { en: 'Lighting adequate', ar: 'الإضاءة كافية' }, description: { en: 'D. Environmental & Site Conditions', ar: 'د. الظروف البيئية والموقع' } },
            { id: 'ct_1_20', text: { en: 'No overhead electrical hazards', ar: 'لا توجد مخاطر كهربائية علوية' }, description: { en: 'D. Environmental & Site Conditions', ar: 'د. الظروف البيئية والموقع' } },
            { id: 'ct_1_21', text: { en: 'Load-handling safe when at height', ar: 'مناولة الأحمال آمنة عند الارتفاع' }, description: { en: 'D. Environmental & Site Conditions', ar: 'د. الظروف البيئية والموقع' } },
        ],
    },
    {
        id: 'ct_2',
        org_id: 'org_1',
        category: 'Hot Work',
        title: { en: 'Hot Work Checklist', ar: 'قائمة التحقق من العمل الساخن' },
        items: [
            { id: 'ct_2_1', text: { en: 'Fire watch appointed and trained', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_2', text: { en: 'Fire extinguishers available, inspected', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_3', text: { en: 'Fire blanket installed', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_4', text: { en: 'Combustibles removed/covered', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_5', text: { en: 'Gas cylinders secured and upright', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_6', text: { en: 'Flashback arrestors fitted', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_7', text: { en: 'Ventilation adequate', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_8', text: { en: 'Sparks contained with proper shielding', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_9', text: { en: 'Hot work equipment certified', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
            { id: 'ct_2_10', text: { en: 'Area monitored for minimum 30 minutes after work', ar: '' }, description: { en: 'Welding, Cutting, Grinding', ar: '' } },
        ],
    },
    { id: 'ct_3', org_id: 'org_1', category: 'Confined Space', title: { en: 'Confined Space Entry Checklist', ar: '' }, items: [], },
    { id: 'ct_4', org_id: 'org_1', category: 'Excavation', title: { en: 'Excavation & Trenching Checklist', ar: '' }, items: [], },
    { id: 'ct_5', org_id: 'org_1', category: 'Lifting', title: { en: 'Lifting Operation Checklist', ar: '' }, items: [], },
    { id: 'ct_6', org_id: 'org_1', category: 'Electrical', title: { en: 'Electrical Work Checklist', ar: '' }, items: [], },
    { id: 'ct_7', org_id: 'org_1', category: 'General Work', title: { en: 'General Work Checklist', ar: '' }, items: [], },
    { id: 'ct_8', org_id: 'org_1', category: 'Road Closure', title: { en: 'Road Closure Checklist', ar: '' }, items: [], },
    { id: 'ct_9', org_id: 'org_1', category: 'Utility Work', title: { en: 'Utility Work Checklist', ar: '' }, items: [], },
    { id: 'ct_10', org_id: 'org_1', category: 'Night Work', title: { en: 'Night Work Checklist', ar: '' }, items: [], },
    { id: 'ct_11', org_id: 'org_1', category: 'HSE Inspection', title: { en: 'HSE Inspection Checklist', ar: '' }, items: [], },
    { id: 'ct_12', org_id: 'org_1', category: 'Emergency Preparedness', title: { en: 'Emergency Preparedness Checklist', ar: '' }, items: [], },
    { id: 'ct_13', org_id: 'org_1', category: 'Toolbox Talk / Training', title: { en: 'Toolbox Talk / Training Checklist', ar: '' }, items: [], },
    { id: 'ct_14', org_id: 'org_1', category: 'Environmental', title: { en: 'Environmental Checklist', ar: '' }, items: [], },
    {
        id: 'ct_15', org_id: 'org_1', category: 'Housekeeping', title: { en: 'General Housekeeping Checklist', ar: 'قائمة فحص النظافة العامة' }, items: [
            { id: 'hk_1_1', text: { en: 'Floors clean and dry', ar: 'الأرضيات نظيفة وجافة' }, description: { en: '', ar: '' } },
            { id: 'hk_1_2', text: { en: 'Aisles & walkways clear', ar: 'الممرات والمشايات خالية' }, description: { en: '', ar: '' } },
            { id: 'hk_1_3', text: { en: 'No debris, no nails', ar: 'لا يوجد حطام أو مسامير' }, description: { en: '', ar: '' } },
            { id: 'hk_1_4', text: { en: 'Stored material stacked safely', ar: 'المواد المخزنة مكدسة بأمان' }, description: { en: '', ar: '' } },
            { id: 'hk_1_5', text: { en: 'Tools returned to toolboxes', ar: 'الأدوات أعيدت إلى صناديقها' }, description: { en: '', ar: '' } },
            { id: 'hk_1_6', text: { en: 'Waste bins available and not overflowing', ar: 'صناديق النفايات متوفرة وغير ممتلئة' }, description: { en: '', ar: '' } },
            { id: 'hk_1_7', text: { en: 'No excessive dust', ar: 'لا يوجد غبار مفرط' }, description: { en: '', ar: '' } },
            { id: 'hk_1_8', text: { en: 'Spill kits available and stocked', ar: 'معدات التعامل مع الانسكابات متوفرة ومجهزة' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_16', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Washroom Checklist', ar: 'قائمة فحص دورات المياه' }, items: [
            { id: 'hk_2_1', text: { en: 'Toilets clean and sanitized', ar: 'المراحيض نظيفة ومعقمة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_2', text: { en: 'Hand wash basin clean', ar: 'حوض غسيل الأيدي نظيف' }, description: { en: '', ar: '' } },
            { id: 'hk_2_3', text: { en: 'Soap available', ar: 'الصابون متوفر' }, description: { en: '', ar: '' } },
            { id: 'hk_2_4', text: { en: 'Tissue available', ar: 'المناديل متوفرة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_5', text: { en: 'No foul odor', ar: 'لا توجد رائحة كريهة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_6', text: { en: 'Exhaust fan working', ar: 'مروحة الشفط تعمل' }, description: { en: '', ar: '' } },
            { id: 'hk_2_7', text: { en: 'Floor dry and clean', ar: 'الأرضية جافة ونظيفة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_8', text: { en: 'Mirror clean', ar: 'المرآة نظيفة' }, description: { en: '', ar: '' } },
            { id: 'hk_2_9', text: { en: 'Door locks working', ar: 'أقفال الأبواب تعمل' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_17', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Eating Area / Canteen Checklist', ar: 'قائمة فحص منطقة الطعام / الكافتيريا' }, items: [
            { id: 'hk_3_1', text: { en: 'Tables & chairs clean', ar: 'الطاولات والكراسي نظيفة' }, description: { en: '', ar: '' } },
            { id: 'hk_3_2', text: { en: 'No insects / pests observed', ar: 'لم تتم ملاحظة حشرات / آفات' }, description: { en: '', ar: '' } },
            { id: 'hk_3_3', text: { en: 'Waste bins covered', ar: 'صناديق النفايات مغطاة' }, description: { en: '', ar: '' } },
            { id: 'hk_3_4', text: { en: 'Hand wash station available and stocked', ar: 'محطة غسيل الأيدي متوفرة ومجهزة' }, description: { en: '', ar: '' } },
            { id: 'hk_3_5', text: { en: 'No leftover food on tables', ar: 'لا يوجد طعام متبق على الطاولات' }, description: { en: '', ar: '' } },
            { id: 'hk_3_6', text: { en: 'Microwave/Fridge clean (if any)', ar: 'الميكروويف/الثلاجة نظيفة (إن وجدت)' }, description: { en: '', ar: '' } },
        ]
    },
    {
        id: 'ct_18', org_id: 'org_1', category: 'Housekeeping', title: { en: 'Rest Area Checklist', ar: 'قائمة فحص منطقة الراحة' }, items: [
            { id: 'hk_4_1', text: { en: 'Benches/chairs clean and in good condition', ar: 'المقاعد/الكراسي نظيفة وفي حالة جيدة' }, description: { en: '', ar: '' } },
            { id: 'hk_4_2', text: { en: 'Air conditioning/fan working effectively', ar: 'التكييف/المروحة تعمل بفعالية' }, description: { en: '', ar: '' } },
            { id: 'hk_4_3', text: { en: 'Drinking water station is clean and functional', ar: 'محطة مياه الشرب نظيفة وتعمل' }, description: { en: '', ar: '' } },
            { id: 'hk_4_4', text: { en: 'Area is free of litter and waste', ar: 'المنطقة خالية من القمامة والنفايات' }, description: { en: '', ar: '' } },
        ]
    },
];
export const checklistRuns: ChecklistRun[] = [];
export const plans: Plan[] = [];
export const rams: Rams[] = [];
export const signs: Sign[] = [
    // ... (Signage data remains unchanged) ...
    { id: 'SGN-001', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Helmet', ar: 'ارتداء خوذة السلامة' }, icon_url: '⛑️', description: { en: 'Mandates the use of safety helmets in designated areas.', ar: 'يفرض استخدام خوذات السلامة في المناطق المخصصة.' }, matched_activities: ['Work at Height', 'Lifting', 'General Work', 'Excavation'], hazards: ['Dropped Object', 'Overhead Load'] },
    { id: 'SGN-002', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Footwear', ar: 'ارتداء أحذية السلامة' }, icon_url: '🥾', description: { en: 'Mandates the use of safety footwear on site.', ar: 'يفرض استخدام أحذية السلامة في الموقع.' }, matched_activities: ['Work at Height', 'Lifting', 'General Work', 'Excavation'], hazards: ['Trip', 'Slippery'] },
    { id: 'SGN-003', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear High-Visibility Vest', ar: 'ارتداء سترة عالية الوضوح' }, icon_url: '🦺', description: { en: 'Mandates high-visibility clothing in areas with vehicle traffic.', ar: 'يفرض ارتداء ملابس عالية الوضوح في المناطق التي بها حركة مرور للمركبات.' }, matched_activities: ['Night Work', 'Road Closure', 'Lifting'], hazards: ['Moving Machinery'] },
    { id: 'SGN-004', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Harness', ar: 'ارتداء حزام الأمان' }, icon_url: '🧗', description: { en: 'Mandates use of a safety harness for fall protection.', ar: 'يفرض استخدام حزام الأمان للحماية من السقوط.' }, matched_activities: ['Work at Height', 'Confined Space Entry'], hazards: ['Fall'] },
    // ... (Truncated signage list to save space, assume remaining exist) ...
    { id: 'SGN-020', org_id: 'org_1', category: 'Emergency', title: { en: 'Emergency Exit', ar: 'مخرج طوارئ' }, icon_url: '🏃', description: { en: 'Indicates the direction to the nearest emergency exit.', ar: 'يشير إلى اتجاه أقرب مخرج طوارئ.' }, matched_activities: [], hazards: [] },
    { id: 'SGN-023', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Extinguisher', ar: 'طفاية حريق' }, icon_url: '🧯', description: { en: 'Marks the location of a fire extinguisher.', ar: 'يحدد موقع طفاية الحريق.' }, matched_activities: ['Hot Work'], hazards: ['Fire'] },
    { id: 'SGN-025', org_id: 'org_1', category: 'Traffic', title: { en: 'Road Closed', ar: 'الطريق مغلق' }, icon_url: '🚧', description: { en: 'Indicates that the road ahead is closed to all traffic.', ar: '' }, matched_activities: ['Road Closure', 'Excavation', 'Utility Work'], hazards: [] },
];
export const tbtSessions: TbtSession[] = [];
export const trainingCourses: TrainingCourse[] = [];
export const trainingRecords: TrainingRecord[] = [];
export const trainingSessions: TrainingSession[] = [];
export const notifications: Notification[] = [];

const startDate1 = new Date();
const endDate1 = new Date(Date.now() + 8 * 3600 * 1000);
const startDate2 = new Date(Date.now() + 24 * 3600 * 1000);
const endDate2 = new Date(Date.now() + 32 * 3600 * 1000);

export const ptws: Ptw[] = [
    {
        id: 'ptw_1',
        org_id: 'org_1',
        project_id: 'proj_1',
        type: 'Hot Work',
        status: 'ACTIVE',
        title: 'Welding on Level 5',
        payload: {
            creator_id: 'user_2',
            permit_no: 'HW-2024-001',
            category: 'standard',
            requester: { name: 'Maria Garcia', email: 'maria.garcia@clint.com', mobile: '555-0102', designation: 'Supervisor', contractor: 'Clint Operations', signature: 'Maria Garcia' },
            work: {
                description: 'Welding support brackets for HVAC system.',
                location: 'Level 5, Sector B',
                coverage: {
                    start_date: startDate1.toISOString().split('T')[0],
                    end_date: endDate1.toISOString().split('T')[0],
                    start_time: startDate1.toTimeString().slice(0, 5),
                    end_time: endDate1.toTimeString().slice(0, 5)
                }
            },
            ppe: { 'hard_hat': true, 'safety_shoes': true, 'goggles': true } as any,
            safety_requirements: ptwChecklistData['Hot Work']?.map(item => ({...item, response: 'N/A'})) || [],
            attachments: [],
            fire_watcher: { name: 'John Doe', mobile: '555-0105' },
            post_watch_minutes: 30,
        } as PtwHotWorkPayload,
        audit_log: [],
        approvals: []
    },
    {
        id: 'ptw_2',
        org_id: 'org_1',
        project_id: 'proj_1',
        type: 'Work at Height',
        status: 'DRAFT',
        title: 'Facade panel installation',
        payload: {
            creator_id: 'user_3',
            permit_no: 'WAH-2024-002',
            category: 'standard',
            requester: { name: 'Chen Wei', email: 'chen.wei@clint.com', mobile: '555-0103', designation: 'Inspector', contractor: 'Clint Operations', signature: '' },
            work: {
                description: 'Installation of glass panels on exterior facade.',
                location: 'Tower A, Levels 10-12',
                coverage: {
                    start_date: startDate2.toISOString().split('T')[0],
                    end_date: endDate2.toISOString().split('T')[0],
                    start_time: startDate2.toTimeString().slice(0, 5),
                    end_time: endDate2.toTimeString().slice(0, 5)
                }
            },
            ppe: { 'hard_hat': true, 'safety_harness': true, 'safety_shoes': true } as any,
            safety_requirements: ptwChecklistData['Work at Height']?.map(item => ({...item, response: 'N/A'})) || [],
            attachments: [],
            access_equipment: {
                step_ladder: false, independent_scaffolding: true, tower_mobile_scaffolding: false,
                scissor_lift: false, articulated_telescopic_boom: false, boatswain_chair: false,
                man_basket: false, rope_access_system: false, roof_ladder: false, other: ''
            }
        } as PtwWorkAtHeightPayload,
        audit_log: [],
        approvals: []
    }
];

export const certificationProfile: CertificationProfile = {
    user_id: 'user_kamran',
    org_id: 'org_1',
    level: 'Advanced',
    role_title: 'HSE Manager',
    safe_working_hours: 3680,
    total_years_experience: 7,
    last_incident_date: '2023-11-15',
    qualifications: [
        { id: 'q1', title: 'NEBOSH IGC', issuer: 'NEBOSH', date_obtained: '2020-05-20', verification_status: 'Verified' },
        { id: 'q2', title: 'IOSH Managing Safely', issuer: 'IOSH', date_obtained: '2022-01-15', expiry_date: '2025-01-15', verification_status: 'Verified' },
        { id: 'q3', title: 'Advanced First Aid', issuer: 'Red Crescent', date_obtained: '2023-03-10', expiry_date: '2025-03-10', verification_status: 'Pending' }
    ],
    requirements_met: {
        training: true,
        experience: true,
        safe_hours: false, // Needs 5000 for Expert
        behavior: true
    }
};