import React, { useEffect, useMemo, useState } from 'react';
import type { ChecklistTemplate, Inspection, Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

// ================================
// GLOBAL / INTERNATIONAL INSPECTION SETUP
// ================================

type StdRef = 'ISO 45001' | 'OSHA' | 'ISO 14001' | 'ILO' | 'NFPA' | 'NEOM' | 'Local Regs';
type InspectionFrequency = 'One-off' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

type HseComplianceKey =
  | 'risk_assessment_done'
  | 'ptw_required'
  | 'ptw_ready'
  | 'rams_jsa_available'
  | 'toolbox_talk_done'
  | 'competency_verified'
  | 'ppe_ready'
  | 'equipment_cert_valid'
  | 'housekeeping_ready'
  | 'emergency_plan_confirmed'
  | 'first_aid_available'
  | 'fire_extinguishers_checked'
  | 'environmental_controls_ready'
  | 'msds_available'
  | 'stop_work_authority_confirmed';

const DEFAULT_COMPLIANCE: Record<HseComplianceKey, boolean> = {
  risk_assessment_done: false,
  ptw_required: false,
  ptw_ready: false,
  rams_jsa_available: false,
  toolbox_talk_done: false,
  competency_verified: false,
  ppe_ready: false,
  equipment_cert_valid: false,
  housekeeping_ready: false,
  emergency_plan_confirmed: false,
  first_aid_available: false,
  fire_extinguishers_checked: false,
  environmental_controls_ready: false,
  msds_available: false,
  stop_work_authority_confirmed: false,
};

const complianceLabels: Array<{ key: HseComplianceKey; label: string; critical?: boolean }> = [
  { key: 'risk_assessment_done', label: 'Risk Assessment / JSA completed', critical: true },
  { key: 'ptw_required', label: 'Permit to Work required?', critical: true },
  { key: 'ptw_ready', label: 'PTW authorized (if required)', critical: true },
  { key: 'rams_jsa_available', label: 'RAMS / Method Statement briefed', critical: true },
  { key: 'toolbox_talk_done', label: 'Toolbox Talk conducted', critical: false },
  { key: 'competency_verified', label: 'Worker competency verified', critical: false },
  { key: 'ppe_ready', label: 'PPE suitable and available', critical: true },
  { key: 'equipment_cert_valid', label: 'Equipment certificates valid', critical: false },
  { key: 'housekeeping_ready', label: 'Access routes clear', critical: false },
  { key: 'emergency_plan_confirmed', label: 'Emergency plan confirmed', critical: true },
  { key: 'first_aid_available', label: 'First aid available', critical: false },
  { key: 'fire_extinguishers_checked', label: 'Fire extinguishers checked', critical: false },
  { key: 'environmental_controls_ready', label: 'Spill kits/Waste bins ready', critical: false },
  { key: 'msds_available', label: 'MSDS available (if chemical)', critical: false },
  { key: 'stop_work_authority_confirmed', label: 'Stop Work Authority communicated', critical: true },
];

const stdRefs: StdRef[] = ['ISO 45001', 'OSHA', 'ISO 14001', 'ILO', 'NFPA', 'NEOM', 'Local Regs'];

// Icons
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const CheckAllIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export const InspectionCreationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inspection: Omit<Inspection, 'id' | 'org_id' | 'created_by_id' | 'audit_trail'>) => void;
  projects: Project[];
  users: User[];
  checklistTemplates: ChecklistTemplate[];
}> = ({ isOpen, onClose, onSubmit, projects, users, checklistTemplates }) => {
  const { language, t } = useAppContext();

  // Base form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Inspection['type']>('Safety');
  const [projectId, setProjectId] = useState('');
  const [personResponsibleId, setPersonResponsibleId] = useState('');
  const [checklistTemplateId, setChecklistTemplateId] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [observers, setObservers] = useState<string[]>([]);

  // Global enhancement fields
  const [locationArea, setLocationArea] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [frequency, setFrequency] = useState<InspectionFrequency>('One-off');
  const [selectedStandards, setSelectedStandards] = useState<StdRef[]>(['ISO 45001']);
  const [preInspectionBriefing, setPreInspectionBriefing] = useState('');
  const [ppeRequirements, setPpeRequirements] = useState('');
  const [hseCompliance, setHseCompliance] = useState<Record<HseComplianceKey, boolean>>(DEFAULT_COMPLIANCE);
  
  // Evidence State
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoLocal = now.toISOString().slice(0, 16);

    setTitle('');
    setType('Safety');
    
    // Auto-select first project if available
    setProjectId(projects.length > 0 ? projects[0].id : '');
    
    // Auto-select first template if available
    setChecklistTemplateId(checklistTemplates.length > 0 ? checklistTemplates[0].id : '');
    
    // Auto-select first user as responsible
    setPersonResponsibleId(users.length > 0 ? users[0].id : '');

    setScheduleAt(isoLocal);
    setTeamMemberIds([]);
    setObservers([]);

    setLocationArea('');
    setContractorName('');
    setFrequency('One-off');
    setSelectedStandards(['ISO 45001']);
    setPreInspectionBriefing('');
    setPpeRequirements('');
    setHseCompliance(DEFAULT_COMPLIANCE);
    setEvidenceFiles([]);
  }, [isOpen, projects, checklistTemplates, users]);

  const selectedProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  // Filter templates optionally by category/type
  const filteredTemplates = useMemo(() => {
    const byType = checklistTemplates.filter(tpl => (tpl.category || '').toLowerCase().includes(type.toLowerCase()));
    return byType.length > 0 ? byType : checklistTemplates;
  }, [checklistTemplates, type]);

  // Readiness score
  const readiness = useMemo(() => {
    const total = complianceLabels.length;
    const done = complianceLabels.filter(i => hseCompliance[i.key]).length;

    const criticalMissing = complianceLabels
      .filter(i => i.critical)
      .filter(i => !hseCompliance[i.key])
      .map(i => i.label);

    const score = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, score, criticalMissing };
  }, [hseCompliance]);

  const autoTitle = useMemo(() => {
    const proj = selectedProject?.name ? ` - ${selectedProject.name}` : '';
    const datePart = scheduleAt ? ` - ${new Date(scheduleAt).toLocaleDateString()}` : '';
    return `${type} Inspection${proj}${datePart}`;
  }, [type, selectedProject?.name, scheduleAt]);

  const validationStatus = useMemo(() => {
      if (!projectId) return 'Select a Project';
      if (!checklistTemplateId) return 'Select a Checklist';
      if (!scheduleAt) return 'Set a Date/Time';
      if (readiness.criticalMissing.length > 0) return `${readiness.criticalMissing.length} Critical Checks Missing`;
      return 'ready';
  }, [projectId, checklistTemplateId, scheduleAt, readiness.criticalMissing]);

  const canCreate = validationStatus === 'ready';

  const toggleArray = (arr: string[], v: string) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectAllCompliance = () => {
      const allChecked: any = {};
      complianceLabels.forEach(item => {
          allChecked[item.key] = true;
      });
      setHseCompliance(allChecked);
  };

  // Helper to safely render titles
  const getTemplateTitle = (tpl: ChecklistTemplate): string => {
    if (typeof tpl.title === 'string') return tpl.title;
    if (typeof tpl.title === 'object' && tpl.title !== null) {
      const record = tpl.title as Record<string, string>;
      return record['en'] || Object.values(record)[0] || 'Untitled Checklist';
    }
    return 'Untitled Checklist';
  };

  const handleCreate = () => {
    if (!canCreate) return;

    const finalTitle = title.trim() || autoTitle;

    // Fake uploading for demo (In real app, use storageService)
    const fakeUrls = evidenceFiles.map(() => `https://source.unsplash.com/random/200x200?sig=${Math.random()}`);

    const meta = [
      `Scope / Location: ${locationArea || 'N/A'}`,
      `Contractor: ${contractorName || 'N/A'}`,
      `Frequency: ${frequency}`,
      `Standards: ${selectedStandards.join(', ')}`,
      `Pre-brief: ${preInspectionBriefing || 'N/A'}`,
      `PPE: ${ppeRequirements || 'N/A'}`,
      `Readiness Score: ${readiness.score}%`,
      `Evidence Count: ${evidenceFiles.length}`,
    ].join('\n');

    const newInspection = {
      project_id: projectId,
      title: finalTitle,
      type,
      status: 'Ongoing' as const,
      person_responsible_id: personResponsibleId,
      checklist_template_id: checklistTemplateId,
      schedule_at: scheduleAt,
      team_member_ids: teamMemberIds,
      observers,
      findings: [],
      overall_comments: meta,
      // @ts-ignore
      hse_compliance: hseCompliance,
      evidence_urls: fakeUrls,
    };

    onSubmit(newInspection);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b dark:border-dark-border flex items-start justify-between shrink-0 bg-white dark:bg-dark-card sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Create Modern Inspection
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Planning → Readiness → Evidence → Checklist
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
             <XMarkIcon />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          
          {/* Section 1: Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Inspection Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={autoTitle}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:bg-dark-background dark:border-dark-border dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Inspection['type'])}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 dark:bg-dark-background dark:border-dark-border dark:text-white"
              >
                <option value="Safety">Safety</option>
                <option value="Quality">Quality</option>
                <option value="Environmental">Environmental</option>
                <option value="Fire">Fire</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2.5 dark:bg-dark-background dark:text-white ${!projectId ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'dark:border-dark-border'}`}
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Global Readiness (Critical) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs">!</span>
                Pre-Inspection Readiness
              </h3>
              <div className="flex items-center gap-3">
                  <button onClick={handleSelectAllCompliance} className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1">
                      <CheckAllIcon /> Mark All Ready
                  </button>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${readiness.score === 100 ? 'bg-green-100 text-green-700' : 'bg-white text-blue-700 shadow-sm'}`}>
                    {readiness.score}% Ready
                  </span>
              </div>
            </div>

            {readiness.criticalMissing.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                <p className="font-bold">Critical items missing:</p>
                <ul className="list-disc ml-5 mt-1">
                  {readiness.criticalMissing.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {complianceLabels.map(item => (
                <label key={item.key} className="flex items-start gap-3 text-sm cursor-pointer p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={hseCompliance[item.key]}
                    onChange={(e) => setHseCompliance(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className={`${item.critical ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                    {item.label} {item.critical && <span className="text-red-500 ml-1" title="Required">*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Evidence Upload (NEW) */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Site Evidence / Media</h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative">
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                    <UploadIcon />
                    <span className="text-sm font-medium">Click to upload photos or videos</span>
                    <span className="text-xs">Supports JPG, PNG, MP4</span>
                </div>
            </div>
            
            {evidenceFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {evidenceFiles.map((file, i) => (
                        <div key={i} className="relative group bg-gray-100 dark:bg-white/10 p-2 rounded-lg flex items-center gap-2">
                             <div className="w-8 h-8 bg-gray-300 rounded flex-shrink-0"></div>
                             <span className="text-xs truncate flex-1">{file.name}</span>
                             <button 
                                onClick={() => handleRemoveFile(i)}
                                className="text-gray-400 hover:text-red-500"
                             >
                                 <XMarkIcon />
                             </button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Section 4: Details & Team */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Logistics</h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Checklist Template</label>
                  <select
                    value={checklistTemplateId}
                    onChange={(e) => setChecklistTemplateId(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-dark-background dark:border-dark-border dark:text-white"
                  >
                    <option value="">Select checklist template</option>
                    {filteredTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        {getTemplateTitle(tpl)}
                      </option>
                    ))}
                  </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Members</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {users.slice(0, 6).map(u => (
                            <button
                            key={u.id}
                            onClick={() => setTeamMemberIds(prev => toggleArray(prev, u.id))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                teamMemberIds.includes(u.id)
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-dark-background dark:border-dark-border dark:text-gray-400'
                            }`}
                            >
                            {u.name}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
          </div>

        </div>

        <div className="p-5 border-t dark:border-dark-border bg-gray-50 dark:bg-black/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-sm text-gray-500">
            {selectedProject ? (
              <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Linked to: <span className="font-bold text-gray-900 dark:text-white">{selectedProject.name}</span>
              </span>
            ) : (
               <span className="flex items-center gap-2 text-red-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Action Required: Select a Project
              </span>
            )}
          </div>

          <div className="flex gap-3 items-center">
            {!canCreate && (
                <span className="text-xs font-bold text-red-500 mr-2">
                    {validationStatus}
                </span>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canCreate}>
              Create Inspection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};