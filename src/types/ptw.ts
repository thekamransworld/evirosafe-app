// src/types/ptw.ts

export type PtwType = 
  | 'Utility Work'
  | 'Work at Height'
  | 'General Work'
  | 'Confined Space Entry'
  | 'Night Work'
  | 'Electrical Work'
  | 'Excavation'
  | 'Hot Work'
  | 'Road Closure'
  | 'Lifting'
  | 'Mechanical Work'
  | 'Chemical Handling';

export type PtwStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PRE_SCREEN'
  | 'SITE_INSPECTION'
  | 'APPROVAL'
  | 'ACTIVE'
  | 'HOLD'
  | 'CLOSED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type PtwCategory = 'standard' | 'operational' | 'emergency' | 'urgent';

// ========== BASE PTW INTERFACES ==========
export interface PtwPpe {
  hard_hat: boolean;
  safety_harness: boolean;
  safety_shoes: boolean;
  goggles: boolean;
  coverall: boolean;
  respirator: boolean;
  safety_gloves: boolean;
  vest: boolean;
  hearing_protection?: boolean;
  face_shield?: boolean;
  chemical_suit?: boolean;
  apron?: boolean;
  rubber_boots?: boolean;
}

export interface PtwSafetyRequirement {
  id: string;
  text: string;
  response: 'Yes' | 'No' | 'N/A';
}

export interface PtwSignoff {
  name: string;
  designation?: string;
  email?: string;
  mobile?: string;
  signature: string;
  remarks?: string;
  signed_at?: string;
}

export interface PtwStoppage {
  reason: string;
  stopped_by: string;
  informed_to: string;
  time: string;
  restarted_time?: string;
  signature?: string;
}

export interface PtwExtension {
  is_requested: boolean;
  reason?: string;
  days: {
    from: string;
    to: string;
  };
  hours: {
    from: string;
    to: string;
  };
  approved?: boolean;
  approved_by?: string;
  approved_at?: string;
}

export interface PtwClosure {
  note?: string;
  permit_requester: PtwSignoff;
  client_proponent: PtwSignoff;
  client_hs: PtwSignoff;
}

export interface PtwJointInspection {
  remarks: string;
  requester: { signature: string };
  client_proponent: { signature: string };
  client_hs: { signature: string };
}

// ========== TYPE-SPECIFIC PAYLOADS ==========
export interface PtwUtilityWorkPayload {
  community_announcement_required: boolean;
  underground_drawings_available: boolean;
  backup_plan_available: boolean;
  road_diversion_plan_available: boolean;
  service_shutdown_required: boolean;
  utility_type: 'water' | 'sewer' | 'electricity' | 'gas' | 'telecom';
  as_built_drawings_available: boolean;
}

export interface PtwWorkAtHeightPayload {
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
  fall_protection: {
      anchor_points_certified: boolean;
      rescue_plan_available: boolean;
      weather_monitoring: boolean;
  };
}

export interface PtwGeneralWorkPayload {
  msds_coshh_available: boolean;
  toolbox_talk_conducted: boolean;
  drinking_water_available: boolean;
  rest_area_available: boolean;
  first_aid_available: boolean;
  heat_stress_precautions: {
    work_rest_cycle: boolean;
    shades_ventilation: boolean;
    light_clothing: boolean;
  };
}

export interface PtwConfinedSpacePayload {
  gas_tests: any[];
  entry_log: any[];
  rescue_plan: {
    team_available: boolean;
    equipment_available: boolean;
    practiced_recently: boolean;
  };
}

export interface PtwNightWorkPayload {
  hi_visibility_jackets_available: boolean;
  flashing_beacon_lights: boolean;
  communication_tools_available: boolean;
  continuous_supervision: boolean;
  work_rotation_planned: boolean;
  emergency_arrangements: boolean;
  lighting_level_lux: number;
  rest_area_provided: boolean;
}

export interface PtwElectricalWorkPayload {
  personnel_qualified: boolean;
  fiberglass_ladder_required: boolean;
  no_jewelry_metal: boolean;
  area_free_from_hazards: boolean;
  equipment_properly_grounded: boolean;
  deenergization_infeasible: boolean;
  voltage_level: 'low' | 'medium' | 'high';
  loto_procedure: string;
  insulated_tools_class: string;
}

export interface PtwExcavationPayload {
  soil_type: 'A' | 'B' | 'C';
  cave_in_protection: string[];
  utilities_marked: boolean;
  daily_inspection_required: boolean;
  safety_shoring: {
      type: string;
      installed_by: string;
      inspection_date: string;
  };
}

export interface PtwHotWorkPayload {
  fire_watcher: {
    name: string;
    mobile: string;
    certified: boolean;
  };
  post_watch_minutes: number;
  fire_precautions: {
    extinguishers_available: boolean;
    water_supply_available: boolean;
    combustibles_removed: boolean;
    fire_blanket_available: boolean;
  };
}

export interface PtwRoadClosurePayload {
  closure_type: 'partial' | 'complete';
  traffic_management: {
    alternative_route_planned?: boolean;
    signage_reflective?: boolean;
    sunflower_lights_available?: boolean;
    banksman_appointed?: boolean;
    speed_limit_signs_erected?: boolean;
    plan_available: boolean;
    signage_available: boolean;
    flaggers_certified: boolean;
  };
}

export interface PtwLiftingPayload {
  load_calculation: {
    hook_rigging_weight?: number;
    load_weight: number;
    total_weight?: number;
    boom_length?: number;
    max_working_radius?: number;
    crane_capacity_at_radius?: number;
    crane_capacity: number;
    utilization_percent: number;
    lift_plan_ref: string;
    crane_certification_no: string;
    operator_certification_no: string;
  };
}

// ========== CANONICAL PTW PAYLOAD ==========
export interface CanonicalPtwPayload {
  creator_id: string;
  permit_no: string;
  category: PtwCategory;
  requester: {
    name: string;
    email: string;
    mobile: string;
    designation: string;
    contractor: string;
    signature: string;
    hse_certified?: boolean;
  };
  contractor_safety_personnel: {
    name: string;
    email: string;
    mobile: string;
    designation: string;
    signature: string;
  };
  work: {
    location: string;
    description: string;
    coverage: {
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    };
    associated_permits: string[];
    number_of_workers?: number;
    work_method_statement?: string;
    emergency_contact?: string;
    risk_assessment_ref?: string;
    environmental_concerns?: string;
  };
  safety_requirements: PtwSafetyRequirement[];
  ppe: PtwPpe;
  signoffs: {
    client_proponent: PtwSignoff;
    other_stakeholders: PtwSignoff[];
    client_hs: PtwSignoff;
  };
  joint_inspection: PtwJointInspection;
  holding_or_stoppage: PtwStoppage[];
  extension: PtwExtension;
  closure: PtwClosure;
  attachments: any[];
  audit: any[];
  global_compliance?: {
    standards: string[];
    requirements_met: Record<string, boolean>;
    created_at: string;
    last_audit: string | null;
  };
}

// ========== MAIN PTW DOCUMENT ==========
export interface Ptw {
  id: string;
  org_id: string;
  project_id: string;
  type: PtwType;
  status: PtwStatus;
  title: string;
  payload: CanonicalPtwPayload & (
    | PtwUtilityWorkPayload
    | PtwWorkAtHeightPayload
    | PtwGeneralWorkPayload
    | PtwConfinedSpacePayload
    | PtwNightWorkPayload
    | PtwElectricalWorkPayload
    | PtwExcavationPayload
    | PtwHotWorkPayload
    | PtwRoadClosurePayload
    | PtwLiftingPayload
  );
  created_at: string;
  updated_at: string;
  version: string;
  compliance_level: 'FULL' | 'PARTIAL' | 'NONE';
}