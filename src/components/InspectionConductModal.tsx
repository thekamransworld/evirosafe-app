import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionFinding, ChecklistTemplate, User, Project, InspectionPhase, OpeningMeetingData, ClosingMeetingData } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
    OpeningMeetingSection, ClosingMeetingSection, 
    FollowUpSection, RootCauseAnalysisModal, InspectionReportGenerator 
} from './inspection/InspectionComponents';
import { 
    CloseIcon, CameraIcon, MapPinIcon, FindingDisplay, FindingForm 
} from './InspectionConductModalHelpers'; // We will define these helpers below to keep file clean

// --- HELPER ICONS & COMPONENTS (Inline for simplicity if not separated) ---
const CloseIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const CameraIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;
const MapPinIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;

interface InspectionConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: Inspection;
  onUpdate: (inspection: Inspection, action?: any) => void;
  onConvertToReport: (finding: InspectionFinding) => void;
  checklistTemplates: ChecklistTemplate[];
  users: User[];
  projects: Project[];
}

export const InspectionConductModal: React.FC<InspectionConductModalProps> = ({
  isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users
}) => {
  const { activeUser, language, activeOrg } = useAppContext();
  const [currentInspection, setCurrentInspection] = useState(inspection);
  const [currentPhase, setCurrentPhase] = useState<InspectionPhase>(inspection.phase || 'opening_meeting');
  const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);
  const [showRootCause, setShowRootCause] = useState<InspectionFinding | null>(null);

  const template = useMemo(() => checklistTemplates.find(t => t.id === inspection.checklist_template_id), [checklistTemplates, inspection]);
  const getTranslated = (text: any) => (typeof text === 'string' ? text : text?.en || '');

  const handleSaveFinding = (finding: InspectionFinding) => {
    setCurrentInspection(prev => {
        const findings = prev.findings || [];
        const idx = findings.findIndex(f => f.id === finding.id);
        const newFindings = idx > -1 ? findings.map((f, i) => i === idx ? finding : f) : [...findings, finding];
        return { ...prev, findings: newFindings };
    });
    setEditingFinding(null);
  };

  const phases = [
      { id: 'opening_meeting', label: '1. Opening' },
      { id: 'execution', label: '2. Inspection' },
      { id: 'closing_meeting', label: '3. Closing' },
      { id: 'follow_up', label: '4. Follow-up' },
      { id: 'documentation', label: '5. Report' }
  ];

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header with Phase Tracker */}
        <header className="p-5 border-b dark:border-dark-border bg-white dark:bg-dark-card rounded-t-xl sticky top-0 z-10">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{inspection.title}</h2>
                <button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-500" /></button>
             </div>
             <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
                 {phases.map((p, i) => (
                     <button 
                        key={p.id}
                        onClick={() => setCurrentPhase(p.id as InspectionPhase)}
                        className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${currentPhase === p.id ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                     >
                         {p.label}
                     </button>
                 ))}
             </div>
        </header>

        <main className="p-6 space-y-8 min-h-[500px]">
            
            {/* PHASE 1: OPENING MEETING */}
            {currentPhase === 'opening_meeting' && (
                <OpeningMeetingSection 
                    inspectionId={inspection.id}
                    teamMembers={users}
                    isEditable={true}
                    initialData={currentInspection.opening_meeting}
                    onComplete={(data) => {
                        const updated = { ...currentInspection, opening_meeting: data, phase: 'execution' as InspectionPhase };
                        setCurrentInspection(updated);
                        onUpdate(updated, 'save');
                        setCurrentPhase('execution');
                    }}
                />
            )}

            {/* PHASE 2: EXECUTION (Checklist) */}
            {currentPhase === 'execution' && (
                <div className="space-y-6">
                    <div className="flex justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Checklist Execution</h3>
                        <Button size="sm" onClick={() => setEditingFinding({})} leftIcon={<CameraIcon className="w-4 h-4"/>}>Add Observation</Button>
                    </div>
                    
                    {/* Finding Editor */}
                    {editingFinding && (
                        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Edit Finding</h4>
                            <textarea 
                                className="w-full p-2 border rounded mb-2 dark:bg-gray-900 dark:text-white" 
                                placeholder="Description..." 
                                value={editingFinding.description || ''}
                                onChange={e => setEditingFinding({...editingFinding, description: e.target.value})}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => setEditingFinding(null)}>Cancel</Button>
                                <Button onClick={() => handleSaveFinding({ ...editingFinding, id: editingFinding.id || `f_${Date.now()}`, risk_level: 'Medium', status: 'open' } as InspectionFinding)}>Save</Button>
                            </div>
                        </div>
                    )}

                    {/* Checklist Items */}
                    <div className="space-y-3">
                        {template.items.map((item, idx) => {
                            const finding = currentInspection.findings?.find(f => f.checklist_item_id === item.id);
                            return (
                                <div key={item.id} className={`p-4 border rounded-lg ${finding ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex justify-between">
                                        <div>
                                            <span className="font-bold text-gray-900 dark:text-white">{idx + 1}. {getTranslated(item.text)}</span>
                                            {finding && <p className="text-sm text-red-600 mt-1">Finding: {finding.description}</p>}
                                        </div>
                                        {!finding && (
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-bold">Pass</button>
                                                <button onClick={() => setEditingFinding({ checklist_item_id: item.id })} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-bold">Fail</button>
                                            </div>
                                        )}
                                        {finding && (
                                            <Button size="sm" variant="secondary" onClick={() => setShowRootCause(finding)}>Root Cause</Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={() => setCurrentPhase('closing_meeting')}>Proceed to Closing</Button>
                    </div>
                </div>
            )}

            {/* PHASE 3: CLOSING MEETING */}
            {currentPhase === 'closing_meeting' && (
                <ClosingMeetingSection 
                    inspection={currentInspection}
                    findings={currentInspection.findings || []}
                    isEditable={true}
                    onGenerateReport={() => setCurrentPhase('documentation')}
                    onComplete={(data) => {
                        const updated = { ...currentInspection, closing_meeting: data, phase: 'follow_up' as InspectionPhase, status: 'Approved' as const };
                        setCurrentInspection(updated);
                        onUpdate(updated, 'approve');
                        setCurrentPhase('follow_up');
                    }}
                />
            )}

            {/* PHASE 4: FOLLOW UP */}
            {currentPhase === 'follow_up' && (
                <FollowUpSection 
                    findings={currentInspection.findings || []}
                    onVerify={(id, verified) => {
                        const updatedFindings = currentInspection.findings.map(f => f.id === id ? { ...f, status: verified ? 'closed' : 'open' } : f);
                        // @ts-ignore
                        setCurrentInspection(prev => ({ ...prev, findings: updatedFindings }));
                    }}
                />
            )}

            {/* PHASE 5: DOCUMENTATION */}
            {currentPhase === 'documentation' && (
                <InspectionReportGenerator inspection={currentInspection} />
            )}

        </main>
        
        {/* Root Cause Modal */}
        {showRootCause && (
            <RootCauseAnalysisModal 
                finding={showRootCause}
                onClose={() => setShowRootCause(null)}
                onSave={(analysis) => {
                    // Save analysis logic
                    setShowRootCause(null);
                }}
            />
        )}
      </div>
    </div>
  );
};