import type { PtwType, PtwSafetyRequirement } from '../types';

// We use Partial here to allow missing keys during development, 
// or we ensure all keys from PtwType are present.
export const ptwChecklistData: Record<string, { id: string; text: string }[]> = {
  'Utility Work': [
    { id: 'uw_1', text: 'Does the work require announcement to the community?' },
    { id: 'uw_2', text: 'Method Statement / Risk Assessment provided?' },
    { id: 'uw_3', text: 'Work area barricaded with barriers and proper safety signages displayed?' },
    { id: 'uw_4', text: 'Underground service drawing(s) available?' },
    { id: 'uw_5', text: 'Service isolated and locked as per LOTO procedure?' },
  ],
  'Work at Height': [
    { id: 'wah_1', text: 'Does the work require announcement to the community?' },
    { id: 'wah_2', text: 'Method Statement / Risk Assessment provided?' },
    { id: 'wah_3', text: 'Work area barricaded with barriers and proper safety signages displayed?' },
    { id: 'wah_4', text: 'Environmental factors assessed & suitable for work?' },
  ],
  'General Work': [
    { id: 'gw_1', text: 'Risk assessment and method statement approved?' },
    { id: 'gw_2', text: 'Work area barricaded with proper signage?' },
    { id: 'gw_3', text: 'Safe Workplace regarding Lighting and ventilation?' },
  ],
  'Confined Space Entry': [
    { id: 'cs_1', text: 'Risk assessment and method statement approved?' },
    { id: 'cs_2', text: 'Suitable ventilation (natural or mechanical) provided?' },
    { id: 'cs_3', text: 'Proper means of access and egress available?' },
  ],
  'Night Work': [
    { id: 'nw_1', text: 'Adequate lighting provided?' },
    { id: 'nw_2', text: 'Hi-visibility jackets with reflective strips provided?' },
  ],
  'Electrical Work': [
    { id: 'ew_1', text: 'Personnel qualified for electrical work?' },
    { id: 'ew_2', text: 'Power source isolated and locked (LOTO)?' },
  ],
  'Excavation': [
    { id: 'ex_1', text: 'Underground service drawings available?' },
    { id: 'ex_2', text: 'Cave-in protection in place?' },
  ],
  'Hot Work': [
    { id: 'hw_1', text: 'Fire watch appointed?' },
    { id: 'hw_2', text: 'Combustibles removed from area?' },
  ],
  'Road Closure': [
    { id: 'rc_1', text: 'Diversion plan approved?' },
    { id: 'rc_2', text: 'Reflective signage erected?' },
  ],
  'Lifting': [
    { id: 'li_1', text: 'Lifting plan approved?' },
    { id: 'li_2', text: 'Crane capacity suitable for load?' },
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

export const emptySignoff = { name: '', designation: '', email: '', mobile: '', remarks: '', signature: '', signed_at: '' };
export const emptySignature = { signature: '', signed_at: '' };
export const emptyExtension = { is_requested: false, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' }, requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };
export const emptyClosure = { note: '', permit_requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature };