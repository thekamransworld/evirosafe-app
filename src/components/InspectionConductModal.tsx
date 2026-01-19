import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionFinding, ChecklistTemplate, User, Project, InspectionPhase, OpeningMeetingData, ClosingMeetingData } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
  FindingForm, OpeningMeetingSection, ClosingMeetingSection, 
  InspectionReportGenerator, FollowUpSection, AiRiskAnalysis 
} from './InspectionConductModalHelpers';
import { 
  CheckCircle, XCircle, MinusCircle, 
  MessageSquare, Camera, ChevronDown, ChevronUp,
  AlertTriangle, FileText, Users, Calendar
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

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

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

// Phase progress component
const PhaseProgress: React.FC<{ currentPhase: InspectionPhase }> = ({ currentPhase }) => {
  const phases = [
    { id: 'planning', label: 'Planning', icon: '📋' },
    { id: 'opening_meeting', label: 'Opening Meeting', icon: '👥' },
    { id: 'execution', label: 'Inspection', icon: '🔍' },
    { id: 'documentation', label: 'Documentation', icon: '📝' },
    { id: 'closing_meeting', label: 'Closing Meeting', icon: '✅' },
    { id: 'follow_up', label: 'Follow-up', icon: '🔄' },
  ];

  const currentIndex = phases.findIndex(p => p.id === currentPhase);

  return (
    <div className="mb-8 px-4">
      <div className="flex justify-between items-center mb-2 relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10" />
        
        {/* Active Progress Line */}
        <div 
            className="absolute top-5 left-0 h-1 bg-blue-600 -z-10 transition-all duration-500" 
            style={{ width: `${(currentIndex / (phases.length - 1)) * 100}%` }}
        />

        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-col items-center z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-4 transition-all duration-300 ${
                index <= currentIndex 
                ? 'bg-blue-600 text-white border-white dark:border-gray-900 shadow-md scale-110' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 border-white dark:border-gray-900'
            }`}>
              {index < currentIndex ? <CheckCircle className="w-5 h-5" /> : phase.icon}
            </div>
            <span className={`text-xs mt-2 font-medium ${index <= currentIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const InspectionConductModal: React.FC<InspectionConductModalProps> = (props) => {
    const { isOpen, onClose, inspection, onUpdate, onConvertToReport, checklistTemplates, users } = props;
    const { activeUser, language, activeOrg } = useAppContext();
    const [currentInspection, setCurrentInspection] = useState(inspection);
    const [editingFinding, setEditingFinding] = useState<Partial<InspectionFinding> | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    // Phased Workflow State
    const [currentPhase, setCurrentPhase] = useState<InspectionPhase>(
        inspection.phase || (
            inspection.status === 'Draft' ? 'planning' :
            inspection.status === 'In Progress' ? 'opening_meeting' :
            inspection.status === 'Submitted' ? 'documentation' :
            'execution'
        )
    );

    const [openingMeetingData, setOpeningMeetingData] = useState<OpeningMeetingData | null>(
        inspection.opening_meeting || null
    );

    const [closingMeetingData, setClosingMeetingData] = useState<ClosingMeetingData | null>(
        inspection.closing_meeting || null
    );

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
            
            {/* Phase Progress Indicator */}
            <PhaseProgress currentPhase={currentPhase} />

            {/* PHASE 1: OPENING MEETING */}
            {currentPhase === 'opening_meeting' && (
                <OpeningMeetingSection
                    inspectionId={inspection.id}
                    teamMembers={users.filter(u => inspection.team_member_ids?.includes(u.id))}
                    onComplete={(data) => {
                        setOpeningMeetingData(data);
                        setCurrentPhase('execution');
                        onUpdate({ ...inspection, opening_meeting: data, phase: 'execution' }, 'save');
                    }}
                    isEditable={!isSubmitted}
                    initialData={openingMeetingData || undefined}
                />
            )}

            {/* PHASE 2: EXECUTION (Checklist & Findings) */}
            {currentPhase === 'execution' && (
                <>
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
                                                        <AlertTriangle className="w-3 h-3"/> Fail / Finding
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
                                                isSubmitted={isSubmitted}
                                                activeUser={activeUser}
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
                                <Button variant="secondary" size="sm" onClick={() => setEditingFinding({})} leftIcon={<AlertTriangle className="w-4 h-4"/>}>
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
                                isSubmitted={isSubmitted}
                                activeUser={activeUser}
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
                                        isSubmitted={isSubmitted}
                                        activeUser={activeUser}
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

                    {/* AI Risk Analysis */}
                    <AiRiskAnalysis 
                        findings={currentInspection.findings} 
                        onAnalysisComplete={(analysis) => console.log(analysis)} 
                    />

                    <div className="flex justify-end mt-6">
                        <Button onClick={() => setCurrentPhase('closing_meeting')}>
                            Proceed to Closing Meeting
                        </Button>
                    </div>
                </>
            )}

            {/* PHASE 3: CLOSING MEETING */}
            {currentPhase === 'closing_meeting' && (
                <ClosingMeetingSection
                    inspection={currentInspection}
                    findings={currentInspection.findings}
                    onComplete={(data) => {
                        setClosingMeetingData(data);
                        setCurrentPhase('follow_up');
                        onUpdate({ 
                            ...currentInspection, 
                            closing_meeting: data, 
                            phase: 'follow_up',
                            status: 'Completed' // Or 'Pending Review' depending on workflow
                        }, 'save');
                    }}
                    onGenerateReport={() => setCurrentPhase('documentation')}
                    isEditable={!isSubmitted}
                />
            )}

            {/* PHASE 4: DOCUMENTATION / REPORT */}
            {currentPhase === 'documentation' && (
                <InspectionReportGenerator
                    inspection={currentInspection}
                    findings={currentInspection.findings}
                    openingMeeting={openingMeetingData}
                    closingMeeting={closingMeetingData}
                    onEmail={(emailData) => console.log("Emailing report:", emailData)}
                />
            )}

            {/* PHASE 5: FOLLOW UP */}
            {currentPhase === 'follow_up' && (
                <FollowUpSection
                    inspection={currentInspection}
                    findings={currentInspection.findings}
                    onVerify={(findingId, verification) => {
                        // Update finding verification logic here
                        setCurrentInspection(prev => ({
                            ...prev,
                            findings: prev.findings.map(f => 
                                f.id === findingId ? { ...f, verification_data: verification } : f
                            )
                        }));
                    }}
                    onScheduleFollowUp={(date) => {
                        onUpdate({ ...currentInspection, scheduled_follow_up: date }, 'save');
                    }}
                />
            )}

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