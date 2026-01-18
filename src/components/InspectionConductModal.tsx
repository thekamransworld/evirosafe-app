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
} from './InspectionConductModalHelpers';

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
                        <FindingForm
                            finding={editingFinding}
                            onSave={handleSaveFinding}
                            onCancel={() => setEditingFinding(null)}
                            users={users}
                        />
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