// src/types.ts

// --- CORE ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: 'active' | 'suspended' | 'pending';
  timezone: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  branding: {
    logoUrl: string;
    primaryColor?: string;
  };
  industry: string;
  country: string;
  description?: string;
  created_at?: string;
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
  project_ids?: string[]; // Added for project assignment
  preferences: {
    language: string;
    default_view: string;
    units: {
      temperature: 'C' | 'F';
      wind_speed: 'km/h' | 'mph';
      height: 'm' | 'ft';
      weight: 'kg' | 'lbs';
    };
  };
}

export interface ProjectTeamMember extends User {
  project_role?: string;
  certifications?: string[];
  last_active?: string;
}

export interface Subcontractor {
  id: string;
  org_id: string;
  name: string;
  specialization: string;
  status: 'active' | 'inactive';
  workers_count: number;
  compliance_score: number;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  code: string;
  status: 'active' | 'pending' | 'archived' | 'Active'; // Added 'Active' to match dashboard
  location: string;
  start_date: string;
  finish_date: string;
  manager_id: string;
  type: string;
  budget?: number;
  budget_spent?: number;
  currency?: string;
  progress?: number;
  safe_man_hours?: number;
  safety_score?: number;
  quality_score?: number;
  environmental_score?: number;
}

// --- ASSETS & RESOURCES ---
export interface Equipment {
  id: string;
  project_id: string;
  name: string;
  type: string;
  serial_number: string;
  status: 'operational' | 'maintenance' | 'out_of_service';
  last_inspection_date: string;
  next_inspection_date: string;
  condition: 'good' | 'fair' | 'poor';
  last_inspected_by: string;
}

// --- HSE MODULES ---

// Reporting
export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'closed' | 'active';
export type ReportType = 
  | 'Incident' | 'Accident' | 'Near Miss' | 'Unsafe Act' | 'Unsafe Condition'
  | 'First Aid Case (FAC)' | 'Medical Treatment Case (MTC)' | 'Lost Time Injury (LTI)'
  | 'Restricted Work Case (RWC)' | 'Property / Asset Damage' | 'Environmental Incident'
  | 'Fire Event' | 'Leadership Event' | 'Positive Observation' | 'First Aid' | 'Property Damage'; // Added dashboard types

export interface Report {
  id: string;
  creator_id?: string;
  org_id: string;
  project_id: string;
  type: ReportType;
  status: ReportStatus;
  classification?: string;
  reporter_id: string;
  reported_by?: string; // Alias for reporter_id for dashboard compatibility
  reported_at: string;
  created_at?: string; // Alias for reported_at
  occurred_at: string;
  location: { text: string; specific_area?: string; geo?: { lat: number; lng: number } };
  description: string;
  risk_pre_control: { severity: number; likelihood: number };
  severity?: 'low' | 'medium' | 'high' | 'critical'; // Derived helper
  conditions?: string;
  immediate_actions?: string;
  evidence_urls?: string[];
  ai_suggested_evidence?: string[];
  classification_codes?: string[];
  details?: any;
  capa?: any[];
  distribution?: any;
  acknowledgements?: any[];
  audit_trail?: any[];
}

// Permits (PTW)
export type PtwStatus = 'DRAFT' | 'SUBMITTED' | 'PRE_SCREEN' | 'SITE_INSPECTION' | 'APPROVAL' | 'ACTIVE' | 'HOLD' | 'COMPLETED' | 'CLOSED';
export interface Ptw {
  id: string;
  org_id: string;
  project_id: string;
  type: string;
  status: PtwStatus;
  title: string;
  requested_by?: string; // ID of requester
  created_at?: string;
  updated_at: string;
  risk_level?: 'low' | 'medium' | 'high';
  compliance_level?: 'FULL' | 'PARTIAL' | 'NONE';
  work_description?: string; // Shortcut to payload description
  payload: {
    permit_no?: string;
    requester: { name: string; email?: string; mobile?: string; designation?: string; contractor?: string; signature?: string };
    contractor_safety_personnel?: any;
    work: {
      location: string;
      description: string;
      coverage: { start_date: string; end_date: string; start_time: string; end_time: string };
      number_of_workers?: number;
      risk_assessment_ref?: string;
      emergency_contact?: string;
    };
    equipment_details?: any;
    fire_watcher?: any;
    post_watch_minutes?: number;
    global_compliance?: { standards: string[] };
    safety_requirements: any[];
    ppe?: any;
    signoffs?: any;
    joint_inspection?: any;
    holding_or_stoppage?: any[];
    extension?: any;
    closure?: any;
    load_calculation?: any;
    gas_tests?: any[];
    entry_log?: any[];
    access_equipment?: any;
  };
  audit_log: any[];
  approvals: any[];
}

// Inspections
export interface Inspection {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  type: 'Safety' | 'Quality' | 'Environmental' | 'Fire' | 'Equipment';
  status: 'Draft' | 'Ongoing' | 'Submitted' | 'Under Review' | 'Approved' | 'Closed' | 'Archived';
  person_responsible_id: string;
  inspector_id?: string; // Alias
  checklist_template_id: string;
  schedule_at: string;
  inspection_date?: string; // Alias
  team_member_ids: string[];
  observers: string[];
  findings: any[];
  findings_count?: number; // Helper
  result?: 'Pass' | 'Fail'; // Helper
  notes?: string;
  overall_comments?: string;
  audit_trail: any[];
  updated_at?: string;
}

// RAMS
export interface Rams {
  id: string;
  org_id: string;
  project_id: string;
  title?: string; // Alias for activity
  activity: string;
  location: string;
  status: 'draft' | 'under_review' | 'approved' | 'published' | 'archived';
  version: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  risk_level?: 'low' | 'medium' | 'high';
  description?: string;
  prepared_by: { name: string; email: string; role?: string; signed_at?: string };
  reviewed_by?: any;
  approved_by_client?: any;
  times: { valid_from: string; valid_until: string; created_at?: string; updated_at?: string };
  method_statement: any;
  overall_risk_before: number;
  overall_risk_after: number;
  attachments: any[];
  linked_ptw_types: string[];
  audit_log: any[];
}

// Training
export interface Training {
  id: string;
  project_id: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'scheduled' | 'overdue';
  instructor_id: string;
  attendees_count: number;
}

// TBT
export interface TbtSession {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  topic?: string; // Alias
  topic_category: string;
  method: string;
  location: string;
  conducted_by: any; // ID or object
  date: string;
  time: string;
  conducted_date?: string; // Alias
  summary: string;
  hazards_discussed: string[];
  controls_discussed: string[];
  discussion_points: string[];
  attendees: any[];
  attachments: any[];
  linked_rams_ids: string[];
  linked_ptw_types: string[];
  linked_plan_ids: string[];
  status: 'draft' | 'scheduled' | 'delivered' | 'closed' | 'archived';
  audit_log: any[];
}

// Other Types
export interface Plan {
  id: string;
  org_id: string;
  project_id: string;
  type: string;
  title: string;
  version: string;
  status: 'draft' | 'under_review' | 'approved' | 'published' | 'archived';
  people: any;
  dates: any;
  content: any;
  meta: any;
  audit_trail: any[];
}

export interface ChecklistRun {
  id: string;
  org_id: string;
  project_id: string;
  template_id: string;
  executed_by_id: string;
  executed_at: string;
  status: string;
  score?: number;
  results: any[];
}

export interface ChecklistTemplate {
  id: string;
  org_id: string;
  category: string;
  title: any;
  items: any[];
}

export interface Sign {
  id: string;
  org_id: string;
  category: string;
  title: any;
  icon_url: string;
  description: any;
  matched_activities: string[];
  hazards: string[];
}

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

export interface TrainingSession {
  id: string;
  course_id: string;
  project_id: string;
  scheduled_at: string;
  trainer_id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  roster: string[];
  attendance: any[];
}

export interface Notification {
  id: string;
  user_id: string;
  report_id?: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  type?: string;
  title?: string;
  created_at?: string;
}

export interface ActionItem {
  id: string;
  action: string;
  owner_id: string;
  due_date: string;
  status: string;
  project_id: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  source: { type: string; id: string; description: string };
  origin: { type: string; parentId: string; itemId: string };
}

export interface CertificationProfile {
  user_id: string;
  org_id: string;
  level: string;
  role_title: string;
  safe_working_hours: number;
  total_years_experience: number;
  last_incident_date?: string;
  qualifications: any[];
  requirements_met: any;
}

export type Resource = 'dashboard' | 'reports' | 'inspections' | 'plans' | 'rams' | 'training' | 'people' | 'settings' | 'files' | 'analytics' | 'checklists' | 'signage' | 'tbt' | 'organizations' | 'projects' | 'roles' | 'ptw' | 'housekeeping' | 'actions' | 'site-map' | 'certification';
export type View = Resource | 'ai-insights';
export type Action = 'read' | 'create' | 'update' | 'approve' | 'delete' | 'export' | 'assign';
export type Scope = 'org' | 'project' | 'own';

export interface Role {
  org_id: string | null;
  key: string;
  label: string;
  is_system: boolean;
  permissions: { resource: Resource; actions: Action[]; scope: Scope }[];
}