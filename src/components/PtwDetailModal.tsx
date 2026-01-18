import React, { useState, useEffect } from 'react';
import type { 
  Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, PtwHotWorkPayload, 
  PtwConfinedSpacePayload, PtwWorkAtHeightPayload, PtwSignoff, PtwStoppage 
} from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { usePtwWorkflow } from '../contexts/PtwWorkflowContext';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { LoadCalculationSection } from './LoadCalculationSection';
import { GasTestLogSection } from './GasTestLogSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Shield, X, ArrowRight } from 'lucide-react';
import { IsolationManagementModal } from './permit/IsolationManagementModal';

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
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'isolations'>('details');
  const toast = useToast();
  
  const { activeUser } = useAppContext();
  const { moveToNextStage, getNextPossibleStages, getStageResponsibilities } = usePtwWorkflow();
  const [isIsolationModalOpen, setIsIsolationModalOpen] = useState(false);
  
  const [stoppageFormData, setStoppageFormData] = useState<Partial<PtwStoppage>>({ reason: '', stopped_by: '', informed_to: '' });
  
  const isEditable = formData.status === 'DRAFT';
  const isProponentEditable = formData.status === 'SUBMITTED';
  const isHseEditable = formData.status === 'APPROVAL';
  const isInspectionEditable = formData.status === 'APPROVAL' || formData.status === 'ACTIVE';
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
            if (!current[keys[i]]) current[keys[i]] = {};
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
      if (!updatedFormData.payload.extension) {
          updatedFormData.payload.extension = { is_requested: true, reason: '', days: { from: '', to: '' }, hours: { from: '', to: '' }, requester: { signature: '', signed_at: '' }, client_proponent: { signature: '', signed_at: '' }, client_hs: { signature: '', signed_at: '' } };
      } else {
          updatedFormData.payload.extension.is_requested = true;
      }
      setFormData(updatedFormData);
      onUpdate(updatedFormData, 'save');
  };
  
  const handleWorkflowAction = (stage: string) => {
    if (!activeUser) return;
    const updatedPtw = moveToNextStage(ptw, activeUser.id, `Moved to ${stage}`);
    if (updatedPtw) {
      onUpdate(updatedPtw, stage as any);
    }
  };

  const nextStages = getNextPossibleStages(ptw);
  const currentResponsibilities = getStageResponsibilities(ptw.status);

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
                        <InfoField label="Risk Assessment Ref" value={formData.payload.work.risk_assessment_ref || 'Not provided'} />
                        <InfoField label="Emergency Contact" value={formData.payload.work.emergency_contact || 'Not provided'} />
                    </div>
                </div>
            );
            
        case 'II':
            const isChecklistDisabled = !isEditable;
            return (
                <div className="space-y-6">
                    {formData.type === 'Lifting' && 'load_calculation' in formData.payload && (
                        <LoadCalculationSection 
                            // FIX: Cast to any to bypass strict optional check
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
                                            disabled={isChecklistDisabled}
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
                        </div>
                    </div>
                </div>
            );

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
                                <FormInput label="Reason" value={stoppageFormData.reason} onChange={val => setStoppageFormData(p => ({...p, reason: val}))} />
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                <SignatureInput label="Requester" value={formData.payload.extension.requester.signature} onChange={val => handlePayloadChange('extension.requester.signature', val)} disabled={!isExtensionEditable} />
                                <SignatureInput label="Client Proponent" value={formData.payload.extension.client_proponent.signature} onChange={val => handlePayloadChange('extension.client_proponent.signature', val)} disabled={!isExtensionEditable} />
                                <SignatureInput label="Client HSE" value={formData.payload.extension.client_hs.signature} onChange={val => handlePayloadChange('extension.client_hs.signature', val)} disabled={!isExtensionEditable} />
                            </div>
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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-right">
          
          {/* Header */}
          <div className="p-6 border-b dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge color={ptw.status === 'ACTIVE' ? 'green' : 'blue'}>
                  {ptw.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs font-mono text-gray-500">{ptw.payload.permit_no || 'DRAFT'}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{ptw.title}</h2>
              <p className="text-sm text-gray-500">{ptw.type} • {ptw.project_id}</p>
            </div>
            <div className="flex gap-2">
               <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
               <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
               </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b dark:border-gray-800 px-6">
              <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Details</button>
              <button onClick={() => setActiveTab('workflow')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'workflow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Workflow & Audit</button>
              <button onClick={() => setActiveTab('isolations')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'isolations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Isolations (LOTO)</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex">
            
            {activeTab === 'details' ? (
                <>
                    {/* SIDEBAR NAVIGATION FOR SECTIONS I-IX */}
                    <nav className="w-64 bg-gray-50 dark:bg-dark-background border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0">
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

                    {/* MAIN CONTENT AREA */}
                    <main className="flex-1 p-8 overflow-y-auto bg-white dark:bg-dark-card">
                        {renderSectionContent()}
                    </main>
                </>
            ) : activeTab === 'workflow' ? (
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {/* Current Stage Actions */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> Current Stage: {ptw.status.replace(/_/g, ' ')}
                        </h3>
                        
                        {currentResponsibilities.length > 0 && (
                            <div className="mb-4 bg-white dark:bg-gray-800 p-3 rounded-lg text-sm">
                                <p className="font-semibold mb-1">Pending Actions:</p>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                    {currentResponsibilities.map((resp, i) => <li key={i}>{resp}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                        {nextStages.map(stage => (
                            <Button key={stage} onClick={() => handleWorkflowAction(stage)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                Move to {stage.replace(/_/g, ' ')} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ))}
                        {nextStages.length === 0 && (
                            <p className="text-sm text-gray-500">No further actions available for this stage.</p>
                        )}
                        </div>
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 font-bold">Workflow History</div>
                        <div className="divide-y dark:divide-gray-700">
                            {ptw.workflow_log?.map((log, i) => (
                                <div key={i} className="p-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{log.action}</span>
                                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-gray-500 mt-1">User ID: {log.user_id}</p>
                                </div>
                            ))}
                            {(!ptw.workflow_log || ptw.workflow_log.length === 0) && <div className="p-4 text-gray-500 italic">No history recorded.</div>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-500" /> Active Isolations
                        </h3>
                        <Button size="sm" variant="secondary" onClick={() => setIsIsolationModalOpen(true)}>
                            Manage LOTO
                        </Button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-dashed text-center text-gray-500">
                        No active isolations recorded. Click "Manage LOTO" to add points.
                    </div>
                </div>
            )}

          </div>

          {/* Footer */}
          <footer className="p-4 border-t bg-gray-100 dark:bg-black/20 dark:border-dark-border flex justify-end items-center flex-shrink-0 print:hidden">
             <WorkflowActions onAction={handleWorkflowAction} onSave={() => onUpdate(formData, 'save')} ptw={formData} />
          </footer>
        </div>
      </div>

      {isIsolationModalOpen && (
        <IsolationManagementModal 
          ptw={ptw} 
          isOpen={isIsolationModalOpen} 
          onClose={() => setIsIsolationModalOpen(false)}
          onUpdate={(isolations) => {
             console.log("Isolations updated", isolations);
          }}
        />
      )}
      
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no}`}
        documentLink="#"
        defaultRecipients={[]}
      />
    </div>
    </>
  );
};