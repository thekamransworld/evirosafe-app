
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
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            setEvidenceFiles(prev => [...prev, ...newFiles]);
            const newUrls = newFiles.map(() => `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/400/300`);
            setFormData(prev => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...newUrls] }));
            event.target.value = '';
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setEvidenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setFormData(prev => ({ ...prev, evidence_urls: prev.evidence_urls.filter((_, index) => index !== indexToRemove) }));
    };

    const handleGetGps = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({...prev, gps_tag: { lat: latitude, lng: longitude }}));
            },
            (error) => { console.error("Error getting location", error); alert("Could not retrieve GPS location."); }
        );
    };

    const handleSave = () => {
        onSave({
            ...finding,
            ...formData,
            id: finding.id || `find_${Math.random().toString(36).substring(2, 9)}`,
        } as InspectionFinding);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-t mt-2 space-y-3 rounded-b-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white">{finding.id ? 'Edit Finding' : 'Create Finding'}</h4>
            <textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the finding..."
                rows={3} className="w-full text-sm p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-4">
                <select value={formData.risk_level} onChange={e => setFormData(p => ({ ...p, risk_level: e.target.value as any}))} className="w-full text-sm p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select>
                <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value as any }))} className="w-full text-sm p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white">
                     <option>Unsafe Act</option>
                     <option>Unsafe Condition</option>
                     <option>Documentation</option>
                     <option>Equipment</option>
                     <option>Environmental</option>
                </select>
            </div>
            <div>
                 <button onClick={handleGetGps} className="text-sm text-blue-600 hover:underline">
                    {formData.gps_tag ? `📍 GPS: ${formData.gps_tag.lat.toFixed(4)}, ${formData.gps_tag.lng.toFixed(4)}` : '📍 Get GPS Location'}
                </button>
            </div>
            <div>
                <div className="flex items-center">
                    <input type="checkbox" id={`ca-required-${finding.id}`} checked={formData.corrective_action_required} onChange={e => setFormData(p => ({...p, corrective_action_required: e.target.checked}))} className="h-4 w-4 rounded" />
                    <label htmlFor={`ca-required-${finding.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">Corrective Action Required</label>
                </div>
                {formData.corrective_action_required && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <select value={formData.responsible_person_id} onChange={e => setFormData(p => ({...p, responsible_person_id: e.target.value}))} className="w-full text-sm p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white">
                            <option value="">Assign to...</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                         <input type="date" value={formData.due_date} onChange={e => setFormData(p => ({...p, due_date: e.target.value}))} className="w-full text-sm p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white" />
                    </div>
                )}
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Evidence</label>
                <div className="mt-1">
                    <input type="file" id={`file-upload-${finding.id}`} multiple onChange={handleFileChange} accept="image/*,video/*" className="hidden"/>
                    <label htmlFor={`file-upload-${finding.id}`} className="text-sm text-primary-600 hover:underline cursor-pointer">Upload Photos/Videos</label>
                </div>
                 {formData.evidence_urls.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {formData.evidence_urls.map((url, index) => (
                            <div key={index} className="flex items-center justify-between p-1 bg-gray-200 dark:bg-white/10 rounded-md text-xs">
                                <span className="truncate pr-4 text-gray-700 dark:text-gray-300">Evidence Photo {index + 1}</span>
                                <button type="button" onClick={() => handleRemoveFile(index)} className="text-red-600 hover:text-red-700 font-semibold">Remove</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex justify-end space-x-2">
                <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save Finding</Button>
            </div>
        </div>
    );
};

const FindingDisplay: React.FC<{ finding: InspectionFinding, onConvertToReport: () => void, onEdit: () => void, isReviewer: boolean }> = ({ finding, onConvertToReport, onEdit, isReviewer }) => (
    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-red-800 dark:text-red-200">Finding Recorded ({finding.risk_level})</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{finding.description}</p>
                {finding.evidence_urls.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                        {finding.evidence_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Evidence ${i+1}`} className="h-16 w-16 object-cover rounded"/>
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="space-x-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={onConvertToReport}>Convert to Report</Button>
                {!isReviewer && <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>}
            </div>
        </div>
    </div>
);

export const InspectionConductModal: React.FC<InspectionConductModalProps> = (props) => {
    const { isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users } = props;
    const { activeUser } = useAppContext();
    const [currentInspection, setCurrentInspection] = useState(inspection);
    const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);

    const template = useMemo(() => checklistTemplates.find(t => t.id === inspection.checklist_template_id), [checklistTemplates, inspection]);
    const isReviewer = useMemo(() => ['HSE_MANAGER', 'SUPERVISOR', 'ADMIN'].includes(activeUser.role), [activeUser.role]);
    const isSubmitted = useMemo(() => ['Submitted', 'Under Review', 'Approved', 'Closed'].includes(currentInspection.status), [currentInspection.status]);
    
    const itemFindings = useMemo(() => (currentInspection.findings || []).filter(f => f.checklist_item_id), [currentInspection.findings]);
    const generalFindings = useMemo(() => (currentInspection.findings || []).filter(f => !f.checklist_item_id), [currentInspection.findings]);

    const handleSaveFinding = (finding: InspectionFinding) => {
        setCurrentInspection(prev => {
            const findings = prev.findings || [];
            const existingIndex = findings.findIndex(f => f.id === finding.id);
            if (existingIndex > -1) {
                const newFindings = [...findings];
                newFindings[existingIndex] = finding;
                return { ...prev, findings: newFindings };
            }
            return { ...prev, findings: [...findings, finding] };
        });
        setEditingFinding(null);
    };

    if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b dark:border-dark-border sticky top-0 bg-white dark:bg-dark-card z-10">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Conduct Inspection: {inspection.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Checklist: {template.title}</p>
             </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <main className="p-6 overflow-y-auto">
            <div className="space-y-4">
                {template.items.map((item, index) => {
                    const finding = itemFindings.find(f => f.checklist_item_id === item.id);
                    const isEditingThis = editingFinding?.checklist_item_id === item.id;
                    return (
                        <div key={item.id} className="p-4 border border-gray-200 dark:border-dark-border rounded-lg">
                            <p className="font-semibold text-gray-900 dark:text-white">{index + 1}. {item.text}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-5 mb-2">{item.description}</p>
                            
                            {isEditingThis ? (
                                <FindingForm
                                    finding={editingFinding!}
                                    onSave={handleSaveFinding}
                                    onCancel={() => setEditingFinding(null)}
                                    users={users}
                                />
                            ) : finding ? (
                                <FindingDisplay
                                    finding={finding}
                                    onEdit={() => setEditingFinding(finding)}
                                    onConvertToReport={() => onConvertToReport(finding)}
                                    isReviewer={isReviewer && isSubmitted}
                                />
                            ) : (
                                <div className="flex items-center space-x-2">
                                    {!isSubmitted && <Button variant="secondary" size="sm" onClick={() => setEditingFinding({ checklist_item_id: item.id })}>+ Add Finding</Button>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-4 border-t dark:border-dark-border">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">General Findings & Observations</h3>
                <div className="space-y-4">
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
                            <div key={finding.id} className="p-4 border rounded-lg">
                                <FindingDisplay
                                    finding={finding}
                                    onEdit={() => setEditingFinding(finding)}
                                    onConvertToReport={() => onConvertToReport(finding)}
                                    isReviewer={isReviewer && isSubmitted}
                                />
                            </div>
                        )
                    ))}
                     {editingFinding && !editingFinding.id && !editingFinding.checklist_item_id && (
                         <FindingForm
                            finding={editingFinding}
                            onSave={handleSaveFinding}
                            onCancel={() => setEditingFinding(null)}
                            users={users}
                        />
                     )}
                </div>
                 {!editingFinding && !isSubmitted && (
                    <div className="mt-4">
                        <Button variant="secondary" onClick={() => setEditingFinding({})}>+ Add General Finding</Button>
                    </div>
                )}
            </div>

             {(isReviewer && isSubmitted) && (
                <div className="mt-8 pt-4 border-t dark:border-dark-border">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Review & Approval</h3>
                    <textarea 
                        placeholder="Add overall comments..."
                        rows={4}
                        className="w-full p-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                        value={currentInspection.overall_comments || ''}
                        onChange={e => setCurrentInspection(p => ({...p, overall_comments: e.target.value}))}
                    />
                </div>
            )}
        </main>
        
        <footer className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card sticky bottom-0 z-10 flex justify-between items-center">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <div className="space-x-2">
                {!isSubmitted && <Button variant="secondary" onClick={() => onUpdate(currentInspection, 'save')}>Save Progress</Button>}
                {!isSubmitted && <Button onClick={() => onUpdate(currentInspection, 'submit')}>Submit for Review</Button>}
                {(isReviewer && isSubmitted) && (
                    <>
                        <Button variant="secondary" onClick={() => onUpdate(currentInspection, 'request_revision')}>Request Revision</Button>
                        <Button onClick={() => onUpdate(currentInspection, 'approve')}>Approve Inspection</Button>
                    </>
                )}
                 {currentInspection.status === 'Approved' && isReviewer && (
                    <Button onClick={() => onUpdate(currentInspection, 'close')}>Close Inspection</Button>
                 )}
            </div>
        </footer>
      </div>
    </div>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
