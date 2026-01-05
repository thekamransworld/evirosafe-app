import React, { useState, useEffect, useMemo } from 'react';
import type { Report, Project, User, RiskMatrix, Severity, Likelihood, AccidentDetails, IncidentDetails, NearMissDetails, UnsafeActDetails, UnsafeConditionDetails, LeadershipEventDetails, CapaAction, ReportClassification, ImpactedParty, RootCause, ReportDistribution, ReportType } from '../types';
import { Button } from './ui/Button';
import { RiskMatrixInput } from './RiskMatrixInput';
import { FormField } from './ui/FormField';
import { useDataContext, useAppContext } from '../contexts';
import { uploadFileToCloud } from '../services/storageService';
import { generateSafetyReport } from '../services/geminiService';

interface ReportCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Omit<Report, 'id' | 'org_id' | 'reporter_id'>> | null;
}

const REPORT_TYPES: { type: ReportType; icon: string; description: string; color: string }[] = [
    { type: 'Incident', icon: '❗', description: 'Unplanned event causing harm/damage.', color: 'bg-red-100 border-red-300 text-red-800' },
    { type: 'Accident', icon: '🚑', description: 'Event resulting in injury or ill health.', color: 'bg-red-200 border-red-400 text-red-900' },
    { type: 'Near Miss', icon: '⚠️', description: 'Unplanned event, no injury/damage but could have.', color: 'bg-amber-100 border-amber-300 text-amber-800' },
    { type: 'Unsafe Act', icon: '🚫', description: 'Human action creating risk.', color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { type: 'Unsafe Condition', icon: '🏚️', description: 'Hazardous workplace situation.', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    { type: 'First Aid Case (FAC)', icon: '🩹', description: 'Minor injury treated onsite.', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { type: 'Medical Treatment Case (MTC)', icon: '🏥', description: 'Injury requiring professional care.', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
    { type: 'Lost Time Injury (LTI)', icon: '🛌', description: 'Injury causing missed workdays.', color: 'bg-red-100 border-red-300 text-red-800' },
    { type: 'Restricted Work Case (RWC)', icon: '🤕', description: 'Injury limiting work duties.', color: 'bg-purple-100 border-purple-300 text-purple-800' },
    { type: 'Property / Asset Damage', icon: '💥', description: 'Damage to tools, equipment, etc.', color: 'bg-gray-200 border-gray-400 text-gray-800' },
    { type: 'Environmental Incident', icon: '🛢️', description: 'Spill, leak, emission.', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { type: 'Fire Event', icon: '🔥', description: 'Flame or smoke related.', color: 'bg-rose-100 border-rose-300 text-rose-800' },
    { type: 'Leadership Event', icon: '🤝', description: 'Site visit, drill, or meeting.', color: 'bg-teal-100 border-teal-300 text-teal-800' },
    { type: 'Positive Observation', icon: '🌟', description: 'Good safety practice observed.', color: 'bg-green-100 border-green-300 text-green-800' },
];

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const GpsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 00-2.456 2.456z" /></svg>;

export const ReportCreationModal: React.FC<ReportCreationModalProps> = ({ isOpen, onClose, initialData }) => {
  const { projects, handleCreateReport } = useDataContext();
  const { activeUser, usersList, activeOrg } = useAppContext();
  
  const defaultDetails = useMemo(() => ({
    injury: { person_name: '', designation: '', nature_of_injury: 'Other', body_part_affected: '', treatment_given: '', days_lost: 0, medical_report_urls: [] } as AccidentDetails,
    incident: { property_damage_details: '', environmental_impact: null } as IncidentDetails,
    nearMiss: { potential_consequence: '' } as NearMissDetails,
    unsafeAct: { act_category: 'PPE Non-Compliance', coaching_given: false, coaching_notes: '' } as UnsafeActDetails,
    unsafeCondition: { condition_category: 'Housekeeping', temporary_control_applied: '' } as UnsafeConditionDetails,
    leadership: { event_type_code: 'TBD', leader_name: activeUser?.name || '', attendees_count: 0, key_observations: '' } as LeadershipEventDetails,
  }), [activeUser?.name]);

  const getInitialState = () => {
    const defaultState = {
        project_id: projects[0]?.id || '',
        type: 'Unsafe Condition' as ReportType,
        occurred_at: new Date().toISOString().slice(0, 16),
        location: { text: '', specific_area: '', geo: undefined },
        description: '',
        evidence_urls: [] as string[],
        risk_pre_control: { severity: 1 as Severity, likelihood: 1 as Likelihood },
        work_related: true,
        impacted_party: [] as ImpactedParty[],
        conditions: '',
        immediate_actions: '',
        further_corrective_action_required: false,
        details: defaultDetails.unsafeCondition,
        distribution: {
            user_ids: [],
            additional_recipients: [],
            send_alert_on_submit: true,
            notify_on_update: true,
        } as ReportDistribution,
        identification: { was_fire: false, was_injury: false, was_environment: false },
        classification_codes: [] as string[],
        ai_evidence_summary: '',
        ai_suggested_evidence: [] as string[],
    };
    if (initialData) {
      return { ...defaultState, ...initialData };
    }
    return defaultState;
  };

  const [formData, setFormData] = useState(getInitialState);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (!formData.project_id && projects.length > 0) {
        setFormData(prev => ({ ...prev, project_id: projects[0].id }));
    }
  }, [projects, formData.project_id]);

  const handleTypeSelect = (newType: ReportType) => {
      let newDetails = defaultDetails.unsafeCondition;
      if (['First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)', 'Restricted Work Case (RWC)', 'Accident', 'Incident'].includes(newType)) {
          newDetails = defaultDetails.injury;
      } else if (['Property / Asset Damage', 'Fire Event', 'Environmental Incident'].includes(newType)) {
          newDetails = defaultDetails.incident;
      } else if (newType === 'Near Miss') {
          newDetails = defaultDetails.nearMiss;
      } else if (newType === 'Unsafe Act') {
          newDetails = defaultDetails.unsafeAct;
      } else if (['Leadership Event', 'Positive Observation'].includes(newType)) {
          newDetails = defaultDetails.leadership;
      }
      setFormData(prev => ({ ...prev, type: newType, details: newDetails }));
  };

  const handleChange = (field: keyof Omit<typeof formData, 'details' | 'risk_pre_control' | 'location' | 'distribution' | 'identification' | 'classification_codes' | 'ai_suggested_evidence'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleDetailsChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, details: { ...(prev.details as any), [field]: value } }));
  };

  const handleLocationChange = (field: 'text' | 'specific_area', value: string) => {
     setFormData(prev => ({ ...prev, location: { ...prev.location, [field]: value }}));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleGetGps = () => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setFormData(prev => ({
                ...prev,
                location: {
                    ...prev.location,
                    text: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                    geo: { lat: latitude, lng: longitude }
                }
            }));
        },
        (error) => {
            console.error("Error getting location", error);
            alert("Could not retrieve GPS location. Please enter it manually.");
        }
    );
  };

  const handleQuickAiReport = async () => {
      if(!aiPrompt.trim()) return;
      setIsAiLoading(true);
      setError('');
      try {
          const fullPrompt = `Type: ${formData.type}. Details: ${aiPrompt}`;
          const aiData = await generateSafetyReport(fullPrompt);
          if (!aiData) throw new Error("No data received from AI");

          const newFormData: any = {
              ...formData,
              description: aiData.description, 
              conditions: aiData.rootCause ? `Root Cause: ${aiData.rootCause}` : formData.conditions,
              immediate_actions: aiData.recommendation || formData.immediate_actions,
              risk_pre_control: {
                   severity: aiData.riskLevel === 'High' ? 3 : aiData.riskLevel === 'Medium' ? 2 : 1,
                   likelihood: aiData.riskLevel === 'High' ? 3 : aiData.riskLevel === 'Medium' ? 2 : 1
              },
              ai_evidence_summary: `AI Analysis: Risk detected as ${aiData.riskLevel}`,
              ai_suggested_evidence: [] 
          };
          setFormData(newFormData);
      } catch (e) {
          console.error(e);
          setError("AI analysis failed. Check your connection or API Key.");
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleSubmit = async () => {
    if (!formData.project_id) {
        setError("A project must be selected.");
        return;
    }
    if (!formData.description.trim() && !isLeadership) {
        setError("The event description cannot be empty.");
        return;
    }
    
    setError('');
    setIsSubmitting(true);
    setUploadProgress('Uploading evidence...');

    try {
      // 1. Upload files to Firebase Storage
      let realUrls: string[] = [];
      if (evidenceFiles.length > 0) {
          const uploadPromises = evidenceFiles.map(file => uploadFileToCloud(file, 'reports'));
          realUrls = await Promise.all(uploadPromises);
      }

      // 2. Save Report to Firestore
      setUploadProgress('Saving report...');
      await handleCreateReport({ ...formData, evidence_urls: realUrls });
      
      onClose();
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(`Failed to submit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const isInjuryType = ['First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)', 'Restricted Work Case (RWC)', 'Accident', 'Incident'].includes(formData.type);
  const isLeadership = ['Leadership Event', 'Positive Observation'].includes(formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">New HSE Report</h2>
            <button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-500" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
            {/* Report Type Selection */}
            <section>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">What do you want to report?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {REPORT_TYPES.map((rt) => (
                        <button
                            key={rt.type}
                            onClick={() => handleTypeSelect(rt.type)}
                            className={`p-2 rounded-lg border-2 text-left transition-all flex flex-col h-full ${
                                formData.type === rt.type 
                                ? `${rt.color} border-transparent shadow-md ring-2 ring-offset-1 ring-blue-400` 
                                : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            <span className="text-xl mb-1 block text-center">{rt.icon}</span>
                            <span className="font-bold text-[10px] leading-tight block text-center">{rt.type}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* AI Helper */}
            <section className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-primary-200 dark:border-primary-800">
                <div className="flex items-start gap-4">
                    <div className="bg-white dark:bg-black p-2 rounded-full shadow-sm text-primary-600"><SparklesIcon className="w-6 h-6" /></div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-primary-900 dark:text-primary-100 mb-1">AI Form Assistant</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={aiPrompt} 
                                onChange={(e) => setAiPrompt(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickAiReport()}
                                placeholder={`Describe the ${formData.type.toLowerCase()}...`} 
                                className="flex-1 p-2 text-sm border border-primary-300 dark:border-primary-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-black/30"
                            />
                            <Button onClick={handleQuickAiReport} disabled={isAiLoading || !aiPrompt.trim()}>
                                {isAiLoading ? 'Analyzing...' : 'Auto-Fill'}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Form */}
            {!isLeadership && (
                <>
                    <section>
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Event Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Project">
                                <select value={formData.project_id} onChange={e => handleChange('project_id', e.target.value)} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md">
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Event Date & Time">
                                <input type="datetime-local" value={formData.occurred_at} onChange={e => handleChange('occurred_at', e.target.value)} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md" />
                            </FormField>
                            <FormField label="Location" fullWidth>
                                <div className="flex items-center space-x-2">
                                    <input type="text" value={formData.location.text} onChange={e => handleLocationChange('text', e.target.value)} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md" placeholder="e.g. Loading Dock" />
                                    <Button variant="ghost" onClick={handleGetGps} leftIcon={<GpsIcon />}>GPS</Button>
                                </div>
                            </FormField>
                        </div>
                        <div className="mt-4 space-y-4">
                             <FormField label="Description" fullWidth><textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={3} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md" placeholder="Describe what happened..." /></FormField>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Immediate Actions"><textarea value={formData.immediate_actions} onChange={e => handleChange('immediate_actions', e.target.value)} rows={2} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md" /></FormField>
                                <FormField label="Conditions"><textarea value={formData.conditions} onChange={e => handleChange('conditions', e.target.value)} rows={2} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md" /></FormField>
                             </div>
                        </div>
                    </section>

                    {isInjuryType && (
                        <section className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
                            <h3 className="text-md font-bold mb-3 text-red-800 dark:text-red-300">Injury Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Injured Person Name"><input type="text" value={(formData.details as AccidentDetails).person_name} onChange={e => handleDetailsChange('person_name', e.target.value)} className="w-full p-2 border rounded-md" /></FormField>
                                <FormField label="Nature of Injury">
                                    <select value={(formData.details as AccidentDetails).nature_of_injury} onChange={e => handleDetailsChange('nature_of_injury', e.target.value)} className="w-full p-2 border rounded-md">
                                        <option>Laceration</option><option>Burn</option><option>Fracture</option><option>Sprain</option><option>Other</option>
                                    </select>
                                </FormField>
                            </div>
                        </section>
                    )}

                    <section className="border-t dark:border-dark-border pt-4">
                        <h3 className="text-lg font-semibold mb-3">Risk Assessment</h3>
                        <RiskMatrixInput value={formData.risk_pre_control} onChange={(val) => setFormData(p => ({...p, risk_pre_control: val}))} />
                    </section>
                </>
            )}

            {/* Evidence Upload */}
            <section className="border-t dark:border-dark-border pt-6">
                 <h3 className="text-lg font-semibold mb-3">Evidence</h3>
                 <div className="grid grid-cols-1 gap-4">
                    <FormField label="Photo/Video Evidence">
                        <div>
                            <input type="file" multiple onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
                            {evidenceFiles.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {evidenceFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm bg-gray-100 dark:bg-dark-background p-2 rounded-md border dark:border-dark-border">
                                            <span className="truncate pr-4">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                            <button onClick={() => handleRemoveFile(index)} className="font-bold text-red-500 hover:text-red-700">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </FormField>
                 </div>
            </section>
            
            {error && <p className="text-sm text-red-500 mt-4 text-center font-semibold">{error}</p>}
        </div>
        <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? uploadProgress || 'Submitting...' : 'Submit Report'}
            </Button>
        </div>
      </div>
    </div>
  );
};