import type { ChecklistTemplate } from '../types';

export const MASTER_CHECKLIST_LIBRARY: ChecklistTemplate[] = [
  // --- GENERAL SAFETY ---
  {
    id: 'lib_gen_01', org_id: 'system', category: 'General Safety',
    title: { en: 'Daily Site Safety Inspection' },
    items: [
      { id: '1', text: { en: 'Access routes clear and safe' }, description: { en: 'No trip hazards, adequate lighting' } },
      { id: '2', text: { en: 'Proper PPE being worn by all' }, description: { en: 'Helmets, boots, vests, glasses' } },
      { id: '3', text: { en: 'Signage in place and visible' }, description: { en: 'Warning signs, mandatory signs' } },
      { id: '4', text: { en: 'Work areas tidy (Housekeeping)' }, description: { en: 'No debris, waste segregated' } },
      { id: '5', text: { en: 'Welfare facilities clean' }, description: { en: 'Toilets, drinking water, rest area' } }
    ]
  },
  {
    id: 'lib_gen_02', org_id: 'system', category: 'General Safety',
    title: { en: 'Office Safety Inspection' },
    items: [
      { id: '1', text: { en: 'Fire exits clear' }, description: { en: 'No obstructions' } },
      { id: '2', text: { en: 'Cables managed' }, description: { en: 'No trip hazards under desks' } },
      { id: '3', text: { en: 'Chairs/Desks in good condition' }, description: { en: 'Ergonomic setup' } }
    ]
  },

  // --- FIRE SAFETY ---
  {
    id: 'lib_fire_01', org_id: 'system', category: 'Fire Safety',
    title: { en: 'Fire Extinguisher Monthly Check' },
    items: [
      { id: '1', text: { en: 'Extinguisher in correct location' }, description: { en: 'Mounted, accessible' } },
      { id: '2', text: { en: 'Pressure gauge in green zone' }, description: { en: 'Needle in green' } },
      { id: '3', text: { en: 'Safety pin and seal intact' }, description: { en: 'Not tampered with' } },
      { id: '4', text: { en: 'Hose/Nozzle clear' }, description: { en: 'No blockages' } },
      { id: '5', text: { en: 'Inspection tag updated' }, description: { en: 'Signed and dated' } }
    ]
  },
  {
    id: 'lib_fire_02', org_id: 'system', category: 'Fire Safety',
    title: { en: 'Hot Work Area Pre-Check' },
    items: [
      { id: '1', text: { en: 'Combustibles removed (10m radius)' }, description: { en: 'Or covered with fire blanket' } },
      { id: '2', text: { en: 'Fire extinguisher immediately available' }, description: { en: 'Within arm\'s reach' } },
      { id: '3', text: { en: 'Fire Watcher appointed' }, description: { en: 'Identified and present' } }
    ]
  },

  // --- ELECTRICAL ---
  {
    id: 'lib_elec_01', org_id: 'system', category: 'Electrical',
    title: { en: 'Portable Power Tools Inspection' },
    items: [
      { id: '1', text: { en: 'Casing free from cracks/damage' }, description: { en: 'Visual inspection' } },
      { id: '2', text: { en: 'Cord/Cable insulation intact' }, description: { en: 'No exposed wires, no tape' } },
      { id: '3', text: { en: 'Plug undamaged' }, description: { en: 'Pins straight, casing whole' } },
      { id: '4', text: { en: 'Guard in place (if applicable)' }, description: { en: 'Grinders, saws' } }
    ]
  },
  {
    id: 'lib_elec_02', org_id: 'system', category: 'Electrical',
    title: { en: 'Temporary Distribution Board (DB)' },
    items: [
      { id: '1', text: { en: 'DB door closed and locked' }, description: { en: 'Prevent unauthorized access' } },
      { id: '2', text: { en: 'ELCB/RCD tested and tripping' }, description: { en: 'Push test button' } },
      { id: '3', text: { en: 'Cables glanded/secured properly' }, description: { en: 'No strain on connections' } },
      { id: '4', text: { en: 'Proper earthing connected' }, description: { en: 'Earth rod/cable visible' } }
    ]
  },

  // --- WORK AT HEIGHT ---
  {
    id: 'lib_wah_01', org_id: 'system', category: 'Work at Height',
    title: { en: 'Scaffolding Weekly Inspection' },
    items: [
      { id: '1', text: { en: 'Base plates/Sole boards on firm ground' }, description: { en: 'No sinking or undermining' } },
      { id: '2', text: { en: 'Standards upright and braced' }, description: { en: 'Vertical and cross-braced' } },
      { id: '3', text: { en: 'Platforms fully boarded' }, description: { en: 'No gaps, boards secured' } },
      { id: '4', text: { en: 'Guardrails and toe-boards in place' }, description: { en: 'Top rail, mid rail, toe board' } },
      { id: '5', text: { en: 'Scafftag updated' }, description: { en: 'Green tag, signed within 7 days' } }
    ]
  },
  {
    id: 'lib_wah_02', org_id: 'system', category: 'Work at Height',
    title: { en: 'Safety Harness Inspection' },
    items: [
      { id: '1', text: { en: 'Webbing free from cuts/burns' }, description: { en: 'Check entire length' } },
      { id: '2', text: { en: 'Stitching intact' }, description: { en: 'No loose threads' } },
      { id: '3', text: { en: 'Metal fittings not deformed/rusted' }, description: { en: 'Buckles, D-rings' } },
      { id: '4', text: { en: 'Shock absorber not deployed' }, description: { en: 'Check indicator' } },
      { id: '5', text: { en: 'Valid inspection tag/color code' }, description: { en: 'Current period' } }
    ]
  },
  {
    id: 'lib_wah_03', org_id: 'system', category: 'Work at Height',
    title: { en: 'Ladder Inspection' },
    items: [
      { id: '1', text: { en: 'Stiles/Side rails not bent/cracked' }, description: { en: 'Structural integrity' } },
      { id: '2', text: { en: 'Rungs/Steps tight and clean' }, description: { en: 'Not missing, no oil/grease' } },
      { id: '3', text: { en: 'Feet/End caps present' }, description: { en: 'Anti-slip rubber' } }
    ]
  },

  // --- LIFTING ---
  {
    id: 'lib_lift_01', org_id: 'system', category: 'Lifting',
    title: { en: 'Lifting Accessories (Slings/Shackles)' },
    items: [
      { id: '1', text: { en: 'SWL/WLL clearly marked' }, description: { en: 'Legible tag/stamp' } },
      { id: '2', text: { en: 'No cuts, tears, or fraying (Web slings)' }, description: { en: 'Visual check' } },
      { id: '3', text: { en: 'No corrosion or deformation (Shackles/Chains)' }, description: { en: 'Visual check' } },
      { id: '4', text: { en: 'Safety latches on hooks working' }, description: { en: 'Spring return functional' } }
    ]
  },
  {
    id: 'lib_lift_02', org_id: 'system', category: 'Lifting',
    title: { en: 'Mobile Crane Pre-Use' },
    items: [
      { id: '1', text: { en: 'Outriggers fully extended' }, description: { en: 'On pads/mats' } },
      { id: '2', text: { en: 'Level ground' }, description: { en: 'Crane is level' } },
      { id: '3', text: { en: 'Load chart available in cab' }, description: { en: 'Operator reference' } },
      { id: '4', text: { en: 'Wind speed within limits' }, description: { en: 'Anemometer check' } }
    ]
  },

  // --- EXCAVATION ---
  {
    id: 'lib_exc_01', org_id: 'system', category: 'Excavation',
    title: { en: 'Excavation Daily Check' },
    items: [
      { id: '1', text: { en: 'Barriers/Fencing in place' }, description: { en: 'Prevent falls' } },
      { id: '2', text: { en: 'Signage displayed' }, description: { en: 'Deep Excavation signs' } },
      { id: '3', text: { en: 'Safe access/egress provided' }, description: { en: 'Ladder/Ramp every 25ft' } },
      { id: '4', text: { en: 'No water accumulation' }, description: { en: 'Dewatering active if needed' } },
      { id: '5', text: { en: 'Spoil pile 1m away from edge' }, description: { en: 'Prevent collapse' } },
      { id: '6', text: { en: 'Shoring/Benching intact' }, description: { en: 'If depth > 1.2m' } }
    ]
  },

  // --- CONFINED SPACE ---
  {
    id: 'lib_cs_01', org_id: 'system', category: 'Confined Space',
    title: { en: 'Confined Space Entry Check' },
    items: [
      { id: '1', text: { en: 'Gas test conducted and safe' }, description: { en: 'O2, LEL, H2S, CO' } },
      { id: '2', text: { en: 'Ventilation running' }, description: { en: 'Blower/Extractor' } },
      { id: '3', text: { en: 'Attendant (Standby Man) present' }, description: { en: 'At entry point' } },
      { id: '4', text: { en: 'Communication system working' }, description: { en: 'Radio/Signals' } },
      { id: '5', text: { en: 'Rescue tripod/winch in place' }, description: { en: 'If vertical entry' } }
    ]
  },

  // --- VEHICLES ---
  {
    id: 'lib_veh_01', org_id: 'system', category: 'Vehicles',
    title: { en: 'Heavy Vehicle / Plant Inspection' },
    items: [
      { id: '1', text: { en: 'Brakes functioning' }, description: { en: 'Service and parking brake' } },
      { id: '2', text: { en: 'Reversing alarm working' }, description: { en: 'Audible' } },
      { id: '3', text: { en: 'Lights and indicators working' }, description: { en: 'Head, tail, brake, turn' } },
      { id: '4', text: { en: 'Tires in good condition' }, description: { en: 'No deep cuts, pressure ok' } },
      { id: '5', text: { en: 'No fluid leaks' }, description: { en: 'Hydraulic, oil, fuel' } }
    ]
  },

  // --- ENVIRONMENTAL ---
  {
    id: 'lib_env_01', org_id: 'system', category: 'Environmental',
    title: { en: 'Chemical Storage Inspection' },
    items: [
      { id: '1', text: { en: 'MSDS available' }, description: { en: 'For all stored chemicals' } },
      { id: '2', text: { en: 'Secondary containment (Drip tray)' }, description: { en: '110% capacity' } },
      { id: '3', text: { en: 'Containers labeled' }, description: { en: 'Contents and hazard' } },
      { id: '4', text: { en: 'Spill kit nearby' }, description: { en: 'Fully stocked' } }
    ]
  },
  {
    id: 'lib_env_02', org_id: 'system', category: 'Environmental',
    title: { en: 'Waste Management Check' },
    items: [
      { id: '1', text: { en: 'Waste segregated' }, description: { en: 'General, Hazardous, Recyclable' } },
      { id: '2', text: { en: 'Bins not overflowing' }, description: { en: 'Regular removal' } },
      { id: '3', text: { en: 'Skip covers in place' }, description: { en: 'Prevent windblown litter' } }
    ]
  },

  // --- WELFARE ---
  {
    id: 'lib_wel_01', org_id: 'system', category: 'Welfare',
    title: { en: 'Drinking Water Station' },
    items: [
      { id: '1', text: { en: 'Water cooler clean' }, description: { en: 'Hygiene check' } },
      { id: '2', text: { en: 'Water available' }, description: { en: 'Not empty' } },
      { id: '3', text: { en: 'Disposable cups available' }, description: { en: 'Or personal bottles' } },
      { id: '4', text: { en: 'Waste bin for cups' }, description: { en: 'Empty regularly' } }
    ]
  }
];