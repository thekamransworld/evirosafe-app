import React, { useEffect, useMemo, useState } from 'react';
import type { ChecklistTemplate, Inspection, Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
  X, Check, AlertTriangle, Upload, 
  MapPin, Calendar, ClipboardCheck, ChevronRight 
} from 'lucide-react';

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

export const InspectionCreationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inspection: Omit<Inspection, 'id' | 'org_id' | 'created_by_id' | 'audit_trail'>) => void;
  projects: Project[];
  users: User[];
  checklistTemplates: ChecklistTemplate[];
}> = ({ isOpen, onClose, onSubmit, projects, users, checklistTemplates }) => {
  const { activeOrg } = useAppContext();

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
    // Adjust to local ISO string manually to keep timezone offset correct for inputs
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    setTitle('');
    setType('Safety');
    
    // Auto-select first project if available
    setProjectId(projects.length > 0 ? projects[0].id : '');
    
    // Auto-select first template if available
    setChecklistTemplateId(checklistTemplates.length > 0 ? checklistTemplates[0].id : '');
    
    // Auto-select first user as responsible
    setPersonResponsibleId(users.length > 0 ? users[0].id : '');

    setScheduleAt(localIso);
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

  const getTemplateTitle = (tpl: ChecklistTemplate): string => {
    if (typeof tpl.title === 'string') return tpl.title;
    // @ts-ignore
    return tpl.title['en'] || Object.values(tpl.title)[0] || 'Untitled';
  };

  const handleCreate = () => {
    if (!canCreate) return;

    const finalTitle = title.trim() || autoTitle;

    // Fake uploading for demo
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b dark:border-gray-800 flex items-start justify-between shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Create Modern Inspection
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Planning → Readiness → Evidence → Checklist
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors">
             <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          
          {/* Section 1: Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Inspection Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={autoTitle}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Inspection['type'])}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-gray-700 dark:text-white appearance-none"
                >
                  <option value="Safety">Safety</option>
                  <option value="Quality">Quality</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Fire">Fire</option>
                  <option value="Equipment">Equipment</option>
                </select>
                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-4 rotate-90 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project</label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2.5 bg-gray-50 dark:bg-slate-950 dark:text-white appearance-none ${!projectId ? 'border-red-400 ring-1 ring-red-400/50' : 'border-gray-300 dark:border-gray-700'}`}
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-4 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Global Readiness (Critical) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                Pre-Inspection Readiness
              </h3>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSelectAllCompliance} 
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                      <Check className="w-4 h-4" /> Mark All Ready
                  </button>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${readiness.score === 100 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-blue-700 border border-blue-200 shadow-sm'}`}>
                    {readiness.score}% Ready
                  </span>
              </div>
            </div>

            {readiness.criticalMissing.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                <p className="font-bold mb-1">Critical items missing:</p>
                <ul className="list-disc ml-5 space-y-0.5">
                  {readiness.criticalMissing.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}

            {/* This is the grid that was missing/hidden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {complianceLabels.map(item => (
                <label key={item.key} className="flex items-start gap-3 text-sm cursor-pointer p-2.5 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                  <input
                    type="checkbox"
                    checked={hseCompliance[item.key]}
                    onChange={(e) => setHseCompliance(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                  />
                  <span className={`${item.critical ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                    {item.label} {item.critical && <span className="text-red-500 ml-1 font-bold" title="Required">*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Evidence Upload */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-gray-500" /> Site Evidence / Media
            </h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group">
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:scale-105 transition-transform">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">Click to upload photos or videos</span>
                    <span className="text-xs text-gray-400">Supports JPG, PNG, MP4</span>
                </div>
            </div>
            
            {evidenceFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {evidenceFiles.map((file, i) => (
                        <div key={i} className="relative group bg-gray-100 dark:bg-slate-800 p-2 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                             <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-xs">
                                {file.name.split('.').pop()?.toUpperCase()}
                             </div>
                             <span className="text-xs truncate flex-1 text-gray-700 dark:text-gray-300">{file.name}</span>
                             <button 
                                onClick={() => handleRemoveFile(i)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500"
                             >
                                 <X className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Section 4: Details & Team */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-gray-800">
             <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Checklist Configuration</h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Template</label>
                  <div className="relative">
                    <select
                      value={checklistTemplateId}
                      onChange={(e) => setChecklistTemplateId(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-gray-700 dark:text-white appearance-none"
                    >
                      <option value="">Select checklist template</option>
                      {filteredTemplates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>
                          {getTemplateTitle(tpl)}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-4 rotate-90 pointer-events-none" />
                  </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Team Assignment</h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Inspectors</label>
                  <div className="flex flex-wrap gap-2">
                      {users.slice(0, 6).map(u => (
                          <button
                          key={u.id}
                          onClick={() => setTeamMemberIds(prev => toggleArray(prev, u.id))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              teamMemberIds.includes(u.id)
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400'
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

        {/* Footer */}
        <div className="p-5 border-t dark:border-gray-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0 backdrop-blur-sm">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            {selectedProject ? (
              <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-gray-600 dark:text-gray-300">Linked to: <span className="font-bold text-gray-900 dark:text-white">{selectedProject.name}</span></span>
              </>
            ) : (
               <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-500 font-medium">Select a Project</span>
              </>
            )}
          </div>

          <div className="flex gap-3 items-center">
            {!canCreate && (
                <span className="text-xs font-bold text-red-500 mr-2 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/30">
                    {validationStatus}
                </span>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canCreate} className={!canCreate ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-500/20'}>
              Create Inspection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};