import React, { useState, useEffect } from 'react';
import type { 
  Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, PtwHotWorkPayload, 
  PtwConfinedSpacePayload, PtwWorkAtHeightPayload, PtwSignoff, PtwStoppage,
  PtwWorkflowStage
} from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { usePtwWorkflow } from '../contexts/PtwWorkflowContext'; // <--- NEW IMPORT
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { LoadCalculationSection } from './LoadCalculationSection';
import { GasTestLogSection } from './GasTestLogSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { AlertTriangle, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';

interface PtwDetailModalProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw, action?: string) => void;
}

type SectionKey = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX';
const sections: { key: SectionKey, title: string }[] = [
    { key: 'I', title: 'General Information'},
    { key: 'II', title: 'Safety Requirement'},
    { key: 'III', title: 'Permit Requester'},
    { key: 'IV', title: 'Client Proponent'},
    { key: 'V', title: 'Client HSE Dept'},
    { key: 'VI', title: 'Joint Site Inspection'},
    { key: 'VII', title: 'Holding/Stoppage'},
    { key: 'VIII', title: 'Extension'},
    { key: 'IX', title: 'Permit Closure'},
];

// --- SMART WORKFLOW ACTIONS COMPONENT ---
const WorkflowActions: React.FC<{ ptw: Ptw, onUpdate: (ptw: Ptw) => void }> = ({ ptw, onUpdate }) => {
    const { activeUser } = useAppContext();
    const { getNextPossibleStages, validateUserPermission, moveToNextStage, getStageResponsibilities } = usePtwWorkflow();
    const [comment, setComment] = useState('');
    const [showComment, setShowComment] = useState(false);
    const [targetStage, setTargetStage] = useState<PtwWorkflowStage | null>(null);
    const toast = useToast();

    if (!activeUser) return null;

    const nextStages = getNextPossibleStages(ptw);
    const responsibilities = getStageResponsibilities(ptw.status);

    const handleTransition = (stage: PtwWorkflowStage) => {
        // Check permissions
        const permission = validateUserPermission(ptw, activeUser.id, activeUser.role);
        if (!permission) {
            toast.error("You do not have permission to perform this action.");
            return;
        }

        // If comment needed (e.g. rejection), show input
        if ((stage === 'REJECTED' || stage === 'SUSPENDED') && !showComment) {
            setTargetStage(stage);
            setShowComment(true);
            return;
        }

        const updatedPtw = moveToNextStage(ptw, activeUser.id, comment);
        if (updatedPtw) {
            onUpdate(updatedPtw);
            toast.success(`Permit moved to ${stage}`);
            setShowComment(false);
            setComment('');
        }
    };

    const getActionColor = (stage: string) => {
        if (['REJECTED', 'CANCELLED', 'SUSPENDED'].includes(stage)) return 'danger';
        if (['ACTIVE', 'COMPLETED', 'CLOSED'].includes(stage)) return 'primary';
        return 'secondary';
    };

    const getActionLabel = (stage: string) => {
        switch(stage) {
            case 'SUBMITTED': return 'Submit for Review';
            case 'ISSUER_REVIEW': return 'Accept for Review';
            case 'SITE_INSPECTION': return 'Start Site Inspection';
            case 'APPROVAL': return 'Submit for Approval';
            case 'ACTIVE': return 'Activate Permit';
            case 'SUSPENDED': return 'Suspend Work';
            case 'CLOSED': return 'Close Permit';
            default: return stage.replace('_', ' ');
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Current Responsibilities Hint */}
            {responsibilities.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                    <strong>Current Stage Requirements:</strong>
                    <ul className="list-disc list-inside mt-1">
                        {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
            )}

            {/* Comment Input for Rejections/Suspensions */}
            {showComment && (
                <div className="flex gap-2 animate-fade-in">
                    <input 
                        type="text" 
                        value={comment} 
                        onChange={e => setComment(e.target.value)}
                        placeholder="Reason for this action..."
                        className="flex-1 p-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                    />
                    <Button size="sm" onClick={() => targetStage && handleTransition(targetStage)}>Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowComment(false)}>Cancel</Button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-2">
                {nextStages.map(stage => (
                    <Button 
                        key={stage} 
                        variant={getActionColor(stage)}
                        onClick={() => handleTransition(stage)}
                        disabled={!validateUserPermission(ptw, activeUser.id, activeUser.role)}
                        title={!validateUserPermission(ptw, activeUser.id, activeUser.role) ? "Role not authorized" : ""}
                    >
                        {getActionLabel(stage)}
                    </Button>
                ))}
                {nextStages.length === 0 && (
                    <span className="text-sm text-gray-500 italic">No further actions available (Terminal State)</span>
                )}
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---
const ChecklistRow: React.FC<{ index: number; item: PtwSafetyRequirement; onChange: (value: PtwSafetyRequirement) => void; disabled: boolean }> = ({ index, item, onChange, disabled }) => (
    <tr className={`border-b dark:border-dark-border ${disabled ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-background'}`}>
        <td className="p-2 w-8 text-center text-gray-600 dark:text-gray-400">{index}</td>
        <td className="p-2 text-gray-900 dark:text-gray-200">{item.text}</td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'Yes'} onChange={() => onChange({ ...item, response: 'Yes' })} disabled={disabled} className="w-4 h-4 text-blue-600" /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'No'} onChange={() => onChange({ ...item, response: 'No' })} disabled={disabled} className="w-4 h-4 text-blue-600" /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'N/A'} onChange={() => onChange({ ...item, response: 'N/A' })} disabled={disabled} className="w-4 h-4 text-blue-600" /></td>
    </tr>
);

const InfoField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div className="border-b py-2 dark:border-dark-border">
        <span className="font-semibold text-gray-600 dark:text-gray-400">{label}:</span>
        <span className="ml-2 text-gray-800 dark:text-gray-200">{value}</span>
    </div>
)

const FormInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, type?: string, required?: boolean, disabled?: boolean }> = ({ label, value, onChange, type = 'text', required = false, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm read-only:bg-gray-100 dark:read-only:bg-white/5"
            required={required}
            readOnly={disabled}
        />
    </div>
);

const SignatureInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</label>
        <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md font-serif text-lg bg-white dark:bg-dark-background text-blue-800 dark:text-blue-200 read-only:bg-gray-100 dark:read-only:bg-white/5"
            placeholder={disabled ? "Signed" : "Type name to sign"}
            readOnly={disabled}
        />
    </div>
);

export const PtwDetailModal: React.FC<PtwDetailModalProps> = (props) => {
  const { ptw, onClose, onUpdate } = props;
  const [formData, setFormData] = useState<Ptw>(JSON.parse(JSON.stringify(ptw)));
  const [activeSection, setActiveSection] = useState<SectionKey>('I');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  // Determine editability based on status
  const isEditable = formData.status === 'DRAFT' || formData.status === 'REQUESTED';
  
  useEffect(() => {
      setFormData(JSON.parse(JSON.stringify(ptw)));
  }, [ptw]);

  const handlePayloadChange = (path: string, value: any) => {
    setFormData(prev => {
        const keys = path.split('.');
        const newPayload = JSON.parse(JSON.stringify(prev.payload));
        let current: any = newPayload;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return { ...prev, payload: newPayload };
    });
  };

  const handleChecklistChange = (updatedItem: PtwSafetyRequirement) => {
      setFormData(prev => {
          const newSafetyRequirements = prev.payload.safety_requirements.map(item => 
              item.id === updatedItem.id ? updatedItem : item
          );
          return { ...prev, payload: { ...prev.payload, safety_requirements: newSafetyRequirements } } as Ptw;
      });
  }

  const renderSectionContent = () => {
    switch(activeSection) {
        case 'I':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoField label="Permit Type" value={formData.type} />
                        <InfoField label="Permit Status" value={
                            <Badge color={
                                formData.status === 'ACTIVE' ? 'green' : 
                                formData.status === 'HOLD' ? 'red' :
                                formData.status === 'APPROVAL' ? 'blue' :
                                'gray'
                            }>
                                {formData.status.replace(/_/g, ' ')}
                            </Badge>
                        } />
                        <InfoField label="Permit Number" value={formData.payload.permit_no || 'Draft'} />
                        <InfoField label="Project" value={formData.project_id} />
                        <InfoField label="Work Location" value={formData.payload.work.location} />
                        <InfoField label="Number of Workers" value={formData.payload.work.number_of_workers || 'Not specified'} />
                    </div>
                    
                    <div className="mt-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Work Description</h4>
                        <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-900/30 rounded">
                            {formData.payload.work.description}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <InfoField label="Start Time" value={`${formData.payload.work.coverage.start_date} ${formData.payload.work.coverage.start_time}`} />
                        <InfoField label="End Time" value={`${formData.payload.work.coverage.end_date} ${formData.payload.work.coverage.end_time}`} />
                    </div>
                </div>
            );
            
        case 'II':
            return (
                <div className="space-y-6">
                    {formData.type === 'Lifting' && 'load_calculation' in formData.payload && (
                        <LoadCalculationSection 
                            loadCalc={formData.payload.load_calculation as any}
                            onChange={(calc) => handlePayloadChange('load_calculation', calc)}
                            disabled={!isEditable}
                        />
                    )}
                    
                    {formData.type === 'Confined Space Entry' && 'gas_tests' in formData.payload && (
                        <GasTestLogSection 
                            gasTests={formData.payload.gas_tests}
                            onChange={(tests) => handlePayloadChange('gas_tests', tests)}
                            disabled={!isEditable}
                        />
                    )}
                    
                    {formData.type === 'Confined Space Entry' && 'entry_log' in formData.payload && (
                        <PersonnelEntryLogSection 
                            entries={formData.payload.entry_log}
                            onChange={(entries) => handlePayloadChange('entry_log', entries)}
                            disabled={!isEditable}
                        />
                    )}
                    
                    {formData.type === 'Work at Height' && 'access_equipment' in formData.payload && (
                        <WorkAtHeightPermit 
                            payload={formData.payload as PtwWorkAtHeightPayload}
                            onChange={(updatedPayload) => setFormData(prev => ({ ...prev, payload: updatedPayload } as Ptw))}
                            readOnly={!isEditable}
                        />
                    )}
                    
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200">Safety Requirements Checklist</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr className="border-b dark:border-dark-border text-gray-700 dark:text-gray-300">
                                        <th className="p-3 w-8">#</th>
                                        <th className="p-3 text-left">Requirement</th>
                                        <th className="p-3 w-16 text-center">Yes</th>
                                        <th className="p-3 w-16 text-center">No</th>
                                        <th className="p-3 w-16 text-center">N/A</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.payload.safety_requirements.map((item, index) => (
                                        <ChecklistRow 
                                            key={item.id}
                                            index={index + 1}
                                            item={item}
                                            onChange={handleChecklistChange}
                                            disabled={!isEditable}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                        <h4 className="font-bold mb-3 text-base text-gray-800 dark:text-gray-200">Personal Protective Equipment (PPE)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(formData.payload.ppe || {}).map(([key, value]) => (
                                <label key={key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={!!value}
                                        onChange={(e) => handlePayloadChange(`ppe.${key}`, e.target.checked)}
                                        disabled={!isEditable}
                                        className="rounded"
                                    />
                                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );
            
        case 'III':
            return (
                <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                        <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section III — Permit Requester Confirmation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <FormInput label="Permit Holder Name" value={formData.payload.requester.name} onChange={val => handlePayloadChange('requester.name', val)} required disabled={!isEditable} />
                            <FormInput label="Designation" value={formData.payload.requester.designation} onChange={val => handlePayloadChange('requester.designation', val)} required disabled={!isEditable} />
                            <FormInput label="Contractor Company" value={formData.payload.requester.contractor} onChange={val => handlePayloadChange('requester.contractor', val)} required disabled={!isEditable} />
                            <div className="md:col-span-2">
                                <SignatureInput label="Signature" value={formData.payload.requester.signature} onChange={val => handlePayloadChange('requester.signature', val)} disabled={!isEditable} />
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'IV':
             return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section IV – Client Proponent / Stakeholder</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <FormInput label="Name" value={formData.payload.signoffs?.client_proponent.name} onChange={val => handlePayloadChange('signoffs.client_proponent.name', val)} disabled={formData.status !== 'ISSUER_REVIEW'} />
                        <div className="col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.signoffs?.client_proponent.signature} onChange={val => handlePayloadChange('signoffs.client_proponent.signature', val)} disabled={formData.status !== 'ISSUER_REVIEW'} />
                        </div>
                    </div>
                </div>
            );

        case 'V':
            return (
                 <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section V – Client HSE Department</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <FormInput label="HSE Representative Name" value={formData.payload.signoffs?.client_hs.name} onChange={val => handlePayloadChange('signoffs.client_hs.name', val)} disabled={formData.status !== 'PRE_SCREEN'} />
                        <div className="col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.signoffs?.client_hs.signature} onChange={val => handlePayloadChange('signoffs.client_hs.signature', val)} disabled={formData.status !== 'PRE_SCREEN'} />
                        </div>
                    </div>
                </div>
            );

        default:
            return <div className="text-center py-10 text-gray-500">Section content not available in this view.</div>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{ptw.type} - {ptw.payload.permit_no || `Draft #${ptw.id.slice(-6)}`}</h2>
              <div className="flex items-center space-x-2">
                <Badge color={
                    ptw.status === 'ACTIVE' ? 'green' : 
                    ptw.status.includes('SUBMITTED') ? 'yellow' : 
                    ptw.status === 'APPROVAL' ? 'blue' : 
                    'gray'
                }>
                    {ptw.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} downloadOptions={[{ label: 'Download PDF', handler: () => window.print() }]} />
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            <nav className="w-64 bg-gray-50 dark:bg-dark-background border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0 print:hidden">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">SECTIONS</h3>
              <ul className="space-y-1">
                {sections.map(section => (
                  <li key={section.key}>
                    <button
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full text-left p-3 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.key 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-l-4 border-transparent'
                      }`}
                    >
                      {section.key}. {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <main className="flex-1 p-8 overflow-y-auto">
              {renderSectionContent()}
            </main>
          </div>

          <footer className="p-4 border-t bg-gray-100 dark:bg-black/20 dark:border-dark-border flex justify-end items-center flex-shrink-0 print:hidden">
            <WorkflowActions ptw={formData} onUpdate={onUpdate} />
          </footer>
        </div>
      </div>

      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no || ptw.id}`}
        documentLink={`${window.location.href}?ptw=${ptw.id}`}
        defaultRecipients={[...Object.values(ptw.payload.signoffs ?? {}).flat(), ptw.payload.requester].filter(Boolean) as Partial<User>[]}
      />
    </>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;