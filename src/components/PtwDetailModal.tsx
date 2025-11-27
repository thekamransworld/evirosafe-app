
import React, { useState, useEffect, useRef } from 'react';
import type { Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, PtwHotWorkPayload, PtwConfinedSpacePayload, PtwRoadClosurePayload, GasTestLogEntry, PersonnelEntryLogEntry, PtwWorkAtHeightPayload, PtwSignoff, PtwStoppage, PtwType } from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails } from '../config';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';

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
    { key: 'IV', title: 'Client Proponent / Stakeholder'},
    { key: 'V', title: 'Client HSE Department'},
    { key: 'VI', title: 'Joint Site Inspection'},
    { key: 'VII', title: 'Holding/ Stoppage of work'},
    { key: 'VIII', title: 'Extension'},
    { key: 'IX', title: 'Permit Closure'},
];

const ChecklistRow: React.FC<{ index: number; item: PtwSafetyRequirement; onChange: (value: PtwSafetyRequirement) => void; disabled: boolean }> = ({ index, item, onChange, disabled }) => (
    <tr className={`border-b dark:border-dark-border ${disabled ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-background'}`}>
        <td className="p-2 w-8 text-center text-gray-600 dark:text-gray-400">{index}</td>
        <td className="p-2 text-gray-900 dark:text-gray-200">{item.text}</td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'Yes'} onChange={() => onChange({ ...item, response: 'Yes' })} disabled={disabled} /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'No'} onChange={() => onChange({ ...item, response: 'No' })} disabled={disabled} /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'N/A'} onChange={() => onChange({ ...item, response: 'N/A' })} disabled={disabled} /></td>
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
                    <Button onClick={() => onAction('approve_proponent')} disabled={selfApprovalBlocked} title={selfApprovalBlocked ? "You cannot approve a permit you created." : ""}>Approve</Button>
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
            className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md font-serif text-lg bg-white dark:bg-dark-background text-blue-800 dark:text-blue-200 read-only:bg-gray-100 dark:read-only:bg-white/5"
            placeholder={disabled ? "Signed" : "Type your name to sign"}
            readOnly={disabled}
            required
        />
    </div>
);


export const PtwDetailModal: React.FC<PtwDetailModalProps> = (props) => {
  const { ptw, onClose, onUpdate } = props;
  const [formData, setFormData] = useState<Ptw>(JSON.parse(JSON.stringify(ptw)));
  const [activeSection, setActiveSection] = useState<SectionKey>('I');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const toast = useToast();
  
  const [stoppageFormData, setStoppageFormData] = useState<Partial<PtwStoppage>>({ reason: '', stopped_by: '', informed_to: '' });
  
  const details = ptwTypeDetails[ptw.type];
  const isEditable = formData.status === 'DRAFT';
  const isProponentEditable = formData.status === 'SUBMITTED';
  const isHseEditable = formData.status === 'APPROVAL';
  const isInspectionEditable = formData.status === 'APPROVAL';
  const isStoppageEditable = formData.status === 'ACTIVE' || formData.status === 'HOLD';
  const isExtensionEditable = formData.status === 'ACTIVE';
  const isClosureEditable = formData.status === 'ACTIVE' || formData.status === 'HOLD';


  useEffect(() => {
      setFormData(JSON.parse(JSON.stringify(ptw)));
  }, [ptw]);

  const handlePayloadChange = (path: string, value: any) => {
    setFormData(prev => {
        const keys = path.split('.');
        const newPayload = JSON.parse(JSON.stringify(prev.payload));
        let current: any = newPayload;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        // Auto-set signed_at date if a signature is being added/removed
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
            } catch (e) { console.error("Could not set signed_at date", e)}
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
      if (!updatedFormData.payload.holding_or_stoppage) {
          updatedFormData.payload.holding_or_stoppage = [];
      }
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
      if (updatedFormData.payload.extension) {
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
        if (contractor_safety_personnel && (!contractor_safety_personnel.name || !contractor_safety_personnel.email || !contractor_safety_personnel.mobile || !contractor_safety_personnel.signature)) {
            return "Gating failed: Section III - Contractor Safety Personnel information must be complete, including signature.";
        }
    }

    if (action === 'approve_proponent') {
        const { client_proponent } = permit.payload.signoffs ?? {};
        if (!client_proponent || !client_proponent.name || !client_proponent.designation || !client_proponent.email || !client_proponent.mobile || !client_proponent.signature) {
            return "Gating failed: Section IV - Primary Client Proponent information must be complete, including signature, before approval.";
        }
    }
    
    if (action === 'approve_hse') {
        const { client_hs } = permit.payload.signoffs ?? {};
        if (!client_hs || !client_hs.name || !client_hs.signature) {
             return "Gating failed: Section V - HSE Representative must sign off before approval.";
        }
    }
    
    if (action === 'activate') {
        const { joint_inspection } = permit.payload;
        if (!joint_inspection || !joint_inspection.requester.signature || !joint_inspection.client_proponent.signature || !joint_inspection.client_hs.signature) {
            return "Gating failed: Section VI - All parties must sign the Joint Site Inspection before activation.";
        }
    }

    if (action === 'close') {
        const { closure } = permit.payload;
        if (!closure || !closure.permit_requester.signature || !closure.client_proponent.signature || !closure.client_hs.signature) {
            return "Gating failed: Section IX - All parties must sign for permit closure.";
        }
    }
      
    if (['approve_proponent', 'approve_hse', 'activate'].includes(action)) {
        const getChecklistItemResult = (id: string) => permit.payload.safety_requirements.find(i => i.id === id)?.response === 'Yes';

        switch (permit.type) {
          case 'Confined Space Entry':
            if ('gas_tests' in permit.payload && (permit.payload as PtwConfinedSpacePayload).gas_tests.length === 0) return "Gating failed: Pre-entry gas test results must be logged before approval.";
            if (!getChecklistItemResult('cs_4')) return "Gating failed: Entrants, standby, and supervisor must be competent.";
            if (!getChecklistItemResult('cs_3')) return "Gating failed: Retrieval equipment must be available.";
            return null;
          case 'Electrical Work':
            if (!getChecklistItemResult('ew_2')) return "Gating failed: Power source must be isolated and locked out (LOTO).";
            if (!getChecklistItemResult('ew_3')) return "Gating failed: Insulated tools must be verified.";
            return null;
          case 'Excavation':
            if (!getChecklistItemResult('ex_1')) return "Gating failed: Underground service locates and drawings must be available.";
            if (!getChecklistItemResult('ex_3')) return "Gating failed: Cave-in protection method must be selected and in place.";
            return null;
          case 'Hot Work':
            if ('fire_watcher' in permit.payload && !(permit.payload as PtwHotWorkPayload).fire_watcher.name) return "Gating failed: A competent fire watcher must be named.";
            if (!getChecklistItemResult('hw_1')) return "Gating failed: Continuous fire watch must be confirmed.";
            if (!getChecklistItemResult('hw_5')) return "Gating failed: Flashback arrestors must be fitted for all gas hoses.";
            return null;
          case 'Lifting':
            if ('load_calculation' in permit.payload && (permit.payload as PtwLiftingPayload).load_calculation.utilization_percent <= 0) return "Gating failed: Load calculation panel must be completed and utilization must be greater than 0.";
            if (!getChecklistItemResult('li_1')) return "Gating failed: Lifting plan must be prepared and approved.";
            if (!getChecklistItemResult('li_3')) return "Gating failed: Outrigger pads must be used.";
            return null;
          case 'Road Closure':
            if (!getChecklistItemResult('rc_1')) return "Gating failed: Diversion plan must be approved and suitable.";
            if (!getChecklistItemResult('rc_2')) return "Gating failed: Reflective signage must be erected.";
            return null;
          case 'Night Work':
             if (!getChecklistItemResult('nw_2')) return "Gating failed: Hi-visibility jackets must be provided.";
             if (!getChecklistItemResult('nw_1')) return "Gating failed: Adequate lighting must be confirmed.";
            return null;
          case 'Work at Height':
            if (!getChecklistItemResult('wah_3')) return "Gating failed: Scaffolding must be inspected and tagged by a competent person.";
            if (!getChecklistItemResult('wah_4')) return "Gating failed: Full body harness must be provided and confirmed in good condition.";
            return null;
          default:
            return null;
        }
    }
    return null;
  };

  const handleWorkflowAction = (action: any) => {
        if (!action) return;

        if (['submit', 'approve_proponent', 'approve_hse', 'activate', 'close'].includes(action)) {
            const validationError = validatePtwForAction(formData, action);
            if (validationError) {
                toast.error(validationError);
                return;
            }
        }
        
        onUpdate(formData, action);
  };


  const renderSectionContent = () => {
    switch(activeSection) {
        case 'I':
            return (
                <div className="space-y-2 text-sm">
                    <InfoField label="Permit Type" value={formData.type} />
                    <InfoField label="Work Description" value={formData.payload.work.description} />
                    <InfoField label="Location" value={formData.payload.work.location} />
                    <InfoField label="Start Time" value={`${formData.payload.work.coverage.start_date} ${formData.payload.work.coverage.start_time}`} />
                    <InfoField label="End Time" value={`${formData.payload.work.coverage.end_date} ${formData.payload.work.coverage.end_time}`} />
                </div>
            )
        case 'II':
            const isChecklistDisabled = !isEditable;
            return (
                <div>
                     {ptw.type === 'Lifting' && (
                        <div className="mb-6 border rounded-lg p-4">
                            <h4 className="font-bold mb-2 text-base text-gray-800 dark:text-gray-200">Load Calculation</h4>
                        </div>
                     )}
                     {ptw.type === 'Confined Space Entry' && (
                        <>
                        <div className="mb-6 border rounded-lg p-4">
                            <h4 className="font-bold mb-2 text-base text-gray-800 dark:text-gray-200">Gas Test Log (Hourly)</h4>
                        </div>
                        <div className="mb-6 border rounded-lg p-4">
                            <h4 className="font-bold mb-2 text-base text-gray-800 dark:text-gray-200">Personnel Entry Log</h4>
                        </div>
                        </>
                     )}
                    {ptw.type === 'Work at Height' && 'access_equipment' in formData.payload && (
                        <WorkAtHeightPermit 
                            payload={formData.payload as PtwWorkAtHeightPayload}
                            onChange={(updatedPayload) => setFormData(prev => ({ ...prev, payload: updatedPayload } as Ptw))}
                            readOnly={!isEditable}
                        />
                    )}
                     <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-dark-background"><tr className="border-b dark:border-dark-border text-gray-700 dark:text-gray-300"><th className="p-1 w-8">#</th><th className="p-1 text-left">Requirement</th><th className="p-1 w-16">Yes</th><th className="p-1 w-16">No</th><th className="p-1 w-16">N/A</th></tr></thead>
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
            )
        case 'III':
            return (
                <div>
                    <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section III — Permit Requester Confirmation</h3>
                    <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6">
                        <p className="text-sm italic text-gray-700 dark:text-gray-300">“I hereby confirm that I have personally inspected the worksite and verified that all required precautionary measures and safety controls described in this permit have been fully implemented.”</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Permit Holder Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <FormInput label="Permit Holder Name" value={formData.payload.requester.name} onChange={val => handlePayloadChange('requester.name', val)} required disabled={!isEditable} />
                                <FormInput label="Designation" value={formData.payload.requester.designation} onChange={val => handlePayloadChange('requester.designation', val)} required disabled={!isEditable} />
                                <FormInput label="Contractor Company" value={formData.payload.requester.contractor} onChange={val => handlePayloadChange('requester.contractor', val)} required disabled={!isEditable} />
                                <FormInput label="Email" type="email" value={formData.payload.requester.email} onChange={val => handlePayloadChange('requester.email', val)} required disabled={!isEditable} />
                                <FormInput label="Mobile No." type="tel" value={formData.payload.requester.mobile} onChange={val => handlePayloadChange('requester.mobile', val)} required disabled={!isEditable} />
                                <SignatureInput label="Signature" value={formData.payload.requester.signature} onChange={val => handlePayloadChange('requester.signature', val)} disabled={!isEditable} />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Contractor Safety Personnel</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <FormInput label="Safety Personnel Name" value={formData.payload.contractor_safety_personnel?.name} onChange={val => handlePayloadChange('contractor_safety_personnel.name', val)} required disabled={!isEditable} />
                                <FormInput label="Designation (optional)" value={formData.payload.contractor_safety_personnel?.designation} onChange={val => handlePayloadChange('contractor_safety_personnel.designation', val)} disabled={!isEditable} />
                                <FormInput label="Mobile No." type="tel" value={formData.payload.contractor_safety_personnel?.mobile} onChange={val => handlePayloadChange('contractor_safety_personnel.mobile', val)} required disabled={!isEditable} />
                                <FormInput label="Email" type="email" value={formData.payload.contractor_safety_personnel?.email} onChange={val => handlePayloadChange('contractor_safety_personnel.email', val)} required disabled={!isEditable} />
                                <div className="col-span-2">
                                    <SignatureInput label="Signature" value={formData.payload.contractor_safety_personnel?.signature} onChange={val => handlePayloadChange('contractor_safety_personnel.signature', val)} disabled={!isEditable} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        case 'IV':
             return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section IV – Client Proponent / Stakeholder</h3>
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

                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-dark-border pb-1 mb-3">Additional Client Stakeholders</h4>
                            <div className="space-y-4">
                                {formData.payload.signoffs?.other_stakeholders.map((stakeholder, index) => (
                                    <div key={index} className="p-4 border rounded-md relative dark:border-dark-border">
                                        {isProponentEditable && <button onClick={() => handleRemoveStakeholder(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                            <CloseIcon className="w-5 h-5" />
                                        </button>}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <FormInput label={`Stakeholder ${index + 1} Name`} value={stakeholder.name} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.name`, val)} disabled={!isProponentEditable} />
                                            <FormInput label="Designation" value={stakeholder.designation} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.designation`, val)} disabled={!isProponentEditable} />
                                            <FormInput label="Email" type="email" value={stakeholder.email} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.email`, val)} disabled={!isProponentEditable} />
                                            <FormInput label="Mobile No." type="tel" value={stakeholder.mobile} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.mobile`, val)} disabled={!isProponentEditable} />
                                            <div className="col-span-2">
                                                <FormInput label="Remarks" value={stakeholder.remarks} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.remarks`, val)} disabled={!isProponentEditable} />
                                            </div>
                                            <div className="col-span-2">
                                                <SignatureInput label="Signature" value={stakeholder.signature} onChange={val => handlePayloadChange(`signoffs.other_stakeholders.${index}.signature`, val)} disabled={!isProponentEditable} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Button variant="secondary" size="sm" onClick={handleAddStakeholder} disabled={!isProponentEditable}>+ Add Stakeholder</Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'V':
            return (
                 <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section V – Client HSE Department</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <FormInput label="HSE Representative Name" value={formData.payload.signoffs?.client_hs.name} onChange={val => handlePayloadChange('signoffs.client_hs.name', val)} required disabled={!isHseEditable} />
                        <FormInput label="Designation" value={formData.payload.signoffs?.client_hs.designation} onChange={val => handlePayloadChange('signoffs.client_hs.designation', val)} disabled={!isHseEditable} />
                        <FormInput label="Email" type="email" value={formData.payload.signoffs?.client_hs.email} onChange={val => handlePayloadChange('signoffs.client_hs.email', val)} disabled={!isHseEditable} />
                        <FormInput label="Mobile No." type="tel" value={formData.payload.signoffs?.client_hs.mobile} onChange={val => handlePayloadChange('signoffs.client_hs.mobile', val)} disabled={!isHseEditable} />
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
                    <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section VI — Joint Site Inspection</h3>
                    <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6">
                        <p className="text-sm italic text-gray-700 dark:text-gray-300">“The work area has been jointly inspected by all parties, and all safety requirements specified in Section II have been implemented and verified. The permit is now authorized for activation.”</p>
                    </div>
                    <div className="space-y-6">
                        <FormInput label="Remarks" value={formData.payload.joint_inspection?.remarks} onChange={val => handlePayloadChange('joint_inspection.remarks', val)} disabled={!isInspectionEditable} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SignatureInput label="Permit Requester" value={formData.payload.joint_inspection?.requester.signature} onChange={val => handlePayloadChange('joint_inspection.requester.signature', val)} disabled={!isInspectionEditable} />
                            <SignatureInput label="Client Proponent" value={formData.payload.joint_inspection?.client_proponent.signature} onChange={val => handlePayloadChange('joint_inspection.client_proponent.signature', val)} disabled={!isInspectionEditable} />
                            <SignatureInput label="Client HSE" value={formData.payload.joint_inspection?.client_hs.signature} onChange={val => handlePayloadChange('joint_inspection.client_hs.signature', val)} disabled={!isInspectionEditable} />
                        </div>
                    </div>
                </div>
            );
        case 'VII':
            return (
                <div>
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section VII – Holding / Stoppage of Work</h3>
                    <div className="space-y-4">
                        {formData.payload.holding_or_stoppage?.map((stoppage, index) => (
                            <div key={index} className="p-4 border rounded-md dark:border-dark-border text-gray-800 dark:text-gray-200">
                                <p className="font-bold">Stoppage #{index+1} at {new Date(stoppage.time).toLocaleString()}</p>
                                <p><strong>Reason:</strong> {stoppage.reason}</p>
                                <p><strong>Stopped By:</strong> {stoppage.stopped_by}</p>
                                <p><strong>Informed To:</strong> {stoppage.informed_to}</p>
                                {stoppage.restarted_time ? (
                                    <div className="mt-2 pt-2 border-t dark:border-dark-border">
                                        <p className="text-green-600 font-semibold">Resumed at {new Date(stoppage.restarted_time).toLocaleString()}</p>
                                        <p><strong>Signed by:</strong> {stoppage.signature}</p>
                                    </div>
                                ) : (
                                     <div className="mt-4">
                                        {formData.status === 'HOLD' && (
                                            <div className="flex items-center space-x-2">
                                                <input type="text" placeholder="Your Name for Signature" className="w-full p-2 border rounded-md text-sm bg-white dark:bg-dark-background dark:border-dark-border text-gray-900 dark:text-white" onChange={e => {
                                                    const updatedStoppage = {...stoppage, signature: e.target.value};
                                                    const newStoppages = [...(formData.payload.holding_or_stoppage || [])];
                                                    newStoppages[index] = updatedStoppage;
                                                    setFormData(prev => ({...prev, payload: {...prev.payload, holding_or_stoppage: newStoppages}}))
                                                }} />
                                                <Button size="sm" onClick={() => handleResumeWork(stoppage.signature)}>Resume Work</Button>
                                            </div>
                                        )}
                                     </div>
                                )}
                            </div>
                        ))}
                        {(formData.payload.holding_or_stoppage?.length ?? 0) === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No work stoppages have been logged.</p>}
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
                    <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section VIII – Extension</h3>
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
                            {/* Signature fields would go here */}
                        </div>
                    )}
                </div>
            );
        case 'IX':
            return (
                 <div>
                    <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section IX – Permit Closure</h3>
                    <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6">
                        <p className="text-sm italic text-gray-700 dark:text-gray-300">“We confirm the work is complete, the area is clean and safe, all isolations have been removed, and the permit is now closed.”</p>
                    </div>
                    <FormInput label="Closure Note" value={formData.payload.closure?.note} onChange={val => handlePayloadChange('closure.note', val)} disabled={!isClosureEditable} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                         <SignatureInput label="Permit Requester" value={formData.payload.closure?.permit_requester.signature} onChange={val => handlePayloadChange('closure.permit_requester.signature', val)} disabled={!isClosureEditable} />
                         <SignatureInput label="Client Proponent" value={formData.payload.closure?.client_proponent.signature} onChange={val => handlePayloadChange('closure.client_proponent.signature', val)} disabled={!isClosureEditable} />
                         <SignatureInput label="Client HSE" value={formData.payload.closure?.client_hs.signature} onChange={val => handlePayloadChange('closure.client_hs.signature', val)} disabled={!isClosureEditable} />
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 print:hidden" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="ptw-title">
        <div id="ptw-printable-area" className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0 print:hidden">
            <div>
              <h2 id="ptw-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">{ptw.type} - {ptw.payload.permit_no || `Draft #${ptw.id.slice(-6)}`}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{ptw.payload.work.description}</p>
                <Badge color={ptw.status === 'ACTIVE' ? 'green' : ptw.status.includes('SUBMITTED') ? 'yellow' : ptw.status === 'APPROVAL' ? 'blue' : 'gray'}>
                    {ptw.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} downloadOptions={[{ label: 'Download PDF', handler: () => window.print() }]} />
              <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            <nav className="w-64 bg-gray-50 dark:bg-dark-background border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0 print:hidden">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Sections</h3>
              <ul>
                {sections.map(section => (
                  <li key={section.key}>
                    <button
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full text-left p-2 rounded-md text-sm font-medium ${activeSection === section.key ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-neon-green' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
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
            <WorkflowActions onAction={handleWorkflowAction} onSave={() => onUpdate(formData, 'save')} ptw={formData} />
          </footer>
        </div>
      </div>

      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no || ptw.id}`}
        defaultRecipients={[...Object.values(ptw.payload.signoffs ?? {}).flat(), ptw.payload.requester, ptw.payload.contractor_safety_personnel].filter(Boolean) as Partial<User>[]}
        documentLink={`#`} // Placeholder link
      />

      <style>{`
          @media print {
              body * { visibility: hidden; }
              #ptw-printable-area, #ptw-printable-area * { visibility: visible; }
              #ptw-printable-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; max-height: none; }
              @page { size: A4; margin: 1.5cm; }
          }
      `}</style>
    </>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
