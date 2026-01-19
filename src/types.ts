// ... (continuation from previous message)

export interface ChecklistRunResult { 
    item_id: string; 
    result: 'pass' | 'fail' | 'na'; 
    remarks?: string; 
    evidence_urls?: string[]; 
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
    results: ChecklistRunResult[]; 
}

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

export interface TrainingCourse { id: string; org_id: string; title: string; category: string; validity_months: number; syllabus: string; learning_objectives: string[]; requires_assessment: boolean; }
export interface TrainingSession { id: string; course_id: string; project_id: string; scheduled_at: string; trainer_id: string; status: 'scheduled' | 'completed' | 'cancelled'; roster: string[]; attendance: { user_id: string; attended: boolean; score?: number; }[]; }
export interface TrainingRecord { id: string; org_id: string; user_id: string; course_id: string; session_id: string; issued_at: string; expires_at: string; score?: number; status: 'valid' | 'expiring_soon' | 'expired'; }

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
    work: { location: string; description: string; coverage: { start_date: string; end_date: string; start_time: string; end_time: string; }; associated_permits?: string[]; number_of_workers?: number; risk_assessment_ref?: string; emergency_contact?: string; };
    safety_requirements: PtwSafetyRequirement[]; ppe: PtwPpe;
    signoffs?: { client_proponent: PtwSignoff; other_stakeholders: PtwSignoff[]; client_hs: PtwSignoff; };
    joint_inspection?: { remarks: string; requester: PtwSignature; client_proponent: PtwSignature; client_hs: PtwSignature; };
    holding_or_stoppage?: PtwStoppage[]; extension?: PtwExtension; closure?: PtwClosure; attachments?: { name: string; url: string }[]; audit?: AuditLogEntry[];
    global_compliance?: { standards: string[] };
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