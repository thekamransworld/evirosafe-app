import React, { useState, useMemo, useRef } from 'react';
import { Button } from './ui/Button';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Calendar, 
  Users, AlertTriangle, TrendingUp, FileText, BarChart3, 
  Mail, Printer, Download, Sparkles, X, Search 
} from 'lucide-react';
import type { 
  Inspection, InspectionFinding, OpeningMeetingData, ClosingMeetingData, 
  User, ImmediateControl, ObservationCategory, ObservationType 
} from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 00-2.456 2.456z" /></svg>;

// --- FINDING FORM ---
export const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
    users: User[];
    isSubmitted: boolean;
    activeUser: User | null;
}> = ({ finding, onSave, onCancel, users, isSubmitted, activeUser }) => {
    const [formData, setFormData] = useState({
        description: finding.description || '',
        risk_level: finding.risk_level || 'Low',
        category: finding.category || 'Unsafe Condition',
        observation_category: finding.observation_category || 'people_behaviors',
        observation_type: finding.observation_type || 'unsafe_condition',
        evidence_urls: finding.evidence_urls || [],
        corrective_action_required: finding.corrective_action_required ?? true,
        responsible_person_id: finding.responsible_person_id || '',
        due_date: finding.due_date || '',
        gps_tag: finding.gps_tag,
        immediate_controls: finding.immediate_controls || [],
        root_causes: finding.root_causes || [],
    });

    const [newImmediateControl, setNewImmediateControl] = useState('');
    const [showRootCauseModal, setShowRootCauseModal] = useState(false);

    const OBSERVATION_CATEGORIES = [
        { id: 'people_behaviors', label: 'People & Behaviors', icon: '👷', color: 'blue' },
        { id: 'equipment_machinery', label: 'Equipment & Machinery', icon: '🔧', color: 'orange' },
        { id: 'materials_substances', label: 'Materials & Substances', icon: '🧪', color: 'purple' },
        { id: 'work_environment', label: 'Work Environment', icon: '🏗️', color: 'green' },
        { id: 'documentation', label: 'Documentation', icon: '📋', color: 'gray' },
        { id: 'emergency_preparedness', label: 'Emergency Preparedness', icon: '🚨', color: 'red' },
        { id: 'management_systems', label: 'Management Systems', icon: '📊', color: 'indigo' },
    ];

    const handleAddImmediateControl = () => {
        if (!newImmediateControl.trim()) return;
        const control: ImmediateControl = {
            action: newImmediateControl,
            taken_by: activeUser?.id || '',
            taken_at: new Date().toISOString(),
            effectiveness: 'effective'
        };
        setFormData(prev => ({
            ...prev,
            immediate_controls: [...prev.immediate_controls, control]
        }));
        setNewImmediateControl('');
    };

    const handleSave = () => {
        if (!formData.description.trim()) {
            alert("Description is required");
            return;
        }
        
        const savedFinding: InspectionFinding = {
            ...finding,
            ...formData,
            id: finding.id || `find_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            status: 'open',
            created_at: finding.created_at || new Date().toISOString(),
            created_by: finding.created_by || activeUser?.id || '',
        } as InspectionFinding;
        
        onSave(savedFinding);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h4 className="font-bold text-xl text-gray-900 dark:text-white">
                    {finding.id ? 'Edit Finding' : 'Record New Finding'}
                </h4>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            
            {/* Observation Categories */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Observation Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {OBSERVATION_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, observation_category: cat.id as ObservationCategory }))}
                            className={`p-4 rounded-xl border-2 transition-all ${formData.observation_category === cat.id ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                        >
                            <div className="text-2xl mb-2">{cat.icon}</div>
                            <div className="text-xs font-medium">{cat.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Finding Type */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Type of Observation
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'unsafe_act', label: 'Unsafe Act', color: 'red' },
                        { id: 'unsafe_condition', label: 'Unsafe Condition', color: 'orange' },
                        { id: 'non_compliance', label: 'Non-Compliance', color: 'yellow' },
                        { id: 'best_practice', label: 'Best Practice', color: 'green' },
                        { id: 'observation', label: 'Observation', color: 'blue' },
                    ].map(type => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, observation_type: type.id as ObservationType }))}
                            className={`p-3 rounded-lg border ${formData.observation_type === type.id ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20` : 'border-gray-200 dark:border-gray-700'}`}
                        >
                            <div className={`text-sm font-medium ${formData.observation_type === type.id ? `text-${type.color}-700 dark:text-${type.color}-300` : ''}`}>
                                {type.label}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Detailed Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Be specific: What did you observe? Where? When? Who was involved? What was the context?"
                    rows={4}
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Immediate Controls */}
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h5 className="font-bold text-red-700 dark:text-red-300">Immediate Controls Applied</h5>
                </div>
                
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newImmediateControl}
                        onChange={e => setNewImmediateControl(e.target.value)}
                        placeholder="What immediate action was taken? (e.g., Barricaded area, Issued PPE, Stopped work...)"
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <Button onClick={handleAddImmediateControl} size="sm">
                        Add Control
                    </Button>
                </div>

                {formData.immediate_controls.length > 0 && (
                    <div className="space-y-2">
                        {formData.immediate_controls.map((control, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-sm">{control.action}</span>
                                <button
                                    onClick={() => setFormData(p => ({
                                        ...p,
                                        immediate_controls: p.immediate_controls.filter((_, i) => i !== index)
                                    }))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Risk & Responsibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Risk Level
                    </label>
                    <select 
                        value={formData.risk_level} 
                        onChange={e => setFormData(p => ({ ...p, risk_level: e.target.value as any }))} 
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    >
                        <option value="Low">🟢 Low Risk</option>
                        <option value="Medium">🟡 Medium Risk</option>
                        <option value="High">🔴 High Risk</option>
                        <option value="Critical">⚫ Critical Risk</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign To
                    </label>
                    <select 
                        value={formData.responsible_person_id} 
                        onChange={e => setFormData(p => ({ ...p, responsible_person_id: e.target.value }))} 
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    >
                        <option value="">Select responsible person</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Due Date
                    </label>
                    <input
                        type="date"
                        value={formData.due_date}
                        onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                    Save Finding
                </Button>
            </div>
        </div>
    );
};

// --- OPENING MEETING SECTION ---
export const OpeningMeetingSection: React.FC<{
  inspectionId: string;
  teamMembers: User[];
  onComplete: (data: OpeningMeetingData) => void;
  isEditable: boolean;
  initialData?: OpeningMeetingData;
}> = ({
  inspectionId,
  teamMembers,
  onComplete,
  isEditable,
  initialData
}) => {
  const [meetingData, setMeetingData] = useState<OpeningMeetingData>(() => ({
    conducted_at: new Date().toISOString(),
    supervisor_present: initialData?.supervisor_present || '',
    hazards_discussed: initialData?.hazards_discussed || '',
    emergency_procedures_confirmed: initialData?.emergency_procedures_confirmed || false,
    permits_verified: initialData?.permits_verified || false,
    stop_work_authority_confirmed: initialData?.stop_work_authority_confirmed || false,
    attendees: initialData?.attendees || teamMembers.map(m => m.id),
    notes: initialData?.notes || '',
  }));

  const handleSubmit = () => {
    if (!meetingData.supervisor_present.trim()) {
      alert('Please enter the supervisor name');
      return;
    }
    onComplete(meetingData);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-200">Opening Meeting</h2>
          <p className="text-blue-700 dark:text-blue-300">Phase 1: Setup & Communication</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Area Supervisor / Lead Present
            </label>
            <input
              type="text"
              value={meetingData.supervisor_present}
              onChange={(e) => setMeetingData({...meetingData, supervisor_present: e.target.value})}
              disabled={!isEditable}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              placeholder="Enter supervisor name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Inspection Team
            </label>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(member => (
                <span key={member.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  {member.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">Safety Briefing & Hazards</h3>
          </div>
          
          <textarea
            value={meetingData.hazards_discussed}
            onChange={(e) => setMeetingData({...meetingData, hazards_discussed: e.target.value})}
            disabled={!isEditable}
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
            placeholder="Discuss known hazards, hot work permits, lockout-tagout status, confined space entries, emergency exits, first aid locations..."
          />
        </div>

        {/* Action Button */}
        {isEditable && (
          <div className="pt-6 border-t border-blue-200 dark:border-blue-800">
            <Button
              onClick={handleSubmit}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg"
              leftIcon={<Users className="w-5 h-5" />}
            >
              Complete Opening Meeting & Start Inspection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- CLOSING MEETING SECTION ---
export const ClosingMeetingSection: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  onComplete: (data: ClosingMeetingData) => void;
  onGenerateReport: () => void;
  isEditable: boolean;
}> = ({
  inspection,
  findings,
  onComplete,
  onGenerateReport,
  isEditable
}) => {
  const [closingData, setClosingData] = useState<ClosingMeetingData>({
    conducted_at: new Date().toISOString(),
    key_findings_summary: '',
    immediate_actions_agreed: '',
    follow_up_required: false,
    next_inspection_date: '',
    supervisor_acknowledged: false,
    recommendations: '',
  });

  const handleSubmit = () => {
    if (!closingData.supervisor_acknowledged) {
      alert('Supervisor acknowledgement is required');
      return;
    }
    if (!closingData.key_findings_summary.trim()) {
      alert('Please provide a findings summary');
      return;
    }
    onComplete(closingData);
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200">Closing Meeting</h2>
          <p className="text-green-700 dark:text-green-300">Phase 3: Review & Action Planning</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Key Findings Summary
          </label>
          <textarea
            value={closingData.key_findings_summary}
            onChange={(e) => setClosingData({...closingData, key_findings_summary: e.target.value})}
            disabled={!isEditable}
            rows={4}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800"
            placeholder="Summarize the main findings, trends identified, and overall assessment..."
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={closingData.supervisor_acknowledged}
                  onChange={(e) => setClosingData({...closingData, supervisor_acknowledged: e.target.checked})}
                  disabled={!isEditable}
                  className="rounded"
                />
                <span className="font-bold">Supervisor Acknowledgement</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                I acknowledge receipt of these findings and accept responsibility for implementing the agreed actions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-green-200 dark:border-green-800 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onGenerateReport}
          variant="secondary"
          leftIcon={<FileText className="w-5 h-5" />}
          className="flex-1"
        >
          Generate Inspection Report
        </Button>
        
        {isEditable && (
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            leftIcon={<CheckCircle className="w-5 h-5" />}
            disabled={!closingData.supervisor_acknowledged}
          >
            Complete Inspection & Close
          </Button>
        )}
      </div>
    </div>
  );
};

// --- INSPECTION REPORT GENERATOR ---
export const InspectionReportGenerator: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  openingMeeting: any;
  closingMeeting: any;
  onEmail?: (emailData: any) => void;
}> = ({
  inspection,
  findings,
  openingMeeting,
  closingMeeting,
  onEmail
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`inspection-report-${inspection.id}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={generatePDF}
            leftIcon={<Download className="w-4 h-4" />}
            variant="secondary"
          >
            Download PDF
          </Button>
          <Button
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            variant="secondary"
          >
            Print Report
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="bg-white p-8 rounded-xl border shadow-lg">
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">INSPECTION REPORT</h1>
          <h2 className="text-xl text-gray-700">{inspection.title}</h2>
        </div>
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Executive Summary
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{closingMeeting?.key_findings_summary || 'No summary available'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FOLLOW UP SECTION ---
export const FollowUpSection: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  onVerify: (findingId: string, verification: any) => void;
  onScheduleFollowUp: (date: string) => void;
}> = ({
  inspection,
  findings,
  onVerify,
  onScheduleFollowUp
}) => {
  const [verificationDates, setVerificationDates] = useState<Record<string, string>>({});
  const [followUpDate, setFollowUpDate] = useState(
    inspection.scheduled_follow_up || ''
  );

  const openFindings = findings.filter(f => 
    f.status === 'open' || f.status === 'in_progress'
  );
  
  const verifiedFindings = findings.filter(f => 
    f.verification_data?.verified_by
  );

  const handleVerify = (findingId: string, effective: boolean) => {
    const verification = {
      verified_by: 'current_user_id',
      verified_at: new Date().toISOString(),
      effective,
      notes: effective ? 'Action verified as effective' : 'Action not effective, requires rework',
      evidence_urls: [],
    };
    onVerify(findingId, verification);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-200 mb-2">
          Follow-up & Verification
        </h2>
        <p className="text-purple-700 dark:text-purple-300">Phase 4: Action Verification</p>
      </div>

      {openFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Findings Pending Verification
          </h3>
          
          <div className="space-y-3">
            {openFindings.map(finding => (
              <div key={finding.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{finding.description}</h4>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVerify(finding.id, true)}
                      leftIcon={<CheckCircle className="w-4 h-4" />}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Verify Effective
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleVerify(finding.id, false)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Not Effective
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- AI RISK ANALYSIS ---
export const AiRiskAnalysis: React.FC<{
  findings: InspectionFinding[];
  onAnalysisComplete: (analysis: any) => void;
}> = ({ findings, onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const analyzeFindings = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockAnalysis = {
        primaryCategory: 'People & Behaviors',
        trend: 'Increasing unsafe acts in high-risk areas',
        priorityArea: 'PPE Compliance',
        recommendations: [
          'Conduct refresher training on PPE usage',
          'Increase supervision during shift changes',
          'Implement positive reinforcement program'
        ]
      };
      setAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg mb-6 border border-purple-100 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <h4 className="font-bold text-purple-900 dark:text-purple-200">AI Risk Analysis</h4>
        </div>
        <Button 
          size="sm" 
          onClick={analyzeFindings} 
          disabled={isAnalyzing || findings.length === 0}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Trends'}
        </Button>
      </div>
      
      {analysis && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Primary Risk Category</div>
              <div className="font-bold text-sm">{analysis.primaryCategory}</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Trend Detected</div>
              <div className="font-bold text-sm">{analysis.trend}</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded border">
              <div className="text-xs text-gray-500">Priority Area</div>
              <div className="font-bold text-sm">{analysis.priorityArea}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};