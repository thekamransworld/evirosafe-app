import type { Organization, User, Project, Report, Inspection, ChecklistTemplate, ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, TrainingRecord, Notification, TrainingSession, Ptw, CertificationProfile } from './types';
import { logoSrc, ptwChecklistData } from './config';

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
  }
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
  }
];

export const reports: Report[] = [];
export const inspections: Inspection[] = [];
export const checklistTemplates: ChecklistTemplate[] = [];
export const checklistRuns: ChecklistRun[] = [];
export const plans: Plan[] = [];
export const rams: Rams[] = [];

// --- COMPREHENSIVE SIGNAGE LIBRARY (80+ SIGNS) ---
export const signs: Sign[] = [
    // --- MANDATORY (PPE & BEHAVIOR) ---
    { id: 'SGN-001', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Helmet', ar: 'ارتداء خوذة السلامة' }, icon_url: '⛑️', description: { en: 'Head protection required in this area.', ar: 'حماية الرأس مطلوبة في هذه المنطقة.' }, matched_activities: ['General Work', 'Lifting', 'Excavation'], hazards: ['Dropped Object'] },
    { id: 'SGN-002', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Footwear', ar: 'ارتداء أحذية السلامة' }, icon_url: '🥾', description: { en: 'Steel-toe boots required.', ar: 'أحذية بمقدمة فولاذية مطلوبة.' }, matched_activities: ['General Work', 'Construction'], hazards: ['Trip', 'Slippery'] },
    { id: 'SGN-003', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear High-Vis Vest', ar: 'ارتداء سترة عالية الوضوح' }, icon_url: '🦺', description: { en: 'High visibility clothing mandatory.', ar: 'الملابس عالية الوضوح إلزامية.' }, matched_activities: ['Road Closure', 'Night Work'], hazards: ['Moving Machinery'] },
    { id: 'SGN-004', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Safety Harness', ar: 'ارتداء حزام الأمان' }, icon_url: '🧗', description: { en: 'Fall protection required above 2m.', ar: 'الحماية من السقوط مطلوبة فوق 2 متر.' }, matched_activities: ['Work at Height'], hazards: ['Fall'] },
    { id: 'SGN-005', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Eye Protection', ar: 'ارتداء واقي العين' }, icon_url: '🥽', description: { en: 'Safety glasses or goggles required.', ar: 'النظارات الواقية مطلوبة.' }, matched_activities: ['Hot Work', 'Grinding'], hazards: ['Chemical', 'Flying Particles'] },
    { id: 'SGN-006', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Ear Protection', ar: 'ارتداء واقي الأذن' }, icon_url: '🎧', description: { en: 'High noise area. Hearing protection required.', ar: 'منطقة ضوضاء عالية. حماية السمع مطلوبة.' }, matched_activities: ['Construction', 'Machinery'], hazards: ['Noise'] },
    { id: 'SGN-007', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Hand Protection', ar: 'ارتداء قفازات السلامة' }, icon_url: '🧤', description: { en: 'Protective gloves required.', ar: 'القفازات الواقية مطلوبة.' }, matched_activities: ['Manual Handling', 'Chemical Handling'], hazards: ['Chemical', 'Cuts'] },
    { id: 'SGN-008', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Face Shield', ar: 'ارتداء درع الوجه' }, icon_url: '🛡️', description: { en: 'Full face protection required.', ar: 'حماية الوجه بالكامل مطلوبة.' }, matched_activities: ['Welding', 'Grinding'], hazards: ['Flying Particles'] },
    { id: 'SGN-009', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wear Respiratory Protection', ar: 'ارتداء قناع التنفس' }, icon_url: '😷', description: { en: 'Dust mask or respirator required.', ar: 'قناع الغبار أو التنفس مطلوب.' }, matched_activities: ['Dusty Work', 'Painting'], hazards: ['Dust', 'Fumes'] },
    { id: 'SGN-010', org_id: 'org_1', category: 'Mandatory', title: { en: 'Wash Hands', ar: 'غسل اليدين' }, icon_url: '🧼', description: { en: 'Wash hands after working.', ar: 'اغسل يديك بعد العمل.' }, matched_activities: ['Hygiene'], hazards: ['Biological'] },
    { id: 'SGN-011', org_id: 'org_1', category: 'Mandatory', title: { en: 'Keep Locked', ar: 'ابق مغلقاً' }, icon_url: '🔒', description: { en: 'Keep door locked at all times.', ar: 'ابق الباب مغلقاً في جميع الأوقات.' }, matched_activities: ['Security'], hazards: ['Unauthorized Access'] },
    { id: 'SGN-012', org_id: 'org_1', category: 'Mandatory', title: { en: 'Use Handrail', ar: 'استخدم الدرابزين' }, icon_url: '🪜', description: { en: 'Hold handrail when using stairs.', ar: 'امسك الدرابزين عند استخدام السلالم.' }, matched_activities: ['General Safety'], hazards: ['Fall'] },
    { id: 'SGN-013', org_id: 'org_1', category: 'Mandatory', title: { en: 'Read Manual', ar: 'اقرأ الدليل' }, icon_url: '📖', description: { en: 'Refer to instruction manual before operating.', ar: 'راجع دليل التعليمات قبل التشغيل.' }, matched_activities: ['Machinery'], hazards: ['Mechanical'] },
    { id: 'SGN-014', org_id: 'org_1', category: 'Mandatory', title: { en: 'Switch Off After Use', ar: 'أطفئ بعد الاستخدام' }, icon_url: '🔌', description: { en: 'Turn off equipment when finished.', ar: 'أطفئ المعدات عند الانتهاء.' }, matched_activities: ['Electrical Work'], hazards: ['Electrical'] },
    { id: 'SGN-015', org_id: 'org_1', category: 'Mandatory', title: { en: 'Pedestrians This Way', ar: 'المشاة من هنا' }, icon_url: '🚶', description: { en: 'Designated walkway for pedestrians.', ar: 'ممر مخصص للمشاة.' }, matched_activities: ['Traffic Management'], hazards: ['Moving Machinery'] },

    // --- PROHIBITION (DO NOT DO) ---
    { id: 'SGN-016', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Entry', ar: 'ممنوع الدخول' }, icon_url: '⛔', description: { en: 'Authorized personnel only.', ar: 'للمصرح لهم فقط.' }, matched_activities: ['Restricted Area'], hazards: ['Security'] },
    { id: 'SGN-017', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Smoking', ar: 'ممنوع التدخين' }, icon_url: '🚭', description: { en: 'Smoking strictly prohibited.', ar: 'التدخين ممنوع منعاً باتاً.' }, matched_activities: ['Flammable Area'], hazards: ['Fire'] },
    { id: 'SGN-018', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Open Flames', ar: 'ممنوع اللهب المكشوف' }, icon_url: '🔥', description: { en: 'No matches or open fires.', ar: 'لا أعواد ثقاب أو نيران مكشوفة.' }, matched_activities: ['Fuel Storage'], hazards: ['Explosion'] },
    { id: 'SGN-019', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Mobile Phones', ar: 'ممنوع استخدام الهاتف' }, icon_url: '📵', description: { en: 'Mobile phones prohibited in this area.', ar: 'الهواتف المحمولة ممنوعة في هذه المنطقة.' }, matched_activities: ['Driving', 'Hazardous Area'], hazards: ['Distraction', 'Explosion'] },
    { id: 'SGN-020', org_id: 'org_1', category: 'Prohibition', title: { en: 'Not Drinking Water', ar: 'ماء غير صالح للشرب' }, icon_url: '🚱', description: { en: 'Water is unsafe for consumption.', ar: 'الماء غير آمن للاستهلاك.' }, matched_activities: ['Industrial Water'], hazards: ['Biological'] },
    { id: 'SGN-021', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Photography', ar: 'ممنوع التصوير' }, icon_url: '📸', description: { en: 'Cameras and photography prohibited.', ar: 'الكاميرات والتصوير ممنوع.' }, matched_activities: ['Security'], hazards: ['Security'] },
    { id: 'SGN-022', org_id: 'org_1', category: 'Prohibition', title: { en: 'Do Not Touch', ar: 'لا تلمس' }, icon_url: '✋', description: { en: 'Do not touch equipment or surface.', ar: 'لا تلمس المعدات أو السطح.' }, matched_activities: ['Electrical', 'Hot Surface'], hazards: ['Electrical', 'Burn'] },
    { id: 'SGN-023', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Pedestrians', ar: 'ممنوع مرور المشاة' }, icon_url: '🚷', description: { en: 'No walking in this area.', ar: 'المشي ممنوع في هذه المنطقة.' }, matched_activities: ['Vehicle Route'], hazards: ['Moving Machinery'] },
    { id: 'SGN-024', org_id: 'org_1', category: 'Prohibition', title: { en: 'Do Not Operate', ar: 'لا تشغل' }, icon_url: '🛑', description: { en: 'Equipment locked out or faulty.', ar: 'المعدات مغلقة أو معطلة.' }, matched_activities: ['Maintenance'], hazards: ['Mechanical'] },
    { id: 'SGN-025', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Eating or Drinking', ar: 'ممنوع الأكل والشرب' }, icon_url: '🍔', description: { en: 'Consumption of food/drink prohibited.', ar: 'تناول الطعام/الشراب ممنوع.' }, matched_activities: ['Chemical Area'], hazards: ['Contamination'] },
    { id: 'SGN-026', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Heavy Load', ar: 'ممنوع الأحمال الثقيلة' }, icon_url: '🏋️', description: { en: 'Maximum load limit applies.', ar: 'يطبق حد أقصى للحمل.' }, matched_activities: ['Lifting'], hazards: ['Structural Failure'] },
    { id: 'SGN-027', org_id: 'org_1', category: 'Prohibition', title: { en: 'No Running', ar: 'ممنوع الركض' }, icon_url: '🏃', description: { en: 'Walk, do not run.', ar: 'امشِ، لا تركض.' }, matched_activities: ['General Safety'], hazards: ['Slip/Trip'] },

    // --- WARNING (HAZARDS) ---
    { id: 'SGN-028', org_id: 'org_1', category: 'Warning', title: { en: 'High Voltage', ar: 'جهد عالي' }, icon_url: '⚡', description: { en: 'Danger of electric shock.', ar: 'خطر الصدمة الكهربائية.' }, matched_activities: ['Electrical Work'], hazards: ['Electrical'] },
    { id: 'SGN-029', org_id: 'org_1', category: 'Warning', title: { en: 'Flammable Material', ar: 'مواد قابلة للاشتعال' }, icon_url: '🔥', description: { en: 'Risk of fire.', ar: 'خطر الحريق.' }, matched_activities: ['Storage'], hazards: ['Fire'] },
    { id: 'SGN-030', org_id: 'org_1', category: 'Warning', title: { en: 'Toxic Substance', ar: 'مادة سامة' }, icon_url: '☠️', description: { en: 'Poisonous material present.', ar: 'مادة سامة موجودة.' }, matched_activities: ['Chemical Handling'], hazards: ['Chemical'] },
    { id: 'SGN-031', org_id: 'org_1', category: 'Warning', title: { en: 'Corrosive', ar: 'مادة أكالة' }, icon_url: '🧪', description: { en: 'Corrosive substance hazard.', ar: 'خطر المواد الأكالة.' }, matched_activities: ['Chemical Handling'], hazards: ['Chemical'] },
    { id: 'SGN-032', org_id: 'org_1', category: 'Warning', title: { en: 'Radioactive', ar: 'مشع' }, icon_url: '☢️', description: { en: 'Radiation hazard.', ar: 'خطر الإشعاع.' }, matched_activities: ['NDT Testing'], hazards: ['Radiation'] },
    { id: 'SGN-033', org_id: 'org_1', category: 'Warning', title: { en: 'Biohazard', ar: 'خطر بيولوجي' }, icon_url: '☣️', description: { en: 'Biological hazard present.', ar: 'خطر بيولوجي موجود.' }, matched_activities: ['Medical', 'Waste'], hazards: ['Biological'] },
    { id: 'SGN-034', org_id: 'org_1', category: 'Warning', title: { en: 'Overhead Load', ar: 'حمل علوي' }, icon_url: '🏗️', description: { en: 'Suspended loads overhead.', ar: 'أحمال معلقة بالأعلى.' }, matched_activities: ['Lifting'], hazards: ['Overhead Load'] },
    { id: 'SGN-035', org_id: 'org_1', category: 'Warning', title: { en: 'Forklift Trucks', ar: 'رافعات شوكية' }, icon_url: '🚜', description: { en: 'Forklifts operating in area.', ar: 'رافعات شوكية تعمل في المنطقة.' }, matched_activities: ['Warehouse'], hazards: ['Moving Machinery'] },
    { id: 'SGN-036', org_id: 'org_1', category: 'Warning', title: { en: 'Slippery Surface', ar: 'سطح زلق' }, icon_url: '💧', description: { en: 'Floor may be wet or slippery.', ar: 'الأرضية قد تكون رطبة أو زلقة.' }, matched_activities: ['Cleaning'], hazards: ['Slippery'] },
    { id: 'SGN-037', org_id: 'org_1', category: 'Warning', title: { en: 'Trip Hazard', ar: 'خطر التعثر' }, icon_url: '🦶', description: { en: 'Uneven surface or cables.', ar: 'سطح غير مستوٍ أو كابلات.' }, matched_activities: ['General Work'], hazards: ['Trip'] },
    { id: 'SGN-038', org_id: 'org_1', category: 'Warning', title: { en: 'Hot Surface', ar: 'سطح ساخن' }, icon_url: '♨️', description: { en: 'Do not touch, hot surface.', ar: 'لا تلمس، سطح ساخن.' }, matched_activities: ['Welding'], hazards: ['Burn'] },
    { id: 'SGN-039', org_id: 'org_1', category: 'Warning', title: { en: 'Low Temperature', ar: 'درجة حرارة منخفضة' }, icon_url: '❄️', description: { en: 'Freezing conditions.', ar: 'ظروف التجمد.' }, matched_activities: ['Cold Storage'], hazards: ['Cold'] },
    { id: 'SGN-040', org_id: 'org_1', category: 'Warning', title: { en: 'Explosive Atmosphere', ar: 'جو قابل للانفجار' }, icon_url: '💥', description: { en: 'Risk of explosion (EX zone).', ar: 'خطر الانفجار (منطقة EX).' }, matched_activities: ['Gas Plant'], hazards: ['Explosion'] },
    { id: 'SGN-041', org_id: 'org_1', category: 'Warning', title: { en: 'Laser Beam', ar: 'شعاع الليزر' }, icon_url: '🔦', description: { en: 'Laser hazard.', ar: 'خطر الليزر.' }, matched_activities: ['Surveying'], hazards: ['Radiation'] },
    { id: 'SGN-042', org_id: 'org_1', category: 'Warning', title: { en: 'Magnetic Field', ar: 'مجال مغناطيسي' }, icon_url: '🧲', description: { en: 'Strong magnetic field.', ar: 'مجال مغناطيسي قوي.' }, matched_activities: ['Medical'], hazards: ['Radiation'] },
    { id: 'SGN-043', org_id: 'org_1', category: 'Warning', title: { en: 'Deep Excavation', ar: 'حفر عميق' }, icon_url: '🕳️', description: { en: 'Risk of falling into excavation.', ar: 'خطر السقوط في الحفر.' }, matched_activities: ['Excavation'], hazards: ['Fall'] },
    { id: 'SGN-044', org_id: 'org_1', category: 'Warning', title: { en: 'Falling Objects', ar: 'أجسام متساقطة' }, icon_url: '🧱', description: { en: 'Watch for falling debris.', ar: 'احترس من الحطام المتساقط.' }, matched_activities: ['Scaffolding'], hazards: ['Dropped Object'] },
    { id: 'SGN-045', org_id: 'org_1', category: 'Warning', title: { en: 'Fragile Roof', ar: 'سقف هش' }, icon_url: '🏚️', description: { en: 'Roof cannot support weight.', ar: 'السقف لا يتحمل الوزن.' }, matched_activities: ['Work at Height'], hazards: ['Fall'] },
    { id: 'SGN-046', org_id: 'org_1', category: 'Warning', title: { en: 'Sharp Objects', ar: 'أدوات حادة' }, icon_url: '🔪', description: { en: 'Risk of cuts.', ar: 'خطر الجروح.' }, matched_activities: ['Workshop'], hazards: ['Cuts'] },
    { id: 'SGN-047', org_id: 'org_1', category: 'Warning', title: { en: 'Automatic Start', ar: 'تشغيل تلقائي' }, icon_url: '⚙️', description: { en: 'Machinery may start automatically.', ar: 'الآلات قد تعمل تلقائياً.' }, matched_activities: ['Maintenance'], hazards: ['Mechanical'] },

    // --- EMERGENCY / SAFE CONDITION ---
    { id: 'SGN-048', org_id: 'org_1', category: 'Emergency', title: { en: 'Emergency Exit', ar: 'مخرج طوارئ' }, icon_url: '🚪', description: { en: 'Exit route.', ar: 'طريق الخروج.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-049', org_id: 'org_1', category: 'Emergency', title: { en: 'Assembly Point', ar: 'نقطة التجمع' }, icon_url: '👥', description: { en: 'Muster point for evacuation.', ar: 'نقطة التجمع للإخلاء.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-050', org_id: 'org_1', category: 'Emergency', title: { en: 'First Aid', ar: 'إسعافات أولية' }, icon_url: '➕', description: { en: 'First aid kit/room location.', ar: 'موقع صندوق/غرفة الإسعافات الأولية.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-051', org_id: 'org_1', category: 'Emergency', title: { en: 'Eyewash Station', ar: 'محطة غسيل العين' }, icon_url: '👀', description: { en: 'Emergency eyewash.', ar: 'غسيل العين للطوارئ.' }, matched_activities: ['Chemical Handling'], hazards: ['Chemical'] },
    { id: 'SGN-052', org_id: 'org_1', category: 'Emergency', title: { en: 'Emergency Shower', ar: 'دش الطوارئ' }, icon_url: '🚿', description: { en: 'Safety shower location.', ar: 'موقع دش السلامة.' }, matched_activities: ['Chemical Handling'], hazards: ['Chemical'] },
    { id: 'SGN-053', org_id: 'org_1', category: 'Emergency', title: { en: 'AED Defibrillator', ar: 'جهاز الصدمات' }, icon_url: '💓', description: { en: 'Automated External Defibrillator.', ar: 'جهاز مزيل الرجفان الخارجي الآلي.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-054', org_id: 'org_1', category: 'Emergency', title: { en: 'Stretcher', ar: 'نقالة' }, icon_url: '🛌', description: { en: 'Emergency stretcher location.', ar: 'موقع نقالة الطوارئ.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-055', org_id: 'org_1', category: 'Emergency', title: { en: 'Break Glass', ar: 'اكسر الزجاج' }, icon_url: '🔨', description: { en: 'Break glass in emergency.', ar: 'اكسر الزجاج في حالة الطوارئ.' }, matched_activities: ['Fire Safety'], hazards: [] },
    { id: 'SGN-056', org_id: 'org_1', category: 'Emergency', title: { en: 'Push Bar to Open', ar: 'ادفع لفتح الباب' }, icon_url: '🚪', description: { en: 'Emergency door mechanism.', ar: 'آلية باب الطوارئ.' }, matched_activities: ['General Safety'], hazards: [] },
    { id: 'SGN-057', org_id: 'org_1', category: 'Emergency', title: { en: 'Slide to Open', ar: 'اسحب للفتح' }, icon_url: '↔️', description: { en: 'Door opening direction.', ar: 'اتجاه فتح الباب.' }, matched_activities: ['General Safety'], hazards: [] },

    // --- FIRE SAFETY ---
    { id: 'SGN-058', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Extinguisher', ar: 'طفاية حريق' }, icon_url: '🧯', description: { en: 'Fire extinguisher location.', ar: 'موقع طفاية الحريق.' }, matched_activities: ['Fire Safety'], hazards: ['Fire'] },
    { id: 'SGN-059', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Hose Reel', ar: 'خرطوم الحريق' }, icon_url: '🚒', description: { en: 'Fire hose location.', ar: 'موقع خرطوم الحريق.' }, matched_activities: ['Fire Safety'], hazards: ['Fire'] },
    { id: 'SGN-060', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Alarm Call Point', ar: 'نقطة إنذار الحريق' }, icon_url: '🚨', description: { en: 'Manual call point.', ar: 'نقطة الاتصال اليدوية.' }, matched_activities: ['Fire Safety'], hazards: ['Fire'] },
    { id: 'SGN-061', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Ladder', ar: 'سلم الحريق' }, icon_url: '🪜', description: { en: 'Ladder for fire access.', ar: 'سلم للوصول للحريق.' }, matched_activities: ['Fire Safety'], hazards: ['Fire'] },
    { id: 'SGN-062', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Blanket', ar: 'بطانية الحريق' }, icon_url: '⬜', description: { en: 'Fire blanket location.', ar: 'موقع بطانية الحريق.' }, matched_activities: ['Kitchen', 'Hot Work'], hazards: ['Fire'] },
    { id: 'SGN-063', org_id: 'org_1', category: 'Fire', title: { en: 'Fire Phone', ar: 'هاتف الحريق' }, icon_url: '☎️', description: { en: 'Emergency fire phone.', ar: 'هاتف طوارئ الحريق.' }, matched_activities: ['Fire Safety'], hazards: ['Fire'] },
    { id: 'SGN-064', org_id: 'org_1', category: 'Fire', title: { en: 'Sprinkler Stop Valve', ar: 'صمام الرشاشات' }, icon_url: '🚰', description: { en: 'Control valve for sprinklers.', ar: 'صمام التحكم في الرشاشات.' }, matched_activities: ['Maintenance'], hazards: ['Fire'] },

    // --- ENVIRONMENTAL & TRAFFIC ---
    { id: 'SGN-065', org_id: 'org_1', category: 'Environmental', title: { en: 'Recycle', ar: 'إعادة تدوير' }, icon_url: '♻️', description: { en: 'Recycling point.', ar: 'نقطة إعادة التدوير.' }, matched_activities: ['Waste Management'], hazards: [] },
    { id: 'SGN-066', org_id: 'org_1', category: 'Environmental', title: { en: 'General Waste', ar: 'نفايات عامة' }, icon_url: '🗑️', description: { en: 'General waste bin.', ar: 'سلة النفايات العامة.' }, matched_activities: ['Waste Management'], hazards: [] },
    { id: 'SGN-067', org_id: 'org_1', category: 'Environmental', title: { en: 'Hazardous Waste', ar: 'نفايات خطرة' }, icon_url: '☣️', description: { en: 'Hazardous waste disposal.', ar: 'التخلص من النفايات الخطرة.' }, matched_activities: ['Waste Management'], hazards: ['Chemical'] },
    { id: 'SGN-068', org_id: 'org_1', category: 'Environmental', title: { en: 'Spill Kit', ar: 'طقم الانسكاب' }, icon_url: '🛢️', description: { en: 'Spill containment kit.', ar: 'طقم احتواء الانسكاب.' }, matched_activities: ['Chemical Handling'], hazards: ['Chemical'] },
    { id: 'SGN-069', org_id: 'org_1', category: 'Traffic', title: { en: 'Speed Limit 20', ar: 'السرعة 20' }, icon_url: '2️⃣0️⃣', description: { en: 'Max speed 20 km/h.', ar: 'السرعة القصوى 20 كم/س.' }, matched_activities: ['Driving'], hazards: ['Moving Machinery'] },
    { id: 'SGN-070', org_id: 'org_1', category: 'Traffic', title: { en: 'Stop', ar: 'قف' }, icon_url: '🛑', description: { en: 'Stop vehicle completely.', ar: 'أوقف المركبة تماماً.' }, matched_activities: ['Driving'], hazards: ['Moving Machinery'] },
    { id: 'SGN-071', org_id: 'org_1', category: 'Traffic', title: { en: 'Give Way', ar: 'أفسح الطريق' }, icon_url: '🔻', description: { en: 'Yield to other traffic.', ar: 'أفسح الطريق للمرور الآخر.' }, matched_activities: ['Driving'], hazards: ['Moving Machinery'] },
    { id: 'SGN-072', org_id: 'org_1', category: 'Traffic', title: { en: 'One Way', ar: 'اتجاه واحد' }, icon_url: '⬆️', description: { en: 'Traffic flows one way.', ar: 'حركة المرور في اتجاه واحد.' }, matched_activities: ['Driving'], hazards: ['Moving Machinery'] },
    { id: 'SGN-073', org_id: 'org_1', category: 'Traffic', title: { en: 'No Parking', ar: 'ممنوع الوقوف' }, icon_url: '🅿️', description: { en: 'Parking prohibited.', ar: 'الوقوف ممنوع.' }, matched_activities: ['Driving'], hazards: [] },
    { id: 'SGN-074', org_id: 'org_1', category: 'Traffic', title: { en: 'Parking', ar: 'موقف سيارات' }, icon_url: '🅿️', description: { en: 'Designated parking area.', ar: 'منطقة وقوف مخصصة.' }, matched_activities: ['Driving'], hazards: [] },
    { id: 'SGN-075', org_id: 'org_1', category: 'Traffic', title: { en: 'Pedestrian Crossing', ar: 'ممر مشاة' }, icon_url: '🚶', description: { en: 'Watch for pedestrians.', ar: 'احترس من المشاة.' }, matched_activities: ['Driving'], hazards: ['Moving Machinery'] },
    { id: 'SGN-076', org_id: 'org_1', category: 'Traffic', title: { en: 'Men at Work', ar: 'رجال يعملون' }, icon_url: '👷', description: { en: 'Construction work ahead.', ar: 'أعمال بناء في الأمام.' }, matched_activities: ['Road Closure'], hazards: ['Moving Machinery'] },
    { id: 'SGN-077', org_id: 'org_1', category: 'Traffic', title: { en: 'Road Closed', ar: 'طريق مغلق' }, icon_url: '🚧', description: { en: 'Road closed to traffic.', ar: 'الطريق مغلق أمام حركة المرور.' }, matched_activities: ['Road Closure'], hazards: [] },
    { id: 'SGN-078', org_id: 'org_1', category: 'Traffic', title: { en: 'Turn Left', ar: 'انعطف يساراً' }, icon_url: '⬅️', description: { en: 'Mandatory turn left.', ar: 'انعطاف إجباري لليسار.' }, matched_activities: ['Driving'], hazards: [] },
    { id: 'SGN-079', org_id: 'org_1', category: 'Traffic', title: { en: 'Turn Right', ar: 'انعطف يميناً' }, icon_url: '➡️', description: { en: 'Mandatory turn right.', ar: 'انعطاف إجباري لليمين.' }, matched_activities: ['Driving'], hazards: [] },
    { id: 'SGN-080', org_id: 'org_1', category: 'Informational', title: { en: 'Drinking Water', ar: 'ماء للشرب' }, icon_url: '🚰', description: { en: 'Safe drinking water.', ar: 'ماء شرب آمن.' }, matched_activities: ['Welfare'], hazards: [] },
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
        roles: {
            requester_id: 'user_2',
            issuer_id: 'user_1',
            approver_id: 'user_1',
            receiver_id: 'user_2',
        },
        workflow_log: [],
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
        } as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'ptw_2',
        org_id: 'org_1',
        project_id: 'proj_1',
        type: 'Work at Height',
        status: 'DRAFT',
        title: 'Facade panel installation',
        roles: {
            requester_id: 'user_3',
            issuer_id: 'user_1',
            approver_id: 'user_1',
            receiver_id: 'user_3',
        },
        workflow_log: [],
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
        } as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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