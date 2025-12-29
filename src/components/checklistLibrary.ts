import type { ChecklistTemplate } from '../types';

export const MASTER_CHECKLIST_LIBRARY: ChecklistTemplate[] = [
  // --- GENERAL SAFETY ---
  {
    id: 'lib_gen_01', org_id: '', category: 'General', title: { en: 'Daily Site Safety Inspection' },
    items: [
      { id: 'i1', text: { en: 'Access routes clear and safe' }, description: { en: 'No trip hazards' } },
      { id: 'i2', text: { en: 'Proper PPE worn by all personnel' }, description: { en: 'Helmets, boots, vests' } },
      { id: 'i3', text: { en: 'Signage in place and visible' }, description: { en: 'Warning signs, mandatory signs' } },
      { id: 'i4', text: { en: 'First aid kit available and stocked' }, description: { en: 'Check expiry dates' } },
      { id: 'i5', text: { en: 'Fire extinguishers accessible' }, description: { en: 'Not blocked, pressure gauge green' } }
    ]
  },
  {
    id: 'lib_gen_02', org_id: '', category: 'General', title: { en: 'Office Safety Checklist' },
    items: [
      { id: 'i1', text: { en: 'Walkways clear of cables' }, description: { en: 'Cable management' } },
      { id: 'i2', text: { en: 'Fire exits unlocked and clear' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Electrical equipment PAT tested' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Ergonomic setup for workstations' }, description: { en: 'Chairs, monitors adjusted' } }
    ]
  },
  {
    id: 'lib_gen_03', org_id: '', category: 'General', title: { en: 'Visitor Induction Checklist' },
    items: [
      { id: 'i1', text: { en: 'Visitor log signed' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Safety briefing provided' }, description: { en: 'Emergency exits, PPE' } },
      { id: 'i3', text: { en: 'PPE issued' }, description: { en: 'Helmet, vest' } },
      { id: 'i4', text: { en: 'Escort assigned' }, description: { en: 'Visitor never left alone' } }
    ]
  },

  // --- HIGH RISK ---
  {
    id: 'lib_hr_01', org_id: '', category: 'High Risk', title: { en: 'Working at Height (Scaffolding)' },
    items: [
      { id: 'i1', text: { en: 'Scaffolding tagged (Green)' }, description: { en: 'Inspected within 7 days' } },
      { id: 'i2', text: { en: 'Guardrails and toe boards in place' }, description: { en: 'Top, mid, and toe' } },
      { id: 'i3', text: { en: 'Base plates and sole boards secure' }, description: { en: 'Ground stability' } },
      { id: 'i4', text: { en: 'Ladder access secured' }, description: { en: 'Tied off, extends 1m above' } }
    ]
  },
  {
    id: 'lib_hr_02', org_id: '', category: 'High Risk', title: { en: 'Confined Space Entry' },
    items: [
      { id: 'i1', text: { en: 'Gas test conducted and passed' }, description: { en: 'O2, LEL, H2S, CO' } },
      { id: 'i2', text: { en: 'Rescue tripod and winch in place' }, description: { en: 'Tested and ready' } },
      { id: 'i3', text: { en: 'Attendant (hole watcher) present' }, description: { en: 'Communication established' } },
      { id: 'i4', text: { en: 'Ventilation active' }, description: { en: 'Forced air or exhaust' } }
    ]
  },
  {
    id: 'lib_hr_03', org_id: '', category: 'High Risk', title: { en: 'Lifting Operations (Crane)' },
    items: [
      { id: 'i1', text: { en: 'Ground conditions suitable' }, description: { en: 'Outrigger pads used' } },
      { id: 'i2', text: { en: 'Lifting gear certified' }, description: { en: 'Slings, shackles color coded' } },
      { id: 'i3', text: { en: 'Load secure and balanced' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Exclusion zone established' }, description: { en: 'Barricades and signage' } }
    ]
  },
  {
    id: 'lib_hr_04', org_id: '', category: 'High Risk', title: { en: 'Hot Work (Welding/Cutting)' },
    items: [
      { id: 'i1', text: { en: 'Fire extinguisher nearby' }, description: { en: 'Within arm\'s reach' } },
      { id: 'i2', text: { en: 'Flammables removed (10m radius)' }, description: { en: 'Or covered with fire blanket' } },
      { id: 'i3', text: { en: 'Flashback arrestors fitted' }, description: { en: 'Gas cutting sets' } },
      { id: 'i4', text: { en: 'PPE worn (Face shield, leather gloves)' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_hr_05', org_id: '', category: 'High Risk', title: { en: 'Excavation Safety' },
    items: [
      { id: 'i1', text: { en: 'Shoring/benching in place (>1.2m)' }, description: { en: 'Prevent collapse' } },
      { id: 'i2', text: { en: 'Edge protection/barriers installed' }, description: { en: 'Prevent falls into pit' } },
      { id: 'i3', text: { en: 'Access/Egress provided' }, description: { en: 'Ladder every 7.5m' } },
      { id: 'i4', text: { en: 'Spoil pile 1m away from edge' }, description: { en: '' } }
    ]
  },

  // --- ELECTRICAL ---
  {
    id: 'lib_elec_01', org_id: '', category: 'Electrical', title: { en: 'Temporary Electrical Installations' },
    items: [
      { id: 'i1', text: { en: 'Distribution boards locked' }, description: { en: 'Prevent unauthorized access' } },
      { id: 'i2', text: { en: 'Cables elevated or protected' }, description: { en: 'Not a trip hazard' } },
      { id: 'i3', text: { en: 'ELCB/RCD protection active' }, description: { en: 'Test button functional' } },
      { id: 'i4', text: { en: 'Industrial plugs used' }, description: { en: 'No domestic sockets' } }
    ]
  },
  {
    id: 'lib_elec_02', org_id: '', category: 'Electrical', title: { en: 'Hand Tools Inspection' },
    items: [
      { id: 'i1', text: { en: 'Casing intact (no cracks)' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Cord insulation undamaged' }, description: { en: 'No tape repairs' } },
      { id: 'i3', text: { en: 'Dead man switch functional' }, description: { en: 'Grinders/saws' } },
      { id: 'i4', text: { en: 'Guard in place' }, description: { en: 'Rotating parts covered' } }
    ]
  },

  // --- FIRE SAFETY ---
  {
    id: 'lib_fire_01', org_id: '', category: 'Fire', title: { en: 'Fire Extinguisher Monthly Check' },
    items: [
      { id: 'i1', text: { en: 'Pressure gauge in green zone' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Safety pin and seal intact' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Hose/nozzle free of obstruction' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Inspection tag updated' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_fire_02', org_id: '', category: 'Fire', title: { en: 'Emergency Exit Route' },
    items: [
      { id: 'i1', text: { en: 'Routes clear of obstruction' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Emergency lighting functional' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Exit signs visible' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Doors open easily' }, description: { en: 'Push bars functional' } }
    ]
  },

  // --- VEHICLES & PLANT ---
  {
    id: 'lib_veh_01', org_id: '', category: 'Vehicles', title: { en: 'Heavy Vehicle Daily Check' },
    items: [
      { id: 'i1', text: { en: 'Brakes functional' }, description: { en: 'Service and parking' } },
      { id: 'i2', text: { en: 'Reverse alarm working' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Mirrors and glass clean/intact' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Tires in good condition' }, description: { en: 'Pressure and tread' } }
    ]
  },
  {
    id: 'lib_veh_02', org_id: '', category: 'Vehicles', title: { en: 'Forklift Inspection' },
    items: [
      { id: 'i1', text: { en: 'Hydraulics (no leaks)' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Forks not bent/cracked' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Seatbelt functional' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Load chart visible' }, description: { en: '' } }
    ]
  },

  // --- ENVIRONMENT ---
  {
    id: 'lib_env_01', org_id: '', category: 'Environment', title: { en: 'Waste Management' },
    items: [
      { id: 'i1', text: { en: 'Waste segregated (General/Hazardous)' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Bins not overflowing' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Hazardous waste area bunded' }, description: { en: 'Prevent leaks' } },
      { id: 'i4', text: { en: 'Site free of litter' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_env_02', org_id: '', category: 'Environment', title: { en: 'Spill Kit Inspection' },
    items: [
      { id: 'i1', text: { en: 'Kit accessible and visible' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Absorbent pads/granules stocked' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Disposal bags available' }, description: { en: '' } },
      { id: 'i4', text: { en: 'PPE (gloves/goggles) included' }, description: { en: '' } }
    ]
  },

  // --- WELFARE ---
  {
    id: 'lib_wel_01', org_id: '', category: 'Welfare', title: { en: 'Canteen Hygiene' },
    items: [
      { id: 'i1', text: { en: 'Tables and chairs clean' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Drinking water available' }, description: { en: 'Cool and clean' } },
      { id: 'i3', text: { en: 'Hand washing facilities working' }, description: { en: 'Soap and towels' } },
      { id: 'i4', text: { en: 'No pest infestation signs' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_wel_02', org_id: '', category: 'Welfare', title: { en: 'Toilet Facilities' },
    items: [
      { id: 'i1', text: { en: 'Toilets flushed and clean' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Consumables stocked' }, description: { en: 'Paper, soap' } },
      { id: 'i3', text: { en: 'Lighting functional' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Cleaning schedule signed' }, description: { en: '' } }
    ]
  }
];