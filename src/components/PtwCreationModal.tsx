import React, { useState } from 'react';
import type {
  Ptw,
  PtwType,
  PtwSafetyRequirement,
  CanonicalPtwPayload,
  PtwHotWorkPayload,
  PtwWorkAtHeightPayload,
  PtwConfinedSpacePayload,
  PtwExcavationPayload,
  PtwRoadClosurePayload,
  PtwLiftingPayload
} from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails, emptySignoff, emptySignature, emptyExtension, emptyClosure, ptwChecklistData } from '../config';
import { useDataContext, useAppContext } from '../contexts';
import { FormField } from './ui/FormField';
// FIX: Ensure this import matches the exported interface in ptwAiService.ts
import { analyzePtwRisk, checkSimopsConflicts, AiRiskAnalysisResult } from '../services/ptwAiService';
import { Sparkles, AlertTriangle } from 'lucide-react';

// Icons
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

const GLOBAL_PTW_REQUIREMENTS = {
  mandatoryForAll: [
    "Risk Assessment completed and reviewed",
    "Emergency procedures communicated",
    "Energy isolation procedures defined (LOTO)",
    "Competent personnel identified",
  ],
  globalStandards: ["ISO 45001:2018", "OSHA 29 CFR 1910"]
};

interface PtwCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Ptw, 'id' | 'org_id' | 'status'>, manualPermitNo?: string) => void;
  mode: 'new' | 'existing';
}

export const PtwCreationModal: React.FC<PtwCreationModalProps> = ({ isOpen, onClose, onSubmit, mode }) => {
    const { projects, ptwList } = useDataContext();
    const { activeUser } = useAppContext();

    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<PtwType | null>(null);
    
    // AI & Conflicts
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiRiskAnalysisResult | null>(null);
    const [conflicts, setConflicts] = useState<string[]>([]);

    // COMPLIANCE
    const [globalCompliance, setGlobalCompliance] = useState({
      riskAssessmentCompleted: false,
      emergencyProcedures: false,
      energyIsolation: false,
      competentPersonnel: false,
    });
    
    // EVIDENCE
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAiAnalysis = async () => {
        if (!selectedType || !formData.work_description || !formData.work_location) {
            setError("Please fill in Location and Description first.");
            return;
        }
        
        setIsAnalyzing(true);
        setError('');
        
        try {
            // 1. Check Conflicts
            const activePermits = ptwList.filter(p => p.status === 'ACTIVE');
            const foundConflicts = checkSimopsConflicts(
                formData.work_location, 
                formData.starts_at, 
                formData.ends_at, 
                activePermits
            );
            setConflicts(foundConflicts);

            // 2. AI Risk Analysis
            const analysis = await analyzePtwRisk(selectedType, formData.work_description, formData.work_location);
            setAiAnalysis(analysis);

        } catch (e) {
            console.error(e);
            setError("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSelectedType(null);
        setError('');
        setEvidenceFiles([]);
        setAiAnalysis(null);
        setConflicts([]);
        setGlobalCompliance({
            riskAssessmentCompleted: false,
            emergencyProcedures: false,
            energyIsolation: false,
            competentPersonnel: false,
        });
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
    
    const validateGlobalCompliance = () => {
      return Object.values(globalCompliance).every(val => val === true);
    };
    
    const handleSubmit = () => {
        if (!formData.project_id || !formData.work_location.trim() || !formData.work_description.trim()) {
            setError('Please fill out all required fields.');
            return;
        }

        if (!validateGlobalCompliance()) {
          setError('Please check all Global Compliance boxes to proceed.');
          return;
        }
        
        if (conflicts.length > 0 && !window.confirm("There are SIMOPS conflicts. Are you sure you want to proceed?")) {
            return;
        }

        if (!selectedType) return;
        
        const checklist: PtwSafetyRequirement[] = (ptwChecklistData[selectedType] || []).map(item => ({
            id: item.id,
            text: item.text,
            response: 'N/A' as const,
        }));
        
        const attachmentData = evidenceFiles.map((file) => ({
            name: file.name,
            url: `https://source.unsplash.com/random/200x200?sig=${Math.random()}` 
        }));

        const basePayload: CanonicalPtwPayload = {
            creator_id: activeUser?.id || 'unknown',
            permit_no: mode === 'new' ? '' : formData.manual_permit_no,
            category: 'standard',
            requester: { 
              name: activeUser?.name || 'Unknown', 
              email: activeUser?.email || '', 
              mobile: '555-0101', 
              designation: activeUser?.role || 'WORKER', 
              contractor: formData.contractor_name || 'Internal', 
              signature: '',
            },
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
            ppe: { hard_hat: true, safety_shoes: true, safety_harness: false, goggles: false, coverall: false, respirator: false, safety_gloves: false, vest: false },
            signoffs: { client_proponent: emptySignoff, other_stakeholders: [], client_hs: emptySignoff },
            joint_inspection: { remarks: '', requester: emptySignature, client_proponent: emptySignature, client_hs: emptySignature },
            holding_or_stoppage: [],
            extension: emptyExtension,
            closure: emptyClosure,
            attachments: attachmentData,
            audit: [],
            global_compliance: { standards: GLOBAL_PTW_REQUIREMENTS.globalStandards }
        };
        
        let payload: Ptw['payload'] = basePayload;

        // Initialize specific payloads based on type
        if (selectedType === 'Hot Work') {
             payload = { ...basePayload, fire_watcher: { name: '', mobile: '' }, post_watch_minutes: 30 } as PtwHotWorkPayload;
        } else if (selectedType === 'Work at Height') {
             payload = { ...basePayload, access_equipment: {} } as PtwWorkAtHeightPayload;
        } else if (selectedType === 'Confined Space Entry') {
             payload = { ...basePayload, gas_tests: [], entry_log: [] } as PtwConfinedSpacePayload;
        } else if (selectedType === 'Excavation') {
             payload = { ...basePayload, soil_type: 'A', cave_in_protection: [] } as PtwExcavationPayload;
        } else if (selectedType === 'Road Closure') {
             payload = { ...basePayload, closure_type: 'partial' } as PtwRoadClosurePayload;
        } else if (selectedType === 'Lifting') {
             payload = { ...basePayload, load_calculation: { load_weight: 0, crane_capacity: 0, utilization_percent: 0 } } as PtwLiftingPayload;
        }

        const newPtw: Omit<Ptw, 'id' | 'org_id'> = {
            project_id: formData.project_id,
            type: selectedType,
            status: 'DRAFT',
            title: formData.work_description,
            payload: payload,
            updated_at: new Date().toISOString(),
            audit_log: [],
            approvals: []
        }
        
        // @ts-ignore
        onSubmit(newPtw);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="border-b dark:border-dark-border px-6 py-4 flex justify-between items-center bg-white dark:bg-dark-card sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {mode === 'existing' ? 'Add Existing Permit' : 'Create New Permit'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {step === 1 ? 'Step 1: Select Permit Type' : `Step 2: Enter Details for ${selectedType}`}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:shadow-lg transition-all flex flex-col justify-between h-32 bg-white dark:bg-dark-background hover:border-blue-500 group"
                                    >
                                        <div className="text-3xl">{details.icon}</div>
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600">{type}</h3>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 2 && selectedType && (
                        <div className="space-y-6">
                             {/* AI & CONFLICT ANALYSIS */}
                             <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" /> AI Risk & Conflict Analysis
                                    </h3>
                                    <Button size="sm" onClick={handleAiAnalysis} disabled={isAnalyzing}>
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze Permit'}
                                    </Button>
                                </div>
                                
                                {conflicts.length > 0 && (
                                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> SIMOPS Conflicts Detected
                                        </h4>
                                        <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-200 mt-1">
                                            {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {aiAnalysis && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                            <p className="text-xs text-gray-500 uppercase font-bold">Risk Level</p>
                                            <p className={`text-lg font-bold ${aiAnalysis.riskLevel === 'Critical' ? 'text-red-600' : 'text-orange-500'}`}>
                                                {aiAnalysis.riskLevel}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                            <p className="text-xs text-gray-500 uppercase font-bold">Suggested Controls</p>
                                            <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc list-inside">
                                                {aiAnalysis.controls.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                             </div>

                             {/* GLOBAL COMPLIANCE */}
                             <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                                    <span className="mr-2">🌐</span> Mandatory Safety Checks
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {GLOBAL_PTW_REQUIREMENTS.mandatoryForAll.map((req, idx) => (
                                        <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={globalCompliance[Object.keys(globalCompliance)[idx] as keyof typeof globalCompliance]}
                                                onChange={(e) => setGlobalCompliance(prev => ({
                                                    ...prev,
                                                    [Object.keys(globalCompliance)[idx] as keyof typeof globalCompliance]: e.target.checked
                                                }))}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{req}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {/* FORM FIELDS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <FormField label="Project">
                                    <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm">
                                        <option value="">Select Project...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Work Location">
                                    <input type="text" value={formData.work_location} onChange={e => setFormData(p => ({...p, work_location: e.target.value}))} placeholder="e.g., Level 12" className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                                <FormField label="Work Description" fullWidth>
                                    <textarea rows={3} value={formData.work_description} onChange={e => setFormData(p => ({...p, work_description: e.target.value}))} placeholder="Describe work..." className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm"></textarea>
                                </FormField>
                                <FormField label="Start Time">
                                    <input type="datetime-local" value={formData.starts_at} onChange={e => setFormData(p => ({...p, starts_at: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                                <FormField label="End Time">
                                    <input type="datetime-local" value={formData.ends_at} onChange={e => setFormData(p => ({...p, ends_at: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md shadow-sm" />
                                </FormField>
                            </div>

                            {/* EVIDENCE UPLOAD */}
                            <div className="border-t pt-4 dark:border-dark-border">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Attachments / Evidence</h4>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 relative">
                                     <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*,video/*,.pdf" 
                                        onChange={handleFileChange} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                        <UploadIcon />
                                        <span className="text-sm mt-1">Upload Photos, JSA, or Diagrams</span>
                                    </div>
                                </div>
                                {evidenceFiles.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {evidenceFiles.map((file, i) => (
                                            <div key={i} className="flex justify-between text-xs bg-gray-100 dark:bg-white/10 p-2 rounded">
                                                <span className="truncate text-gray-700 dark:text-gray-300">{file.name}</span>
                                                <button onClick={() => handleRemoveFile(i)} className="text-red-500 font-bold">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && <p className="text-sm text-red-600 font-semibold bg-red-50 p-2 rounded">{error}</p>}
                        </div>
                    )}
                </div>

                {step === 2 && (
                    <div className="bg-gray-100 dark:bg-black/20 px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-dark-border sticky bottom-0">
                         <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button 
                              onClick={handleSubmit} 
                              disabled={!validateGlobalCompliance()}
                              className={!validateGlobalCompliance() ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                {validateGlobalCompliance() ? 'Create Permit' : 'Check Requirements First'}
                            </Button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};