export type InspectionType = 'safety' | 'environmental' | 'health' | 'fire' | 'equipment' | 'process';

export interface Evidence {
  id: string;
  type: 'photograph' | 'video_recording' | 'audio_note' | 'document_scan';
  title: string;
  description: string;
  url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: Date;
  gps_coordinates?: { latitude: number; longitude: number; accuracy: number };
  timestamp: Date;
  device_info?: any;
  tags: string[];
  encrypted: boolean;
  access_control: string[];
}

export interface ChecklistResponse {
  value: 'pass' | 'fail' | 'na';
  comments?: string;
  evidence_ids?: string[];
  timestamp: Date;
  responder: string;
}

export interface ChecklistItem {
  id: string;
  category?: string;
  requirement: string;
  criteria: string;
  response?: ChecklistResponse;
}

export interface HSEFinding {
  id: string;
  finding_number: string;
  type: 'non_conformity' | 'observation' | 'opportunity_for_improvement' | 'compliment';
  description: string;
  risk_assessment: {
    severity: 1 | 2 | 3 | 4 | 5;
    likelihood: 1 | 2 | 3 | 4 | 5;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'extreme';
    people_at_risk: number;
    potential_consequences: string[];
  };
  status: 'open' | 'closed';
  created_at: Date;
  updated_at: Date;
  created_by: string;
  evidence_ids: string[];
  corrective_action_required: boolean;
}

export interface HSEInspection {
  inspection_id?: string;
  title: string;
  entity_id: string; // Project ID
  type: InspectionType;
  schedule?: {
    scheduled_date: Date;
    scheduled_time: string;
  };
  inspection_team?: {
    team_lead?: { id: string; name: string; role: string; qualification: string; contact: any };
    inspectors?: any[];
  };
  checklist_items?: ChecklistItem[];
  findings?: HSEFinding[];
  evidence?: Evidence[];
  status?: string;
}