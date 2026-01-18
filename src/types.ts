// src/types.ts

// ... keep existing Organization, User, Project interfaces ...

// --- ENHANCED REPORTING TYPES ---

export type ReportStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_investigation' 
  | 'capa_required' 
  | 'capa_in_progress' 
  | 'pending_closure' 
  | 'closed' 
  | 'archived';

export interface Witness {
  id: string;
  name: string;
  contact: string;
  statement: string;
  type: 'employee' | 'contractor' | 'public';
}

export interface RootCauseAnalysis {
  method: '5_whys' | 'fishbone';
  direct_cause: string;
  why_1?: string;
  why_2?: string;
  why_3?: string;
  why_4?: string;
  why_5?: string;
  root_cause_category: ('Human' | 'Equipment' | 'Process' | 'Environment' | 'Management')[];
  conclusion: string;
}

export interface CostImpact {
  direct_costs: {
    medical: number;
    repair: number;
    compensation: number;
    fines: number;
  };
  indirect_costs: {
    downtime: number;
    legal: number;
    training: number;
    admin: number;
  };
  total_estimated: number;
  currency: string;
}

export interface RegulatoryCompliance {
  osha_reportable: boolean;
  riddor_reportable: boolean; // UK specific, can be generic
  insurance_notified: boolean;
  authority_notified: boolean;
  reference_number?: string;
}

// Update the main Report interface
export interface Report {
    id: string;
    creator_id: string;
    org_id: string;
    project_id: string;
    type: ReportType;
    status: ReportStatus; // Updated type
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
    
    // New Enhanced Fields
    investigation_level?: 'none' | 'quick' | 'formal' | 'immediate';
    investigation_team?: string[]; // User IDs
    witnesses?: Witness[];
    root_cause_analysis?: RootCauseAnalysis;
    costs?: CostImpact;
    compliance?: RegulatoryCompliance;
    lessons_learned?: string;
    prevention_strategy?: string;

    // Existing fields
    risk_pre_control: RiskMatrix;
    capa: CapaAction[];
    distribution: ReportDistribution;
    acknowledgements: ReportAcknowledgement[];
    audit_trail: AuditLogEntry[];
    details: ReportDetails;
    identification?: { was_fire: boolean; was_injury: boolean; was_environment: boolean; };
    classification_codes?: string[];
    ai_evidence_summary?: string;
    ai_suggested_evidence?: string[];
    created_at?: string;
}

// ... keep the rest of your types (Inspection, PTW, etc) ...