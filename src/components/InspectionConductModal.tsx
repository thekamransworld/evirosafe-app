import React, { useState, useMemo, useEffect } from 'react';
import type { Inspection, InspectionFinding, ChecklistTemplate, User, Project, InspectionPhase, OpeningMeetingData, ClosingMeetingData, RootCauseAnalysis, ObservationCategory, ObservationType } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
  X, Camera, MapPin, ChevronRight, Users, AlertTriangle, 
  CheckCircle, ClipboardList, MessageSquare, Shield, 
  HardHat, Wrench, FlaskConical, FileText, Siren, Construction
} from 'lucide-react';

interface InspectionConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: Inspection;
  onUpdate: (inspection: Inspection, action?: 'submit' | 'approve' | 'request_revision' | 'close' | 'save') => void;
  onConvertToReport: (finding: InspectionFinding) => void;
  checklistTemplates: ChecklistTemplate[];
  users: User[];
  projects: Project[];
}

// --- CONSTANTS ---
const OBSERVATION_CATEGORIES: { id: ObservationCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'people', label: 'People', icon: <HardHat className="w-4 h-4"/>, color: 'blue' },
  { id: 'equipment', label: 'Equipment', icon: <Wrench className="w-4 h-4"/>, color: 'orange' },
  { id: 'materials', label: 'Materials', icon: <FlaskConical className="w-4 h-4"/>, color: 'purple' },
  { id: 'environment', label: 'Environment', icon: <Construction className="w-4 h-4"/>, color: 'green' },
  { id: 'documentation', label: 'Docs', icon: <FileText className="w-4 h-4"/>, color: 'gray' },
  { id: 'emergency', label: 'Emergency', icon: <Siren className="w-4 h-4"/>, color: 'red' },
];

// --- SUB-COMPONENTS ---

const OpeningMeetingView: React.FC<{ data: OpeningMeetingData | undefined, onSave: (data: OpeningMeetingData) => void, isEditable: boolean }> = ({ data, onSave, isEditable }) => {
    const [formData, setFormData] = useState<OpeningMeetingData>(data || {
        conducted_at: new Date().toISOString(),
        attendees: [],
        supervisor_present: '',
        hazards_discussed: '',
        permits_verified: false,
        emergency_procedures_confirmed: false
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Phase 1: Opening Meeting</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Verify site readiness before starting inspection.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Area Supervisor</label>
                        <input
                            type="text"
                            value={formData.supervisor_present}
                            onChange={e => setFormData({...formData, supervisor_present: e.target.value})}
                            disabled={!isEditable}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="Name of supervisor contacted"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Hazards Discussed</label>
                        <textarea
                            rows={3}
                            value={formData.hazards_discussed}
                            onChange={e => setFormData({...formData, hazards_discussed: e.target.value})}
                            disabled={!isEditable}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="Review known hazards, active permits, LOTO status..."
                        />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-3 mt-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 cursor-pointer">
                            <input type="checkbox" checked={formData.emergency_procedures_confirmed} onChange={e => setFormData({...formData, emergency_procedures_confirmed: e.target.checked})} disabled={!isEditable} className="w-5 h-5 text-blue-600 rounded" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency procedures & muster points confirmed</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 cursor-pointer">
                            <input type="checkbox" checked={formData.permits_verified} onChange={e => setFormData({...formData, permits_verified: e.target.checked})} disabled={!isEditable} className="w-5 h-5 text-blue-600 rounded" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Permits (PTW) verified for the area</span>
                        </label>
                    </div>
                </div>

                {isEditable && (
                    <div className="mt-6 flex justify-end">
                        <Button onClick={() => onSave(formData)} disabled={!formData.supervisor_present}>
                            Complete Opening Meeting & Start
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ClosingMeetingView: React.FC<{ data: ClosingMeetingData | undefined, findings: InspectionFinding[], onSave: (data: ClosingMeetingData) => void, isEditable: boolean }> = ({ data, findings, onSave, isEditable }) => {
    const [formData, setFormData] = useState<ClosingMeetingData>(data || {
        conducted_at: new Date().toISOString(),
        attendees: [],
        key_findings_summary: '',
        immediate_actions_agreed: '',
        supervisor_acknowledged: false,
        follow_up_required: false
    });

    const stats = {
        critical: findings.filter(f => f.risk_level === 'High').length,
        medium: findings.filter(f => f.risk_level === 'Medium').length,
        low: findings.filter(f => f.risk_level === 'Low').length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-green-900 dark:text-green-200">Phase 3: Closing Meeting</h3>
                        <p className="text-sm text-green-700 dark:text-green-300">Review findings and agree on actions.</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center border dark:border-gray-700">
                        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Critical</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center border dark:border-gray-700">
                        <div className="text-2xl font-bold text-orange-500">{stats.medium}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Medium</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center border dark:border-gray-700">
                        <div className="text-2xl font-bold text-green-600">{stats.low}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Low</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Key Findings Summary</label>
                        <textarea
                            rows={3}
                            value={formData.key_findings_summary}
                            onChange={e => setFormData({...formData, key_findings_summary: e.target.value})}
                            disabled={!isEditable}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="Summarize the main issues..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Immediate Actions Agreed</label>
                        <textarea
                            rows={2}
                            value={formData.immediate_actions_agreed}
                            onChange={e => setFormData({...formData, immediate_actions_agreed: e.target.value})}
                            disabled={!isEditable}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="Actions to be taken immediately..."
                        />
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 cursor-pointer">
                            <input type="checkbox" checked={formData.follow_up_required} onChange={e => setFormData({...formData, follow_up_required: e.target.checked})} disabled={!isEditable} className="w-5 h-5 text-green-600 rounded" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Formal follow-up inspection required</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 cursor-pointer">
                            <input type="checkbox" checked={formData.supervisor_acknowledged} onChange={e => setFormData({...formData, supervisor_acknowledged: e.target.checked})} disabled={!isEditable} className="w-5 h-5 text-green-600 rounded" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor acknowledges findings and action plan</span>
                        </label>
                    </div>
                </div>

                {isEditable && (
                    <div className="mt-6 flex justify-end">
                        <Button onClick={() => onSave(formData)} disabled={!formData.supervisor_acknowledged} className="bg-green-600 hover:bg-green-700 text-white">
                            Submit Inspection Report
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
}> = ({ finding, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        description: finding.description || '',
        risk_level: finding.risk_level || 'Low',
        observation_category: finding.observation_category || 'people',
        observation_type: finding.observation_type || 'unsafe_condition',
        immediate_actions: finding.immediate_actions || '',
        evidence_urls: finding.evidence_urls || [],
        root_cause_analysis: finding.root_cause_analysis || { why1: '', why2: '', why3: '', why4: '', why5: '', root_cause: '', systemic_issues: [] }
    });
    const [showRCA, setShowRCA] = useState(false);

    const handleSave = () => {
        if (!formData.description) return alert("Description is required");
        onSave({
            ...finding,
            ...formData,
            id: finding.id || `find_${Date.now()}`,
            status: 'open',
            category: formData.observation_category, // Legacy mapping
            corrective_action_required: true
        } as InspectionFinding);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 mt-2 rounded-lg space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{finding.id ? 'Edit Finding' : 'New Finding'}</h4>
                <button onClick={onCancel}><X className="w-4 h-4 text-gray-500"/></button>
            </div>

            {/* Observation Category */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {OBSERVATION_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFormData({...formData, observation_category: cat.id})}
                            className={`p-2 rounded-lg border text-center text-xs transition-all ${formData.observation_category === cat.id ? `bg-${cat.color}-100 border-${cat.color}-500 text-${cat.color}-700 dark:bg-${cat.color}-900/30 dark:text-${cat.color}-300` : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                            <div className="flex justify-center mb-1">{cat.icon}</div>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Observation Type */}
            <div className="flex gap-2">
                {['unsafe_act', 'unsafe_condition', 'best_practice'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFormData({...formData, observation_type: type as any})}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-md border ${formData.observation_type === type ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}
                    >
                        {type.replace('_', ' ')}
                    </button>
                ))}
            </div>
            
            <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the observation..."
                rows={2} 
                className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Risk Level</label>
                    <select 
                        value={formData.risk_level} 
                        onChange={e => setFormData({...formData, risk_level: e.target.value as any})} 
                        className="w-full text-sm p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Immediate Action</label>
                    <input 
                        type="text"
                        value={formData.immediate_actions}
                        onChange={e => setFormData({...formData, immediate_actions: e.target.value})}
                        placeholder="What was done immediately?"
                        className="w-full text-sm p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                </div>
            </div>

            {/* Root Cause Toggle */}
            <div>
                <button onClick={() => setShowRCA(!showRCA)} className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <ChevronRight className={`w-3 h-3 transition-transform ${showRCA ? 'rotate-90' : ''}`} />
                    {showRCA ? 'Hide Root Cause Analysis' : 'Add Root Cause Analysis (5 Whys)'}
                </button>
                
                {showRCA && (
                    <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg space-y-2 border dark:border-gray-700">
                        <input type="text" placeholder="Why 1: Direct Cause" value={formData.root_cause_analysis.why1} onChange={e => setFormData({...formData, root_cause_analysis: {...formData.root_cause_analysis, why1: e.target.value}})} className="w-full text-xs p-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white" />
                        <input type="text" placeholder="Why 2: Underlying Cause" value={formData.root_cause_analysis.why2} onChange={e => setFormData({...formData, root_cause_analysis: {...formData.root_cause_analysis, why2: e.target.value}})} className="w-full text-xs p-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white" />
                        <input type="text" placeholder="Root Cause Identified" value={formData.root_cause_analysis.root_cause} onChange={e => setFormData({...formData, root_cause_analysis: {...formData.root_cause_analysis, root_cause: e.target.value}})} className="w-full text-xs p-2 border rounded border-blue-300 dark:border-blue-700 dark:bg-gray-900 dark:text-white font-semibold" />
                    </div>
                )}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save Finding</Button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const InspectionConductModal: React.FC<InspectionConductModalProps> = (props) => {
    const { isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users } = props;
    const { activeUser, language, activeOrg } = useAppContext();
    const [currentInspection, setCurrentInspection] = useState(inspection);
    const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);
    
    // Initialize phase if missing
    const [currentPhase, setCurrentPhase] = useState<InspectionPhase>(
        inspection.current_phase || (inspection.status === 'Draft' ? 'opening_meeting' : 'execution')
    );

    // Helper to safely get translated string
    const getTranslated = (textRecord: string | Record<string, string> | undefined) => {
        if (!textRecord) return '';
        if (typeof textRecord === 'string') return textRecord;
        return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
    };

    const template = useMemo(() => checklistTemplates.find(t => t.id === inspection.checklist_template_id), [checklistTemplates, inspection]);
    const isReviewer = useMemo(() => ['HSE_MANAGER', 'SUPERVISOR', 'ADMIN'].includes(activeUser.role), [activeUser.role]);
    
    const itemFindings = useMemo(() => (currentInspection.findings || []).filter(f => f.checklist_item_id), [currentInspection.findings]);
    const generalFindings = useMemo(() => (currentInspection.findings || []).filter(f => !f.checklist_item_id), [currentInspection.findings]);

    const handleSaveFinding = (finding: InspectionFinding) => {
        setCurrentInspection(prev => {
            const findings = prev.findings || [];
            const existingIndex = findings.findIndex(f => f.id === finding.id);
            let newFindings;
            if (existingIndex > -1) {
                newFindings = [...findings];
                newFindings[existingIndex] = finding;
            } else {
                newFindings = [...findings, finding];
            }
            return { ...prev, findings: newFindings };
        });
        setEditingFinding(null);
    };

    const handlePhaseComplete = (phase: InspectionPhase, data: any) => {
        let updatedInspection = { ...currentInspection };
        
        if (phase === 'opening_meeting') {
            updatedInspection.opening_meeting = data;
            updatedInspection.current_phase = 'execution';
            updatedInspection.status = 'In Progress'; // Start execution
            setCurrentPhase('execution');
        } else if (phase === 'closing_meeting') {
            updatedInspection.closing_meeting = data;
            updatedInspection.current_phase = 'closed';
            updatedInspection.status = 'Submitted'; // Submit for review
            onUpdate(updatedInspection, 'submit');
            return; // Close modal handled by parent
        }
        
        setCurrentInspection(updatedInspection);
        onUpdate(updatedInspection, 'save'); // Auto-save progress
    };

    if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="p-5 border-b dark:border-dark-border bg-white dark:bg-dark-card rounded-t-xl sticky top-0 z-10 flex justify-between items-center">
             <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{inspection.title}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${inspection.status === 'Ongoing' || inspection.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {inspection.status}
                    </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>Template: {getTranslated(template.title)}</span>
                    <span>•</span>
                    <span className="font-mono uppercase text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Phase: {currentPhase.replace('_', ' ')}</span>
                </div>
             </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
            </button>
        </header>

        <main className="p-6 space-y-8">
            
            {/* PHASE 1: OPENING MEETING */}
            {currentPhase === 'opening_meeting' && (
                <OpeningMeetingView 
                    data={currentInspection.opening_meeting} 
                    onSave={(data) => handlePhaseComplete('opening_meeting', data)}
                    isEditable={true}
                />
            )}

            {/* PHASE 2: EXECUTION (CHECKLIST) */}
            {(currentPhase === 'execution' || currentPhase === 'closing_meeting' || currentPhase === 'closed') && (
                <>
                    {/* Read-only view of Opening Meeting if passed */}
                    {currentInspection.opening_meeting && currentPhase !== 'execution' && (
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg mb-6 opacity-75">
                            <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Opening Meeting Completed</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Supervisor: {currentInspection.opening_meeting.supervisor_present} • Hazards: {currentInspection.opening_meeting.hazards_discussed}</p>
                        </div>
                    )}

                    <section>
                        <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Checklist Execution</h3>
                            {currentPhase === 'execution' && (
                                <Button size="sm" onClick={() => setCurrentPhase('closing_meeting')}>Proceed to Closing Meeting →</Button>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            {template.items.map((item, index) => {
                                const finding = itemFindings.find(f => f.checklist_item_id === item.id);
                                const isEditingThis = editingFinding?.checklist_item_id === item.id;
                                
                                return (
                                    <div key={item.id} className={`p-4 border rounded-lg transition-all ${finding ? 'border-red-300 bg-red-50/30 dark:border-red-900/50' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {index + 1}
                                                    </span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{getTranslated(item.text)}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1">{getTranslated(item.description)}</p>
                                            </div>
                                            
                                            {!finding && !isEditingThis && currentPhase === 'execution' && (
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100">Pass</button>
                                                    <button 
                                                        onClick={() => setEditingFinding({ checklist_item_id: item.id })}
                                                        className="px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 flex items-center gap-1"
                                                    >
                                                        <AlertTriangle className="w-3 h-3"/> Fail
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {isEditingThis ? (
                                            <FindingForm
                                                finding={editingFinding!}
                                                onSave={handleSaveFinding}
                                                onCancel={() => setEditingFinding(null)}
                                            />
                                        ) : finding ? (
                                            <div className="ml-8 mt-3 p-3 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 rounded-lg shadow-sm">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold uppercase text-red-600">{finding.risk_level} Risk</span>
                                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{finding.observation_category}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{finding.description}</p>
                                                        {finding.root_cause_analysis?.root_cause && (
                                                            <p className="text-xs text-gray-500 mt-1"><strong>Root Cause:</strong> {finding.root_cause_analysis.root_cause}</p>
                                                        )}
                                                    </div>
                                                    {currentPhase === 'execution' && (
                                                        <Button variant="ghost" size="sm" onClick={() => setEditingFinding(finding)}>Edit</Button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* General Findings */}
                    <section>
                        <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">General Observations</h3>
                            {currentPhase === 'execution' && (
                                <Button variant="secondary" size="sm" onClick={() => setEditingFinding({})} leftIcon={<Camera className="w-4 h-4"/>}>
                                    Add Observation
                                </Button>
                            )}
                        </div>

                        {editingFinding && !editingFinding.checklist_item_id && (
                             <FindingForm
                                finding={editingFinding}
                                onSave={handleSaveFinding}
                                onCancel={() => setEditingFinding(null)}
                            />
                        )}

                        <div className="space-y-3">
                            {generalFindings.map(finding => (
                                <div key={finding.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                                    <div className="flex justify-between">
                                        <div>
                                            <span className="text-xs font-bold uppercase text-blue-600">{finding.observation_type?.replace('_', ' ')}</span>
                                            <p className="text-sm mt-1">{finding.description}</p>
                                        </div>
                                        {currentPhase === 'execution' && <Button variant="ghost" size="sm" onClick={() => setEditingFinding(finding)}>Edit</Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* PHASE 3: CLOSING MEETING */}
            {currentPhase === 'closing_meeting' && (
                <ClosingMeetingView 
                    data={currentInspection.closing_meeting}
                    findings={currentInspection.findings || []}
                    onSave={(data) => handlePhaseComplete('closing_meeting', data)}
                    isEditable={true}
                />
            )}

        </main>
        
        {/* Footer Actions */}
        <footer className="p-5 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card rounded-b-xl flex justify-between items-center sticky bottom-0">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <div className="space-x-3">
                {currentPhase !== 'closed' && <Button variant="secondary" onClick={() => onUpdate(currentInspection, 'save')}>Save Draft</Button>}
            </div>
        </footer>
      </div>
    </div>
  );
};