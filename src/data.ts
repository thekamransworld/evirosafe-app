import type { 
  Organization, User, Project, Report, Inspection, ChecklistTemplate, 
  ChecklistRun, Plan, Rams, Sign, TbtSession, TrainingCourse, 
  TrainingRecord, TrainingSession, Notification, Ptw, CertificationProfile 
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

// --- 50 HSE CHECKLIST TEMPLATES ---
const createChecklist = (id: string, cat: string, title: string, items: string[]) => ({
    id, org_id: 'org_1', category: cat, title: { en: title },
    items: items.map((text, i) => ({ id: `${id}_${i}`, text: { en: text }, description: { en: 'Verify compliance' } }))
});

export const checklistTemplates: ChecklistTemplate[] = [
    // General Safety
    createChecklist('cl_1', 'General', 'Daily Site Safety Inspection', ['PPE compliance', 'Housekeeping', 'Access/Egress clear', 'Signage in place']),
    createChecklist('cl_2', 'General', 'Weekly HSE Walkdown', ['Scaffolding tags', 'Electrical panels locked', 'Fire extinguishers checked', 'Welfare facilities clean']),
    createChecklist('cl_3', 'General', 'PPE Compliance Check', ['Helmets', 'Safety Shoes', 'High-Vis Vests', 'Eye Protection', 'Gloves']),
    createChecklist('cl_4', 'General', 'Site Perimeter & Security', ['Fencing intact', 'Gates secured', 'Security guard present', 'Lighting functional']),
    createChecklist('cl_5', 'General', 'Welfare Facilities', ['Drinking water available', 'Toilets clean', 'Rest area shaded', 'Hand wash available']),
    
    // Work at Height
    createChecklist('cl_6', 'Work at Height', 'Scaffolding Inspection (Weekly)', ['Base plates secure', 'Bracing complete', 'Guardrails installed', 'Tag (Green/Red) updated']),
    createChecklist('cl_7', 'Work at Height', 'Ladder Safety', ['Rungs in good condition', 'Secured at top/bottom', 'Correct angle (1:4)', 'Non-conductive if near electrical']),
    createChecklist('cl_8', 'Work at Height', 'Mobile Elevating Work Platform (MEWP)', ['Operator certified', 'Outriggers deployed', 'Emergency controls functional', 'Harness worn']),
    createChecklist('cl_9', 'Work at Height', 'Safety Harness & Lanyard', ['Webbing intact', 'Buckles functional', 'Shock absorber undeployed', 'Inspection tag valid']),
    createChecklist('cl_10', 'Work at Height', 'Roof Work', ['Edge protection', 'Fragile roof signs', 'Crawling boards used', 'Weather conditions suitable']),

    // Electrical
    createChecklist('cl_11', 'Electrical', 'Portable Power Tools', ['Cables undamaged', 'Guards in place', 'PAT test valid', 'Dead man switch functional']),
    createChecklist('cl_12', 'Electrical', 'Temporary Electrical Supply', ['DBs locked', 'ELCB/RCD tested', 'Cables elevated/buried', 'Warning signs posted']),
    createChecklist('cl_13', 'Electrical', 'Lock Out Tag Out (LOTO)', ['Isolation verified', 'Locks applied', 'Tags completed', 'Keys secured']),
    createChecklist('cl_14', 'Electrical', 'Generator Inspection', ['Earthing connected', 'Drip tray present', 'Fire extinguisher nearby', 'No leaks']),
    createChecklist('cl_15', 'Electrical', 'Cable Management', ['No trip hazards', 'Cables hung on hooks', 'Joints proper (no tape)', 'Protected from damage']),

    // Lifting & Rigging
    createChecklist('cl_16', 'Lifting', 'Mobile Crane Pre-Use', ['Operator license valid', 'Load chart available', 'Outriggers fully extended', 'Ground conditions stable']),
    createChecklist('cl_17', 'Lifting', 'Lifting Gear (Slings/Shackles)', ['SWL marked', 'Color code current', 'No cuts/frays', 'Safety latches on hooks']),
    createChecklist('cl_18', 'Lifting', 'Tower Crane Weekly', ['Limit switches tested', 'Brakes functional', 'Structure bolts tight', 'Wind speed monitor working']),
    createChecklist('cl_19', 'Lifting', 'Forklift Inspection', ['Horn/Reverse alarm', 'Forks condition', 'Hydraulics (no leaks)', 'Seatbelt functional']),
    createChecklist('cl_20', 'Lifting', 'Rigging Plan Verification', ['Load weight confirmed', 'Radius measured', 'Ground bearing pressure checked', 'Wind speed within limits']),

    // Fire Safety
    createChecklist('cl_21', 'Fire', 'Fire Extinguisher Monthly', ['Pressure gauge in green', 'Pin & seal intact', 'Hose clear', 'Inspection tag updated']),
    createChecklist('cl_22', 'Fire', 'Hot Work Area', ['Combustibles removed (10m)', 'Fire watcher present', 'Extinguisher available', 'Gas test done']),
    createChecklist('cl_23', 'Fire', 'Emergency Evacuation Route', ['Routes clear', 'Exit signs visible', 'Emergency lighting functional', 'Assembly point marked']),
    createChecklist('cl_24', 'Fire', 'Flammable Storage', ['Ventilation adequate', 'Bunded area', 'MSDS available', 'No smoking signs']),
    createChecklist('cl_25', 'Fire', 'Fire Alarm System', ['Panel normal', 'Call points accessible', 'Sounders audible', 'Weekly test log']),

    // Excavation
    createChecklist('cl_26', 'Excavation', 'Excavation Daily', ['Shoring/Benching intact', 'Access/Egress (ladder)', 'Spoil pile 1m back', 'Barriers & signage']),
    createChecklist('cl_27', 'Excavation', 'Underground Utilities', ['Scanning done', 'Services marked', 'Hand digging near cables', 'Permit active']),
    createChecklist('cl_28', 'Excavation', 'Dewatering', ['Pumps functional', 'Discharge hose secured', 'Sediment tank used', 'No oil leaks']),

    // Confined Space
    createChecklist('cl_29', 'Confined Space', 'Pre-Entry Check', ['Gas test (O2, LEL, H2S, CO)', 'Ventilation running', 'Attendant (Standby Man) present', 'Rescue tripod ready']),
    createChecklist('cl_30', 'Confined Space', 'BA Set Inspection', ['Cylinder pressure', 'Mask seal', 'Straps condition', 'Whistle test']),

    // Plant & Machinery
    createChecklist('cl_31', 'Machinery', 'Heavy Equipment Daily', ['Brakes/Steering', 'Reverse alarm/Camera', 'Lights/Mirrors', 'No fluid leaks']),
    createChecklist('cl_32', 'Machinery', 'Vehicle Marshalling', ['Banksman present', 'Hi-vis clothing', 'Communication clear', 'Pedestrian segregation']),
    createChecklist('cl_33', 'Machinery', 'Concrete Mixer/Pump', ['Pipe connections secure', 'Whip checks fitted', 'Washout area used', 'Operator PPE']),

    // Environmental
    createChecklist('cl_34', 'Environment', 'Waste Management', ['Bins segregated (Gen/Haz)', 'No overflowing', 'Skip covered', 'Collection schedule']),
    createChecklist('cl_35', 'Environment', 'Spill Control', ['Spill kits available', 'Drip trays under plant', 'Chemicals stored correctly', 'Soil contamination check']),
    createChecklist('cl_36', 'Environment', 'Dust & Noise', ['Water spraying used', 'Equipment covers closed', 'Ear protection zones', 'Work hours respected']),

    // Health & Hygiene
    createChecklist('cl_37', 'Health', 'First Aid Box', ['Contents complete', 'Nothing expired', 'Box clean/marked', 'Eyewash station check']),
    createChecklist('cl_38', 'Health', 'Heat Stress Management', ['Rest areas shaded', 'Cool water available', 'Flag system active', 'Rehydration salts']),
    createChecklist('cl_39', 'Health', 'Canteen/Dining', ['Cleanliness', 'Hand wash soap', 'Pest control', 'Food storage']),
    createChecklist('cl_40', 'Health', 'Camp Inspection', ['Room density', 'Fire safety', 'Kitchen hygiene', 'Toilet facilities']),

    // Specialized
    createChecklist('cl_41', 'Special', 'Night Work', ['Lighting adequate', 'Hi-vis reflective', 'Lone worker check', 'Emergency comms']),
    createChecklist('cl_42', 'Special', 'Road Works', ['Traffic cones/barriers', 'Flagman present', 'Diversion signs', 'Safety buffer zone']),
    createChecklist('cl_43', 'Special', 'Demolition', ['Services disconnected', 'Exclusion zone', 'Dust suppression', 'Falling debris protection']),
    createChecklist('cl_44', 'Special', 'Piling Operations', ['Auger guarded', 'Platform stable', 'Concrete delivery safe', 'Noise control']),
    createChecklist('cl_45', 'Special', 'Steel Erection', ['Fall arrest nets', 'Wind speed check', 'Bolt tightening', 'Crane coordination']),
    createChecklist('cl_46', 'Special', 'Painting/Coating', ['Ventilation (if indoor)', 'Respirators worn', 'Flammables storage', 'Spill protection']),
    createChecklist('cl_47', 'Special', 'Manual Handling', ['Load weight assessed', 'Team lifting used', 'Mechanical aids available', 'Gloves worn']),
    createChecklist('cl_48', 'Special', 'Office Safety', ['Cables tidied', 'Ergonomics', 'Fire exits clear', 'PAT testing']),
    createChecklist('cl_49', 'Special', 'Warehouse/Stores', ['Racking condition', 'Aisles clear', 'Stacking height', 'Ladder safety']),
    createChecklist('cl_50', 'Special', 'Security Gate', ['Logbook maintained', 'Visitor induction', 'Vehicle search', 'PPE check']),
];

// --- SAMPLE PLANS ---
export const plans: Plan[] = [
    {
        id: 'plan_1', org_id: 'org_1', project_id: 'proj_1', type: 'HSEMP', title: 'Project HSE Plan', version: 'v1.0', status: 'approved',
        people: { prepared_by: { name: 'Alex Johnson', email: 'alex@clint.com', signed_at: '2024-01-01' } },
        dates: { created_at: '2024-01-01', updated_at: '2024-01-05', next_review_at: '2024-06-01' },
        content: { body_json: [], attachments: [] }, meta: { tags: ['Master'], change_note: '' }, audit_trail: []
    },
    {
        id: 'plan_2', org_id: 'org_1', project_id: 'proj_1', type: 'Lifting', title: 'Heavy Lift Plan - Chiller', version: 'v2.0', status: 'draft',
        people: { prepared_by: { name: 'Maria Garcia', email: 'maria@clint.com' } },
        dates: { created_at: '2024-02-10', updated_at: '2024-02-10', next_review_at: '2024-02-20' },
        content: { body_json: [], attachments: [] }, meta: { tags: ['Crane'], change_note: '' }, audit_trail: []
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

// --- INSPECTIONS (UPDATED FOR PHASED WORKFLOW) ---
export const inspections: Inspection[] = [
    {
        id: 'insp_1',
        org_id: 'org_1',
        project_id: 'proj_1',
        title: 'Weekly Site Safety Audit',
        type: 'Safety',
        status: 'Closed',
        current_phase: 'closed', // NEW FIELD
        person_responsible_id: 'user_alex',
        checklist_template_id: 'cl_1',
        schedule_at: '2024-03-10T09:00',
        team_member_ids: ['user_kamran'],
        observers: [],
        findings: [
            {
                id: 'f1',
                description: 'Scaffolding tag missing on Tower A',
                risk_level: 'High',
                category: 'Unsafe Condition',
                observation_category: 'equipment', // NEW FIELD
                observation_type: 'unsafe_condition', // NEW FIELD
                immediate_actions: 'Tag replaced immediately',
                evidence_urls: [],
                corrective_action_required: true,
                status: 'closed'
            }
        ],
        opening_meeting: {
            conducted_at: '2024-03-10T09:00',
            attendees: ['user_kamran', 'user_alex'],
            supervisor_present: 'John Doe',
            hazards_discussed: 'Working at height, dropped objects',
            permits_verified: true,
            emergency_procedures_confirmed: true
        },
        closing_meeting: {
            conducted_at: '2024-03-10T11:00',
            attendees: ['user_kamran', 'user_alex'],
            key_findings_summary: 'Generally good compliance, one scaffold tag missing.',
            immediate_actions_agreed: 'Tag replaced.',
            supervisor_acknowledged: true,
            follow_up_required: false
        },
        audit_trail: []
    },
    {
        id: 'insp_2',
        org_id: 'org_1',
        project_id: 'proj_2',
        title: 'Electrical Equipment Check',
        type: 'Equipment',
        status: 'In Progress',
        current_phase: 'execution', // NEW FIELD
        person_responsible_id: 'user_kamran',
        checklist_template_id: 'cl_11',
        schedule_at: '2024-03-15T14:00',
        team_member_ids: [],
        observers: [],
        findings: [],
        opening_meeting: {
            conducted_at: '2024-03-15T14:00',
            attendees: ['user_kamran'],
            supervisor_present: 'Mike Smith',
            hazards_discussed: 'Live electricity, LOTO',
            permits_verified: true,
            emergency_procedures_confirmed: true
        },
        audit_trail: []
    }
];

// --- EMPTY PLACEHOLDERS (To prevent crashes) ---
export const reports: Report[] = [];
export const checklistRuns: ChecklistRun[] = [];
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