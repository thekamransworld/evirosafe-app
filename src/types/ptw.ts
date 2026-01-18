import type { User } from '../types';

// --- 1. CORE DEFINITIONS ---

export type PtwType = 
  | 'General Work'
  | 'Hot Work'
  | 'Confined Space Entry'
  | 'Electrical Work'
  | 'Work at Height'
  | 'Excavation'
  | 'Lifting'
  | 'Road Closure'
  | 'Utility Work'
  | 'Night Work';

export type PtwStatus = 
  | 'DRAFT'              // Being written
  | 'REQUESTED'          // Submitted by Receiver
  | 'ISSUER_REVIEW'      // Issuer checking details
  | 'ISSUER_SIGNED'      // Issuer signed, waiting for others
  | 'IV_REVIEW'          // Independent Verifier (if needed)
  | 'PENDING_APPROVAL'   // Waiting for final authority
  | 'APPROVED'           // Approved, ready for issue
  | 'ACTIVE'             // Issued & Work Started
  | 'SUSPENDED'          // Temporarily stopped (e.g., shift change)
  | 'COMPLETION_PENDING' // Work done, waiting for closure
  | 'CLOSED'             // Formally closed
  | 'CANCELLED'          // Voided
  | 'ARCHIVED';          // Historical

export type PtwCategory = 'standard' | 'high_risk' | 'operational' | 'emergency' | 'urgent';
export type PtwWorkflowStage = PtwStatus;

// --- 2. SUB-INTERFACES ---

export interface PtwWorkflowLog {
  stage: PtwWorkflowStage;
  action: string;
  user_id: string;
  timestamp: string;
  comments?: string;
  signoff_type?: 'digital' | 'wet_ink';
}

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

export interface PtwSignature {
  signature: string; // URL or Base64
  signed_at: string;
}

export interface PtwSignoff {
  name: string;
  designation: string;
  email: string;
  mobile: string;
  remarks: string;
  signature: string;
  signed_at: string;
}

export interface PtwStoppage {
  time: string;
  reason: string;
  stopped_by: string;
  informed_to: string;
  restarted_time: string;
  signature: string;
}

export interface PtwExtension {
  is_requested: boolean;
  reason: string;
  days: { from: string; to: string };
  hours: { from: string; to: string };
  requester: PtwSignature;
  client_proponent: PtwSignature;
  client_hs: PtwSignature;
}

export interface PtwClosure {
  note: string;
  permit_requester: PtwSignature;
  client_proponent: PtwSignature;
  client_hs: PtwSignature;
}

// --- 3. PAYLOAD DEFINITIONS (The "Body" of the permit) ---

// Common fields for ALL permits
export interface CanonicalPtwPayload {
  creator_id: string;
  permit_no: string;
  category: PtwCategory;
  
  // Personnel
  requester: {
    name: string;
    email: string;
    mobile: string;
    designation: string;
    contractor: string;
    signature: string;
    hse_certified?: boolean;
  };
  contractor_safety_personnel?: {
    name: string;
    email: string;
    mobile: string;
    designation: string;
    signature: string;
  };

  // Work Details
  work: {
    location: string;
    description: string;
    coverage: {
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    };
    associated_permits?: string[];
    number_of_workers?: number;
    risk_assessment_ref?: string;
    emergency_contact?: string;
  };

  // Safety
  safety_requirements: PtwSafetyRequirement[];
  ppe: PtwPpe;
  
  // Workflow Data
  signoffs?: {
    client_proponent: PtwSignoff;
    other_stakeholders: PtwSignoff[];
    client_hs: PtwSignoff;
  };
  
  joint_inspection?: {
    remarks: string;
    requester: PtwSignature;
    client_proponent: PtwSignature;
    client_hs: PtwSignature;
  };

  holding_or_stoppage?: PtwStoppage[];
  extension?: PtwExtension;
  closure?: PtwClosure;
  
  attachments?: { name: string; url: string }[];
  audit?: any[]; // Legacy audit trail
  
  global_compliance?: {
    standards: string[];
  };
}

// Specific Payloads
export interface PtwHotWorkPayload extends CanonicalPtwPayload {
  fire_watcher: { name: string; mobile: string };
  post_watch_minutes: number;
}

export interface PtwWorkAtHeightPayload extends CanonicalPtwPayload {
  access_equipment: {
    step_ladder: boolean;
    independent_scaffolding: boolean;
    tower_mobile_scaffolding: boolean;
    scissor_lift: boolean;
    articulated_telescopic_boom: boolean;
    boatswain_chair: boolean;
    man_basket: boolean;
    rope_access_system: boolean;
    roof_ladder: boolean;
    other: string;
  };
}

export interface GasTestLogEntry {
  time: string;
  o2: number;
  lel: number;
  co: number;
  h2s: number;
  tester_name: string;
}

export interface PersonnelEntryLogEntry {
  name: string;
  time_in: string;
  time_out: string;
}

export interface PtwConfinedSpacePayload extends CanonicalPtwPayload {
  gas_tests: GasTestLogEntry[];
  entry_log: PersonnelEntryLogEntry[];
}

export interface PtwExcavationPayload extends CanonicalPtwPayload {
  soil_type: 'A' | 'B' | 'C';
  cave_in_protection: string[];
}

export interface PtwRoadClosurePayload extends CanonicalPtwPayload {
  closure_type: 'full' | 'partial' | 'rolling';
}

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

// Placeholder interfaces for other types to ensure union works
export interface PtwNightWorkPayload extends CanonicalPtwPayload {}
export interface PtwElectricalWorkPayload extends CanonicalPtwPayload {}
export interface PtwUtilityWorkPayload extends CanonicalPtwPayload {}
export interface PtwGeneralWorkPayload extends CanonicalPtwPayload {}

// Union Type
export type PtwPayload = 
  | CanonicalPtwPayload
  | PtwHotWorkPayload
  | PtwWorkAtHeightPayload
  | PtwConfinedSpacePayload
  | PtwExcavationPayload
  | PtwRoadClosurePayload
  | PtwLiftingPayload;

// --- 4. MAIN DOCUMENT ---

export interface Ptw {
  id: string;
  org_id: string;
  project_id: string;
  type: PtwType;
  status: PtwStatus;
  title: string;
  payload: PtwPayload;
  approvals: any[]; // Legacy
  audit_log: any[]; // Legacy
  compliance_level?: 'FULL' | 'PARTIAL' | 'NONE';
  updated_at: string;
  workflow_log?: PtwWorkflowLog[];
}