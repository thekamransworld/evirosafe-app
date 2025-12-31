import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { 
  organizations as initialOrganizations, 
  users as initialUsers
} from './data';
import { translations, supportedLanguages, roles, planTemplates } from './config';
import type { 
  Organization, User, Report, ReportStatus, CapaAction, Notification, 
  ChecklistRun, Inspection, Plan as PlanType, PlanStatus, 
  Rams as RamsType, RamsStatus, TbtSession, 
  TrainingCourse, TrainingRecord, TrainingSession, Project, View, 
  Ptw, Action, Resource, Sign, ChecklistTemplate, ActionItem 
} from './types';
import { useToast } from './components/ui/Toast';

// --- MOCK DATA ---
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Downtown Construction', status: 'active', org_id: 'org1', location: 'City Center', start_date: '2023-01-01', code: 'DTC-001', finish_date: '2024-01-01', manager_id: 'user_1', type: 'Construction' },
  { id: 'p2', name: 'Refinery Maintenance', status: 'active', org_id: 'org1', location: 'Sector 7', start_date: '2023-03-15', code: 'REF-002', finish_date: '2024-03-15', manager_id: 'user_2', type: 'Maintenance' }
];

const MOCK_INSPECTIONS: Inspection[] = [];
const MOCK_CHECKLIST_RUNS: ChecklistRun[] = [];
const MOCK_PLANS: PlanType[] = [];
const MOCK_RAMS: RamsType[] = [];
const MOCK_TBTS: TbtSession[] = [];
const MOCK_COURSES: TrainingCourse[] = [];
const MOCK_RECORDS: TrainingRecord[] = [];
const MOCK_SESSIONS: TrainingSession[] = [];
const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'n1', report_id: 'rep_1', user_id: 'user_1', is_read: false, message: 'System connected successfully.', timestamp: new Date().toISOString() }
];
const MOCK_PTWS: Ptw[] = [];

// --- 50+ DETAILED HSE CHECKLISTS ---
const MOCK_TEMPLATES: ChecklistTemplate[] = [
    // --- 1. GENERAL SAFETY & HOUSEKEEPING ---
    { 
        id: 'ct_gen_1', org_id: 'org_1', category: 'General Safety', title: { en: 'Daily Site Safety Walk' }, 
        items: [
            { id: 'i1', text: { en: 'Access & Egress' }, description: { en: 'Walkways clear, lit, and free of obstruction.' } },
            { id: 'i2', text: { en: 'Signage' }, description: { en: 'Safety signs (Mandatory, Warning) visible and clean.' } },
            { id: 'i3', text: { en: 'PPE Compliance' }, description: { en: 'All workers wearing required PPE (Helmet, Boots, Vest).' } },
            { id: 'i4', text: { en: 'Barriers' }, description: { en: 'Edge protection and exclusion zones in place.' } },
            { id: 'i5', text: { en: 'Welfare' }, description: { en: 'Drinking water and toilets accessible.' } }
        ]
    },
    { 
        id: 'ct_gen_2', org_id: 'org_1', category: 'General Safety', title: { en: 'Housekeeping Inspection' }, 
        items: [
            { id: 'i1', text: { en: 'Waste Management' }, description: { en: 'Bins available, not overflowing, segregated.' } },
            { id: 'i2', text: { en: 'Material Storage' }, description: { en: 'Materials stacked safely, not blocking paths.' } },
            { id: 'i3', text: { en: 'Trip Hazards' }, description: { en: 'Cables routed overhead or covered.' } },
            { id: 'i4', text: { en: 'Spill Control' }, description: { en: 'Drip trays under plant/machinery.' } },
            { id: 'i5', text: { en: 'Dust Control' }, description: { en: 'Water suppression used where needed.' } }
        ] 
    },
    { id: 'ct_gen_3', org_id: 'org_1', category: 'General Safety', title: { en: 'Welfare Facilities Check' }, items: [{ id: 'i1', text: { en: 'Toilets Clean' }, description: { en: 'Sanitized daily, soap available.' } }, { id: 'i2', text: { en: 'Rest Area' }, description: { en: 'Cool, shaded, seating available.' } }, { id: 'i3', text: { en: 'Drinking Water' }, description: { en: 'Cold water dispensers clean and filled.' } }] },
    { id: 'ct_gen_4', org_id: 'org_1', category: 'General Safety', title: { en: 'Night Work Safety' }, items: [{ id: 'i1', text: { en: 'Lighting' }, description: { en: 'Minimum 50 lux in walkways, 100 lux in work areas.' } }, { id: 'i2', text: { en: 'Supervision' }, description: { en: 'Night shift supervisor present.' } }] },
    { id: 'ct_gen_5', org_id: 'org_1', category: 'General Safety', title: { en: 'Visitor Induction' }, items: [{ id: 'i1', text: { en: 'Briefing' }, description: { en: 'Emergency assembly point explained.' } }, { id: 'i2', text: { en: 'PPE' }, description: { en: 'Visitor PPE issued.' } }] },

    // --- 2. FIRE SAFETY ---
    { 
        id: 'ct_fire_1', org_id: 'org_1', category: 'Fire Safety', title: { en: 'Fire Extinguisher Inspection' }, 
        items: [
            { id: 'i1', text: { en: 'Pressure Gauge' }, description: { en: 'Needle in the green zone.' } },
            { id: 'i2', text: { en: 'Safety Pin' }, description: { en: 'Pin and tamper seal intact.' } },
            { id: 'i3', text: { en: 'Condition' }, description: { en: 'No rust, dents, or hose damage.' } },
            { id: 'i4', text: { en: 'Accessibility' }, description: { en: 'Mounted correctly, unobstructed.' } },
            { id: 'i5', text: { en: 'Labeling' }, description: { en: 'Operating instructions legible.' } }
        ] 
    },
    { id: 'ct_fire_2', org_id: 'org_1', category: 'Fire Safety', title: { en: 'Fire Exit Route Check' }, items: [{ id: 'i1', text: { en: 'Doors' }, description: { en: 'Open easily, not locked.' } }, { id: 'i2', text: { en: 'Pathways' }, description: { en: 'Free of combustible storage.' } }, { id: 'i3', text: { en: 'Signage' }, description: { en: 'Exit signs illuminated/visible.' } }] },
    { id: 'ct_fire_3', org_id: 'org_1', category: 'Fire Safety', title: { en: 'Hot Work Area Prep' }, items: [{ id: 'i1', text: { en: 'Combustibles' }, description: { en: 'Removed within 10m radius.' } }, { id: 'i2', text: { en: 'Fire Watch' }, description: { en: 'Person assigned with extinguisher.' } }, { id: 'i3', text: { en: 'Blankets' }, description: { en: 'Fire blankets covering immovable items.' } }] },
    { id: 'ct_fire_4', org_id: 'org_1', category: 'Fire Safety', title: { en: 'Flammable Storage' }, items: [{ id: 'i1', text: { en: 'Ventilation' }, description: { en: 'Store is well ventilated.' } }, { id: 'i2', text: { en: 'Bonding' }, description: { en: 'Containers grounded/bonded.' } }, { id: 'i3', text: { en: 'Extinguisher' }, description: { en: 'Located nearby (outside).' } }] },
    { id: 'ct_fire_5', org_id: 'org_1', category: 'Fire Safety', title: { en: 'Fire Alarm System' }, items: [{ id: 'i1', text: { en: 'Panel' }, description: { en: 'No fault lights showing.' } }, { id: 'i2', text: { en: 'Call Points' }, description: { en: 'Accessible and glass intact.' } }] },

    // --- 3. ELECTRICAL SAFETY ---
    { 
        id: 'ct_elec_1', org_id: 'org_1', category: 'Electrical', title: { en: 'Portable Power Tools' }, 
        items: [
            { id: 'i1', text: { en: 'Casing' }, description: { en: 'No cracks or damage to body.' } },
            { id: 'i2', text: { en: 'Cord/Plug' }, description: { en: 'Insulation intact, industrial plug fitted.' } },
            { id: 'i3', text: { en: 'Guards' }, description: { en: 'Safety guards fitted and functional.' } },
            { id: 'i4', text: { en: 'Tagging' }, description: { en: 'Valid PAT test tag attached.' } }
        ] 
    },
    { id: 'ct_elec_2', org_id: 'org_1', category: 'Electrical', title: { en: 'Distribution Boards (DB)' }, items: [{ id: 'i1', text: { en: 'Enclosure' }, description: { en: 'Door closed and locked.' } }, { id: 'i2', text: { en: 'Protection' }, description: { en: 'ELCB/RCD installed and tested.' } }, { id: 'i3', text: { en: 'Labeling' }, description: { en: 'Circuits identified.' } }] },
    { id: 'ct_elec_3', org_id: 'org_1', category: 'Electrical', title: { en: 'Temporary Cables' }, items: [{ id: 'i1', text: { en: 'Routing' }, description: { en: 'Elevated on hangers or buried.' } }, { id: 'i2', text: { en: 'Joints' }, description: { en: 'Industrial connectors used (no tape joints).' } }] },
    { id: 'ct_elec_4', org_id: 'org_1', category: 'Electrical', title: { en: 'Generator Inspection' }, items: [{ id: 'i1', text: { en: 'Grounding' }, description: { en: 'Earth rod connected.' } }, { id: 'i2', text: { en: 'Leaks' }, description: { en: 'No fuel/oil leaks.' } }, { id: 'i3', text: { en: 'Fire Extinguisher' }, description: { en: 'Available nearby.' } }] },
    { id: 'ct_elec_5', org_id: 'org_1', category: 'Electrical', title: { en: 'LOTO Verification' }, items: [{ id: 'i1', text: { en: 'Isolation' }, description: { en: 'Breaker off.' } }, { id: 'i2', text: { en: 'Lock' }, description: { en: 'Padlock applied.' } }, { id: 'i3', text: { en: 'Tag' }, description: { en: 'Tag details filled out.' } }] },

    // --- 4. WORK AT HEIGHT ---
    { 
        id: 'ct_wah_1', org_id: 'org_1', category: 'Work at Height', title: { en: 'Scaffolding Inspection' }, 
        items: [
            { id: 'i1', text: { en: 'Base' }, description: { en: 'Base plates and sole boards on firm ground.' } },
            { id: 'i2', text: { en: 'Bracing' }, description: { en: 'Diagonal bracing installed.' } },
            { id: 'i3', text: { en: 'Platform' }, description: { en: 'Fully planked, no gaps.' } },
            { id: 'i4', text: { en: 'Guardrails' }, description: { en: 'Top rail, mid rail, and toe board present.' } },
            { id: 'i5', text: { en: 'Tag' }, description: { en: 'Green "Safe for Use" tag valid.' } }
        ] 
    },
    { id: 'ct_wah_2', org_id: 'org_1', category: 'Work at Height', title: { en: 'Ladder Safety' }, items: [{ id: 'i1', text: { en: 'Condition' }, description: { en: 'Rungs and stiles undamaged.' } }, { id: 'i2', text: { en: 'Setup' }, description: { en: '4:1 ratio, secured at top.' } }, { id: 'i3', text: { en: 'Extension' }, description: { en: 'Extends 1m above landing.' } }] },
    { id: 'ct_wah_3', org_id: 'org_1', category: 'Work at Height', title: { en: 'Safety Harness Check' }, items: [{ id: 'i1', text: { en: 'Webbing' }, description: { en: 'No cuts, burns, or fraying.' } }, { id: 'i2', text: { en: 'Hardware' }, description: { en: 'Buckles and D-rings not distorted.' } }, { id: 'i3', text: { en: 'Lanyard' }, description: { en: 'Shock absorber intact.' } }] },
    { id: 'ct_wah_4', org_id: 'org_1', category: 'Work at Height', title: { en: 'MEWP Pre-Start' }, items: [{ id: 'i1', text: { en: 'Controls' }, description: { en: 'Ground and basket controls working.' } }, { id: 'i2', text: { en: 'Tires' }, description: { en: 'Good condition, no cuts.' } }, { id: 'i3', text: { en: 'Harness Point' }, description: { en: 'Anchor point available in basket.' } }] },
    { id: 'ct_wah_5', org_id: 'org_1', category: 'Work at Height', title: { en: 'Roof Work' }, items: [{ id: 'i1', text: { en: 'Edge Protection' }, description: { en: 'Guardrails installed.' } }, { id: 'i2', text: { en: 'Skylights' }, description: { en: 'Covered or barricaded.' } }] },

    // --- 5. LIFTING & RIGGING ---
    { 
        id: 'ct_lift_1', org_id: 'org_1', category: 'Lifting', title: { en: 'Mobile Crane Inspection' }, 
        items: [
            { id: 'i1', text: { en: 'Outriggers' }, description: { en: 'Fully extended on pads.' } },
            { id: 'i2', text: { en: 'Ground' }, description: { en: 'Level and compacted.' } },
            { id: 'i3', text: { en: 'Certificates' }, description: { en: 'Crane and operator 3rd party certs valid.' } },
            { id: 'i4', text: { en: 'Safety Devices' }, description: { en: 'LMI and anti-two block working.' } }
        ] 
    },
    { id: 'ct_lift_2', org_id: 'org_1', category: 'Lifting', title: { en: 'Webbing Slings' }, items: [{ id: 'i1', text: { en: 'Cuts/Tears' }, description: { en: 'No cuts on edges or eyes.' } }, { id: 'i2', text: { en: 'Label' }, description: { en: 'SWL legible.' } }] },
    { id: 'ct_lift_3', org_id: 'org_1', category: 'Lifting', title: { en: 'Shackles & Hooks' }, items: [{ id: 'i1', text: { en: 'Pin' }, description: { en: 'Correct pin fitted and secured.' } }, { id: 'i2', text: { en: 'Hook' }, description: { en: 'Safety latch functional.' } }] },
    { id: 'ct_lift_4', org_id: 'org_1', category: 'Lifting', title: { en: 'Chain Block' }, items: [{ id: 'i1', text: { en: 'Chain' }, description: { en: 'No stretched or bent links.' } }, { id: 'i2', text: { en: 'Brake' }, description: { en: 'Holds load securely.' } }] },
    { id: 'ct_lift_5', org_id: 'org_1', category: 'Lifting', title: { en: 'Forklift Check' }, items: [{ id: 'i1', text: { en: 'Hydraulics' }, description: { en: 'No leaks.' } }, { id: 'i2', text: { en: 'Forks' }, description: { en: 'Not bent or cracked.' } }, { id: 'i3', text: { en: 'Alarms' }, description: { en: 'Reverse alarm and strobe working.' } }] },

    // --- 6. EXCAVATION ---
    { 
        id: 'ct_exc_1', org_id: 'org_1', category: 'Excavation', title: { en: 'Daily Trench Inspection' }, 
        items: [
            { id: 'i1', text: { en: 'Access' }, description: { en: 'Ladder every 7.5m.' } },
            { id: 'i2', text: { en: 'Spoil Pile' }, description: { en: 'At least 1m from edge.' } },
            { id: 'i3', text: { en: 'Protection' }, description: { en: 'Shoring/benching effective.' } },
            { id: 'i4', text: { en: 'Water' }, description: { en: 'No water accumulation.' } },
            { id: 'i5', text: { en: 'Barriers' }, description: { en: 'Hard barricades installed.' } }
        ] 
    },
    { id: 'ct_exc_2', org_id: 'org_1', category: 'Excavation', title: { en: 'Underground Utilities' }, items: [{ id: 'i1', text: { en: 'Scanning' }, description: { en: 'Area scanned with CAT tool.' } }, { id: 'i2', text: { en: 'Trial Pits' }, description: { en: 'Hand dug trial pits completed.' } }] },
    { id: 'ct_exc_3', org_id: 'org_1', category: 'Excavation', title: { en: 'Confined Space (Excavation)' }, items: [{ id: 'i1', text: { en: 'Gas Test' }, description: { en: 'Atmosphere safe.' } }, { id: 'i2', text: { en: 'Ventilation' }, description: { en: 'Adequate airflow.' } }] },
    { id: 'ct_exc_4', org_id: 'org_1', category: 'Excavation', title: { en: 'Heavy Equipment' }, items: [{ id: 'i1', text: { en: 'Distance' }, description: { en: 'Kept away from trench edges.' } }, { id: 'i2', text: { en: 'Banksman' }, description: { en: 'Present for all movements.' } }] },
    { id: 'ct_exc_5', org_id: 'org_1', category: 'Excavation', title: { en: 'Dewatering' }, items: [{ id: 'i1', text: { en: 'Pump' }, description: { en: 'Functioning correctly.' } }, { id: 'i2', text: { en: 'Discharge' }, description: { en: 'Hose routed to sediment tank.' } }] },

    // --- 7. CHEMICALS & ENVIRONMENT ---
    { id: 'ct_chem_1', org_id: 'org_1', category: 'Chemicals', title: { en: 'Chemical Storage' }, items: [{ id: 'i1', text: { en: 'MSDS' }, description: { en: 'Available for all items.' } }, { id: 'i2', text: { en: 'Bund' }, description: { en: 'Secondary containment provided.' } }, { id: 'i3', text: { en: 'Labeling' }, description: { en: 'Original labels intact.' } }] },
    { id: 'ct_chem_2', org_id: 'org_1', category: 'Chemicals', title: { en: 'Spill Response' }, items: [{ id: 'i1', text: { en: 'Spill Kit' }, description: { en: 'Available and fully stocked.' } }, { id: 'i2', text: { en: 'PPE' }, description: { en: 'Chemical gloves/goggles available.' } }] },
    { id: 'ct_env_1', org_id: 'org_1', category: 'Environment', title: { en: 'Waste Management' }, items: [{ id: 'i1', text: { en: 'Segregation' }, description: { en: 'General, Hazardous, Recyclable separated.' } }, { id: 'i2', text: { en: 'Cover' }, description: { en: 'Skips covered to prevent windblown litter.' } }] },
    { id: 'ct_env_2', org_id: 'org_1', category: 'Environment', title: { en: 'Dust Control' }, items: [{ id: 'i1', text: { en: 'Watering' }, description: { en: 'Roads dampened.' } }, { id: 'i2', text: { en: 'Speed Limit' }, description: { en: 'Vehicles adhering to site speed limit.' } }] },
    { id: 'ct_env_3', org_id: 'org_1', category: 'Environment', title: { en: 'Noise Control' }, items: [{ id: 'i1', text: { en: 'Timing' }, description: { en: 'Noisy works within permitted hours.' } }, { id: 'i2', text: { en: 'Equipment' }, description: { en: 'Engine covers closed.' } }] },

    // --- 8. VEHICLES & DRIVING ---
    { id: 'ct_veh_1', org_id: 'org_1', category: 'Vehicles', title: { en: 'Light Vehicle Daily' }, items: [{ id: 'i1', text: { en: 'Tires' }, description: { en: 'Tread depth and pressure ok.' } }, { id: 'i2', text: { en: 'Lights' }, description: { en: 'Headlights, indicators, brake lights working.' } }, { id: 'i3', text: { en: 'Fluids' }, description: { en: 'Oil, water, brake fluid levels ok.' } }] },
    { id: 'ct_veh_2', org_id: 'org_1', category: 'Vehicles', title: { en: 'Bus Inspection' }, items: [{ id: 'i1', text: { en: 'Seatbelts' }, description: { en: 'Functioning on all seats.' } }, { id: 'i2', text: { en: 'AC' }, description: { en: 'Air conditioning working.' } }] },
    { id: 'ct_veh_3', org_id: 'org_1', category: 'Vehicles', title: { en: 'Water Tanker' }, items: [{ id: 'i1', text: { en: 'Leaks' }, description: { en: 'No water leaks from tank/valves.' } }, { id: 'i2', text: { en: 'Reverse Alarm' }, description: { en: 'Audible.' } }] },
    { id: 'ct_veh_4', org_id: 'org_1', category: 'Vehicles', title: { en: 'Traffic Management' }, items: [{ id: 'i1', text: { en: 'Barriers' }, description: { en: 'Pedestrian/Vehicle segregation in place.' } }, { id: 'i2', text: { en: 'Signage' }, description: { en: 'Speed limit and directional signs visible.' } }] },
    { id: 'ct_veh_5', org_id: 'org_1', category: 'Vehicles', title: { en: 'Driver Check' }, items: [{ id: 'i1', text: { en: 'License' }, description: { en: 'Valid for vehicle type.' } }, { id: 'i2', text: { en: 'Fatigue' }, description: { en: 'Driver appears rested.' } }] },

    // --- 9. OFFICE & CAMP ---
    { id: 'ct_off_1', org_id: 'org_1', category: 'Office', title: { en: 'Office Safety' }, items: [{ id: 'i1', text: { en: 'Cables' }, description: { en: 'No trailing cables.' } }, { id: 'i2', text: { en: 'Fire Exits' }, description: { en: 'Clear of boxes/furniture.' } }] },
    { id: 'ct_off_2', org_id: 'org_1', category: 'Office', title: { en: 'Kitchen/Pantry' }, items: [{ id: 'i1', text: { en: 'Appliances' }, description: { en: 'PAT tested and safe.' } }, { id: 'i2', text: { en: 'Hygiene' }, description: { en: 'Clean and pest-free.' } }] },
    { id: 'ct_camp_1', org_id: 'org_1', category: 'Camp', title: { en: 'Camp Room Inspection' }, items: [{ id: 'i1', text: { en: 'Occupancy' }, description: { en: 'Not overcrowded.' } }, { id: 'i2', text: { en: 'Electrical' }, description: { en: 'No overloaded sockets.' } }] },
    { id: 'ct_camp_2', org_id: 'org_1', category: 'Camp', title: { en: 'Camp Kitchen' }, items: [{ id: 'i1', text: { en: 'Gas' }, description: { en: 'Cylinders stored outside.' } }, { id: 'i2', text: { en: 'Hygiene' }, description: { en: 'Food stored correctly.' } }] },
    { id: 'ct_camp_3', org_id: 'org_1', category: 'Camp', title: { en: 'Camp Fire Safety' }, items: [{ id: 'i1', text: { en: 'Detectors' }, description: { en: 'Smoke detectors working.' } }, { id: 'i2', text: { en: 'Extinguishers' }, description: { en: 'Available in corridors.' } }] },

    // --- 10. SPECIALIZED ---
    { id: 'ct_spec_1', org_id: 'org_1', category: 'Specialized', title: { en: 'Concrete Pour' }, items: [{ id: 'i1', text: { en: 'Access' }, description: { en: 'Safe access to pour area.' } }, { id: 'i2', text: { en: 'PPE' }, description: { en: 'Gumboots and gloves worn.' } }] },
    { id: 'ct_spec_2', org_id: 'org_1', category: 'Specialized', title: { en: 'Rebar Work' }, items: [{ id: 'i1', text: { en: 'Caps' }, description: { en: 'Rebar caps (mushrooms) installed.' } }, { id: 'i2', text: { en: 'Handling' }, description: { en: 'Gloves worn.' } }] },
    { id: 'ct_spec_3', org_id: 'org_1', category: 'Specialized', title: { en: 'Masonry Work' }, items: [{ id: 'i1', text: { en: 'Scaffold' }, description: { en: 'Working platform safe.' } }, { id: 'i2', text: { en: 'Dust' }, description: { en: 'Masks worn for cutting.' } }] },
    { id: 'ct_spec_4', org_id: 'org_1', category: 'Specialized', title: { en: 'Painting' }, items: [{ id: 'i1', text: { en: 'Ventilation' }, description: { en: 'Area well ventilated.' } }, { id: 'i2', text: { en: 'Storage' }, description: { en: 'Paints stored in trays.' } }] },
    { id: 'ct_spec_5', org_id: 'org_1', category: 'Specialized', title: { en: 'Demolition' }, items: [{ id: 'i1', text: { en: 'Services' }, description: { en: 'Utilities disconnected.' } }, { id: 'i2', text: { en: 'Exclusion' }, description: { en: 'Zone barricaded.' } }] },
];

// --- APP CONTEXT ---
type InvitedUser = { name: string; email: string; role: User['role']; org_id: string };

interface AppContextType {
  currentView: View;
  setCurrentView: React.Dispatch<React.SetStateAction<View>>;
  activeOrg: Organization;
  setActiveOrg: React.Dispatch<React.SetStateAction<Organization>>;
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  usersList: User[];
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  activeUser: User | null;
  handleUpdateUser: (updatedUser: User) => void;
  organizations: Organization[];
  handleCreateOrganization: (data: any) => void;
  invitedEmails: InvitedUser[];
  handleInviteUser: (userData: any) => void;
  handleSignUp: (email: string) => void;
  handleApproveUser: (userId: string) => void;
  language: string;
  dir: 'ltr' | 'rtl';
  t: (key: string, fallback?: string) => string;
  login: (userId: string) => void;
  logout: () => void;
  can: (action: Action, resource: Resource) => boolean;
  impersonatingAdmin: User | null;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType>(null!);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations || []);
  const [activeOrg, setActiveOrg] = useState<Organization>(organizations[0]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [usersList, setUsersList] = useState<User[]>(initialUsers || []);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => localStorage.getItem('activeUserId'));
  const [impersonatingAdmin, setImpersonatingAdmin] = useState<User | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<InvitedUser[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const saved = localStorage.getItem('theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toast = useToast();

  useEffect(() => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return usersList.find(u => u.id === activeUserId) || null;
  }, [activeUserId, usersList]);

  const login = (userId: string) => {
    const user = usersList.find(u => u.id === userId);
    if (user && user.status !== 'active') {
        toast.error(`${user.name} is not an active user.`);
        return;
    }
    localStorage.setItem('activeUserId', userId);
    setActiveUserId(userId);
    if(user) setCurrentView(user.preferences.default_view);
  };
  
  const logout = () => {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
    setImpersonatingAdmin(null);
  };

  const impersonateUser = (userId: string) => {
    if (activeUser && !impersonatingAdmin) {
      setImpersonatingAdmin(activeUser);
      login(userId);
    }
  };

  const stopImpersonating = () => {
    if (impersonatingAdmin) {
      login(impersonatingAdmin.id);
      setImpersonatingAdmin(null);
    }
  };

  const can = (action: Action, resource: Resource): boolean => {
    if (!activeUser) return false;
    const userRole = roles.find(r => r.key === activeUser.role);
    if (!userRole) return false;
    const permission = userRole.permissions.find(p => p.resource === resource);
    if (!permission) return false;
    return permission.actions.includes(action);
  };

  const language = activeUser?.preferences.language || 'en';
  const dir = useMemo(() => supportedLanguages.find(l => l.code === language)?.dir || 'ltr', [language]);

  const handleUpdateUser = (updatedUser: User) => {
    setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };
  
  const handleCreateOrganization = (data: any) => {
    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      status: 'active',
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      primaryLanguage: 'en',
      secondaryLanguages: [],
      branding: { logoUrl: 'https://i.imgur.com/sC8b3Qd.png' }, 
      domain: `${data.name.split(' ')[0].toLowerCase()}.com`,
      timezone: 'GMT+4',
      ...data,
    };
    setOrganizations(prev => [...prev, newOrg]);
  };

  const handleInviteUser = (userData: any) => {
    const userToInvite = { ...userData, org_id: userData.org_id || activeOrg.id };
    setInvitedEmails(prev => [...prev, userToInvite]);
    toast.success(`Invitation sent.`);
  };

  const handleSignUp = (email: string) => { /* Mock logic */ };
  const handleApproveUser = (userId: string) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
    toast.success(`User approved.`);
  };
  
  const t = (key: string, fallback: string = key): string => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback;
  };

  const value: AppContextType = {
    currentView, setCurrentView,
    activeOrg, setActiveOrg,
    isSidebarOpen, setSidebarOpen,
    usersList, setUsersList, activeUser, handleUpdateUser,
    organizations, handleCreateOrganization, 
    invitedEmails, handleInviteUser, handleSignUp,
    handleApproveUser,
    language, dir, t,
    login, logout, can,
    impersonatingAdmin, impersonateUser, stopImpersonating,
    theme, toggleTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);

// --- DATA CONTEXT ---

interface DataContextType {
  isLoading: boolean;
  projects: Project[];
  reportList: Report[];
  inspectionList: Inspection[];
  checklistRunList: ChecklistRun[];
  planList: PlanType[];
  ramsList: RamsType[];
  tbtList: TbtSession[];
  trainingCourseList: TrainingCourse[];
  trainingRecordList: TrainingRecord[];
  trainingSessionList: TrainingSession[];
  notifications: Notification[];
  signs: Sign[];
  checklistTemplates: ChecklistTemplate[];
  ptwList: Ptw[];
  actionItems: ActionItem[];
  
  setInspectionList: React.Dispatch<React.SetStateAction<Inspection[]>>;
  setChecklistRunList: React.Dispatch<React.SetStateAction<ChecklistRun[]>>;
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  
  handleCreateProject: (data: any) => void;
  handleCreateReport: (data: any) => void;
  handleStatusChange: (id: string, status: any) => void;
  handleCapaActionChange: (id: string, index: number, status: any) => void;
  handleAcknowledgeReport: (id: string) => void;
  handleUpdateInspection: (data: any, action?: any) => void;
  handleCreatePtw: (data: any) => void;
  handleUpdatePtw: (data: any, action?: any) => void;
  handleCreatePlan: (data: any) => void;
  handleUpdatePlan: (data: any) => void;
  handlePlanStatusChange: (id: string, status: any) => void;
  handleCreateRams: (data: any) => void;
  handleUpdateRams: (data: any) => void;
  handleRamsStatusChange: (id: string, status: any) => void;
  handleCreateTbt: (data: any) => void;
  handleUpdateTbt: (data: any) => void;
  handleCreateOrUpdateCourse: (data: any) => void;
  handleScheduleSession: (data: any) => void;
  handleCloseSession: (id: string, attendance: any) => void;
  handleUpdateActionStatus: (origin: any, status: any) => void;
  handleCreateInspection: (data: any) => void;
  handleCreateStandaloneAction: (data: any) => void;
  handleCreateChecklistTemplate: (data: any) => void;
}

const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeOrg, activeUser } = useAppContext();
    const toast = useToast();
    
    const [isLoading, setIsLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS || []);
    const [reportList, setReportList] = useState<Report[]>([]);
    const [inspectionList, setInspectionList] = useState<Inspection[]>(MOCK_INSPECTIONS);
    const [checklistRunList, setChecklistRunList] = useState<ChecklistRun[]>(MOCK_CHECKLIST_RUNS);
    const [planList, setPlanList] = useState<PlanType[]>(MOCK_PLANS);
    const [ramsList, setRamsList] = useState<RamsType[]>(MOCK_RAMS);
    const [tbtList, setTbtList] = useState<TbtSession[]>(MOCK_TBTS);
    const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>(MOCK_COURSES);
    const [trainingRecordList, setTrainingRecordList] = useState<TrainingRecord[]>(MOCK_RECORDS);
    const [trainingSessionList, setTrainingSessionList] = useState<TrainingSession[]>(MOCK_SESSIONS);
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [ptwList, setPtwList] = useState<Ptw[]>(MOCK_PTWS);
    const [signs, setSigns] = useState<Sign[]>([]);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(MOCK_TEMPLATES);

    const [standaloneActions, setStandaloneActions] = useState<ActionItem[]>([]);

    const handleCreateReport = async (reportData: any) => {
        const newReport = {
            ...reportData,
            id: `rep_${Date.now()}`,
            org_id: activeOrg.id,
            reporter_id: activeUser?.id || 'unknown',
            status: 'submitted',
            audit_trail: [{ user_id: activeUser?.id || 'system', timestamp: new Date().toISOString(), action: 'Report Created' }],
            capa: [],
            acknowledgements: []
        };
        setReportList(prev => [newReport, ...prev]);
        toast.success("Report saved.");
    };

    const handleCreateInspection = (data: any) => {
        const newInspection = {
            ...data,
            id: `insp_${Date.now()}`,
            org_id: activeOrg.id,
            findings: [],
            status: 'Ongoing',
            audit_trail: [{ 
                user_id: activeUser?.id || 'system', 
                timestamp: new Date().toISOString(), 
                action: 'Inspection Created' 
            }]
        };
        setInspectionList(prev => [newInspection as Inspection, ...prev]);
        toast.success("Inspection created successfully.");
    };

    const handleCreateStandaloneAction = (data: any) => {
        const newAction: ActionItem = {
            id: `act_${Date.now()}`,
            action: data.action,
            owner_id: data.owner_id,
            due_date: data.due_date,
            status: 'Open',
            // @ts-ignore
            priority: data.priority,
            project_id: data.project_id,
            source: { type: 'Standalone' as any, id: '-', description: 'Direct Entry' },
            origin: { type: 'standalone' as any, parentId: '', itemId: '' }
        };
        setStandaloneActions(prev => [newAction, ...prev]);
        toast.success("Action created.");
    };

    const handleCreateChecklistTemplate = (data: any) => {
        const newTemplate: ChecklistTemplate = {
            ...data,
            id: `ct_${Date.now()}`,
            org_id: activeOrg.id,
        };
        setChecklistTemplates(prev => [newTemplate, ...prev]);
        toast.success("Checklist template imported.");
    };
    
    const actionItems = useMemo<ActionItem[]>(() => {
        const items: ActionItem[] = [];
        reportList.forEach(report => {
            report.capa.forEach((action, index) => {
                items.push({
                    id: `report-${report.id}-capa-${index}`,
                    action: action.action,
                    owner_id: action.owner_id,
                    due_date: action.due_date,
                    status: action.status,
                    project_id: report.project_id,
                    source: { type: 'Report', id: report.id, description: report.description },
                    origin: { type: 'report-capa', parentId: report.id, itemId: index.toString() }
                });
            });
        });
        return [...items, ...standaloneActions];
    }, [reportList, standaloneActions]);

    const handleUpdateActionStatus = (origin: any, newStatus: any) => {
        if (origin.type === 'report-capa') {
            handleCapaActionChange(origin.parentId, parseInt(origin.itemId), newStatus);
        } else if (origin.type === 'standalone') {
             setStandaloneActions(prev => prev.map(a => 
                a.id === origin.parentId ? { ...a, status: newStatus } : a
            ));
        }
    };

    const handleCapaActionChange = (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => {
        setReportList(prev => prev.map(r => {
            if (r.id === reportId) {
                const newCapa = [...r.capa];
                if (newCapa[capaIndex]) {
                    newCapa[capaIndex] = { ...newCapa[capaIndex], status: newStatus };
                    return { ...r, capa: newCapa };
                }
            }
            return r;
        }));
    };

    const handleCreateProject = (data: any) => setProjects(prev => [...prev, { ...data, id: `proj_${Date.now()}`, org_id: activeOrg.id, status: 'active' }]);
    const handleStatusChange = (id: string, s: any) => setReportList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleAcknowledgeReport = (id: string) => setReportList(prev => prev.map(r => r.id === id ? { ...r, acknowledgements: [...r.acknowledgements, { user_id: activeUser?.id || '', acknowledged_at: new Date().toISOString() }] } : r));
    const handleUpdateInspection = (i: any) => setInspectionList(prev => prev.map(x => x.id === i.id ? i : x));
    const handleCreatePtw = (d: any) => setPtwList(prev => [{ ...d, id: `ptw_${Date.now()}`, status: 'DRAFT' }, ...prev]);
    const handleUpdatePtw = (d: any) => setPtwList(prev => prev.map(p => p.id === d.id ? d : p));
    
    // --- FIXED: Plan Creation now uses templates ---
    const handleCreatePlan = (d: any) => {
        // @ts-ignore - planTemplates is imported from config
        const templateContent = planTemplates[d.type] || [];
        setPlanList(prev => [{ 
            ...d, 
            id: `plan_${Date.now()}`, 
            content: { body_json: templateContent, attachments: [] }, // Use template content
            people: { prepared_by: { name: activeUser?.name, email: activeUser?.email } }, 
            dates: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), next_review_at: '' }, 
            meta: { tags: [], change_note: 'Initial Draft' }, 
            audit_trail: [] 
        } as any, ...prev]);
    };

    const handleUpdatePlan = (d: any) => setPlanList(prev => prev.map(p => p.id === d.id ? d : p));
    const handlePlanStatusChange = (id: string, s: any) => setPlanList(prev => prev.map(p => p.id === id ? { ...p, status: s } : p));
    const handleCreateRams = (d: any) => setRamsList(prev => [{ ...d, id: `rams_${Date.now()}` } as any, ...prev]);
    const handleUpdateRams = (d: any) => setRamsList(prev => prev.map(r => r.id === d.id ? d : r));
    const handleRamsStatusChange = (id: string, s: any) => setRamsList(prev => prev.map(r => r.id === id ? { ...r, status: s } : r));
    const handleCreateTbt = (d: any) => setTbtList(prev => [{ ...d, id: `tbt_${Date.now()}`, attendees: [] } as any, ...prev]);
    const handleUpdateTbt = (d: any) => setTbtList(prev => prev.map(t => t.id === d.id ? d : t));
    const handleCreateOrUpdateCourse = (c: any) => setTrainingCourseList(prev => [...prev.filter(x => x.id !== c.id), c]);
    const handleScheduleSession = (d: any) => setTrainingSessionList(prev => [{ ...d, id: `ts_${Date.now()}`, roster: [] } as any, ...prev]);
    const handleCloseSession = (id: string, att: any) => setTrainingSessionList(prev => prev.map(s => s.id === id ? { ...s, status: 'completed', attendance: att } : s));

    const value = {
        isLoading,
        projects, reportList, inspectionList, checklistRunList, planList, ramsList, tbtList, 
        trainingCourseList, trainingRecordList, trainingSessionList, notifications, signs, checklistTemplates, ptwList,
        actionItems,
        setInspectionList, setChecklistRunList, setPtwList,
        handleCreateProject, handleCreateReport, handleStatusChange, handleCapaActionChange, handleAcknowledgeReport,
        handleUpdateInspection, handleCreatePtw, handleUpdatePtw, handleCreatePlan, handleUpdatePlan, handlePlanStatusChange,
        handleCreateRams, handleUpdateRams, handleRamsStatusChange, handleCreateTbt, handleUpdateTbt,
        handleCreateOrUpdateCourse, handleScheduleSession, handleCloseSession,
        handleUpdateActionStatus,
        handleCreateInspection,       
        handleCreateStandaloneAction,
        handleCreateChecklistTemplate
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => useContext(DataContext);


// --- MODAL CONTEXT ---

interface ModalContextType {
  selectedReport: Report | null; setSelectedReport: (report: Report | null) => void;
  isReportCreationModalOpen: boolean; setIsReportCreationModalOpen: (isOpen: boolean) => void;
  reportInitialData: Partial<Report> | null; setReportInitialData: (data: Partial<Report> | null) => void;
  
  isActionCreationModalOpen: boolean; 
  setIsActionCreationModalOpen: (isOpen: boolean) => void;
  openActionCreationModal: (options?: { initialData?: any; mode?: 'create' | 'edit' }) => void;
  openActionDetailModal: (action: any) => void;

  selectedPtw: Ptw | null; setSelectedPtw: (ptw: Ptw | null) => void;
  isPtwCreationModalOpen: boolean; setIsPtwCreationModalOpen: (isOpen: boolean) => void;
  ptwCreationMode: 'new' | 'existing'; setPtwCreationMode: (mode: 'new' | 'existing') => void;
  selectedPlan: PlanType | null; setSelectedPlan: (plan: PlanType | null) => void;
  selectedPlanForEdit: PlanType | null; setSelectedPlanForEdit: (plan: PlanType | null) => void;
  isPlanCreationModalOpen: boolean; setIsPlanCreationModalOpen: (isOpen: boolean) => void;
  selectedRams: RamsType | null; setSelectedRams: (rams: RamsType | null) => void;
  selectedRamsForEdit: RamsType | null; setSelectedRamsForEdit: (rams: RamsType | null) => void;
  isRamsCreationModalOpen: boolean; setIsRamsCreationModalOpen: (isOpen: boolean) => void;
  selectedTbt: TbtSession | null; setSelectedTbt: (tbt: TbtSession | null) => void;
  isTbtCreationModalOpen: boolean; setIsTbtCreationModalOpen: (isOpen: boolean) => void;
  isCourseModalOpen: boolean; setCourseModalOpen: (isOpen: boolean) => void;
  isSessionModalOpen: boolean; setSessionModalOpen: (isOpen: boolean) => void;
  isAttendanceModalOpen: boolean; setAttendanceModalOpen: (isOpen: boolean) => void;
  courseForSession: TrainingCourse | null; setCourseForSession: (course: TrainingCourse | null) => void;
  sessionForAttendance: TrainingSession | null; setSessionForAttendance: (session: TrainingSession | null) => void;
  isInspectionCreationModalOpen: boolean; setIsInspectionCreationModalOpen: (isOpen: boolean) => void;
}

const ModalContext = createContext<ModalContextType>(null!);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportCreationModalOpen, setIsReportCreationModalOpen] = useState(false);
  const [reportInitialData, setReportInitialData] = useState<Partial<Report> | null>(null);

  const [isActionCreationModalOpen, setIsActionCreationModalOpen] = useState(false);

  const openActionCreationModal = (options?: { initialData?: any; mode?: 'create' | 'edit' }) => {
      setIsActionCreationModalOpen(true);
  };
  const openActionDetailModal = (action: any) => {
      console.log("View action details", action);
  };

  const [selectedPtw, setSelectedPtw] = useState<Ptw | null>(null);
  const [isPtwCreationModalOpen, setIsPtwCreationModalOpen] = useState(false);
  const [ptwCreationMode, setPtwCreationMode] = useState<'new' | 'existing'>('new');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PlanType | null>(null);
  const [isPlanCreationModalOpen, setIsPlanCreationModalOpen] = useState(false);
  const [selectedRams, setSelectedRams] = useState<RamsType | null>(null);
  const [selectedRamsForEdit, setSelectedRamsForEdit] = useState<RamsType | null>(null);
  const [isRamsCreationModalOpen, setIsRamsCreationModalOpen] = useState(false);
  const [selectedTbt, setSelectedTbt] = useState<TbtSession | null>(null);
  const [isTbtCreationModalOpen, setIsTbtCreationModalOpen] = useState(false);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [courseForSession, setCourseForSession] = useState<TrainingCourse | null>(null);
  const [sessionForAttendance, setSessionForAttendance] = useState<TrainingSession | null>(null);
  const [isInspectionCreationModalOpen, setIsInspectionCreationModalOpen] = useState(false);

  const value = {
    selectedReport, setSelectedReport,
    isReportCreationModalOpen, setIsReportCreationModalOpen,
    reportInitialData, setReportInitialData,
    
    isActionCreationModalOpen, setIsActionCreationModalOpen,
    openActionCreationModal, openActionDetailModal,

    selectedPtw, setSelectedPtw,
    isPtwCreationModalOpen, setIsPtwCreationModalOpen,
    ptwCreationMode, setPtwCreationMode,
    selectedPlan, setSelectedPlan,
    selectedPlanForEdit, setSelectedPlanForEdit,
    isPlanCreationModalOpen, setIsPlanCreationModalOpen,
    selectedRams, setSelectedRams,
    selectedRamsForEdit, setSelectedRamsForEdit,
    isRamsCreationModalOpen, setIsRamsCreationModalOpen,
    selectedTbt, setSelectedTbt,
    isTbtCreationModalOpen, setIsTbtCreationModalOpen,
    isCourseModalOpen, setCourseModalOpen,
    isSessionModalOpen, setSessionModalOpen,
    isAttendanceModalOpen, setAttendanceModalOpen,
    courseForSession, setCourseForSession,
    sessionForAttendance, setSessionForAttendance,
    isInspectionCreationModalOpen, setIsInspectionCreationModalOpen
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => useContext(ModalContext);