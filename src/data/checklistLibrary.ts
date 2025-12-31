import type { ChecklistTemplate } from '../types';

export const MASTER_CHECKLIST_LIBRARY: Omit<ChecklistTemplate, 'id' | 'org_id'>[] = [
  // --- GENERAL SAFETY ---
  {
    category: 'General Safety',
    title: { en: 'Daily Site Safety Inspection' },
    items: [
      { id: 'gen_1', text: { en: 'Access routes clear and safe' }, description: { en: 'Walkways free of debris/tripping hazards' } },
      { id: 'gen_2', text: { en: 'Proper PPE being worn' }, description: { en: 'Helmets, boots, vests visible' } },
      { id: 'gen_3', text: { en: 'Work areas tidy (Housekeeping)' }, description: { en: 'No loose materials or waste' } },
      { id: 'gen_4', text: { en: 'Safety signage visible' }, description: { en: 'Warning signs in place' } },
      { id: 'gen_5', text: { en: 'Lighting adequate' }, description: { en: 'Work areas well lit' } }
    ]
  },
  {
    category: 'General Safety',
    title: { en: 'PPE Compliance Check' },
    items: [
      { id: 'ppe_1', text: { en: 'Head protection worn' }, description: { en: 'Hard hats' } },
      { id: 'ppe_2', text: { en: 'Foot protection worn' }, description: { en: 'Safety boots' } },
      { id: 'ppe_3', text: { en: 'Eye protection worn' }, description: { en: 'Safety glasses/goggles' } },
      { id: 'ppe_4', text: { en: 'High visibility vests worn' }, description: { en: 'Reflective vests' } },
      { id: 'ppe_5', text: { en: 'Hand protection available' }, description: { en: 'Gloves suitable for task' } }
    ]
  },
  {
    category: 'General Safety',
    title: { en: 'Shift Handover Safety Check' },
    items: [
      { id: 'sh_1', text: { en: 'Hazards communicated to next shift' }, description: { en: '' } },
      { id: 'sh_2', text: { en: 'Equipment status verified' }, description: { en: '' } },
      { id: 'sh_3', text: { en: 'Housekeeping completed' }, description: { en: '' } }
    ]
  },

  // --- FIRE SAFETY ---
  {
    category: 'Fire Safety',
    title: { en: 'Fire Extinguisher Inspection' },
    items: [
      { id: 'fe_1', text: { en: 'Extinguisher in correct location' }, description: { en: '' } },
      { id: 'fe_2', text: { en: 'Pressure gauge in green zone' }, description: { en: '' } },
      { id: 'fe_3', text: { en: 'Safety pin and seal intact' }, description: { en: '' } },
      { id: 'fe_4', text: { en: 'No physical damage/corrosion' }, description: { en: '' } },
      { id: 'fe_5', text: { en: 'Inspection tag updated' }, description: { en: '' } }
    ]
  },
  {
    category: 'Fire Safety',
    title: { en: 'Hot Work Area Safety' },
    items: [
      { id: 'hw_1', text: { en: 'Combustibles removed (10m radius)' }, description: { en: '' } },
      { id: 'hw_2', text: { en: 'Fire extinguisher immediately available' }, description: { en: '' } },
      { id: 'hw_3', text: { en: 'Fire watch appointed' }, description: { en: '' } },
      { id: 'hw_4', text: { en: 'Flashback arrestors on gas cylinders' }, description: { en: '' } }
    ]
  },
  {
    category: 'Fire Safety',
    title: { en: 'Emergency Exit Route Check' },
    items: [
      { id: 'er_1', text: { en: 'Exit routes unobstructed' }, description: { en: '' } },
      { id: 'er_2', text: { en: 'Emergency lighting functional' }, description: { en: '' } },
      { id: 'er_3', text: { en: 'Exit signs visible' }, description: { en: '' } },
      { id: 'er_4', text: { en: 'Assembly point clear' }, description: { en: '' } }
    ]
  },

  // --- WORK AT HEIGHT ---
  {
    category: 'Work at Height',
    title: { en: 'Scaffolding Inspection (Weekly)' },
    items: [
      { id: 'sc_1', text: { en: 'Base plates/sole boards secure' }, description: { en: 'Ground is stable' } },
      { id: 'sc_2', text: { en: 'Standards upright and braced' }, description: { en: '' } },
      { id: 'sc_3', text: { en: 'Guardrails and toe boards in place' }, description: { en: 'Top, mid, and toe' } },
      { id: 'sc_4', text: { en: 'Planks secured and no gaps' }, description: { en: '' } },
      { id: 'sc_5', text: { en: 'Scafftag updated (Green)' }, description: { en: '' } }
    ]
  },
  {
    category: 'Work at Height',
    title: { en: 'Ladder Safety Check' },
    items: [
      { id: 'ld_1', text: { en: 'Rungs/steps in good condition' }, description: { en: 'No cracks or bends' } },
      { id: 'ld_2', text: { en: 'Anti-slip feet present' }, description: { en: '' } },
      { id: 'ld_3', text: { en: 'Ladder secured/tied off' }, description: { en: '' } },
      { id: 'ld_4', text: { en: 'Correct angle (1:4 ratio)' }, description: { en: '' } }
    ]
  },
  {
    category: 'Work at Height',
    title: { en: 'Safety Harness Inspection' },
    items: [
      { id: 'sh_1', text: { en: 'Webbing free from cuts/fraying' }, description: { en: '' } },
      { id: 'sh_2', text: { en: 'Buckles and D-rings distortion-free' }, description: { en: '' } },
      { id: 'sh_3', text: { en: 'Shock absorber intact (not deployed)' }, description: { en: '' } },
      { id: 'sh_4', text: { en: 'Inspection tag valid' }, description: { en: '' } }
    ]
  },
  {
    category: 'Work at Height',
    title: { en: 'MEWP Pre-Use Inspection' },
    items: [
      { id: 'mw_1', text: { en: 'Controls functioning correctly' }, description: { en: '' } },
      { id: 'mw_2', text: { en: 'Tires/wheels in good condition' }, description: { en: '' } },
      { id: 'mw_3', text: { en: 'Outriggers/stabilizers functional' }, description: { en: '' } },
      { id: 'mw_4', text: { en: 'Emergency lowering mechanism working' }, description: { en: '' } }
    ]
  },

  // --- ELECTRICAL ---
  {
    category: 'Electrical',
    title: { en: 'Portable Power Tools Check' },
    items: [
      { id: 'pt_1', text: { en: 'Casing intact (no cracks)' }, description: { en: '' } },
      { id: 'pt_2', text: { en: 'Cables free from damage/tape' }, description: { en: '' } },
      { id: 'pt_3', text: { en: 'Plug intact and fused correctly' }, description: { en: '' } },
      { id: 'pt_4', text: { en: 'PAT test tag valid' }, description: { en: '' } }
    ]
  },
  {
    category: 'Electrical',
    title: { en: 'Temporary Electrical Panel' },
    items: [
      { id: 'ep_1', text: { en: 'Panel door closed and locked' }, description: { en: '' } },
      { id: 'ep_2', text: { en: 'ELCB/RCD installed and tested' }, description: { en: '' } },
      { id: 'ep_3', text: { en: 'Cables routed safely (overhead/underground)' }, description: { en: '' } },
      { id: 'ep_4', text: { en: 'Proper earthing connected' }, description: { en: '' } }
    ]
  },
  {
    category: 'Electrical',
    title: { en: 'Lock Out Tag Out (LOTO) Audit' },
    items: [
      { id: 'lo_1', text: { en: 'Isolation points identified' }, description: { en: '' } },
      { id: 'lo_2', text: { en: 'Locks and tags applied' }, description: { en: '' } },
      { id: 'lo_3', text: { en: 'Keys held by authorized person' }, description: { en: '' } },
      { id: 'lo_4', text: { en: 'Zero energy verified' }, description: { en: '' } }
    ]
  },

  // --- EXCAVATION ---
  {
    category: 'Excavation',
    title: { en: 'Daily Excavation Inspection' },
    items: [
      { id: 'ex_1', text: { en: 'Shoring/benching adequate' }, description: { en: '' } },
      { id: 'ex_2', text: { en: 'No water accumulation' }, description: { en: '' } },
      { id: 'ex_3', text: { en: 'Access/egress (ladder) every 7.5m' }, description: { en: '' } },
      { id: 'ex_4', text: { en: 'Spoil pile 1m away from edge' }, description: { en: '' } },
      { id: 'ex_5', text: { en: 'Barriers and signage in place' }, description: { en: '' } }
    ]
  },

  // --- LIFTING ---
  {
    category: 'Lifting',
    title: { en: 'Crane Pre-Use Inspection' },
    items: [
      { id: 'cr_1', text: { en: 'Visual check of wire ropes' }, description: { en: '' } },
      { id: 'cr_2', text: { en: 'Outriggers fully extended' }, description: { en: '' } },
      { id: 'cr_3', text: { en: 'Load chart available' }, description: { en: '' } },
      { id: 'cr_4', text: { en: 'Anti-two block device working' }, description: { en: '' } },
      { id: 'cr_5', text: { en: 'Ground conditions stable' }, description: { en: '' } }
    ]
  },
  {
    category: 'Lifting',
    title: { en: 'Lifting Gear Inspection' },
    items: [
      { id: 'lg_1', text: { en: 'Slings free from cuts/abrasion' }, description: { en: '' } },
      { id: 'lg_2', text: { en: 'Shackles not distorted' }, description: { en: '' } },
      { id: 'lg_3', text: { en: 'Hooks have safety latches' }, description: { en: '' } },
      { id: 'lg_4', text: { en: 'Color code current' }, description: { en: '' } }
    ]
  },

  // --- VEHICLES & PLANT ---
  {
    category: 'Vehicles',
    title: { en: 'Heavy Equipment Inspection' },
    items: [
      { id: 'he_1', text: { en: 'Brakes functioning' }, description: { en: '' } },
      { id: 'he_2', text: { en: 'Reverse alarm working' }, description: { en: '' } },
      { id: 'he_3', text: { en: 'Lights and mirrors intact' }, description: { en: '' } },
      { id: 'he_4', text: { en: 'No hydraulic leaks' }, description: { en: '' } },
      { id: 'he_5', text: { en: 'Operator license valid' }, description: { en: '' } }
    ]
  },
  {
    category: 'Vehicles',
    title: { en: 'Light Vehicle Check' },
    items: [
      { id: 'lv_1', text: { en: 'Seatbelts working' }, description: { en: '' } },
      { id: 'lv_2', text: { en: 'Tires tread depth adequate' }, description: { en: '' } },
      { id: 'lv_3', text: { en: 'Indicators and lights working' }, description: { en: '' } },
      { id: 'lv_4', text: { en: 'First aid kit and extinguisher present' }, description: { en: '' } }
    ]
  },

  // --- CHEMICALS ---
  {
    category: 'Chemicals',
    title: { en: 'Chemical Storage Inspection' },
    items: [
      { id: 'ch_1', text: { en: 'MSDS available for all chemicals' }, description: { en: '' } },
      { id: 'ch_2', text: { en: 'Containers labeled correctly' }, description: { en: '' } },
      { id: 'ch_3', text: { en: 'Secondary containment (drip trays) used' }, description: { en: '' } },
      { id: 'ch_4', text: { en: 'Spill kit available nearby' }, description: { en: '' } },
      { id: 'ch_5', text: { en: 'Ventilation adequate' }, description: { en: '' } }
    ]
  },

  // --- WELFARE ---
  {
    category: 'Welfare',
    title: { en: 'Canteen / Dining Area Hygiene' },
    items: [
      { id: 'wf_1', text: { en: 'Tables and chairs clean' }, description: { en: '' } },
      { id: 'wf_2', text: { en: 'Hand washing facilities working' }, description: { en: '' } },
      { id: 'wf_3', text: { en: 'Drinking water available' }, description: { en: '' } },
      { id: 'wf_4', text: { en: 'Bins provided and emptied' }, description: { en: '' } },
      { id: 'wf_5', text: { en: 'No pest infestation signs' }, description: { en: '' } }
    ]
  },
  {
    category: 'Welfare',
    title: { en: 'Toilet / Washroom Inspection' },
    items: [
      { id: 'tl_1', text: { en: 'Toilets clean and flushed' }, description: { en: '' } },
      { id: 'tl_2', text: { en: 'Soap and paper towels available' }, description: { en: '' } },
      { id: 'tl_3', text: { en: 'Lights working' }, description: { en: '' } },
      { id: 'tl_4', text: { en: 'Cleaning schedule signed' }, description: { en: '' } }
    ]
  },

  // --- OFFICE ---
  {
    category: 'Office',
    title: { en: 'Office Safety Inspection' },
    items: [
      { id: 'of_1', text: { en: 'Walkways clear of cables/boxes' }, description: { en: '' } },
      { id: 'of_2', text: { en: 'Fire exits unlocked and clear' }, description: { en: '' } },
      { id: 'of_3', text: { en: 'Electrical sockets not overloaded' }, description: { en: '' } },
      { id: 'of_4', text: { en: 'Shelving units stable' }, description: { en: '' } }
    ]
  },
  {
    category: 'Office',
    title: { en: 'Ergonomic Assessment' },
    items: [
      { id: 'er_1', text: { en: 'Chair adjusted correctly' }, description: { en: '' } },
      { id: 'er_2', text: { en: 'Monitor at eye level' }, description: { en: '' } },
      { id: 'er_3', text: { en: 'Keyboard/mouse within reach' }, description: { en: '' } },
      { id: 'er_4', text: { en: 'Lighting causes no glare' }, description: { en: '' } }
    ]
  },

  // --- ENVIRONMENT ---
  {
    category: 'Environment',
    title: { en: 'Waste Management Check' },
    items: [
      { id: 'wm_1', text: { en: 'Waste segregated (General/Hazardous/Recyclable)' }, description: { en: '' } },
      { id: 'wm_2', text: { en: 'Bins labeled and covered' }, description: { en: '' } },
      { id: 'wm_3', text: { en: 'No littering on site' }, description: { en: '' } },
      { id: 'wm_4', text: { en: 'Hazardous waste stored in bunded area' }, description: { en: '' } }
    ]
  },
  {
    category: 'Environment',
    title: { en: 'Spill Control Inspection' },
    items: [
      { id: 'sp_1', text: { en: 'Spill kits fully stocked' }, description: { en: '' } },
      { id: 'sp_2', text: { en: 'Drip trays under static plant' }, description: { en: '' } },
      { id: 'sp_3', text: { en: 'No evidence of ground contamination' }, description: { en: '' } }
    ]
  },

  // --- CONFINED SPACE ---
  {
    category: 'Confined Space',
    title: { en: 'Confined Space Entry Check' },
    items: [
      { id: 'cs_1', text: { en: 'Gas test conducted and safe' }, description: { en: '' } },
      { id: 'cs_2', text: { en: 'Ventilation running' }, description: { en: '' } },
      { id: 'cs_3', text: { en: 'Attendant (Standby Man) present' }, description: { en: '' } },
      { id: 'cs_4', text: { en: 'Rescue equipment (tripod/harness) ready' }, description: { en: '' } },
      { id: 'cs_5', text: { en: 'Communication system tested' }, description: { en: '' } }
    ]
  }
];