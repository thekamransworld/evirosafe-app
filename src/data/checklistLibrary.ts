import type { ChecklistTemplate } from '../types';

export const MASTER_CHECKLIST_LIBRARY: ChecklistTemplate[] = [
  // --- GENERAL SAFETY ---
  {
    id: 'lib_gen_01', org_id: 'system', category: 'General', title: { en: 'Daily Site Safety Walkdown' },
    items: [
      { id: 'i1', text: { en: 'Access routes clear of obstructions?' }, description: { en: 'Check walkways, stairs, and emergency exits.' } },
      { id: 'i2', text: { en: 'Proper PPE being worn by all personnel?' }, description: { en: 'Helmets, boots, vests, glasses.' } },
      { id: 'i3', text: { en: 'Work areas tidy and free of waste?' }, description: { en: 'Housekeeping check.' } },
      { id: 'i4', text: { en: 'Safety signage visible and in place?' }, description: { en: 'Warning signs, mandatory signs.' } },
      { id: 'i5', text: { en: 'Lighting adequate in all work areas?' }, description: { en: 'Check dark corners and stairwells.' } }
    ]
  },
  {
    id: 'lib_gen_02', org_id: 'system', category: 'General', title: { en: 'Office Safety Inspection' },
    items: [
      { id: 'i1', text: { en: 'Fire extinguishers visible and accessible?' }, description: { en: 'Check tags and pressure.' } },
      { id: 'i2', text: { en: 'Trailing cables secured?' }, description: { en: 'Trip hazard check.' } },
      { id: 'i3', text: { en: 'Emergency exits unlocked and clear?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'First aid kit stocked?' }, description: { en: '' } }
    ]
  },

  // --- FIRE SAFETY ---
  {
    id: 'lib_fire_01', org_id: 'system', category: 'Fire', title: { en: 'Fire Extinguisher Monthly Inspection' },
    items: [
      { id: 'i1', text: { en: 'Extinguisher in designated location?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Safety pin and tamper seal intact?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Pressure gauge in green zone?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'No physical damage or corrosion?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Inspection tag updated?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_fire_02', org_id: 'system', category: 'Fire', title: { en: 'Hot Work Area Setup' },
    items: [
      { id: 'i1', text: { en: 'Combustibles removed within 10m?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Fire extinguisher immediately available?' }, description: { en: 'Type ABC or CO2' } },
      { id: 'i3', text: { en: 'Fire watch appointed?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Welding screens erected?' }, description: { en: '' } }
    ]
  },

  // --- ELECTRICAL ---
  {
    id: 'lib_elec_01', org_id: 'system', category: 'Electrical', title: { en: 'Temporary Electrical Panel Inspection' },
    items: [
      { id: 'i1', text: { en: 'Panel door closed and locked?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'ELCB / RCD tested and tripping?' }, description: { en: 'Push test button.' } },
      { id: 'i3', text: { en: 'Cables elevated or protected?' }, description: { en: 'Not laying in water/mud.' } },
      { id: 'i4', text: { en: 'Proper industrial plugs used?' }, description: { en: 'No bare wires.' } },
      { id: 'i5', text: { en: 'Panel earthed correctly?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_elec_02', org_id: 'system', category: 'Electrical', title: { en: 'Power Tools Inspection' },
    items: [
      { id: 'i1', text: { en: 'Casing free of cracks/damage?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Cord insulation intact?' }, description: { en: 'No tape repairs allowed.' } },
      { id: 'i3', text: { en: 'Dead man switch functioning?' }, description: { en: 'Grinders/Saws' } },
      { id: 'i4', text: { en: 'Guard in place?' }, description: { en: 'Rotating equipment' } },
      { id: 'i5', text: { en: 'PAT test tag valid?' }, description: { en: '' } }
    ]
  },

  // --- WORK AT HEIGHT ---
  {
    id: 'lib_wah_01', org_id: 'system', category: 'Work at Height', title: { en: 'Scaffolding Weekly Inspection' },
    items: [
      { id: 'i1', text: { en: 'Base plates and sole boards on firm ground?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Standards upright and ledgers level?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Bracing installed correctly?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Guardrails and toe boards in place?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Scafftag updated (Green)?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_wah_02', org_id: 'system', category: 'Work at Height', title: { en: 'Safety Harness & Lanyard Check' },
    items: [
      { id: 'i1', text: { en: 'Webbing free of cuts/burns/fraying?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Metal fittings not distorted/corroded?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Shock absorber pack intact?' }, description: { en: 'Not deployed.' } },
      { id: 'i4', text: { en: 'Snap hooks functioning correctly?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Inspection tag valid?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_wah_03', org_id: 'system', category: 'Work at Height', title: { en: 'Ladder Inspection' },
    items: [
      { id: 'i1', text: { en: 'Rungs/steps tight and not damaged?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Side rails not bent or cracked?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Anti-slip feet present?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Spreader bars locking (stepladders)?' }, description: { en: '' } }
    ]
  },

  // --- LIFTING ---
  {
    id: 'lib_lift_01', org_id: 'system', category: 'Lifting', title: { en: 'Mobile Crane Pre-Use Check' },
    items: [
      { id: 'i1', text: { en: 'Outriggers fully extended and on pads?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Wire rope condition acceptable?' }, description: { en: 'No kinks/birdcaging.' } },
      { id: 'i3', text: { en: 'Load Moment Indicator (LMI) working?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Anti-two block device functional?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Hydraulic hoses free of leaks?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_lift_02', org_id: 'system', category: 'Lifting', title: { en: 'Lifting Gear (Slings/Shackles)' },
    items: [
      { id: 'i1', text: { en: 'SWL/WLL clearly marked?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Webbing slings free of cuts?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Shackle pins correct and secured?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Color code current?' }, description: { en: '' } }
    ]
  },

  // --- EXCAVATION ---
  {
    id: 'lib_exc_01', org_id: 'system', category: 'Excavation', title: { en: 'Daily Excavation Inspection' },
    items: [
      { id: 'i1', text: { en: 'Access/Egress (ladder/ramp) every 7.5m?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Spoil pile at least 1m from edge?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Shoring/benching effective?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'No water accumulation?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Barriers and signage in place?' }, description: { en: '' } }
    ]
  },

  // --- VEHICLES ---
  {
    id: 'lib_veh_01', org_id: 'system', category: 'Vehicles', title: { en: 'Heavy Vehicle / Truck Inspection' },
    items: [
      { id: 'i1', text: { en: 'Brakes functioning?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Reverse alarm working?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Lights and indicators working?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Tires in good condition?' }, description: { en: '' } },
      { id: 'i5', text: { en: 'Mirrors and glass clean/intact?' }, description: { en: '' } }
    ]
  },

  // --- ENVIRONMENT ---
  {
    id: 'lib_env_01', org_id: 'system', category: 'Environment', title: { en: 'Waste Management Check' },
    items: [
      { id: 'i1', text: { en: 'Waste segregated (General/Hazardous/Recyclable)?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Bins covered and not overflowing?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Hazardous waste area bunded?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'No littering on site?' }, description: { en: '' } }
    ]
  },
  {
    id: 'lib_env_02', org_id: 'system', category: 'Environment', title: { en: 'Chemical Storage Inspection' },
    items: [
      { id: 'i1', text: { en: 'MSDS available for all chemicals?' }, description: { en: '' } },
      { id: 'i2', text: { en: 'Secondary containment (drip trays) used?' }, description: { en: '' } },
      { id: 'i3', text: { en: 'Containers labeled correctly?' }, description: { en: '' } },
      { id: 'i4', text: { en: 'Spill kit available nearby?' }, description: { en: '' } }
    ]
  }
];