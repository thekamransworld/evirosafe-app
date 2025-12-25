import React, { useState, useEffect } from 'react';
import type { 
  Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, PtwHotWorkPayload, 
  PtwConfinedSpacePayload, PtwWorkAtHeightPayload, PtwSignoff, PtwStoppage, 
  PtwWorkflowStage, PtwIsolation, PtwLiveSensor
} from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails } from '../config';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { PtwWorkflowEngine } from '../utils/workflowEngine';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { LoadCalculationSection } from './LoadCalculationSection';
import { GasTestLogSection } from './GasTestLogSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { 
  CheckCircle, Clock, FileText, Search, MapPin, PenTool, 
  Handshake, Lock, ShieldCheck, AlertTriangle, 
  Activity, UserCheck, FileCheck, Shield, AlertCircle,
  Download, QrCode, Camera, WifiOff, Battery, ThermometerSun,
  Wind as WindIcon, Volume2, Play, Pause, RotateCcw, Eye
} from 'lucide-react';

interface PtwDetailModalProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw) => void;
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

// Workflow visualization steps
const WORKFLOW_STEPS: { id: PtwWorkflowStage; label: string; icon: any; role: string }[] = [
  { id: 'REQUESTED', label: 'Applied', icon: FileText, role: 'Requester' },
  { id: 'ISSUER_REVIEW', label: 'Review', icon: Search, role: 'Issuer' },
  { id: 'APPROVAL', label: 'Approval', icon: UserCheck, role: 'Approver' },
  { id: 'AUTHORIZATION', label: 'Auth', icon: Shield, role: 'System' },
  { id: 'SITE_HANDOVER', label: 'Handover', icon: Handshake, role: 'Receiver' },
  { id: 'ACTIVE', label: 'Active', icon: Activity, role: 'Receiver' },
  { id: 'JOINT_INSPECTION', label: 'Inspect', icon: Eye, role: 'Joint' },
  { id: 'CLOSED', label: 'Closed', icon: Lock, role: 'Issuer' },
];

// --- HELPER COMPONENTS ---

const ChecklistRow: React.FC<{ index: number; item: PtwSafetyRequirement; onChange: (value: PtwSafetyRequirement) => void; disabled: boolean }> = ({ index, item, onChange, disabled }) => (
    <tr className={`border-b dark:border-dark-border ${disabled ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-background'}`}>
        <td className="p-2 w-8 text-center text-gray-600 dark:text-gray-400">{index}</td>
        <td className="p-2 text-gray-900 dark:text-gray-200">{item.text}</td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'Yes'} onChange={() => onChange({ ...item, response: 'Yes' })} disabled={disabled} className="accent-blue-600" /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'No'} onChange={() => onChange({ ...item, response: 'No' })} disabled={disabled} className="accent-blue-600" /></td>
        <td className="p-2 w-16 text-center"><input type="radio" name={`check-${item.id}`} checked={item.response === 'N/A'} onChange={() => onChange({ ...item, response: 'N/A' })} disabled={disabled} className="accent-blue-600" /></td>
    </tr>
);

const InfoField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div className="border-b py-2 dark:border-dark-border">
        <span className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">{label}:</span>
        <div className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{value}</div>
    </div>
)

const FormInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, type?: string, required?: boolean, disabled?: boolean }> = ({ label, value, onChange, type = 'text', required = false, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm mb-1">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:text-gray-500"
            required={required}
            disabled={disabled}
        />
    </div>
);

const SignatureInput: React.FC<{ label: string, value: any, onChange: (val: any) => void, disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => (
    <div>
        <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm mb-1">{label}</label>
        <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md font-serif text-lg bg-white dark:bg-dark-background text-blue-800 dark:text-blue-300 disabled:bg-gray-100 dark:disabled:bg-white/5"
            placeholder={disabled ? "Signed" : "Type name to sign"}
            disabled={disabled}
        />
    </div>
);

// --- WORKFLOW ACTIONS COMPONENT ---
const WorkflowActions: React.FC<{ onAction: (stage: PtwWorkflowStage) => void, onSave: () => void, ptw: Ptw }> = ({ onAction, onSave, ptw }) => {
    const { activeUser, can } = useAppContext();
    const canApprove = can('approve', 'ptw');

    return (
        <div className="flex flex-col gap-2 w-full">
            {ptw.status === 'DRAFT' && (
                <>
                    <Button variant="secondary" onClick={onSave} className="w-full">Save Draft</Button>
                    <Button onClick={() => onAction('REQUESTED')} className="w-full">Submit Application</Button>
                </>
            )}
            
            {ptw.status === 'REQUESTED' && (
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="danger" onClick={() => onAction('DRAFT')}>Return</Button>
                    <Button onClick={() => onAction('ISSUER_REVIEW')}>Start Review</Button>
                </div>
            )}

            {ptw.status === 'ISSUER_REVIEW' && (
                 <Button onClick={() => onAction('ISSUER_SIGNED')}>Sign & Accept</Button>
            )}

            {ptw.status === 'ISSUER_SIGNED' && (
                 <Button onClick={() => onAction('PENDING_APPROVAL')}>Forward to Approver</Button>
            )}

            {ptw.status === 'PENDING_APPROVAL' && (
                 <Button onClick={() => onAction('APPROVAL')}>Start Approval</Button>
            )}

            {ptw.status === 'APPROVAL' && (
                 <Button onClick={() => onAction('APPROVER_SIGNED')}>Authorize Permit</Button>
            )}

            {ptw.status === 'APPROVER_SIGNED' && (
                 <Button onClick={() => onAction('AUTHORIZATION')}>Final Authorization</Button>
            )}

            {ptw.status === 'AUTHORIZATION' && (
                 <Button onClick={() => onAction('HANDOVER_PENDING')}>Prepare Handover</Button>
            )}

            {ptw.status === 'HANDOVER_PENDING' && (
                 <Button onClick={() => onAction('SITE_HANDOVER')}>Scan QR / Handover</Button>
            )}

            {ptw.status === 'SITE_HANDOVER' && (
                 <Button onClick={() => onAction('ACTIVE')}>Accept & Start Work</Button>
            )}

            {ptw.status === 'ACTIVE' && (
                 <div className="grid grid-cols-2 gap-2">
                     <Button variant="secondary" onClick={() => onAction('SUSPENDED')}>Suspend</Button>
                     <Button onClick={() => onAction('COMPLETION_PENDING')}>Mark Complete</Button>
                 </div>
            )}

            {ptw.status === 'SUSPENDED' && (
                 <Button onClick={() => onAction('ACTIVE')}>Resume Work</Button>
            )}

            {ptw.status === 'COMPLETION_PENDING' && (
                 <Button onClick={() => onAction('JOINT_INSPECTION')}>Start Inspection</Button>
            )}

            {ptw.status === 'JOINT_INSPECTION' && (
                 <Button onClick={() => onAction('CLOSED')}>Close Permit</Button>
            )}
        </div>
    );
}

// --- MAIN COMPONENT ---

export const PtwDetailModal: React.FC<PtwDetailModalProps> = ({ ptw, onClose, onUpdate }) => {
  const { activeUser, usersList } = useAppContext();
  const [formData, setFormData] = useState<Ptw>(JSON.parse(JSON.stringify(ptw)));
  const [activeSection, setActiveSection] = useState<SectionKey>('I');
  const [comment, setComment] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const toast = useToast();

  const getName = (id: string) => usersList.find(u => u.id === id)?.name || 'Unknown';

  // --- PERMISSIONS LOGIC (UPDATED) ---
  const isDraft = formData.status === 'DRAFT';
  
  // Requester can edit everything in Draft
  const isEditable = isDraft; 
  
  // Requester can NOMINATE (fill details) for Proponent/HSE in Draft, but NOT sign
  const canEditProponentDetails = isDraft || formData.status === 'ISSUER_REVIEW';
  const canEditHseDetails = isDraft || formData.status === 'APPROVAL';
  
  // Signatures are strictly locked to workflow stages
  const canSignProponent = formData.status === 'ISSUER_REVIEW';
  const canSignHse = formData.status === 'APPROVAL';
  
  const isInspectionEditable = formData.status === 'JOINT_INSPECTION';
  const isClosureEditable = formData.status === 'ACTIVE' || formData.status === 'COMPLETION_PENDING';

  const hasPermission = PtwWorkflowEngine.validateRolePermission(
    ptw.status,
    activeUser?.role || '',
    activeUser?.id || '',
    ptw
  );

  useEffect(() => {
      setFormData(JSON.parse(JSON.stringify(ptw)));
  }, [ptw]);

  const handlePayloadChange = (path: string, value: any) => {
    setFormData(prev => {
        const keys = path.split('.');
        const newPayload = JSON.parse(JSON.stringify(prev.payload || {}));
        let current: any = newPayload;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;

        if (path.endsWith('.signature') && value) {
            const pathPrefix = path.substring(0, path.lastIndexOf('.'));
            const signedAtPath = `${pathPrefix}.signed_at`;
            let signedAtTarget: any = newPayload;
            const signedAtKeys = signedAtPath.split('.');
            try {
                for (let i = 0; i < signedAtKeys.length - 1; i++) {
                    if (!signedAtTarget[signedAtKeys[i]]) signedAtTarget[signedAtKeys[i]] = {};
                    signedAtTarget = signedAtTarget[signedAtKeys[i]];
                }
                signedAtTarget[signedAtKeys[signedAtKeys.length - 1]] = new Date().toISOString();
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

  const handleTransition = (nextStage: PtwWorkflowStage, actionLabel: string) => {
    // Basic validation before submission
    if (nextStage === 'REQUESTED') {
        const { requester } = formData.payload;
        if (!requester.signature) {
            toast.error("Permit Requester must sign in Section III before submitting.");
            return;
        }
    }

    if (!PtwWorkflowEngine.canTransition(ptw.status, nextStage)) {
      alert(`Invalid transition from ${ptw.status} to ${nextStage}`);
      return;
    }
    
    const updatedPtw: Ptw = {
      ...formData,
      status: nextStage,
      workflow_log: [
        ...(formData.workflow_log || []),
        {
          stage: nextStage,
          action: actionLabel,
          user_id: activeUser?.id || '',
          timestamp: new Date().toISOString(),
          comments: comment,
          signoff_type: 'digital',
        }
      ]
    };
    onUpdate(updatedPtw);
    setComment('');
  };

  // Demo Helper: Auto-fill for testing
  const demoFillSection = (section: 'III' | 'IV' | 'V') => {
      if (section === 'III') {
          handlePayloadChange('requester.signature', activeUser?.name || 'Demo User');
      } else if (section === 'IV') {
          handlePayloadChange('signoffs.client_proponent.name', 'John Manager');
          handlePayloadChange('signoffs.client_proponent.designation', 'Site Lead');
          handlePayloadChange('signoffs.client_proponent.email', 'john@client.com');
          handlePayloadChange('signoffs.client_proponent.mobile', '555-0199');
      } else if (section === 'V') {
          handlePayloadChange('signoffs.client_hs.name', 'Sarah Safety');
          handlePayloadChange('signoffs.client_hs.designation', 'HSE Officer');
          handlePayloadChange('signoffs.client_hs.email', 'sarah@hse.com');
          handlePayloadChange('signoffs.client_hs.mobile', '555-0200');
      }
  };

  const renderSectionContent = () => {
    switch(activeSection) {
        case 'I':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoField label="Permit Type" value={formData.type} />
                        <InfoField label="Permit Number" value={formData.payload.permit_no || 'Draft'} />
                        <InfoField label="Project" value={formData.project_id} />
                        <InfoField label="Work Location" value={formData.payload.work.location} />
                        <InfoField label="Number of Workers" value={formData.payload.work.number_of_workers || 'Not specified'} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Work Description</h4>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded border dark:border-dark-border text-sm">
                            {formData.payload.work.description}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoField label="Start Time" value={`${formData.payload.work.coverage.start_date} ${formData.payload.work.coverage.start_time}`} />
                        <InfoField label="End Time" value={`${formData.payload.work.coverage.end_date} ${formData.payload.work.coverage.end_time}`} />
                        <InfoField label="Risk Assessment Ref" value={formData.payload.work.risk_assessment_ref || 'Not provided'} />
                        <InfoField label="Emergency Contact" value={formData.payload.work.emergency_contact || 'Not provided'} />
                    </div>
                </div>
            );
        case 'II':
            return (
                <div className="space-y-6">
                    {formData.type === 'Lifting' && 'load_calculation' in formData.payload && (
                        <LoadCalculationSection 
                            loadCalc={formData.payload.load_calculation}
                            onChange={(calc) => handlePayloadChange('load_calculation', calc)}
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
                    <div className="border rounded-lg overflow-hidden dark:border-dark-border">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-white/5">
                                <tr className="text-left text-gray-600 dark:text-gray-300">
                                    <th className="p-3 w-10">#</th>
                                    <th className="p-3">Requirement</th>
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
                    
                    {/* PPE Requirements */}
                    <div className="border rounded-lg p-4 dark:border-dark-border">
                        <h4 className="font-bold mb-3 text-base text-gray-800 dark:text-gray-200">Personal Protective Equipment (PPE)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(formData.payload.ppe || {}).map(([key, value]) => (
                                <label key={key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={!!value}
                                        onChange={(e) => handlePayloadChange(`ppe.${key}`, e.target.checked)}
                                        disabled={!isEditable}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'III':
            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Permit Requester</h3>
                        {isEditable && <Button size="sm" variant="ghost" onClick={() => demoFillSection('III')}>Demo Sign</Button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Name" value={formData.payload.requester.name} onChange={val => handlePayloadChange('requester.name', val)} disabled={!isEditable} />
                        <FormInput label="Designation" value={formData.payload.requester.designation} onChange={val => handlePayloadChange('requester.designation', val)} disabled={!isEditable} />
                        <FormInput label="Company" value={formData.payload.requester.contractor} onChange={val => handlePayloadChange('requester.contractor', val)} disabled={!isEditable} />
                        <FormInput label="Mobile" value={formData.payload.requester.mobile} onChange={val => handlePayloadChange('requester.mobile', val)} disabled={!isEditable} />
                        <div className="md:col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.requester.signature} onChange={val => handlePayloadChange('requester.signature', val)} disabled={!isEditable} />
                        </div>
                    </div>
                </div>
            );

        case 'IV':
            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Client Proponent</h3>
                        {isDraft && <Button size="sm" variant="ghost" onClick={() => demoFillSection('IV')}>Demo Fill Details</Button>}
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-800 dark:text-blue-200 mb-4">
                        {isDraft ? "Nominate the Client Proponent below. They will sign during the Review stage." : "Client Proponent review and signature."}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Name" value={formData.payload.signoffs?.client_proponent?.name} onChange={val => handlePayloadChange('signoffs.client_proponent.name', val)} disabled={!canEditProponentDetails} />
                        <FormInput label="Designation" value={formData.payload.signoffs?.client_proponent?.designation} onChange={val => handlePayloadChange('signoffs.client_proponent.designation', val)} disabled={!canEditProponentDetails} />
                        <FormInput label="Email" type="email" value={formData.payload.signoffs?.client_proponent?.email} onChange={val => handlePayloadChange('signoffs.client_proponent.email', val)} disabled={!canEditProponentDetails} />
                        <FormInput label="Mobile No." type="tel" value={formData.payload.signoffs?.client_proponent?.mobile} onChange={val => handlePayloadChange('signoffs.client_proponent.mobile', val)} disabled={!canEditProponentDetails} />
                        <div className="md:col-span-2">
                             <FormInput label="Remarks" value={formData.payload.signoffs?.client_proponent?.remarks} onChange={val => handlePayloadChange('signoffs.client_proponent.remarks', val)} disabled={!canSignProponent} />
                        </div>
                        <div className="md:col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.signoffs?.client_proponent?.signature} onChange={val => handlePayloadChange('signoffs.client_proponent.signature', val)} disabled={!canSignProponent} />
                        </div>
                    </div>
                </div>
            );

        case 'V':
            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">HSE Department</h3>
                        {isDraft && <Button size="sm" variant="ghost" onClick={() => demoFillSection('V')}>Demo Fill Details</Button>}
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg text-sm text-purple-800 dark:text-purple-200 mb-4">
                        {isDraft ? "Nominate the HSE Representative below. They will sign during the Approval stage." : "HSE Representative review and signature."}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="HSE Rep Name" value={formData.payload.signoffs?.client_hs?.name} onChange={val => handlePayloadChange('signoffs.client_hs.name', val)} disabled={!canEditHseDetails} />
                        <FormInput label="Designation" value={formData.payload.signoffs?.client_hs?.designation} onChange={val => handlePayloadChange('signoffs.client_hs.designation', val)} disabled={!canEditHseDetails} />
                        <div className="md:col-span-2">
                             <FormInput label="Remarks" value={formData.payload.signoffs?.client_hs?.remarks} onChange={val => handlePayloadChange('signoffs.client_hs.remarks', val)} disabled={!canSignHse} />
                        </div>
                        <div className="md:col-span-2">
                            <SignatureInput label="Signature" value={formData.payload.signoffs?.client_hs?.signature} onChange={val => handlePayloadChange('signoffs.client_hs.signature', val)} disabled={!canSignHse} />
                        </div>
                    </div>
                </div>
            );

        case 'VI':
            return (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 dark:border-dark-border">Joint Site Inspection</h3>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200 mb-4">
                        Verify that all safety measures are in place before activating the permit.
                    </div>
                    <FormInput label="Remarks" value={formData.payload.joint_inspection?.remarks} onChange={val => handlePayloadChange('joint_inspection.remarks', val)} disabled={!isInspectionEditable} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SignatureInput label="Requester Sign" value={formData.payload.joint_inspection?.requester.signature} onChange={val => handlePayloadChange('joint_inspection.requester.signature', val)} disabled={!isInspectionEditable} />
                        <SignatureInput label="Proponent Sign" value={formData.payload.joint_inspection?.client_proponent.signature} onChange={val => handlePayloadChange('joint_inspection.client_proponent.signature', val)} disabled={!isInspectionEditable} />
                        <SignatureInput label="HSE Sign" value={formData.payload.joint_inspection?.client_hs.signature} onChange={val => handlePayloadChange('joint_inspection.client_hs.signature', val)} disabled={!isInspectionEditable} />
                    </div>
                </div>
            );

        case 'VII':
            return (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 dark:border-dark-border">Section VII – Holding / Stoppage of Work</h3>
                    <div className="space-y-4">
                        {formData.payload.holding_or_stoppage?.map((stoppage, index) => (
                            <div key={index} className="p-4 border rounded-md dark:border-dark-border text-gray-800 dark:text-gray-200">
                                <p className="font-bold">Stoppage #{index+1} at {new Date(stoppage.time).toLocaleString()}</p>
                                <p><strong>Reason:</strong> {stoppage.reason}</p>
                                <p><strong>Stopped By:</strong> {stoppage.stopped_by}</p>
                                {stoppage.restarted_time && (
                                    <div className="mt-2 pt-2 border-t dark:border-dark-border">
                                        <p className="text-green-600 font-semibold">Resumed at {new Date(stoppage.restarted_time).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {(formData.payload.holding_or_stoppage?.length ?? 0) === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No work stoppages have been logged.</p>}
                    </div>
                </div>
            );

        case 'VIII':
            return (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 dark:border-dark-border">Section VIII – Extension</h3>
                    {!formData.payload.extension?.is_requested ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg dark:border-dark-border">
                            <p className="text-gray-600 dark:text-gray-400">No extension has been requested for this permit.</p>
                        </div>
                    ) : (
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
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2 dark:border-dark-border">Section IX – Permit Closure</h3>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg text-sm italic text-gray-600 dark:text-gray-400 mb-4">
                        "We confirm the work is complete, the area is clean and safe, all isolations have been removed, and the permit is now closed."
                    </div>
                    <FormInput label="Closure Note / Handover" value={formData.payload.closure?.note} onChange={val => handlePayloadChange('closure.note', val)} disabled={!isClosureEditable} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SignatureInput label="Requester Closure Sign" value={formData.payload.closure?.permit_requester.signature} onChange={val => handlePayloadChange('closure.permit_requester.signature', val)} disabled={!isClosureEditable} />
                        <SignatureInput label="Proponent Closure Sign" value={formData.payload.closure?.client_proponent.signature} onChange={val => handlePayloadChange('closure.client_proponent.signature', val)} disabled={!isClosureEditable} />
                        <SignatureInput label="HSE Closure Sign" value={formData.payload.closure?.client_hs.signature} onChange={val => handlePayloadChange('closure.client_hs.signature', val)} disabled={!isClosureEditable} />
                    </div>
                </div>
            );

        default:
            return <div className="p-8 text-center text-gray-500">Select a section from the left menu.</div>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <header className="p-5 border-b dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-card shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {ptw.type} - {ptw.payload.permit_no || `Draft #${ptw.id.slice(-6)}`}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={ptw.status === 'ACTIVE' ? 'green' : 'gray'}>{ptw.status.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                <CloseIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </header>

          {/* Workflow Bar */}
          <div className="bg-slate-50 dark:bg-black/20 border-b dark:border-dark-border p-4 overflow-x-auto shrink-0">
            <div className="flex items-center min-w-max px-4">
              {WORKFLOW_STEPS.map((step, index) => {
                const isCurrent = ptw.status === step.id;
                const isCompleted = WORKFLOW_STEPS.findIndex(s => s.id === ptw.status) > index;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex flex-col items-center w-24 ${isCurrent ? 'scale-110' : 'opacity-70'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                        isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : 
                        isCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={`h-0.5 w-12 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-64 bg-gray-50 dark:bg-dark-background border-r dark:border-dark-border overflow-y-auto p-4 shrink-0">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 px-2">Sections</h3>
              <ul className="space-y-1">
                {sections.map(section => (
                  <li key={section.key}>
                    <button
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.key 
                          ? 'bg-white dark:bg-white/10 text-primary-700 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-transparent' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {section.key}. {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content Area */}
            <main className="flex-1 p-8 overflow-y-auto bg-white dark:bg-dark-card">
              {renderSectionContent()}
            </main>

            {/* Right Action Panel */}
            <aside className="w-80 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-6 overflow-y-auto shrink-0">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">Action Required</h3>
                    <div className="text-sm text-gray-500 mb-4">Current Stage: {ptw.status.replace(/_/g, ' ')}</div>
                    
                    {hasPermission.allowed ? (
                        <div className="space-y-3">
                            <textarea 
                                className="w-full p-2 text-sm border rounded-md dark:bg-dark-card dark:border-dark-border" 
                                rows={3} 
                                placeholder="Add comments..."
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                            />
                            <div className="flex flex-col gap-2">
                                <WorkflowActions onAction={(action) => handleTransition(action, 'Updated')} onSave={() => onUpdate(formData)} ptw={formData} />
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md border border-yellow-200 dark:border-yellow-800">
                            Waiting for action by <strong>{WORKFLOW_STEPS.find(s => s.id === ptw.status)?.role}</strong>
                        </div>
                    )}
                </div>
                
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">History</h3>
                    <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2 pl-4">
                        {ptw.workflow_log?.slice().reverse().map((log, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600 ring-4 ring-white dark:ring-dark-background"></div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{log.action}</p>
                                <p className="text-[10px] text-gray-500">{getName(log.user_id)} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                                {log.comments && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{log.comments}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
          </div>
        </div>
      </div>
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no}`}
        defaultRecipients={[]}
        documentLink="#"
      />
    </>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;