import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionFinding, ChecklistTemplate, User, Project, ObservationCategory, ObservationType, ImmediateControl } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { X, Camera, MapPin, AlertTriangle, Search, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

// --- ROOT CAUSE MODAL ---
const RootCauseAnalysisModal: React.FC<{
  finding: any;
  onSave: (analysis: { systemic_issues: string[] }) => void;
  onClose: () => void;
}> = ({ finding, onSave, onClose }) => {
  const [analysis, setAnalysis] = useState({
    why1: '', why2: '', why3: '', why4: '', why5: '',
    systemic_issues: [] as string[],
  });

  const SYSTEMIC_ISSUES = [
    'Training / Competence', 'Procedures / Work Instructions', 'Supervision / Leadership',
    'Communication', 'Equipment Design / Maintenance', 'Work Environment',
    'Resource Allocation', 'Time Pressure', 'Organizational Culture', 'Contractor Management',
  ];

  const handleSubmit = () => {
    if (!analysis.why1.trim()) {
      alert('Please complete at least the first "Why"');
      return;
    }
    onSave({ systemic_issues: analysis.systemic_issues });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Root Cause Analysis (5 Whys)</h2>
            <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-gray-800 dark:text-gray-200 font-medium">{finding.description}</p>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10 rounded-r-lg">
                  <label className="block text-sm font-bold mb-2">Why {i}?</label>
                  <input
                    type="text"
                    value={analysis[`why${i}` as keyof typeof analysis] as string}
                    onChange={(e) => setAnalysis(prev => ({ ...prev, [`why${i}`]: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              ))}
            </div>
            <div>
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Systemic Issues</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SYSTEMIC_ISSUES.map(issue => (
                    <button
                    key={issue}
                    onClick={() => setAnalysis(prev => ({
                        ...prev,
                        systemic_issues: prev.systemic_issues.includes(issue)
                        ? prev.systemic_issues.filter(i => i !== issue)
                        : [...prev.systemic_issues, issue]
                    }))}
                    className={`p-3 border rounded-lg text-sm text-left transition-all ${analysis.systemic_issues.includes(issue) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-700'}`}
                    >
                    {issue}
                    </button>
                ))}
                </div>
            </div>
        </div>
        <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Analysis</Button>
        </div>
      </div>
    </div>
  );
};

const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
    users: User[];
}> = ({ finding, onSave, onCancel, users }) => {
    const { activeUser } = useAppContext();
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
            // @ts-ignore
            created_at: new Date().toISOString(),
            // @ts-ignore
            created_by: activeUser?.id || '',
        } as InspectionFinding;
        
        onSave(savedFinding);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b pb-4">
                <h4 className="font-bold text-xl text-gray-900 dark:text-white">
                    {finding.id ? 'Edit Finding' : 'Record New Finding'}
                </h4>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Observation Category</label>
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

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Type of Observation</label>
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
                            <div className={`text-sm font-medium ${formData.observation_type === type.id ? `text-${type.color}-700 dark:text-${type.color}-300` : ''}`}>{type.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Detailed Description</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Be specific: What did you observe? Where? When? Who was involved?"
                    rows={4}
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

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
                        placeholder="What immediate action was taken?"
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <Button onClick={handleAddImmediateControl} size="sm">Add Control</Button>
                </div>
                {formData.immediate_controls.length > 0 && (
                    <div className="space-y-2">
                        {formData.immediate_controls.map((control, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-sm">{control.action}</span>
                                <button onClick={() => setFormData(p => ({...p, immediate_controls: p.immediate_controls.filter((_, i) => i !== index)}))} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Level</label>
                    <select value={formData.risk_level} onChange={e => setFormData(p => ({ ...p, risk_level: e.target.value as any }))} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                        <option value="Low">🟢 Low Risk</option>
                        <option value="Medium">🟡 Medium Risk</option>
                        <option value="High">🔴 High Risk</option>
                        <option value="Critical">⚫ Critical Risk</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                    <select value={formData.responsible_person_id} onChange={e => setFormData(p => ({ ...p, responsible_person_id: e.target.value }))} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                        <option value="">Select responsible person</option>
                        {users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                    <input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900" />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Evidence Collection</label>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { navigator.geolocation.getCurrentPosition((pos) => { setFormData(p => ({ ...p, gps_tag: { lat: pos.coords.latitude, lng: pos.coords.longitude } })); }, () => alert("Could not get location")); }} leftIcon={<MapPinIcon className="w-4 h-4" />}>Tag Location</Button>
                        <Button variant="secondary" size="sm" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/*,video/*'; input.onchange = (e: any) => { if (e.target.files) { const newUrls = Array.from(e.target.files).map(() => `https://source.unsplash.com/random/400x300?sig=${Math.random()}`); setFormData(p => ({ ...p, evidence_urls: [...p.evidence_urls, ...newUrls] })); } }; input.click(); }} leftIcon={<CameraIcon className="w-4 h-4" />}>Add Photo/Video</Button>
                    </div>
                </div>
                {formData.evidence_urls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {formData.evidence_urls.map((url, i) => (
                            <div key={i} className="relative">
                                <img src={url} alt="Evidence" className="w-20 h-20 object-cover rounded border" />
                                <button onClick={() => setFormData(p => ({ ...p, evidence_urls: p.evidence_urls.filter((_, idx) => idx !== i) }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {formData.observation_type !== 'best_practice' && (
                <div className="flex justify-between items-center">
                    <Button variant="secondary" onClick={() => setShowRootCauseModal(true)} leftIcon={<Search className="w-4 h-4" />}>Root Cause Analysis (5 Whys)</Button>
                </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6">Save Finding</Button>
            </div>

            {showRootCauseModal && (
                <RootCauseAnalysisModal
                    finding={formData}
                    onSave={(analysis) => { setFormData(p => ({ ...p, root_causes: analysis.systemic_issues })); setShowRootCauseModal(false); }}
                    onClose={() => setShowRootCauseModal(false)}
                />
            )}
        </div>
    );
};

const FindingDisplay: React.FC<{ finding: InspectionFinding, onConvertToReport: () => void, onEdit: () => void, isReviewer: boolean }> = ({ finding, onConvertToReport, onEdit, isReviewer }) => (
    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-md shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${finding.risk_level === 'High' ? 'bg-red-600' : finding.risk_level === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                        {finding.risk_level}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{finding.observation_category}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{finding.description}</p>
                {finding.evidence_urls.length > 0 && (
                    <div className="mt-2 flex gap-2">
                        {finding.evidence_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt="Evidence" className="h-10 w-10 object-cover rounded border border-red-200" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2">
                {!isReviewer && <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>}
                <Button variant="secondary" size="sm" onClick={onConvertToReport} className="text-xs">Create Report</Button>
            </div>
        </div>
    </div>
);

export const InspectionConductModal: React.FC<any> = (props) => {
    const { isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users } = props;
    const { activeUser, language, activeOrg } = useAppContext();
    const [currentInspection, setCurrentInspection] = useState(inspection);
    const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);

    const getTranslated = (textRecord: string | Record<string, string> | undefined) => {
        if (!textRecord) return '';
        if (typeof textRecord === 'string') return textRecord;
        return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
    };

    const template = useMemo(() => checklistTemplates.find((t: any) => t.id === inspection.checklist_template_id), [checklistTemplates, inspection]);
    const isReviewer = useMemo(() => ['HSE_MANAGER', 'SUPERVISOR', 'ADMIN'].includes(activeUser?.role || ''), [activeUser?.role]);
    const isSubmitted = useMemo(() => ['Submitted', 'Under Review', 'Approved', 'Closed'].includes(currentInspection.status), [currentInspection.status]);
    
    const itemFindings = useMemo(() => (currentInspection.findings || []).filter((f: any) => f.checklist_item_id), [currentInspection.findings]);
    const generalFindings = useMemo(() => (currentInspection.findings || []).filter((f: any) => !f.checklist_item_id), [currentInspection.findings]);

    const handleSaveFinding = (finding: InspectionFinding) => {
        setCurrentInspection((prev: any) => {
            const findings = prev.findings || [];
            const existingIndex = findings.findIndex((f: any) => f.id === finding.id);
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

    if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b dark:border-dark-border bg-white dark:bg-dark-card rounded-t-xl sticky top-0 z-10 flex justify-between items-center">
             <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{inspection.title}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${inspection.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {inspection.status}
                    </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Template: {getTranslated(template.title)}</p>
             </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <CloseIcon className="w-6 h-6 text-gray-500" />
            </button>
        </header>

        <main className="p-6 space-y-8">
            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Checklist Items</h3>
                <div className="space-y-4">
                    {template.items.map((item: any, index: number) => {
                        const finding = itemFindings.find((f: any) => f.checklist_item_id === item.id);
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
                                    
                                    {!finding && !isEditingThis && !isSubmitted && (
                                        <div className="flex gap-2">
                                            <button className="px-3 py-1 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100">Pass</button>
                                            <button 
                                                onClick={() => setEditingFinding({ checklist_item_id: item.id })}
                                                className="px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 flex items-center gap-1"
                                            >
                                                <CameraIcon className="w-3 h-3"/> Fail / Finding
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {isEditingThis ? (
                                    <FindingForm
                                        finding={editingFinding!}
                                        onSave={handleSaveFinding}
                                        onCancel={() => setEditingFinding(null)}
                                        users={users}
                                    />
                                ) : finding ? (
                                    <div className="ml-8">
                                        <FindingDisplay
                                            finding={finding}
                                            onEdit={() => setEditingFinding(finding)}
                                            onConvertToReport={() => onConvertToReport(finding)}
                                            isReviewer={isReviewer && isSubmitted}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">General Observations</h3>
                    {!isSubmitted && (
                        <Button variant="secondary" size="sm" onClick={() => setEditingFinding({})} leftIcon={<CameraIcon className="w-4 h-4"/>}>
                            Add General Finding
                        </Button>
                    )}
                </div>

                {editingFinding && !editingFinding.checklist_item_id && (
                     <FindingForm
                        finding={editingFinding}
                        onSave={handleSaveFinding}
                        onCancel={() => setEditingFinding(null)}
                        users={users}
                    />
                )}

                <div className="space-y-4 mt-4">
                    {generalFindings.map((finding: any) => (
                        editingFinding?.id === finding.id ? (
                             <FindingForm
                                key={finding.id}
                                finding={editingFinding!}
                                onSave={handleSaveFinding}
                                onCancel={() => setEditingFinding(null)}
                                users={users}
                            />
                        ) : (
                            <div key={finding.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <FindingDisplay
                                    finding={finding}
                                    onEdit={() => setEditingFinding(finding)}
                                    onConvertToReport={() => onConvertToReport(finding)}
                                    isReviewer={isReviewer && isSubmitted}
                                />
                            </div>
                        )
                    ))}
                    {generalFindings.length === 0 && !editingFinding && (
                        <p className="text-sm text-gray-500 italic text-center py-4">No general observations recorded.</p>
                    )}
                </div>
            </section>

             {(isReviewer && isSubmitted) && (
                <section className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="text-md font-bold mb-2 text-blue-900 dark:text-blue-200">Reviewer Comments</h3>
                    <textarea 
                        placeholder="Add overall comments regarding this inspection..."
                        rows={3}
                        className="w-full p-3 border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentInspection.overall_comments || ''}
                        onChange={(e: any) => setCurrentInspection((p: any) => ({...p, overall_comments: e.target.value}))}
                    />
                </section>
            )}
        </main>
        
        <footer className="p-5 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card rounded-b-xl flex justify-between items-center sticky bottom-0">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <div className="space-x-3">
                {!isSubmitted && <Button variant="secondary" onClick={() => onUpdate(currentInspection, 'save')}>Save Draft</Button>}
                {!isSubmitted && <Button onClick={() => onUpdate(currentInspection, 'submit')} className="bg-green-600 hover:bg-green-700 text-white border-none">Submit Inspection</Button>}
                
                {(isReviewer && isSubmitted) && (
                    <>
                        <Button variant="secondary" onClick={() => onUpdate(currentInspection, 'request_revision')}>Request Revision</Button>
                        <Button onClick={() => onUpdate(currentInspection, 'approve')} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Approve</Button>
                    </>
                )}
                 {currentInspection.status === 'Approved' && isReviewer && (
                    <Button onClick={() => onUpdate(currentInspection, 'close')} className="bg-gray-800 text-white">Archive Inspection</Button>
                 )}
            </div>
        </footer>
      </div>
    </div>
  );
};