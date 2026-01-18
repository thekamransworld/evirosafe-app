// src/types.ts

// --- CORE ---
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
  status: 'active' | 'inactive' | 'invited' | 'pending_approval' | string; 
  mobile?: string;
  designation?: string;
  company?: string;
  preferences: {
    language: string;
    default_view: string;
    units: {
      temperature: 'C' | 'F';
      wind_speed?: 'km/h' | 'mph';
      height?: 'm' | 'ft';
      weight: 'kg' | 'lbs';
      distance?: 'km' | 'mi';
    };
  };
  project_ids?: string[];
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
  safety_score?: number;
  progress?: number;
  budget?: number;
  budget_spent?: number;
}

export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'plans' | 'rams' | 'training' | 'people' | 'settings' | 'files' | 'analytics' | 'checklists' | 'signage' | 'tbt' | 'organizations' | 'projects' | 'roles' | 'ptw' | 'housekeeping' | 'actions' | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights';

export type View = string;
export type Action = 'read' | 'create' | 'update' | 'approve' | 'delete' | 'export' | 'assign';
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
  report_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

export interface AuditLogEntry {
  user_id: string;
  timestamp: string;
  action: string;
  details?: string;
}

export interface ActionItem {
  id: string;
  action: string;
  owner_id: string;
  due_date: string;
  status: 'Open' | 'In Progress' | 'Closed';
  project_id: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  source: {
    type: 'Report' | 'Inspection' | 'Standalone';
    id: string;
    description: string;
  };
  origin: {
      type: 'report-capa' | 'standalone';
      parentId: string;
      itemId: string;
  }
}

export interface ActivityItem {
    id: string;
    type: 'report' | 'inspection' | 'ptw' | 'rams' | 'equipment' | 'training' | 'message' | 'incident' | 'milestone';
    title: string;
    description: string;
    user: User;
    timestamp: string;
    data: any;
    status?: string;
    priority?: 'low' | 'medium' | 'high';
}

// --- REPORTING ---
// Updated to include all workflow phases
export type ReportStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'under_investigation' 
  | 'capa_required' 
  | 'capa_in_progress' 
  | 'pending_closure' 
  | 'closed' 
  | 'archived';

export type ReportClassification = 'To Be Determined' | 'Minor' | 'Moderate' | 'Major' | 'Fatal';
export type ImpactedParty = 'Employee' | 'Contractor' | 'Visitor' | 'Public' | 'Environment';
export type RootCause = 'Human Error' | 'Equipment Failure' | 'Process Deficiency' | 'Environment' | 'Other';
export type Severity = 1 | 2 | 3 | 4 | 5;
export type Likelihood = 1 | 2 | 3 | 4 | 5;

export type ReportType = 
  | 'Incident' | 'Accident' | 'Near Miss' | 'Unsafe Act' | 'Unsafe Condition'
  | 'First Aid Case (FAC)' | 'Medical Treatment Case (MTC)' | 'Lost Time Injury (LTI)'
  | 'Restricted Work Case (RWC)' | 'Property / Asset Damage' | 'Environmental Incident'
  | 'Fire Event' | 'Leadership Event' | 'Positive Observation';

export interface RiskMatrix {
  severity: Severity;
  likelihood: Likelihood;
}

export interface CapaAction {
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

export interface AccidentDetails { person_name: string; designation: string; nature_of_injury: string; body_part_affected: string; treatment_given: string; days_lost?: number; medical_report_urls?: string[]; }
export interface IncidentDetails { property_damage_details?: string; environmental_impact: { type_of_impact: string; quantity_extent: string; containment_action: string; authority_notified: boolean; notification_ref?: string; } | null; }
export interface NearMissDetails { potential_consequence: string; }
export interface UnsafeActDetails { act_category: string; coaching_given: boolean; coaching_notes?: string; }
export interface UnsafeConditionDetails { condition_category: string; temporary_control_applied: string; }
export interface LeadershipEventDetails { event_type_code: string; leader_name?: string; attendees_count?: number; key_observations?: string; }

export type ReportDetails = AccidentDetails | IncidentDetails | NearMissDetails | UnsafeActDetails | UnsafeConditionDetails | LeadershipEventDetails;

export interface CostImpact {
  directCosts: {
    medical: number;
    repair: number;
    compensation: number;
    fines: number;
  };
  indirectCosts: {
    downtime: number;
    lostProductivity: number;
    training: number;
    administrative: number;
  };
  totalEstimated: number;
  insuranceCoverage: number;
}

export interface Witness {
    name: string;
    contact: string;
    statement: string;
    signature?: string;
}

export interface Report {
    id: string;
    creator_id: string;
    org_id: string;
    project_id: string;
    type: ReportType;
    status: ReportStatus;
    classification: ReportClassification;
    reporter_id: string;
    reported_at: string;
    work_related: boolean;
    impacted_party: ImpactedParty[];
    occurred_at: string;
    location: { text: string; specific_area: string; geo?: { lat: number; lng: number }; };
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
    identification?: { was_fire: boolean; was_injury: boolean; was_environment: boolean; };
    classification_codes?: string[];
    created_at?: string;
    costs?: CostImpact;
    witnesses?: Witness[];
    lessons_learned?: string;
    prevention_strategy?: string;
    root_cause_analysis?: any; // Added to fix build error
}

// --- INSPECTIONS ---
export type InspectionStatus = 'Draft' | 'Ongoing' | 'Submitted' | 'Under Review' | 'Approved' | 'Closed' | 'Archived' | 'In Progress' | 'Scheduled' | 'Pending Review' | 'Overdue';
export type InspectionType = 'Safety' | 'Quality' | 'Environmental' | 'Fire' | 'Equipment' | 'Process';

export type InspectionPhase = 
  | 'planning'
  | 'opening_meeting'
  | 'execution'
  | 'documentation'
  | 'closing_meeting'
  | 'follow_up'
  | 'closed';

export type ObservationCategory = 
  | 'people_behaviors'
  | 'equipment_machinery'
  | 'materials_substances'
  | 'work_environment'
  | 'documentation'
  | 'emergency_preparedness'
  | 'management_systems';

export type ObservationType = 
  | 'unsafe_act'
  | 'unsafe_condition'
  | 'non_compliance'
  | 'best_practice'
  | 'observation';

export interface ImmediateControl {
  action: string;
  taken_by: string;
  taken_at: string;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective';
}

export interface InspectionFinding {
    id: string;
    checklist_item_id?: string;
    description: string;
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
    category: string;
    observation_category: string;
    observation_type: string;
    evidence_urls: string[];
    corrective_action_required: boolean;
    responsible_person_id?: string;
    due_date?: string;
    gps_tag?: { lat: number, lng: number };
    immediate_controls: ImmediateControl[];
    root_causes: string[];
    status: 'open' | 'in_progress' | 'closed';
    created_at: string;
    created_by: string;
    verification_data?: {
        verified_by: string;
        verified_at: string;
        notes: string;
        evidence_urls: string[];
    };
    finding_number?: string;
    risk_assessment?: any;
    type?: any;
}

export interface OpeningMeetingData {
  conducted_at: string;
  supervisor_present: string;
  hazards_discussed: string;
  emergency_procedures_confirmed: boolean;
  permits_verified: boolean;
  stop_work_authority_confirmed: boolean;
  attendees: string[];
  notes: string;
}

export interface ClosingMeetingData {
  conducted_at: string;
  key_findings_summary: string;
  immediate_actions_agreed: string;
  follow_up_required: boolean;
  next_inspection_date?: string;
  supervisor_acknowledged: boolean;
  recommendations: string;
}

// Updated ChecklistItem to support both old and new structures
export interface ChecklistResponse {
  value: 'pass' | 'fail' | 'na';
  comments?: string;
  evidence_ids?: string[];
  timestamp: Date;
  responder: string;
}

export interface ChecklistItem { 
    id: string; 
    text: Record<string, string>; 
    description: Record<string, string>; 
    riskLevel?: string;
    // New fields for enhanced inspection
    requirement?: string;
    criteria?: string;
    category?: string;
    response?: ChecklistResponse;
}

export interface Inspection {
    id: string;
    org_id: string;
    project_id: string;
    title: string;
    type: InspectionType;
    status: InspectionStatus;
    person_responsible_id: string;
    checklist_template_id: string;
    schedule_at: string;
    team_member_ids: string[];
    observers: string[];
    findings: InspectionFinding[];
    overall_comments?: string;
    audit_trail: AuditLogEntry[];
    inspection_id?: string;
    phase?: InspectionPhase;
    opening_meeting?: OpeningMeetingData;
    closing_meeting?: ClosingMeetingData;
    scheduled_follow_up?: string;
    location_area?: string;
    created_at?: string;
    checklist_items?: ChecklistItem[];
    schedule?: { scheduled_date: Date; scheduled_time: string };
    inspection_team?: { team_lead?: any; inspectors?: any[] };
    evidence?: Evidence[];
    entity_id?: string;
}

// --- ALIASES FOR BACKWARD COMPATIBILITY ---
export type HSEInspection = Inspection;
export type HSEFinding = InspectionFinding;

export interface Evidence {
  id: string;
  type: 'photograph' | 'video_recording' | 'audio_note' | 'document_scan';
  title: string;
  description: string;
  url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: Date;
  gps_coordinates?: { latitude: number; longitude: number; accuracy: number };
  timestamp: Date;
  device_info?: any;
  tags: string[];
  encrypted: boolean;
  access_control: string[];
}

// --- CHECKLISTS ---
export interface ChecklistTemplate { id: string; org_id: string; category: string; title: Record<string, string>; items: ChecklistItem[]; popularity?: number; estimatedTime?: number; aiGenerated?: boolean; }
export interface ChecklistRunResult { item_id: string; result: 'pass' | 'fail' | 'na'; remarks?: string; evidence_urls?: string[]; }
export interface ChecklistRun { id: string; org_id: string; project_id: string; template_id: string; executed_by_id: string; executed_at: string; status: 'in_progress' | 'completed'; score?: number; results: ChecklistRunResult[]; }

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
    prepared_by: any; reviewed_by?: any; approved_by_client?: any;
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
export interface Sign { id: string; org_id: string; category: SignCategory; title: Record<string, string>; icon_url: string; description: Record<string, string>; matched_activities: PtwType[]; hazards: HazardType[]; }

export interface TbtAttendee { name: string; company: string; role: string; signature: string; attendance_time: string; }
export interface TbtSession {
    id: string; org_id: string; project_id: string; title: string; topic_category: string; method: 'daily' | 'weekly' | 'ad-hoc'; location: string;
    conducted_by: { name: string; role: string; signature: string; };
    date: string; time: string; summary: string; hazards_discussed: string[]; controls_discussed: string[]; discussion_points: string[];
    attendees: TbtAttendee[]; attachments: { name: string, url: string }[]; linked_rams_ids: string[]; linked_ptw_types: PtwType[]; linked_plan_ids: string[];
    status: 'draft' | 'scheduled' | 'delivered' | 'closed' | 'archived'; audit_log: AuditLogEntry[];
}

// --- TRAINING ---
export interface TrainingCourse { id: string; org_id: string; title: string; category: string; validity_months: number; syllabus: string; learning_objectives: string[]; requires_assessment: boolean; }
export interface TrainingSession { id: string; course_id: string; project_id: string; scheduled_at: string; trainer_id: string; status: 'scheduled' | 'completed' | 'cancelled'; roster: string[]; attendance: { user_id: string; attended: boolean; score?: number; }[]; }
export interface TrainingRecord { id: string; org_id: string; user_id: string; course_id: string; session_id: string; issued_at: string; expires_at: string; score?: number; status: 'valid' | 'expiring_soon' | 'expired'; }

// --- PTW ---
export type PtwType = 'General Work' | 'Hot Work' | 'Electrical Work' | 'Excavation' | 'Lifting' | 'Work at Height' | 'Confined Space Entry' | 'Night Work' | 'Road Closure' | 'Utility Work' | 'Mechanical Work' | 'Chemical Handling';
export type PtwStatus = 'DRAFT' | 'SUBMITTED' | 'PRE_SCREEN' | 'SITE_INSPECTION' | 'APPROVAL' | 'ACTIVE' | 'HOLD' | 'COMPLETED' | 'CLOSED' | 'REQUESTED' | 'ISSUER_REVIEW' | 'ISSUER_SIGNED' | 'IV_REVIEW' | 'PENDING_APPROVAL' | 'APPROVER_SIGNED' | 'AUTHORIZATION' | 'HANDOVER_PENDING' | 'SITE_HANDOVER' | 'SUSPENDED' | 'COMPLETION_PENDING' | 'JOINT_INSPECTION' | 'CANCELLED' | 'ARCHIVED' | 'REJECTED';
export type PtwCategory = 'standard' | 'high_risk' | 'operational' | 'emergency' | 'urgent';
export type PtwWorkflowStage = PtwStatus;

export interface PtwWorkflowLog {
  stage: PtwWorkflowStage;
  action: string;
  user_id: string;
  timestamp: string;
  comments?: string;
  signoff_type?: string;
}

export interface PtwPpe { hard_hat: boolean; safety_shoes: boolean; goggles: boolean; safety_harness: boolean; coverall: boolean; respirator: boolean; safety_gloves: boolean; vest: boolean; other?: string; }
export interface PtwSafetyRequirement { id: string; text: string; response: 'Yes' | 'No' | 'N/A'; is_critical?: boolean; comment?: string; evidence_urls?: string[]; }
export interface PtwSignature { signature: string; signed_at: string; }
export interface PtwSignoff { name: string; designation: string; email: string; mobile: string; remarks: string; signature: string; signed_at: string; }
export interface PtwStoppage { time: string; reason: string; stopped_by: string; informed_to: string; restarted_time: string; signature: string; }
export interface PtwExtension { is_requested: boolean; reason: string; days: { from: string; to: string }; hours: { from: string; to: string }; requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; }
export interface PtwClosure { note: string; permit_requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; }
export interface CanonicalPtwPayload {
    creator_id: string; permit_no: string; category: PtwCategory;
    requester: any; contractor_safety_personnel?: any;
    work: { location: string; description: string; coverage: { start_date: string; end_date: string; start_time: string; end_time: string; }; associated_permits?: string[]; number_of_workers?: number; risk_assessment_ref?: string; emergency_contact?: string; environmental_concerns?: string; work_method_statement?: string; };
    safety_requirements: PtwSafetyRequirement[]; ppe: PtwPpe;
    signoffs?: { client_proponent: PtwSignoff; other_stakeholders: PtwSignoff[]; client_hs: PtwSignoff; };
    joint_inspection?: { remarks: string; requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; };
    holding_or_stoppage?: PtwStoppage[]; extension?: PtwExtension; closure?: PtwClosure; attachments?: { name: string; url: string }[]; audit?: AuditLogEntry[];
    global_compliance?: { standards: string[]; requirements_met?: Record<string, boolean>; created_at?: string; last_audit?: string | null; };
}
export interface PtwHotWorkPayload extends CanonicalPtwPayload { fire_watcher: { name: string; mobile: string; }; post_watch_minutes: number; }
export interface PtwWorkAtHeightPayload extends CanonicalPtwPayload { access_equipment: any; }
export interface GasTestLogEntry { time: string; o2: number; lel: number; co: number; h2s: number; tester_name: string; }
export interface PersonnelEntryLogEntry { name: string; time_in: string; time_out: string; }
export interface PtwConfinedSpacePayload extends CanonicalPtwPayload { gas_tests: GasTestLogEntry[]; entry_log: PersonnelEntryLogEntry[]; }
export interface PtwExcavationPayload extends CanonicalPtwPayload { soil_type: 'A' | 'B' | 'C'; cave_in_protection: any[]; }
export interface PtwRoadClosurePayload extends CanonicalPtwPayload { closure_type: 'full' | 'partial' | 'rolling'; }
export interface PtwLiftingPayload extends CanonicalPtwPayload { 
    load_calculation: { 
        hook_rigging_weight?: number; 
        load_weight: number; 
        total_weight?: number; 
        boom_length?: number; 
        max_working_radius?: number; 
        crane_capacity_at_radius?: number; 
        crane_capacity: number; 
        utilization_percent: number; 
        lift_plan_ref?: string; 
        crane_certification_no?: string; 
        operator_certification_no?: string; 
    }; 
}
export interface PtwNightWorkPayload extends CanonicalPtwPayload {}
export interface PtwElectricalWorkPayload extends CanonicalPtwPayload {}
export interface PtwUtilityWorkPayload extends CanonicalPtwPayload {}
export interface PtwGeneralWorkPayload extends CanonicalPtwPayload {}

export type PtwPayload = CanonicalPtwPayload | PtwHotWorkPayload | PtwWorkAtHeightPayload | PtwConfinedSpacePayload | PtwExcavationPayload | PtwRoadClosurePayload | PtwLiftingPayload;
export interface Ptw { id: string; org_id: string; project_id: string; type: PtwType; status: PtwStatus; title: string; payload: PtwPayload; approvals: any[]; audit_log: AuditLogEntry[]; compliance_level?: 'FULL' | 'PARTIAL' | 'NONE'; updated_at: string; workflow_log?: PtwWorkflowLog[]; }

export type CertificationLevel = 'Beginner' | 'Competent' | 'Advanced' | 'Expert' | 'Certified Professional';
export interface Qualification { id: string; title: string; issuer: string; date_obtained: string; expiry_date?: string; verification_status: 'Pending' | 'Verified' | 'Rejected'; attachment_url?: string; }
export interface CertificationProfile { user_id: string; org_id: string; level: CertificationLevel; role_title: string; safe_working_hours: number; total_years_experience: number; last_incident_date?: string; qualifications: Qualification[]; requirements_met: { training: boolean; experience: boolean; safe_hours: boolean; behavior: boolean; }; certificate_id?: string; certificate_issued_at?: string; supervisor_approval?: { name: string; approved_at: string; comments: string; }; }

export interface PtwRiskAnalysis {
    base_score: number;
    complexity_factor: number;
    weather_factor: number;
    time_factor: number;
    total_risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
    auto_controls: string[];
}

export interface SimopsConflict {
    conflicting_ptw_id: string;
    conflict_type: 'Spatial' | 'Temporal' | 'Resource';
    description: string;
}