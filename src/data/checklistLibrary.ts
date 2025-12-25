import type { ChecklistTemplate } from '../types';

export const MASTER_CHECKLIST_LIBRARY: ChecklistTemplate[] = [
  // --- GENERAL SAFETY ---
  {
    id: 'lib_gen_01', org_id: 'system', category: 'General Safety',
    title: { en: 'Daily Site Safety Inspection' },
    items: [
      { id: 'i1', text: { en: 'Access routes clear and safe' }, description: { en: 'No trip hazards or obstructions' } },
      { id: 'i2', text: { en: 'Proper PPE being worn by all' }, description: { en: 'Helmets, boots, vests' } },
      { id: 'i3', text: { en: 'Signage in place and visible' }, description: { en: 'Warning and mandatory signs' } },
      { id: 'i4', text: { en: 'Work areas tidy (Housekeeping)' }, description: { en: 'No debris accumulation' } },
      { id: 'i5', text: { en: 'First aid kit available/stocked' }, description: { en: 'Check expiry dates' } }
    ]
  },
  {
    id: 'lib_gen_02', org_id: 'system', category: 'General Safety',
    title: { en: 'Office Safety Inspection' },
    items: [
      { id: 'i1', text: { en: 'Fire exits clear' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Cables managed (no trip hazards)' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Chairs/Desks in good condition' }, description: { en: 'Ergonomics check' } }
    ]
  },

  // --- FIRE SAFETY ---
  {
    id: 'lib_fire_01', org_id: 'system', category: 'Fire Safety',
    title: { en: 'Fire Extinguisher Monthly Check' },
    items: [
      { id: 'i1', text: { en: 'Extinguisher in correct location' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Pressure gauge in green zone' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Safety pin and seal intact' }, description: { en: '' } },
      { id: 'i4', text: { en: 'No physical damage/corrosion' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Inspection tag updated' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_fire_02', org_id: 'system', category: 'Fire Safety',
    title: { en: 'Hot Work Area Pre-Check' },
    items: [
      { id: 'i1', text: { en: 'Combustibles removed (10m radius)' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Fire extinguisher immediately available' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Fire watch appointed' }, description: { en: '' } }
    ]
  },

  // --- ELECTRICAL ---
  {
    id: 'lib_elec_01', org_id: 'system', category: 'Electrical',
    title: { en: 'Portable Power Tools Inspection' },
    items: [
      { id: 'i1', text: { en: 'Casing free from cracks/damage' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Power cord/plug in good condition' }, description: { en: 'No exposed wires or tape' } },
      { id: 'i3', text: { en: 'Guards/Safety devices functional' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Valid PAT test tag (if applicable)' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_elec_02', org_id: 'system', category: 'Electrical',
    title: { en: 'Temporary Distribution Board (DB)' },
    items: [
      { id: 'i1', text: { en: 'DB door closed and locked' }, description: { en: '' } },
      { id: 'i2', text: { en: 'ELCB/RCD functional' }, description: { en: 'Test button check' } },
      { id: 'i3', text: { en: 'Proper cable glands used' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Danger signage displayed' }, description: { en: '' } }
    ]
  },

  // --- WORK AT HEIGHT ---
  {
    id: 'lib_wah_01', org_id: 'system', category: 'Work at Height',
    title: { en: 'Scaffolding Inspection (Weekly)' },
    items: [
      { id: 'i1', text: { en: 'Base plates and sole boards secure' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Standards vertical and ledgers level' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Bracing installed correctly' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Working platform fully planked' }, description: { en: 'No gaps' } },
      { id: 'i5', text: { en: 'Guardrails and toe boards in place' }, description: { en: '' } },
      { id: 'i6', text: { en: 'Scafftag updated (Green)' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_wah_02', org_id: 'system', category: 'Work at Height',
    title: { en: 'Safety Harness & Lanyard Check' },
    items: [
      { id: 'i1', text: { en: 'Webbing free from cuts/abrasions' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Stitching intact (no loose threads)' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Metal fittings (buckles/hooks) functional' }, description: { en: 'No rust or distortion' } },
      { id: 'i4', text: { en: 'Shock absorber not deployed' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_wah_03', org_id: 'system', category: 'Work at Height',
    title: { en: 'Ladder Inspection' },
    items: [
      { id: 'i1', text: { en: 'Rungs/Steps secure and clean' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Stiles/Side rails not bent/damaged' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Anti-slip feet present' }, description: { en: '' } }
    ]
  },

  // --- LIFTING ---
  {
    id: 'lib_lift_01', org_id: 'system', category: 'Lifting',
    title: { en: 'Lifting Accessories (Slings/Shackles)' },
    items: [
      { id: 'i1', text: { en: 'SWL/WLL clearly marked' }, description: { en: '' } },
      { id: 'i2', text: { en: 'No cuts, tears, or chemical damage' }, description: { en: 'Webbing slings' } },
      { id: 'i3', text: { en: 'No deformation or cracks' }, description: { en: 'Shackles/Hooks' } },
      { id: 'i4', text: { en: 'Safety latches on hooks functional' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_lift_02', org_id: 'system', category: 'Lifting',
    title: { en: 'Mobile Crane Pre-Use' },
    items: [
      { id: 'i1', text: { en: 'Outriggers fully extended and padded' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Ground condition stable/level' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Load chart available in cab' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Wind speed within limits' }, description: { en: '' } }
    ]
  },

  // --- EXCAVATION ---
  {
    id: 'lib_exc_01', org_id: 'system', category: 'Excavation',
    title: { en: 'Excavation Safety Check' },
    items: [
      { id: 'i1', text: { en: 'Shoring/Benching installed >1.2m' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Edge protection/Barriers in place' }, description: { en: '2m from edge' } },
      { id: 'i3', text: { en: 'Safe access/egress (Ladder/Ramp)' }, description: { en: 'Every 7.5m' } },
      { id: 'i4', text: { en: 'Spoil pile kept 1m from edge' }, description: { en: '' } },
      { id: 'i5', text: { en: 'No water accumulation' }, description: { en: '' } }
    ]
  },

  // --- CONFINED SPACE ---
  {
    id: 'lib_cs_01', org_id: 'system', category: 'Confined Space',
    title: { en: 'Confined Space Entry Pre-Start' },
    items: [
      { id: 'i1', text: { en: 'Gas test conducted and recorded' }, description: { en: 'O2, LEL, H2S, CO' } },
      { id: 'i2', text: { en: 'Ventilation equipment running' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Rescue tripod and winch in place' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Attendant (Standby Man) present' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Communication system tested' }, description: { en: '' } }
    ]
  },

  // --- VEHICLES ---
  {
    id: 'lib_veh_01', org_id: 'system', category: 'Vehicles',
    title: { en: 'Heavy Vehicle / Plant Inspection' },
    items: [
      { id: 'i1', text: { en: 'Brakes and handbrake functional' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Reversing alarm and lights working' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Mirrors and glass clean/intact' }, description: { en: '' } },
      { id: 'i4', text: { en: 'No hydraulic leaks' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Fire extinguisher present' }, description: { en: '' } }
    ]
  },

  // --- ENVIRONMENT ---
  {
    id: 'lib_env_01', org_id: 'system', category: 'Environmental',
    title: { en: 'Waste Management Check' },
    items: [
      { id: 'i1', text: { en: 'Waste bins segregated (Gen/Haz/Rec)' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Bins not overflowing' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Hazardous waste stored in bunded area' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Site free from litter' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_env_02', org_id: 'system', category: 'Environmental',
    title: { en: 'Spill Kit Inspection' },
    items: [
      { id: 'i1', text: { en: 'Kit accessible and signposted' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Contents complete (pads, socks, bags)' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Bin/Container in good condition' }, description: { en: '' } }
    ]
  },

  // --- WELFARE ---
  {
    id: 'lib_wel_01', org_id: 'system', category: 'Welfare',
    title: { en: 'Site Welfare Facilities' },
    items: [
      { id: 'i1', text: { en: 'Toilets clean and sanitary' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Washing facilities (water/soap) available' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Drinking water available' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Rest area clean and ventilated' }, description: { en: '' } }
    ]
  },

  // --- PPE ---
  {
    id: 'lib_ppe_01', org_id: 'system', category: 'PPE',
    title: { en: 'PPE Compliance Check' },
    items: [
      { id: 'i1', text: { en: 'Head protection worn' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Foot protection worn' }, description: { en: '' } },
      { id: 'i3', text: { en: 'High-visibility clothing worn' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Eye/Ear protection worn where required' }, description: { en: '' } }
    ]
  }
];