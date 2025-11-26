
import React, { useState } from 'react';
import type {
  CanonicalPtwPayload,
  PtwConfinedSpacePayload,
  PtwHotWorkPayload,
  PtwLiftingPayload,
  Ptw,
  PtwPpe,
  PtwSafetyRequirement,
  PtwType,
  Project,
  PtwRoadClosurePayload,
  User,
  PtwWorkAtHeightPayload,
  PtwExcavationPayload,
} from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails, emptySignoff, emptySignature, emptyExtension, emptyClosure, ptwChecklistData } from '../config';
import { useDataContext, useAppContext } from '../contexts';
import { FormField } from './ui/FormField';

interface PtwCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Ptw, 'id' | 'org_id' | 'status'>, manualPermitNo?: string) => void;
  mode: 'new' | 'existing';
}

export const PtwCreationModal: React.FC<PtwCreationModalProps> = ({ isOpen, onClose, onSubmit, mode }) => {
    const { projects, ptwList, setPtwList } = useDataContext();
    const { usersList, activeUser, activeOrg } = useAppContext();

    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<PtwType | null>(null);

    const [formData, setFormData] = useState({
        manual_permit_no: '',
        project_id: projects[0]?.id || '',
        work_location: '',
        contractor_name: '',
        work_description: '',
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });

    const [error, setError] = useState('');

    const handleSelectType = (type: PtwType) => {
        setSelectedType(type);
        setStep(2);
    };

    const resetForm = () => {
        setStep(1);
        setSelectedType(null);
        setError('');
        setFormData({
            manual_permit_no: '',
            project_id: projects[0]?.id || '',
            work_location: '',
            contractor_name: '',
            work_description: '',
            starts_at: new Date().toISOString().slice(0, 16),
            ends_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleSubmit = () => {
        if (mode === 'existing' && !formData.manual_permit_no.trim()) {
            setError('Please enter the existing permit number.');
            return;
        }
        if (!formData.project_id || !formData.work_location.trim() || !formData.work_description.trim()) {
            setError('Please fill out all required fields.');
            return;
        }

        if (!selectedType) return;
        
        const checklist: PtwSafetyRequirement[] = (ptwChecklistData[selectedType] || []).map(item => ({
            id: item.id,
            text: item.text,
            response: 'N/A' as const,
        }));
        
        const ppeDefaults: PtwPpe = { hard_hat: false, safety_harness: false, safety_shoes: false, goggles: false, coverall: false, respirator: false, safety_gloves: false, vest: false };

        const basePayload: CanonicalPtwPayload = {
            creator_id: activeUser.id,
            permit_no: mode === 'new' ? '' : formData.manual_permit_no,
            category: 'standard',
            requester: { name: activeUser.name, email: activeUser.email, mobile: '555-0101', designation: activeUser.role, contractor: formData.contractor_name || 'Internal', signature: '' },
            contractor_safety_personnel: { name: '', email: '', mobile: '', designation: '', signature: ''},
            work: {
                location: formData.work_location,
                description: formData.work_description,
                coverage: { 
                    start_date: formData.starts_at.split('T')[0], 
                    end_date: formData.ends_at.split('T')[0], 
                    start_time: formData.starts_at.split('T')[1], 
                    end_time: formData.ends_at.split('T')[1] 
                },
                associated_permits: [],
            },
            safety_requirements: checklist,
            ppe: ppeDefaults,
            signoffs: { client_proponent: emptySignoff, other_stakeholders: [], client_hs: emptySignoff },
            joint_inspection: { remarks: '', requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature },
            holding_or_stoppage: [],
            extension: emptyExtension,
            closure: emptyClosure,
            attachments: [],
            audit: [],
        };
        
        let payload: Ptw['payload'];

        switch (selectedType) {
            case 'Lifting':
                payload = { ...basePayload, load_calculation: { load_weight: 0, crane_capacity: 0, utilization_percent: 0 }} as PtwLiftingPayload;
                break;
            case 'Hot Work':
                 payload = { ...basePayload, fire_watcher: { name: '', mobile: '' }, post_watch_minutes: 30 } as PtwHotWorkPayload;
                break;
            case 'Confined Space Entry':
                payload = { ...basePayload, gas_tests: [], entry_log: [] } as PtwConfinedSpacePayload;
                break;
            case 'Excavation':
                 payload = { ...basePayload, soil_type: 'A', cave_in_protection: [] } as PtwExcavationPayload;
                break;
            case 'Road Closure':
                payload = { ...basePayload, closure_type: 'partial' } as PtwRoadClosurePayload;
                break;
            case 'Work at Height':
                payload = {
                        ...basePayload,
                        access_equipment: {
                            step_ladder: false, independent_scaffolding: false, tower_mobile_scaffolding: false,
                            scissor_lift: false, articulated_telescopic_boom: false, boatswain_chair: false,
                            man_basket: false, rope_access_system: false, roof_ladder: false, other: ''
                        }
                } as PtwWorkAtHeightPayload;
                break;
            default:
                payload = basePayload;
        }
        
        const newPtw: Omit<Ptw, 'id' | 'org_id' | 'approvals' | 'audit_log'> = {
            project_id: formData.project_id,
            type: selectedType,
            status: 'DRAFT',
            title: formData.work_description,
            payload: payload
        }
        
        onSubmit(newPtw);
        handleClose();
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="border-b dark:border-dark-border px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                          {mode === 'existing' ? 'Add Existing Permit' : 'Create New Permit'}
                        </h2>
                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                          {step === 1 ? 'Step 1: Select Permit Type' : `Step 2: Enter Details for ${selectedType}`}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {(Object.keys(ptwTypeDetails) as (keyof typeof ptwTypeDetails)[]).map(type => {
                                const details = ptwTypeDetails[type];
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleSelectType(type)}
                                        className={`p-4 border-2 rounded-lg text-left hover:shadow-lg transition-all flex flex-col justify-between h-40 bg-white dark:bg-dark-background border-gray-200 dark:border-dark-border hover:border-primary-500`}
                                    >
                                        <div>
                                            <span className="text-4xl">{details.icon}</span>
                                            <h3 className={`font-bold text-md mt-2 text-text-primary dark:text-dark-text-primary`}>{type}</h3>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{details.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 2 && selectedType && (
                        <div className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {mode === 'existing' && (
                                    <FormField label="Existing Permit Number" fullWidth>
                                        <input type="text" value={formData.manual_permit_no} onChange={e => setFormData(p => ({...p, manual_permit_no: e.target.value}))} placeholder="e.g., WH-2024-07-123" className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                    </FormField>
                                )}
                                <FormField label="Project">
                                    <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm">
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Work Location">
                                    <input type="text" value={formData.work_location} onChange={e => setFormData(p => ({...p, work_location: e.target.value}))} placeholder="e.g., Sector B, Level 12" className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                                <FormField label="Contractor Name (if any)">
                                    <input type="text" value={formData.contractor_name} onChange={e => setFormData(p => ({...p, contractor_name: e.target.value}))} placeholder="e.g., Awesome Builders Inc." className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                                 <FormField label="Work Description" fullWidth>
                                    <textarea rows={3} value={formData.work_description} onChange={e => setFormData(p => ({...p, work_description: e.target.value}))} placeholder="Describe the work to be done..." className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm"></textarea>
                                </FormField>
                                <FormField label="Permit Start Time">
                                    <input type="datetime-local" value={formData.starts_at} onChange={e => setFormData(p => ({...p, starts_at: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                                <FormField label="Permit End Time">
                                    <input type="datetime-local" value={formData.ends_at} onChange={e => setFormData(p => ({...p, ends_at: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                        </div>
                    )}
                </div>

                {step === 2 && (
                    <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-between items-center space-x-3 border-t dark:border-dark-border">
                         <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                         <div>
                            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleSubmit} className="ml-2">{mode === 'existing' ? 'Add Permit' : 'Create Permit'}</Button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
