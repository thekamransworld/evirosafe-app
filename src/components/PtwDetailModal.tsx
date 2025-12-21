import React, { useState, useEffect } from 'react';
import type { 
  Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, 
  PtwConfinedSpacePayload, PtwWorkAtHeightPayload, PtwStoppage
} from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails } from '../config';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { LoadCalculationSection } from './LoadCalculationSection';
import { GasTestLogSection } from './GasTestLogSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { generatePdf } from '../utils/pdfGenerator'; // <--- NEW IMPORT

interface PtwDetailModalProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw, action?: 'submit' | 'approve_proponent' | 'approve_hse' | 'reject' | 'request_revision' | 'activate' | 'close' | 'save' | 'suspend' | 'resume') => void;
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

// --- HELPER COMPONENTS ---

const ChecklistRow: React.FC<{ index: number; item: PtwSafetyRequirement; onChange: (value: PtwSafetyRequirement) => void; disabled: boolean }> = ({ index, item, onChange, disabled }) => (
    <tr className={`border-b dark:border-dark-border ${disabled ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-background'}`}>
        <td className="p-2 w-8 text-center text-gray-600 dark:text-gray-400">{index}</td>
        <td className="p-2 text-gray-900 dark:text-gray-200">{item.text}</td>
        <td className="p-2 w-16 text-center">
            <input type="radio" name={`check-${item.id}`} checked={item.response === 'Yes'} onChange={() => onChange({ ...item, response: 'Yes' })} disabled={disabled} className="accent-blue-600 w-4 h-4" />
        </td>
        <td className="p-2 w-16 text-center">
            <input type="radio" name={`check-${item.id}`} checked={item.response === 'No'} onChange={() => onChange({ ...item, response: 'No' })} disabled={disabled} className="accent-blue-600 w-4 h-4" />
        </td>
        <td className="p-2 w-16 text-center">
            <input type="radio" name={`check-${item.id}`} checked={item.response === 'N/A'} onChange={() => onChange({ ...item, response: 'N/A' })} disabled={disabled} className="accent-blue-600 w-4 h-4" />
        </td>
    </tr>
);

const WorkflowActions: React.FC<{ onAction: (action: any) => void, onSave: () => void, ptw: Ptw }> = ({ onAction, onSave, ptw }) => {
    const { activeUser, can } = useAppContext();
    const canApprove = can('approve', 'ptw');
    const isCreator = ptw.payload.creator_id === activeUser?.id;
    const selfApprovalBlocked = isCreator && canApprove;

    return (
        <div className="flex items-center space-x-2">
            {ptw.status === 'DRAFT' && <Button variant="secondary" onClick={onSave}>Save Draft</Button>}
            {ptw.status === 'DRAFT' && <Button onClick={() => onAction('submit')}>Submit for Review</Button>}
            
            {ptw.status === 'SUBMITTED' && canApprove && (
                <>
                    <Button variant="secondary" onClick={() => onAction('request_revision')}>Request Revision</Button>
                    <Button onClick={() => onAction('approve_proponent')} disabled={selfApprovalBlocked} title={selfApprovalBlocked ? "You cannot approve a permit you created." : ""}>Approve (Proponent)</Button>
                </>
            )}
            
            {ptw.status === 'APPROVAL' && canApprove && (
                 <>
                    <Button variant="secondary" onClick={() => onAction('request_revision')}>Request Revision</Button>
                    <Button variant="danger" onClick={() => onAction('reject')} disabled={selfApprovalBlocked} title={selfApprovalBlocked ? "You cannot reject a permit you created." : ""}>Reject</Button>
                    <Button onClick={() => onAction('approve_hse')} disabled={selfApprovalBlocked} title={selfApprovalBlocked ? "You cannot give final approval for a permit you created." : ""}>Approve (HSE)</Button>
                </>
            )}

            {ptw.status === 'ACTIVE' && canApprove && <Button variant="danger" onClick={() => onAction('suspend')}>Suspend Permit</Button>}
            {ptw.status === 'HOLD' && canApprove && <Button onClick={() => onAction('resume')}>Resume Work</Button>}
            {(ptw.status === 'ACTIVE' || ptw.status === 'HOLD') && <Button onClick={() => onAction('close')}>Close Permit</Button>}
        </div>
    )
}

const InfoField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div className="border-b py-2 dark:border-dark-border">
        <span className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">{label}:</span>
        <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">{value}</span>
    </div>
)

const FormInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, type?: string, required?: boolean, disabled?: boolean }> = ({ label, value, onChange, type = 'text', required = false, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500"
            required={required}
            disabled={disabled}
        />
    </div>
);

const FormSelect: React.FC<{ label: string; value: any; onChange: (val: any) => void; options: string[]; disabled?: boolean }> = ({ label, value, onChange, options, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</label>
        <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm disabled:bg-gray-100 dark:disabled:bg-white/5"
            disabled={disabled}
        >
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const SignatureInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">{label}</label>
        <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md font-serif text-lg bg-white dark:bg-dark-background text-blue-800 dark:text-blue-200 disabled:bg-gray-100 dark:disabled:bg-white/5"
            placeholder={disabled ? "Signed" : "Type Name to Sign"}
            disabled={disabled}
        />
    </div>
);

// --- MAIN COMPONENT ---

export const PtwDetailModal: React.FC<PtwDetailModalProps> = (props) => {
  const { ptw, onClose, onUpdate } = props;
  const [formData, setFormData] = useState<Ptw>(JSON.parse(JSON.stringify(ptw)));
  const [activeSection, setActiveSection] = useState<SectionKey>('I');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const toast = useToast();
  
  const [stoppageFormData, setStoppageFormData] = useState<Partial<PtwStoppage>>({ reason: '', stopped_by: '', informed_to: '' });
  
  const details = ptwTypeDetails[ptw.type];
  
  // Permission Logic
  const isDraft = formData.status === 'DRAFT';
  const isEditable = isDraft; 
  const isProponentEditable = formData.status === 'SUBMITTED' || isDraft;
  const isHseEditable = formData.status === 'APPROVAL' || isDraft;
  const isInspectionEditable = formData.status === 'APPROVAL' || isDraft;
  const isStoppageEditable = formData.status === 'ACTIVE' || formData.status === 'HOLD' || isDraft;
  const isExtensionEditable = formData.status === 'ACTIVE' || isDraft;
  const isClosureEditable = formData.status === 'ACTIVE' || formData.status === 'HOLD' || isDraft;

  useEffect(() => {
      setFormData(JSON.parse(JSON.stringify(ptw)));
  }, [ptw]);

  // Handle nested object updates safely
  const handlePayloadChange = (path: string, value: any) => {
    setFormData(prev => {
        const keys = path.split('.');
        const newPayload = JSON.parse(JSON.stringify(prev.payload));
        let current: any = newPayload;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}; // Create object if missing
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        if (path.endsWith('.signature') && value) {
            const pathPrefix = path.substring(0, path.lastIndexOf('.'));
            const signedAtPath = `${pathPrefix}.signed_at`;
            let signedAtTarget: any = newPayload;
            const signedAtKeys = signedAtPath.split('.');
            try {
                for (let i = 0; i < signedAtKeys.length - 1; i++) {
                    signedAtTarget = signedAtTarget[signedAtKeys[i]];
                }
                if (signedAtTarget) {
                    signedAtTarget[signedAtKeys[signedAtKeys.length - 1]] = new Date().toISOString();
                }
            } catch (e) { /* ignore */ }
        }

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

  const handleAddStakeholder = () => {
    setFormData(prev => {
        const newPayload = JSON.parse(JSON.stringify(prev.payload));
        if (!newPayload.signoffs.other_stakeholders) newPayload.signoffs.other_stakeholders = [];
        newPayload.signoffs.other_stakeholders.push({
            name: '', designation: '', email: '', mobile: '', signature: '', remarks: '', signed_at: ''
        });
        return { ...prev, payload: newPayload };
    });
  };

  const handleRemoveStakeholder = (index: number) => {
    setFormData(prev => {
        const newPayload = JSON.parse(JSON.stringify(prev.payload));
        newPayload.signoffs.other_stakeholders.splice(index, 1);
        return { ...prev, payload: newPayload };
    });
  };
  
  const handleLogStoppage = () => {
    const newStoppage: PtwStoppage = {
        ...stoppageFormData,
        time: new Date().toISOString(),
        restarted_time: '',
        signature: '',
    } as PtwStoppage;

    const updatedFormData = {
        ...formData,
        payload: {
            ...formData.payload,
            holding_or_stoppage: [...(formData.payload.holding_or_stoppage || []), newStoppage]
        }
    };
    setFormData(updatedFormData);
    onUpdate(updatedFormData, 'suspend');
    setStoppageFormData({ reason: '', stopped_by: '', informed_to: '' });
  };
  
  const handleResumeWork = (signature: string) => {
      const updatedFormData = { ...formData };
      if (!updatedFormData.payload.holding_or_stoppage) updatedFormData.payload.holding_or_stoppage = [];
      
      const lastStoppageIndex = updatedFormData.payload.holding_or_stoppage.length - 1;
      if (lastStoppageIndex >= 0) {
          updatedFormData.payload.holding_or_stoppage[lastStoppageIndex].restarted_time = new Date().toISOString();
          updatedFormData.payload.holding_or_stoppage[lastStoppageIndex].signature = signature;
      }
      setFormData(updatedFormData);
      onUpdate(updatedFormData, 'resume');
  }

  const handleRequestExtension = () => {
      const updatedFormData = { ...formData };
      if (!updatedFormData.payload.extension) {
          updatedFormData.payload.extension = { is_requested: true, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' }, requester: { signature: '', signed_at: '' }, client_proponent: { signature: '', signed_at: '' }, client_hs: { signature: '', signed_at: '' } };
      } else {
          updatedFormData.payload.extension.is_requested = true;
      }
      setFormData(updatedFormData);
      onUpdate(updatedFormData, 'save');
  };
  
  const validatePtwForAction = (permit: Ptw, action: 'submit' | 'approve_proponent' | 'approve_hse' | 'activate' | 'close'): string | null => {
    if (action === 'submit') {
        const { requester, contractor_safety_personnel } = permit.payload;
        if (!requester.name || !requester.designation || !requester.contractor || !requester.email || !requester.mobile || !requester.signature) {
            return "Gating failed: Section III - Permit Holder Information must be complete, including signature.";
        }
        if (contractor_safety_personnel?.name) {
            if (!contractor_safety_personnel.email || !contractor_safety_personnel.mobile || !contractor_safety_personnel.signature) {
                return "Gating failed: Section III - You entered a Contractor Safety Name, so the full details and signature are required.";
            }
        }
    }
    // ... existing validation checks ...
    return null;
  };

  const handleWorkflowAction = (action: any) => {
        if (!action) return;
        if (['submit', 'approve_proponent', 'approve_hse', 'activate', 'close'].includes(action)) {
            const validationError = validatePtwForAction(formData, action);
            if (validationError) {
                toast.error(validationError);
                alert(validationError);
                return;
            }
        }
        onUpdate(formData, action);
  };

  // --- RENDER SECTION CONTENT ---
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
                                formData.status === 'APPROVAL' ? 'blue' : 'gray'
                            }>
                                {formData.status.replace(/_/g, ' ')}
                            </Badge>
                        } />
                        <InfoField label="Permit Number" value={formData.payload.permit_no || 'Draft'} />
                        <InfoField label="Project" value={formData.project_id} />
                        <InfoField label="Location" value={formData.payload.work.location} />
                        <InfoField label="Workers" value={formData.payload.work.number_of_workers || 'N/A'} />
                    </div>
                    
                    <div className="mt-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Work Description</h4>
                        <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-900/30 rounded border dark:border-dark-border">
                            {formData.payload.work.description}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <InfoField label="Start Time" value={`${formData.payload.work.coverage.start_date} ${formData.payload.work.coverage.start_time}`} />
                        <InfoField label="End Time" value={`${formData.payload.work.coverage.end_date} ${formData.payload.work.coverage.end_time}`} />
                        <InfoField label="Risk Assessment Ref" value={formData.payload.work.risk_assessment_ref || 'Not provided'} />
                        <InfoField label="Emergency Contact" value={formData.payload.work.emergency_contact || 'Not provided'} />
                    </div>
                    
                    {formData.payload.global_compliance && (
                        <div className="mt-6 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/10">
                            <h4 className="font-bold text-green-800 dark:text-green-300 mb-3">Global HSE Compliance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoField label="Compliance Level" value={
                                    <Badge color={formData.compliance_level === 'FULL' ? 'green' : 'yellow'}>
                                        {formData.compliance_level}
                                    </Badge>
                                } />
                                <InfoField label="Standards Applied" value={
                                    <div className="flex flex-wrap gap-1">
                                        {formData.payload.global_compliance.standards.slice(0, 3).map((std, idx) => (
                                            <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                {std}
                                            </span>
                                        ))}
                                    </div>
                                } />
                            </div>
                        </div>
                    )}
                </div>
            );
        case 'II':
            const isChecklistDisabled = !isEditable;
            return (
                <div className="space-y-6">
                     {/* Dynamic Sections based on Type */}
                     {formData.type === 'Lifting' && 'load_calculation' in formData.payload && (
                        <LoadCalculationSection 
                            loadCalc={(formData.payload as PtwLiftingPayload).load_calculation}
                            onChange={(calc) => handlePayloadChange('load_calculation', calc)}
                            disabled={!isEditable}
                        />
                     )}
                     {formData.type === 'Confined Space Entry' && 'gas_tests' in formData.payload && (
                        <GasTestLogSection 
                            gasTests={(formData.payload as PtwConfinedSpacePayload).gas_tests}
                            onChange={(tests) => handlePayloadChange('gas_tests', tests)}
                            disabled={!isEditable}
                        />
                     )}
                     {formData.type === 'Confined Space Entry' && 'entry_log' in formData.payload && (
                        <PersonnelEntryLogSection 
                            entries={(formData.payload as PtwConfinedSpacePayload).entry_log}
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
                     <div className="border rounded-lg overflow-hidden mt-6">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr className="border-b dark:border-dark-border text-gray-700 dark:text-gray-300">
                                    <th className="p-2 w-8">#</th>
                                    <th className="p-2 text-left">Requirement</th>
                                    <th className="p-2 w-16 text-center">Yes</th>
                                    <th className="p-2 w-16 text-center">No</th>
                                    <th className="p-2 w-16 text-center">N/A</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.payload.safety_requirements.map((item, index) => (
                                    <ChecklistRow 
                                        key={item.id}
                                        index={index + 1}
                                        item={item}
                                        onChange={handleChecklistChange}
                                        disabled={isChecklistDisabled}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        case 'III':
            return (
                <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                        <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section III — Permit Requester Confirmation</h3>
                        <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6">
                            <p className="text-sm italic text-gray-700 dark:text-gray-300">
                                "I hereby confirm that I have personally inspected the worksite and verified that all required precautionary measures and safety controls described in this permit have been fully implemented."
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Permit Holder Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <FormInput label="Permit Holder Name" value={formData.payload.requester.name} 
                                        onChange={val => handlePayloadChange('requester.name', val)} required disabled={!isEditable} />
                                    <FormInput label="Designation" value={formData.payload.requester.designation} 
                                        onChange={val => handlePayloadChange('requester.designation', val)} required disabled={!isEditable} />
                                    <FormInput label="Contractor Company" value={formData.payload.requester.contractor} 
                                        onChange={val => handlePayloadChange('requester.contractor', val)} required disabled={!isEditable} />
                                    <FormInput label="Email" type="email" value={formData.payload.requester.email} 
                                        onChange={val => handlePayloadChange('requester.email', val)} required disabled={!isEditable} />
                                    <FormInput label="Mobile No." type="tel" value={formData.payload.requester.mobile} 
                                        onChange={val => handlePayloadChange('requester.mobile', val)} required disabled={!isEditable} />
                                    <div className="md:col-span-2">
                                        <SignatureInput label="Signature" value={formData.payload.requester.signature} 
                                            onChange={val => handlePayloadChange('requester.signature', val)} disabled={!isEditable} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Contractor Safety Personnel (Optional)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <FormInput label="Safety Personnel Name" value={formData.payload.contractor_safety_personnel?.name} 
                                        onChange={val => handlePayloadChange('contractor_safety_personnel.name', val)} disabled={!isEditable} />
                                    <FormInput label="Designation" value={formData.payload.contractor_safety_personnel?.designation} 
                                        onChange={val => handlePayloadChange('contractor_safety_personnel.designation', val)} disabled={!isEditable} />
                                    <FormInput label="Mobile No." type="tel" value={formData.payload.contractor_safety_personnel?.mobile} 
                                        onChange={val => handlePayloadChange('contractor_safety_personnel.mobile', val)} disabled={!isEditable} />
                                    <FormInput label="Email" type="email" value={formData.payload.contractor_safety_personnel?.email} 
                                        onChange={val => handlePayloadChange('contractor_safety_personnel.email', val)} disabled={!isEditable} />
                                    <div className="md:col-span-2">
                                        <SignatureInput label="Signature" value={formData.payload.contractor_safety_personnel?.signature} 
                                            onChange={val => handlePayloadChange('contractor_safety_personnel.signature', val)} disabled={!isEditable} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'IV':
             return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Client Proponent / Stakeholder</h3>
                    <div className="space-y-8">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Client Proponent (Primary Reviewer)</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <FormInput label="Name" value={formData.payload.signoffs?.client_proponent.name} onChange={val => handlePayloadChange('signoffs.client_proponent.name', val)} required disabled={!isProponentEditable} />
                                <FormInput label="Designation" value={formData.payload.signoffs?.client_proponent.designation} onChange={val => handlePayloadChange('signoffs.client_proponent.designation', val)} required disabled={!isProponentEditable} />
                                <FormInput label="Email" type="email" value={formData.payload.signoffs?.client_proponent.email} onChange={val => handlePayloadChange('signoffs.client_proponent.email', val)} required disabled={!isProponentEditable} />
                                <FormInput label="Mobile No." type="tel" value={formData.payload.signoffs?.client_proponent.mobile} onChange={val => handlePayloadChange('signoffs.client_proponent.mobile', val)} required disabled={!isProponentEditable} />
                                <div className="col-span-2">
                                    <FormInput label="Remarks" value={formData.payload.signoffs?.client_proponent.remarks} onChange={val => handlePayloadChange('signoffs.client_proponent.remarks', val)} disabled={!isProponentEditable} />
                                </div>
                                <div className="col-span-2">
                                    <SignatureInput label="Signature" value={formData.payload.signoffs?.client_proponent.signature} onChange={val => handlePayloadChange('signoffs.client_proponent.signature', val)} disabled={!isProponentEditable} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'V':
            return (
                 <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Client HSE Department</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <FormInput label="HSE Representative Name" value={formData.payload.signoffs?.client_hs.name} onChange={val => handlePayloadChange('signoffs.client_hs.name', val)} required disabled={!isHseEditable} />
                        <FormInput label="Designation" value={formData.payload.signoffs?.client_hs.designation} onChange={val => handlePayloadChange('signoffs.client_hs.designation', val)} disabled={!isHseEditable} />
                        <div className="col-span-2">
                             <FormInput label="Remarks" value={formData.payload.signoffs?.client_hs.remarks} onChange={val => handlePayloadChange('signoffs.client_hs.remarks', val)} disabled={!isHseEditable} />
                        </div>
                        <div className="col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.signoffs?.client_hs.signature} onChange={val => handlePayloadChange('signoffs.client_hs.signature', val)} disabled={!isHseEditable} />
                        </div>
                    </div>
                </div>
            );
        case 'VI':
            return (
                <div>
                    <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Joint Site Inspection</h3>
                    <div className="space-y-6">
                        <FormInput label="Joint Inspection Remarks" value={formData.payload.joint_inspection?.remarks} onChange={val => handlePayloadChange('joint_inspection.remarks', val)} disabled={!isInspectionEditable} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SignatureInput label="Permit Requester Sign" value={formData.payload.joint_inspection?.requester.signature} onChange={val => handlePayloadChange('joint_inspection.requester.signature', val)} disabled={!isInspectionEditable} />
                            <SignatureInput label="Client Proponent Sign" value={formData.payload.joint_inspection?.client_proponent.signature} onChange={val => handlePayloadChange('joint_inspection.client_proponent.signature', val)} disabled={!isInspectionEditable} />
                            <SignatureInput label="Client HSE Sign" value={formData.payload.joint_inspection?.client_hs.signature} onChange={val => handlePayloadChange('joint_inspection.client_hs.signature', val)} disabled={!isInspectionEditable} />
                        </div>
                    </div>
                </div>
            );
        case 'VII':
            return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Holding / Stoppage of Work</h3>
                    <div className="space-y-4">
                        {formData.payload.holding_or_stoppage?.map((stoppage, index) => (
                            <div key={index} className="p-4 border rounded-md dark:border-dark-border text-gray-800 dark:text-gray-200">
                                <p className="font-bold">Stoppage #{index+1} at {new Date(stoppage.time).toLocaleString()}</p>
                                <p><strong>Reason:</strong> {stoppage.reason}</p>
                                <p><strong>Stopped By:</strong> {stoppage.stopped_by}</p>
                                {stoppage.restarted_time ? (
                                    <div className="mt-2 pt-2 border-t dark:border-dark-border">
                                        <p className="text-green-600 font-semibold">Resumed at {new Date(stoppage.restarted_time).toLocaleString()}</p>
                                        <p><strong>Signed by:</strong> {stoppage.signature}</p>
                                    </div>
                                ) : (
                                     <div className="mt-4">
                                        {formData.status === 'HOLD' && (
                                            <div className="flex items-center space-x-2">
                                                <input type="text" placeholder="Your Name to Resume" className="flex-1 p-2 border rounded-md text-sm bg-white dark:bg-dark-background dark:border-dark-border dark:text-white" onChange={e => {
                                                    const updatedStoppage = {...stoppage, signature: e.target.value};
                                                    const newStoppages = [...(formData.payload.holding_or_stoppage || [])];
                                                    newStoppages[index] = updatedStoppage;
                                                    setFormData(prev => ({...prev, payload: {...prev.payload, holding_or_stoppage: newStoppages}}))
                                                }} />
                                                <Button size="sm" onClick={() => handleResumeWork(stoppage.signature || '')}>Resume Work</Button>
                                            </div>
                                        )}
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {isStoppageEditable && formData.status !== 'HOLD' && (
                        <div className="mt-6 border-t pt-4 dark:border-dark-border">
                            <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Log a New Work Stoppage</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <FormSelect label="Reason" value={stoppageFormData.reason} onChange={val => setStoppageFormData(p => ({...p, reason: val}))} options={['Unsafe Condition', 'Unsafe Act', 'Emergency', 'Weather', 'Client Instruction', 'Other']} />
                                <FormInput label="Stopped By" value={stoppageFormData.stopped_by} onChange={val => setStoppageFormData(p => ({...p, stopped_by: val}))} />
                                <div className="col-span-2"><FormInput label="Informed To" value={stoppageFormData.informed_to} onChange={val => setStoppageFormData(p => ({...p, informed_to: val}))} /></div>
                            </div>
                            <Button className="mt-4" variant="danger" onClick={handleLogStoppage}>Log Stoppage & Suspend Permit</Button>
                        </div>
                    )}
                </div>
            );
        case 'VIII':
            return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Permit Extension</h3>
                    {!formData.payload.extension?.is_requested && isExtensionEditable && (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg dark:border-dark-border">
                            <p className="text-gray-600 dark:text-gray-400">No extension has been requested for this permit.</p>
                            <Button className="mt-4" onClick={handleRequestExtension}>Request Extension</Button>
                        </div>
                    )}
                    {formData.payload.extension?.is_requested && (
                        <div className="space-y-6">
                            <FormInput label="Reason for Extension" value={formData.payload.extension.reason} onChange={val => handlePayloadChange('extension.reason', val)} disabled={!isExtensionEditable} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="New From Date/Time" type="datetime-local" value={formData.payload.extension.days.from} onChange={val => handlePayloadChange('extension.days.from', val)} disabled={!isExtensionEditable} />
                                <FormInput label="New To Date/Time" type="datetime-local" value={formData.payload.extension.hours.to} onChange={val => handlePayloadChange('extension.hours.to', val)} disabled={!isExtensionEditable} />
                            </div>
                        </div>
                    )}
                </div>
            );
        case 'IX':
            return (
                 <div>
                    <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Permit Closure</h3>
                    <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6">
                        <p className="text-sm italic text-gray-700 dark:text-gray-300">
                            “We confirm the work is complete, the area is clean and safe, all isolations have been removed, and the permit is now closed.”
                        </p>
                    </div>
                    <FormInput label="Closure Note / Handover" value={formData.payload.closure?.note} onChange={val => handlePayloadChange('closure.note', val)} disabled={!isClosureEditable} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                         <SignatureInput label="Requester Closure Sign" value={formData.payload.closure?.permit_requester.signature} onChange={val => handlePayloadChange('closure.permit_requester.signature', val)} disabled={!isClosureEditable} />
                         <SignatureInput label="Proponent Closure Sign" value={formData.payload.closure?.client_proponent.signature} onChange={val => handlePayloadChange('closure.client_proponent.signature', val)} disabled={!isClosureEditable} />
                         <SignatureInput label="HSE Closure Sign" value={formData.payload.closure?.client_hs.signature} onChange={val => handlePayloadChange('closure.client_hs.signature', val)} disabled={!isClosureEditable} />
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  if (!ptw) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 print:p-0" onClick={onClose}>
        <div id="ptw-printable-area" className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col print:h-auto print:max-w-none print:shadow-none" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {ptw.type} - {ptw.payload.permit_no || `Draft #${ptw.id.slice(-6)}`}
                {ptw.payload.global_compliance?.standards && (
                   <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200">Global Standard</span>
                )}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <Badge color={
                    ptw.status === 'ACTIVE' ? 'green' : 
                    ptw.status === 'HOLD' ? 'red' :
                    ptw.status.includes('SUBMITTED') || ptw.status === 'APPROVAL' ? 'yellow' : 
                    'gray'
                }>
                    {ptw.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ActionsBar 
                onPrint={() => window.print()} 
                onEmail={() => setIsEmailModalOpen(true)} 
                downloadOptions={[
                    { label: 'Download PDF', handler: () => generatePdf('ptw-printable-area', `PTW-${ptw.payload.permit_no || ptw.id}`) }
                ]} 
              />
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-64 bg-gray-50 dark:bg-dark-background border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0 print:hidden">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Sections</h3>
              <ul className="space-y-1">
                {sections.map(section => (
                  <li key={section.key}>
                    <button
                      type="button" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveSection(section.key); }}
                      className={`w-full text-left p-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.key 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {section.key}. {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 p-6 overflow-y-auto print:p-0 print:overflow-visible">
              {renderSectionContent()}
            </main>
          </div>

          {/* Footer Actions */}
          <footer className="p-4 border-t bg-gray-100 dark:bg-black/20 dark:border-dark-border flex justify-end items-center flex-shrink-0 print:hidden">
            <WorkflowActions onAction={handleWorkflowAction} onSave={() => onUpdate(formData, 'save')} ptw={formData} />
          </footer>
        </div>
      </div>

      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no || ptw.id}`}
        defaultRecipients={[
            ptw.payload.requester,
            ...(ptw.payload.signoffs?.other_stakeholders || []),
        ].filter(Boolean) as any}
        documentLink="#"
      />

      <style>{`
          @media print {
              body * { visibility: hidden; }
              #ptw-printable-area, #ptw-printable-area * { visibility: visible; }
              #ptw-printable-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; max-height: none; }
              @page { size: A4; margin: 1cm; }
          }
      `}</style>
    </>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);