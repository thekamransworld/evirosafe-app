// --- CORE ENTITIES ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: 'active' | 'suspended';
  timezone: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  branding: {
    logoUrl: string;
    primaryColor?: string;
  };
  industry: string;
  country: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'HSE_MANAGER' | 'HSE_OFFICER' | 'SUPERVISOR' | 'INSPECTOR' | 'WORKER' | 'CLIENT_VIEWER' | 'CUSTOM_SITE_LEAD';
  status: 'active' | 'inactive' | 'invited' | 'pending_approval';
  mobile?: string;
  designation?: string;
  company?: string;
  department?: string;
  qualification?: string;
  certifications?: string[]; // Array of cert names
  preferences: {
    language: string;
    default_view: View;
    units: {
      temperature: 'C' | 'F';
      wind_speed: 'km/h' | 'mph';
      height: 'm' | 'ft';
      weight: 'kg' | 'lbs';
    };
    notifications?: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    date_format?: string;
    time_format?: string;
    theme?: 'light' | 'dark' | 'system';
  };
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  code: string;
  status: 'active' | 'pending' | 'archived';
  location: string;
  start_date: string;
  finish_date: string;
  manager_id: string;
  type: string;
  hse_manager?: string; // Name string for display
  last_inspection?: string; // ISO Date string
}

export type Resource = 'dashboard' | 'reports' | 'inspections' | 'plans' | 'rams' | 'training' | 'people' | 'settings' | 'files' | 'analytics' | 'checklists' | 'signage' | 'tbt' | 'projects' | 'roles' | 'ptw' | 'housekeeping' | 'actions' | 'site-map' | 'certification' | 'organizations';
export type View = Resource | 'ai-insights';
export type Action = 'read' | 'create' | 'update' | 'approve' | 'delete' | 'export' | 'assign' | 'edit';
export type Scope = 'org' | 'project' | 'own';

export interface Permission {
  resource: Resource;
  actions: Action[];
  scope: Scope;
}

export interface Role {
  org_id: string | null;
  key: string;
  label: string;
  is_system: boolean;
  permissions: Permission[];
}

export interface Notification {
  id: string;
  user_id: string;
  report_id?: string;
  is_read: boolean;
  message: string;
  timestamp: string;
  type?: 'info' | 'alert' | 'success' | 'warning';
}

export interface AuditLogEntry {
  user_id: string;
  timestamp: string;
  action: string;
  details?: string;
  user_name?: string; // For display
}

// --- ACTION TRACKER ---

export interface ActionItem {
  id: string;
  action: string;
  owner_id: string;
  due_date: string;
  status: 'Open' | 'In Progress' | 'Closed' | 'Pending Review' | 'Verified' | 'On Hold';
  project_id: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  source: {
    type: 'Report' | 'Inspection' | 'Standalone' | 'Manual';
    id: string;
    description: string;
  };
  origin: {
      type: 'report-capa' | 'standalone' | 'inspection-finding';
      parentId: string; // Report ID or Inspection ID or Standalone ID
      itemId: string;   // Array index or sub-ID
  };
  // Advanced fields
  actionType?: string; // Corrective, Preventive, etc.
  category?: string;
  verificationRequired?: boolean;
  recurrencePrevention?: boolean;
  costEstimate?: number;
  comments?: { id: string, user: string, text: string, timestamp: string }[];
  progress_percentage?: number;
  target_completion_date?: string; // Alias for due_date often used in forms
  actual_completion_date?: string;
  root_cause?: string;
  action_plan?: string;
  required_resources?: string[];
  assigned_to?: string; // Name/ID
  assigned_date?: string;
  inspectionTitle?: string;
  effectiveness_check?: { performed_date: string };
  finding?: any; // Linked finding object
}

// --- INSPECTIONS & FINDINGS (NEW) ---

export type InspectionStatus = 'Draft' | 'Scheduled' | 'Ongoing' | 'In Progress' | 'Submitted' | 'Pending Review' | 'Approved' | 'Closed' | 'Overdue' | 'Archived';
export type InspectionType = 'Safety' | 'Quality' | 'Environmental' | 'Fire' | 'Equipment' | 'Health' | 'Process';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface InspectionFinding {
  id: string;
  inspection_id: string;
  checklist_item_id?: string; // Links finding to a specific checklist item
  finding_number?: string; // Readable ID e.g. F-001
  description: string;
  risk_level: RiskLevel;
  category: string; // e.g., 'Unsafe Act', 'Housekeeping'
  status: 'Open' | 'Closed' | 'Corrected on Site';
  evidence_urls: string[];
  corrective_action_required: boolean;
  assigned_to_id?: string;
  due_date?: string;
  created_at: string;
  gps_tag?: { lat: number; lng: number };
  
  // Extra fields for deep integration
  location?: { specific_location: string };
  type?: string; // Unsafe Act/Condition
  risk_assessment?: { risk_level: RiskLevel };
}

export interface InspectionChecklistItemResult {
  item_id: string;
  status: 'Pass' | 'Fail' | 'NA';
  comments?: string;
  evidence_urls?: string[];
  finding_id?: string; // Link to a finding if Failed
}

export interface Inspection {
  id: string;
  inspection_id?: string; // Human readable ID e.g., INSP-2023-001
  org_id: string;
  project_id: string;
  title: string;
  type: InspectionType;
  status: InspectionStatus;
  
  // Scheduling & Team
  schedule_at: string;
  estimated_duration?: number; // minutes
  person_responsible_id: string;
  team_member_ids: string[];
  observers?: string[];

  // Checklist Data
  checklist_template_id: string;
  checklist_results?: InspectionChecklistItemResult[];
  
  // Findings
  findings?: InspectionFinding[];
  
  // Meta
  score?: number; // Calculated score %
  location_area?: string; // Specific zone
  overall_comments?: string;
  audit_trail: AuditLogEntry[];
  
  // Global Readiness / Modern Fields
  hse_compliance?: Record<string, boolean>;
  pre_inspection_briefing?: string;
  ppe_requirements?: string;
  evidence_urls?: string[]; // General inspection evidence
  
  // Additional context fields
  entity_name?: string; // Project Name
  description?: string;
  created_at?: string;
  updated_at?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  checklist_items?: any[]; // Snapshot of items
  corrective_actions?: ActionItem[]; // Linked actions
  compliance_score?: number;
  safety_index?: number;
  location?: { site_name: string };
  schedule?: { scheduled_date: string; scheduled_time?: string; type?: 'planned' | 'immediate'; frequency?: any; reminder_settings?: any; };
  inspection_team?: { team_lead?: any; inspectors?: any[] };
  stakeholders?: any[];
  overall_risk_level?: RiskLevel;
  actual_timings?: { end_time: string };
}

// --- CHECKLISTS ---

export interface ChecklistItem {
  id: string;
  text: Record<string, string> | string; // Support multi-lang or simple string
  description: Record<string, string> | string;
  category?: string;
}

export interface ChecklistTemplate {
  id: string;
  org_id: string;
  category: string;
  title: Record<string, string> | string;
  description?: string;
  items: ChecklistItem[];
  is_system?: boolean; // If true, cannot be deleted (default library)
}

export interface ChecklistRun {
  id: string;
  org_id: string;
  project_id: string;
  template_id: string;
  executed_by_id: string;
  executed_at: string;
  status: 'in_progress' | 'completed';
  score?: number;
  results: {
      item_id: string;
      result: 'pass' | 'fail' | 'na';
      remarks?: string;
      evidence_urls?: string[];
  }[];
}

// --- REPORTING ---

export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'closed' | 'active';
export type ReportClassification = 'To Be Determined' | 'Minor' | 'Moderate' | 'Major' | 'Fatal';
export type ImpactedParty = 'Employee' | 'Contractor' | 'Visitor' | 'Public' | 'Environment';
export type RootCause = 'Human Error' | 'Equipment Failure' | 'Process Deficiency' | 'Environment' | 'Other';
export type Severity = 1 | 2 | 3 | 4 | 5;
export type Likelihood = 1 | 2 | 3 | 4 | 5;

export type ReportType = 
  | 'Incident'
  | 'Accident'
  | 'Near Miss'
  | 'Unsafe Act'
  | 'Unsafe Condition'
  | 'First Aid Case (FAC)'
  | 'Medical Treatment Case (MTC)'
  | 'Lost Time Injury (LTI)'
  | 'Restricted Work Case (RWC)'
  | 'Property / Asset Damage'
  | 'Environmental Incident'
  | 'Fire Event'
  | 'Leadership Event'
  | 'Positive Observation';

export interface RiskMatrix {
  severity: Severity;
  likelihood: Likelihood;
}

export interface CapaAction {
  id?: string;
  type: 'Corrective' | 'Preventive';
  action: string;
  owner_id: string;
  due_date: string;
  status: 'Open' | 'In Progress' | 'Closed';
  verified_at?: string;
  verified_by_id?: string;
}

export interface ReportDistribution {
  user_ids: string[];
  additional_recipients?: string[];
  send_alert_on_submit: boolean;
  notify_on_update: boolean;
  cc_role_key?: string;
}

export interface ReportAcknowledgement {
  user_id: string;
  acknowledged_at: string;
}

// Specific Report Details
export interface AccidentDetails {
    person_name: string;
    designation: string;
    nature_of_injury: 'Laceration' | 'Burn' | 'Fracture' | 'Sprain' | 'Other';
    body_part_affected: string; 
    treatment_given: string; 
    days_lost?: number;
    medical_report_urls?: string[];
}
export interface IncidentDetails {
    property_damage_details?: string;
    environmental_impact: {
        type_of_impact: 'Spill' | 'Emission' | 'Noise' | 'Waste' | 'Other';
        quantity_extent: string;
        containment_action: string;
        authority_notified: boolean;
        notification_ref?: string;
    } | null;
}
export interface NearMissDetails { potential_consequence: string; }
export interface UnsafeActDetails { act_category: string; coaching_given: boolean; coaching_notes?: string; }
export interface UnsafeConditionDetails { condition_category: string; temporary_control_applied: string; }
export interface LeadershipEventDetails { event_type_code: string; leader_name?: string; attendees_count?: number; key_observations?: string; }

export type ReportDetails = AccidentDetails | IncidentDetails | NearMissDetails | UnsafeActDetails | UnsafeConditionDetails | LeadershipEventDetails;

export interface Report {
    id: string;
    creator_id?: string;
    org_id: string;
    project_id: string;
    type: ReportType;
    status: ReportStatus;
    classification?: ReportClassification;
    reporter_id: string;
    reported_at: string;
    work_related: boolean;
    impacted_party: ImpactedParty[];
    occurred_at: string;
    location: {
        text: string;
        specific_area: string;
        geo?: { lat: number; lng: number };
    };
    description: string;
    conditions?: string;
    immediate_actions: string;
    further_corrective_action_required: boolean;
    evidence_urls: string[];
    ai_evidence_summary?: string;
    ai_suggested_evidence?: string[];
    risk_pre_control: RiskMatrix;
    root_cause?: RootCause;
    capa: CapaAction[];
    distribution: ReportDistribution;
    acknowledgements: ReportAcknowledgement[];
    audit_trail: AuditLogEntry[];
    details: ReportDetails;
    identification?: {
        was_fire: boolean;
        was_injury: boolean;
        was_environment: boolean;
    };
    classification_codes?: string[];
}

// --- PERMIT TO WORK (PTW) ---

export type PtwType = 'General Work' | 'Hot Work' | 'Electrical Work' | 'Excavation' | 'Lifting' | 'Work at Height' | 'Confined Space Entry' | 'Night Work' | 'Road Closure' | 'Utility Work';
export type PtwStatus = 'DRAFT' | 'SUBMITTED' | 'PRE_SCREEN' | 'SITE_INSPECTION' | 'APPROVAL' | 'ACTIVE' | 'HOLD' | 'COMPLETED' | 'CLOSED';

export interface PtwPpe {
    hard_hat: boolean;
    safety_shoes: boolean;
    goggles: boolean;
    safety_harness: boolean;
    coverall: boolean;
    respirator: boolean;
    safety_gloves: boolean;
    vest: boolean;
    other?: string;
}
export interface PtwSafetyRequirement {
    id: string;
    text: string;
    response: 'Yes' | 'No' | 'N/A';
    is_critical?: boolean;
    comment?: string;
    evidence_urls?: string[];
}
export interface PtwSignature { signature: string; signed_at: string; }
export interface PtwSignoff { name: string; designation: string; email: string; mobile: string; remarks: string; signature: string; signed_at: string; }
export interface PtwStoppage { time: string; reason: string; stopped_by: string; informed_to: string; restarted_time: string; signature: string; }
export interface PtwExtension { is_requested: boolean; reason: string; days: { from: string; to: string }; hours: { from: string; to: string }; requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; }
export interface PtwClosure { note: string; permit_requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; }

export interface CanonicalPtwPayload {
    creator_id: string;
    permit_no: string;
    category: 'standard' | 'high_risk';
    requester: { name: string; email: string; mobile: string; designation: string; contractor: string; signature: string; };
    contractor_safety_personnel?: { name: string; email: string; mobile: string; designation: string; signature: string; };
    work: { location: string; description: string; coverage: { start_date: string; end_date: string; start_time: string; end_time: string; }; associated_permits?: string[]; number_of_workers?: number; risk_assessment_ref?: string; emergency_contact?: string; };
    safety_requirements: PtwSafetyRequirement[];
    ppe: PtwPpe;
    signoffs?: { client_proponent: PtwSignoff; other_stakeholders: PtwSignoff[]; client_hs: PtwSignoff; };
    joint_inspection?: { remarks: string; requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; };
    holding_or_stoppage?: PtwStoppage[];
    extension?: PtwExtension;
    closure?: PtwClosure;
    attachments?: { name: string; url: string }[];
    audit?: AuditLogEntry[];
    global_compliance?: { standards: string[] };
}

// Specific PTW Payload Types
export interface PtwHotWorkPayload extends CanonicalPtwPayload { fire_watcher: { name: string; mobile: string; }; post_watch_minutes: number; }
export interface PtwWorkAtHeightPayload extends CanonicalPtwPayload { access_equipment: Record<string, any>; }
export interface PtwConfinedSpacePayload extends CanonicalPtwPayload { gas_tests: any[]; entry_log: any[]; }
export interface PtwLiftingPayload extends CanonicalPtwPayload { equipment_details?: any; load_calculation: any; }
export interface PtwExcavationPayload extends CanonicalPtwPayload { soil_type: string; cave_in_protection: string[]; }
export interface PtwRoadClosurePayload extends CanonicalPtwPayload { closure_type: string; }
export interface PtwElectricalWorkPayload extends CanonicalPtwPayload { isolation_details?: any; }
export interface PtwNightWorkPayload extends CanonicalPtwPayload { lighting_check?: boolean; }
export interface PtwUtilityWorkPayload extends CanonicalPtwPayload { utility_ref?: string; }
export interface PtwGeneralWorkPayload extends CanonicalPtwPayload { }

export type PtwPayload = CanonicalPtwPayload | PtwHotWorkPayload | PtwWorkAtHeightPayload | PtwConfinedSpacePayload | PtwLiftingPayload | PtwExcavationPayload | PtwRoadClosurePayload | PtwElectricalWorkPayload | PtwNightWorkPayload | PtwUtilityWorkPayload | PtwGeneralWorkPayload;

export interface Ptw {
    id: string;
    org_id: string;
    project_id: string;
    type: PtwType;
    status: PtwStatus;
    title: string;
    payload: PtwPayload;
    approvals: any[];
    audit_log: AuditLogEntry[];
    compliance_level?: 'FULL' | 'PARTIAL' | 'NONE';
    updated_at: string;
}

// --- PLANS & RAMS ---

export type PlanStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived';
export type PlanType = 'HSEMP' | 'Lifting' | 'Work at Height' | 'Confined Space' | 'Fire' | 'ERP' | 'EMP' | 'Waste';

export interface PlanContentSection { title: string; content: string; is_complete: boolean; }

export interface Plan {
    id: string;
    org_id: string;
    project_id: string;
    type: PlanType;
    title: string;
    version: string;
    status: PlanStatus;
    people: { prepared_by: any; reviewed_by?: any; approved_by_client?: any; };
    dates: { created_at: string; updated_at: string; approved_at?: string; published_at?: string; next_review_at: string; };
    content: { body_json: PlanContentSection[]; attachments: { name: string, url: string }[]; };
    meta: { tags: string[]; change_note: string; };
    audit_trail: AuditLogEntry[];
}

export type RamsStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived';
export type RamsHierarchy = 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';

export interface RamsHazard { id: string; description: string; }
export interface RamsControl { id: string; description: string; hierarchy: RamsHierarchy; }
export interface RamsStep { step_no: number; description: string; hazards: RamsHazard[]; controls: RamsControl[]; risk_before: RiskMatrix; risk_after: RiskMatrix; }

export interface Rams {
    id: string;
    org_id: string;
    project_id: string;
    activity: string;
    location: string;
    status: RamsStatus;
    version: string;
    prepared_by: any;
    reviewed_by?: any;
    approved_by_client?: any;
    times: { created_at: string; updated_at: string; approved_at?: string; valid_from: string; valid_until: string; };
    method_statement: { overview: string; competence: string; sequence_of_operations: RamsStep[]; emergency_arrangements: string; };
    overall_risk_before: number;
    overall_risk_after: number;
    attachments: { name: string, url: string }[];
    linked_ptw_types: PtwType[];
    audit_log: AuditLogEntry[];
}

// --- SIGNAGE & TBT ---

export type SignCategory = 'Prohibition' | 'Mandatory' | 'Warning' | 'Emergency' | 'Fire' | 'Environmental' | 'Traffic' | 'Informational';
export type HazardType = 'Fire' | 'Fall' | 'Electrical' | 'Chemical' | 'Noise' | 'Dropped Object' | 'Overhead Load' | 'Trip' | 'Slippery' | 'Explosion' | 'Moving Machinery' | 'Confined Space' | 'Excavation';

export interface Sign {
    id: string;
    org_id: string;
    category: SignCategory;
    title: Record<string, string>;
    icon_url: string;
    description: Record<string, string>;
    matched_activities: string[]; // Use string[] to be more permissive than just PtwType
    hazards: HazardType[];
}

export interface TbtAttendee { name: string; company: string; role: string; signature: string; attendance_time: string; }

export interface TbtSession {
    id: string;
    org_id: string;
    project_id: string;
    title: string;
    topic_category: string;
    method: 'daily' | 'weekly' | 'ad-hoc';
    location: string;
    conducted_by: { name: string; role: string; signature: string; };
    date: string;
    time: string;
    summary: string;
    hazards_discussed: string[];
    controls_discussed: string[];
    discussion_points: string[];
    attendees: TbtAttendee[];
    attachments: { name: string, url: string }[];
    linked_rams_ids: string[];
    linked_ptw_types: string[];
    linked_plan_ids: string[];
    status: 'draft' | 'scheduled' | 'delivered' | 'closed' | 'archived';
    audit_log: AuditLogEntry[];
}

// --- TRAINING & CERTIFICATION ---

export interface TrainingCourse {
    id: string;
    org_id: string;
    title: string;
    category: string;
    validity_months: number;
    syllabus: string;
    learning_objectives: string[];
    requires_assessment: boolean;
}

export interface TrainingSession {
    id: string;
    course_id: string;
    project_id: string;
    scheduled_at: string;
    trainer_id: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    roster: string[];
    attendance: { user_id: string; attended: boolean; score?: number; }[];
}

export interface TrainingRecord {
    id: string;
    org_id: string;
    user_id: string;
    course_id: string;
    session_id: string;
    issued_at: string;
    expires_at: string;
    score?: number;
    status: 'valid' | 'expiring_soon' | 'expired';
}

export type CertificationLevel = 'Beginner' | 'Competent' | 'Advanced' | 'Expert' | 'Certified Professional';

export interface Qualification {
    id: string;
    title: string;
    issuer: string;
    date_obtained: string;
    expiry_date?: string;
    verification_status: 'Pending' | 'Verified' | 'Rejected';
    attachment_url?: string;
}

export interface CertificationProfile {
    user_id: string;
    org_id: string;
    level: CertificationLevel;
    role_title: string;
    safe_working_hours: number;
    total_years_experience: number;
    last_incident_date?: string;
    qualifications: Qualification[];
    requirements_met: {
        training: boolean;
        experience: boolean;
        safe_hours: boolean;
        behavior: boolean;
    };
    certificate_id?: string;
    certificate_issued_at?: string;
    supervisor_approval?: {
        name: string;
        approved_at: string;
        comments: string;
    };
}