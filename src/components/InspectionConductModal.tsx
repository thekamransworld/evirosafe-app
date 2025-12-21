import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionFinding, ChecklistTemplate, User, Project } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

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

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

const FindingForm: React.FC<{
    finding: Partial<InspectionFinding>;
    onSave: (finding: InspectionFinding) => void;
    onCancel: () => void;
    users: User[];
}> = ({ finding, onSave, onCancel, users }) => {
    const [formData, setFormData] = useState({
        description: finding.description || '',
        risk_level: finding.risk_level || 'Low',
        category: finding.category || 'Unsafe Condition',
        evidence_urls: finding.evidence_urls || [],
        corrective_action_required: finding.corrective_action_required ?? true,
        responsible_person_id: finding.responsible_person_id || '',
        due_date: finding.due_date || '',
        gps_tag: finding.gps_tag
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Mock upload for demo
            const newUrls = Array.from(e.target.files).map(() => `https://source.unsplash.com/random/200x200?sig=${Math.random()}`);
            setFormData(prev => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...newUrls] }));
        }
    };

    const handleGetGps = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({...prev, gps_tag: { lat: position.coords.latitude, lng: position.coords.longitude }}));
            },
            (error) => alert("Could not get location.")
        );
    };

    const handleSave = () => {
        if (!formData.description) return alert("Description is required");
        onSave({
            ...finding,
            ...formData,
            id: finding.id || `find_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            status: 'Open'
        } as InspectionFinding);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 mt-2 rounded-lg space-y-3 animate-fade-in">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{finding.id ? 'Edit Finding' : 'New Finding'}</h4>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-4 h-4"/></button>
            </div>
            
            <textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the non-conformance or hazard..."
                rows={2} 
                className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
            />
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Risk Level</label>
                    <select 
                        value={formData.risk_level} 
                        onChange={e => setFormData(p => ({ ...p, risk_level: e.target.value as any}))} 
                        className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select 
                        value={formData.category} 
                        onChange={e => setFormData(p => ({ ...p, category: e.target.value as any }))} 
                        className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                    >
                        <option>Unsafe Act</option>
                        <option>Unsafe Condition</option>
                        <option>Documentation</option>
                        <option>Equipment</option>
                        <option>Environmental</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                    <CameraIcon className="w-4 h-4" />
                    <span>Add Photo</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <button onClick={handleGetGps} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{formData.gps_tag ? 'Location Tagged' : 'Tag Location'}</span>
                </button>
            </div>

            {formData.evidence_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                    {formData.evidence_urls.map((url, i) => (
                        <img key={i} src={url} alt="Evidence" className="h-12 w-12 object-cover rounded border border-gray-300" />
                    ))}
                </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white border-none">Save Finding</Button>
            </div>
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">{finding.category}</span>
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

export const InspectionConductModal: React.FC<InspectionConductModalProps> = (props) => {
    const { isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users } = props;
    const { activeUser, language, activeOrg } = useAppContext();
    const [currentInspection, setCurrentInspection] = useState(inspection);
    const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);

    // Helper to safely get translated string
    const getTranslated = (textRecord: string | Record<string, string> | undefined) => {
        if (!textRecord) return '';
        if (typeof textRecord === 'string') return textRecord;
        return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
    };

    const template = useMemo(() => checklistTemplates.find(t => t.id === inspection.checklist_template_id), [checklistTemplates, inspection]);
    const isReviewer = useMemo(() => ['HSE_MANAGER', 'SUPERVISOR', 'ADMIN'].includes(activeUser.role), [activeUser.role]);
    const isSubmitted = useMemo(() => ['Submitted', 'Under Review', 'Approved', 'Closed'].includes(currentInspection.status), [currentInspection.status]);
    
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

    if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
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
            {/* Checklist Items Section */}
            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Checklist Items</h3>
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
                                
                                {/* Finding Form or Display */}
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

            {/* General Findings Section */}
            <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">General Observations</h3>
                    {!isSubmitted && (
                        <Button variant="secondary" size="sm" onClick={() => setEditingFinding({})} leftIcon={<CameraIcon className="w-4 h-4"/>}>
                            Add General Finding
                        </Button>
                    )}
                </div>

                {/* New General Finding Form */}
                {editingFinding && !editingFinding.checklist_item_id && (
                     <FindingForm
                        finding={editingFinding}
                        onSave={handleSaveFinding}
                        onCancel={() => setEditingFinding(null)}
                        users={users}
                    />
                )}

                <div className="space-y-4 mt-4">
                    {generalFindings.map(finding => (
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

             {/* Review Section */}
             {(isReviewer && isSubmitted) && (
                <section className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="text-md font-bold mb-2 text-blue-900 dark:text-blue-200">Reviewer Comments</h3>
                    <textarea 
                        placeholder="Add overall comments regarding this inspection..."
                        rows={3}
                        className="w-full p-3 border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={currentInspection.overall_comments || ''}
                        onChange={e => setCurrentInspection(p => ({...p, overall_comments: e.target.value}))}
                    />
                </section>
            )}
        </main>
        
        {/* Footer Actions */}
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