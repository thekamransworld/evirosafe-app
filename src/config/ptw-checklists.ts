import type { PtwType } from '../types';

export const ptwChecklistData: Record<PtwType, { id: string; text: string }[]> = {
  'Utility Work': [
    { id: 'uw_1', text: 'Does the work require announcement to the community?' },
    { id: 'uw_2', text: 'Method Statement / Risk Assessment provided?' },
    { id: 'uw_3', text: 'Work area barricaded with barriers and proper safety signages displayed?' },
    { id: 'uw_4', text: 'Underground service drawing(s) available?' },
    { id: 'uw_5', text: 'Service isolated and locked as per LOTO procedure?' },
    { id: 'uw_6', text: 'Underground installations are protected, supported, or removed as required?' },
    { id: 'uw_7', text: 'Firewatcher trained to extinguish fire and initiate emergency procedure?' },
    { id: 'uw_8', text: 'Firefighters aware of work and deployed (as required)?' },
    { id: 'uw_9', text: 'Back-up plan in place and approved where shutdown of utility services required?' },
    { id: 'uw_10', text: 'Employees trained & briefed on the Risk Assessment and work environment?' },
    { id: 'uw_11', text: 'Weather conditions suitable to execute the work?' },
    { id: 'uw_12', text: 'Equipment to be used inspected, tested and tagged?' },
    { id: 'uw_13', text: 'Adequate access provided for pedestrian and utility services vehicles?' },
    { id: 'uw_14', text: 'Road diversion plan approved and in place (if required)?' },
    { id: 'uw_15', text: 'Hard barriers installed when excavations are next to roadways?' }
  ],
  'Work at Height': [
    { id: 'wah_1', text: 'Does the work require announcement to the community?' },
    { id: 'wah_2', text: 'Method Statement / Risk Assessment provided?' },
    { id: 'wah_3', text: 'Work area barricaded with barriers and proper safety signages displayed?' },
    { id: 'wah_4', text: 'Environmental factors assessed & suitable for work?' },
    { id: 'wah_5', text: 'Safety Clearance from adjacent structures / FM team?' },
    { id: 'wah_6', text: 'MEWP / Scaffolding is clearly marked with safe Working Load and maximum persons?' },
    { id: 'wah_7', text: 'Scaffolding erected, inspected and tagged by competent personnel?' },
    { id: 'wah_8', text: 'Level and sturdy solid ground surface for access equipment?' },
    { id: 'wah_9', text: 'Minimum distance maintained for overhead power lines?' },
    { id: 'wah_10', text: 'Third-party certificate for MEWP / BMU?' },
    { id: 'wah_11', text: 'Personnel are trained and certified for the job?' },
    { id: 'wah_12', text: 'Electrical systems, pipes, tanks, or valves isolated?' },
    { id: 'wah_13', text: 'Full body harness with shock absorber provided?' },
    { id: 'wah_14', text: 'Ladders/ scaffolds/ MEWP/ BMU are free from defects?' },
    { id: 'wah_15', text: 'If the work on-road, flag man / banks man provided?' }
  ],
  'General Work': [
    { id: 'gw_1', text: 'Risk assessment and method statement approved?' },
    { id: 'gw_2', text: 'Work area barricaded with proper signage?' },
    { id: 'gw_3', text: 'Safe Workplace regarding Lighting and ventilation?' },
    { id: 'gw_4', text: 'Services isolated (LOTO) if required?' },
    { id: 'gw_5', text: 'Fire extinguisher provided nearby?' },
    { id: 'gw_6', text: 'Employees aware of emergency assembly point?' },
    { id: 'gw_7', text: 'Chemicals have MSDS / COSHH present?' },
    { id: 'gw_8', text: 'Toolbox talk conducted?' },
    { id: 'gw_9', text: 'Mandatory PPEs provided and checked?' },
    { id: 'gw_10', text: 'First Aid Kit available at site?' }
  ],
  'Confined Space Entry': [
    { id: 'cs_1', text: 'Risk assessment and method statement approved?' },
    { id: 'cs_2', text: 'Suitable ventilation (natural or mechanical) provided?' },
    { id: 'cs_3', text: 'Proper means of access and egress available?' },
    { id: 'cs_4', text: 'Entrants, standby and supervisor identified?' },
    { id: 'cs_5', text: 'Emergency Rescue plan provided?' },
    { id: 'cs_6', text: 'Gas detector available and calibrated?' },
    { id: 'cs_7', text: 'Retrieval equipment available (tripod, rope)?' },
    { id: 'cs_8', text: 'Communication devices in place?' }
  ],
  'Night Work': [
    { id: 'nw_1', text: 'Adequate lighting provided?' },
    { id: 'nw_2', text: 'Hi-visibility jackets with reflective strips provided?' },
    { id: 'nw_3', text: 'Continuous supervision maintained?' },
    { id: 'nw_4', text: 'Emergency arrangements in place?' }
  ],
  'Electrical Work': [
    { id: 'ew_1', text: 'Personnel qualified for electrical work?' },
    { id: 'ew_2', text: 'Power source isolated and locked (LOTO)?' },
    { id: 'ew_3', text: 'Insulated tools in good condition?' },
    { id: 'ew_4', text: 'Equipment properly grounded?' }
  ],
  'Excavation': [
    { id: 'ex_1', text: 'Underground service drawings available?' },
    { id: 'ex_2', text: 'Cave-in protection in place?' },
    { id: 'ex_3', text: 'Exclusion zones marked?' },
    { id: 'ex_4', text: 'Hard barriers for excavations near roadways?' }
  ],
  'Hot Work': [
    { id: 'hw_1', text: 'Fire watch appointed?' },
    { id: 'hw_2', text: 'Combustibles removed from area?' },
    { id: 'hw_3', text: 'Fire extinguisher (ABC) available?' },
    { id: 'hw_4', text: 'Flashback arrestors fitted on gas hoses?' },
    { id: 'hw_5', text: 'Welding machine certified?' }
  ],
  'Road Closure': [
    { id: 'rc_1', text: 'Diversion plan approved?' },
    { id: 'rc_2', text: 'Reflective signage erected?' },
    { id: 'rc_3', text: 'Hard barriers installed?' },
    { id: 'rc_4', text: 'Flag man / banksman appointed?' }
  ],
  'Lifting': [
    { id: 'li_1', text: 'Lifting plan approved?' },
    { id: 'li_2', text: 'Crane capacity suitable for load?' },
    { id: 'li_3', text: 'Outriggers fully extended on pads?' },
    { id: 'li_4', text: 'Rigging gear certified?' },
    { id: 'li_5', text: 'Taglines attached to load?' }
  ],
  'Mechanical Work': [
    { id: 'mw_1', text: 'Equipment isolated?' },
    { id: 'mw_2', text: 'Tools inspected?' },
    { id: 'mw_3', text: 'PPE provided?' }
  ],
  'Chemical Handling': [
    { id: 'ch_1', text: 'MSDS available?' },
    { id: 'ch_2', text: 'Spill kit available?' },
    { id: 'ch_3', text: 'Appropriate PPE (gloves, mask) used?' }
  ]
};