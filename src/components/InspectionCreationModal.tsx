import React, { useEffect, useMemo, useState } from 'react';
import type { ChecklistTemplate, Inspection, Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
  X, Check, AlertTriangle, Upload, 
  ChevronRight, Building, Calendar, Shield, Users
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

const stdRefs: StdRef[] = ['ISO 45001', 'OSHA', 'ISO 14001', 'ILO', 'NFPA', 'NEOM', 'Local Regs'];

// Helper for tabs
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            active ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
        {icon}
        {label}
    </button>
);

// Card Section Wrapper
const CardSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden mb-6 ${className}`}>
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-300 dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">{title}</h3>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {children}
        </div>
    </div>
);

export const InspectionCreationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inspection: Omit<Inspection, 'id' | 'org_id' | 'created_by_id' | 'audit_trail'>) => void;
  projects?: Project[];
  users?: User[];
  checklistTemplates?: ChecklistTemplate[];
}> = ({ isOpen, onClose, onSubmit, projects = [], users = [], checklistTemplates = [] }) => {
  const { activeOrg } = useAppContext();
  const [activeTab, setActiveTab] = useState<'identification' | 'schedule' | 'properties' | 'team'>('identification');

  // Base form state
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
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoLocal = now.toISOString().slice(0, 16);

    setTitle('');
    setType('Safety');
    setProjectId((projects && projects.length > 0) ? projects[0].id : '');
    setPersonResponsibleId('');
    setChecklistTemplateId((checklistTemplates && checklistTemplates.length > 0) ? checklistTemplates[0].id : '');
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
  }, [isOpen, projects, checklistTemplates]);

  const selectedProject = useMemo(() => (projects || []).find(p => p.id === projectId), [projects, projectId]);

  const filteredTemplates = useMemo(() => {
    const safeTemplates = checklistTemplates || [];
    const byType = safeTemplates.filter(tpl => (tpl.category || '').toLowerCase().includes(type.toLowerCase()));
    return byType.length > 0 ? byType : safeTemplates;
  }, [checklistTemplates, type]);

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
    const projName = selectedProject?.name ? ` - ${selectedProject.name}` : '';
    const datePart = scheduleAt ? ` - ${new Date(scheduleAt).toLocaleDateString()}` : '';
    return `${type} Inspection${projName}${datePart}`;
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

  const handleJumpToFix = () => {
    if (readiness.criticalMissing.length > 0) {
        setActiveTab('schedule');
    } else if (!projectId) {
        setActiveTab('identification');
    }
  };

  const getTemplateTitle = (tpl: ChecklistTemplate): string => {
    if (!tpl) return '';
    if (typeof tpl.title === 'string') return tpl.title;
    // @ts-ignore
    return tpl.title['en'] || Object.values(tpl.title)[0] || 'Untitled';
  };

  const handleCreate = () => {
    if (!canCreate) return;

    const finalTitle = title.trim() || autoTitle;
    const fakeUrls = evidenceFiles.map(() => `https://source.unsplash.com/random/200x200?sig=${Math.random()}`);

    const meta = [
      `Scope: ${locationArea || 'N/A'}`,
      `Contractor: ${contractorName || 'N/A'}`,
      `Ref: ${selectedStandards.join(', ')}`,
      `Brief: ${preInspectionBriefing || 'N/A'}`,
      `PPE: ${ppeRequirements || 'N/A'}`,
      `Readiness: ${readiness.score}%`,
      `Evidence: ${evidenceFiles.length} files`,
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
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
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

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
            <TabButton active={activeTab === 'identification'} onClick={() => setActiveTab('identification')} icon={<Building className="w-4 h-4"/>} label="Identification" />
            <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar className="w-4 h-4"/>} label="Readiness" />
            <TabButton active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} icon={<Shield className="w-4 h-4"/>} label="Details" />
            <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<Users className="w-4 h-4"/>} label="Team" />
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
          
          {/* TAB 1: IDENTIFICATION */}
          {activeTab === 'identification' && (
            <div className="space-y-6">
                <CardSection title="Core Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Inspection Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={autoTitle}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as Inspection['type'])}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            >
                                <option value="Safety">Safety</option>
                                <option value="Quality">Quality</option>
                                <option value="Environmental">Environmental</option>
                                <option value="Fire">Fire</option>
                                <option value="Equipment">Equipment</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Project</label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2.5 bg-white text-gray-900 dark:bg-gray-800 dark:text-white ${!projectId ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-300 dark:border-gray-700'}`}
                            >
                                <option value="">Select project...</option>
                                {(projects || []).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardSection>
            </div>
          )}

          {/* TAB 2: SCHEDULE & READINESS */}
          {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-blue-500" />
                            Pre-Inspection Readiness Check
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSelectAllCompliance} 
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 hover:underline"
                            >
                                <Check className="w-4 h-4" /> Mark All Ready
                            </button>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${readiness.score === 100 ? 'bg-green-100 text-green-700' : 'bg-white text-blue-700 shadow-sm border border-blue-100'}`}>
                                {readiness.score}% Ready
                            </span>
                        </div>
                    </div>

                    {/* Checkbox Grid - MOVED UP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {complianceLabels.map(item => (
                        <label key={item.key} className={`flex items-start gap-3 text-sm cursor-pointer p-3 rounded-lg border transition-all ${hseCompliance[item.key] ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                          <input
                            type="checkbox"
                            checked={hseCompliance[item.key]}
                            onChange={(e) => setHseCompliance(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                          />
                          <span className={`${item.critical ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {item.label} {item.critical && <span className="text-red-500 ml-1" title="Required">*</span>}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Warning Box - MOVED DOWN */}
                    {readiness.criticalMissing.length > 0 && (
                        <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                            <p className="font-bold mb-1">Action Required: {readiness.criticalMissing.length} Critical Items Missing</p>
                            <ul className="list-disc ml-5 space-y-0.5 text-xs">
                                {readiness.criticalMissing.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
                                {readiness.criticalMissing.length > 3 && <li>...and {readiness.criticalMissing.length - 3} more</li>}
                            </ul>
                        </div>
                    )}
                </div>

                <CardSection title="Timing">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Schedule Date</label>
                            <input
                                type="datetime-local"
                                value={scheduleAt}
                                onChange={(e) => setScheduleAt(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </CardSection>
            </div>
          )}

          {/* TAB 3: PROPERTIES */}
          {activeTab === 'properties' && (
              <div className="space-y-6">
                <CardSection title="Checklist & Standards">
                     <div className="mb-4">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Checklist Template</label>
                        <select
                            value={checklistTemplateId}
                            onChange={(e) => setChecklistTemplateId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Select checklist template</option>
                            {filteredTemplates.map(tpl => (
                            <option key={tpl.id} value={tpl.id}>
                                {tpl.category} - {getTemplateTitle(tpl)}
                            </option>
                            ))}
                        </select>
                    </div>
                </CardSection>
                
                 {/* Evidence Upload moved here for better flow */}
                <CardSection title="Pre-Inspection Media / Evidence">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {evidenceFiles.map((file, i) => (
                                <div key={i} className="relative group bg-gray-100 dark:bg-gray-800 p-2 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">IMG</div>
                                    <span className="text-xs truncate flex-1 text-gray-700 dark:text-gray-300">{file.name}</span>
                                    <button onClick={() => handleRemoveFile(i)} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardSection>
              </div>
          )}

          {/* TAB 4: TEAM */}
          {activeTab === 'team' && (
              <div className="space-y-6">
                <CardSection title="Inspection Team">
                    <div className="mb-6">
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Lead Inspector</label>
                        <select
                            value={personResponsibleId}
                            onChange={(e) => setPersonResponsibleId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Select person</option>
                            {(users || []).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 block">Additional Members</label>
                        <div className="flex flex-wrap gap-2">
                            {(users || []).slice(0, 10).map(u => (
                                <button
                                key={u.id}
                                type="button"
                                onClick={() => setTeamMemberIds(prev => toggleArray(prev, u.id))}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                    teamMemberIds.includes(u.id)
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                }`}
                                >
                                {u.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardSection>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 shrink-0">
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
                <button 
                    onClick={handleJumpToFix}
                    className="text-xs font-bold text-red-500 mr-2 text-right hover:underline"
                >
                    {validationStatus}
                </button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
                onClick={handleCreate} 
                disabled={!canCreate} 
                className={!canCreate ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'}
            >
              Create Inspection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

2. Fix `src/components/Inspections.tsx`
Add the missing `onConvertToReport` handler prop.

```tsx
import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionStatus, InspectionFinding } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { InspectionCreationModal } from './InspectionCreationModal';
import { InspectionConductModal } from './InspectionConductModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';

// ICONS
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504 1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;

const InspectionCard: React.FC<{
    inspection: Inspection;
    onConduct: (inspection: Inspection) => void;
}> = ({ inspection, onConduct }) => {
    const { usersList } = useAppContext();
    const { projects } = useDataContext();
    const responsible = usersList.find(u => u.id === inspection.person_responsible_id)?.name || 'Unknown';
    const project = projects.find(p => p.id === inspection.project_id)?.name || 'Unknown';
    
    const getStatusColor = (status: Inspection['status']): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
        switch (status) {
            case 'Closed':
            case 'Approved': return 'green';
            case 'In Progress': return 'blue';
            case 'Scheduled': return 'blue';
            case 'Pending Review': return 'yellow';
            case 'Draft': return 'gray';
            case 'Overdue': return 'red';
            default: return 'gray';
        }
    };
    
    const findingsCount = inspection.findings?.length || 0;

    return (
        <Card className="hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <ClipboardIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-md text-text-primary pr-2">{inspection.title}</h3>
                        <p className="text-xs text-text-secondary">{inspection.inspection_id || 'ID Pending'}</p>
                    </div>
                </div>
                <Badge color={getStatusColor(inspection.status)}>{inspection.status}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-t border-b border-gray-100 dark:border-gray-800">
                 <div>
                    <span className="text-xs text-gray-500 block">Project</span>
                    <span className="text-sm font-medium">{project}</span>
                 </div>
                 <div>
                    <span className="text-xs text-gray-500 block">Assigned To</span>
                    <span className="text-sm font-medium">{responsible}</span>
                 </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="text-xs font-semibold text-red-500">
                    {findingsCount > 0 ? `${findingsCount} Findings` : 'No Findings'}
                </div>
                <Button size="sm" onClick={() => onConduct(inspection)}>
                    {inspection.status === 'Draft' || inspection.status === 'Scheduled' ? 'Start' : 'Continue'}
                </Button>
            </div>
        </Card>
    );
};

export const Inspections: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { inspectionList, setInspectionList, projects, handleUpdateInspection, checklistTemplates, handleCreateInspection } = useDataContext();
  
  // Destructure report modal controls
  const { 
    isInspectionCreationModalOpen, 
    setIsInspectionCreationModalOpen,
    setIsReportCreationModalOpen,
    setReportInitialData
  } = useModalContext();

  const [isConductModalOpen, setConductModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const handleStartConduct = (inspection: Inspection) => {
    let inspectionToConduct = inspection;
    // Auto-transition status when starting
    if (inspection.status === 'Draft' || inspection.status === 'Scheduled') {
        inspectionToConduct = { ...inspection, status: 'In Progress' };
        handleUpdateInspection(inspectionToConduct);
    }
    setSelectedInspection(inspectionToConduct);
    setConductModalOpen(true);
  };

  const handleUpdateAndCloseConduct = (inspection: Inspection, action?: 'submit' | 'save' | 'approve' | 'close') => {
    // Logic to handle status transitions based on action
    let newStatus = inspection.status;
    if (action === 'submit') newStatus = 'Pending Review';
    if (action === 'approve') newStatus = 'Approved';
    if (action === 'close') newStatus = 'Closed';

    const updated = { ...inspection, status: newStatus };
    handleUpdateInspection(updated);
    
    if (action !== 'save') {
        setConductModalOpen(false);
        setSelectedInspection(null);
    }
  };

  // Convert Finding to Report Logic
  const handleConvertToReport = (finding: InspectionFinding) => {
    setReportInitialData({
        description: finding.description,
        type: 'Unsafe Condition', // Default type
        risk_pre_control: { 
            severity: finding.risk_level === 'High' ? 3 : finding.risk_level === 'Medium' ? 2 : 1, 
            likelihood: 2 
        },
        evidence_urls: finding.evidence_urls
    });
    // Open report modal (optional: close inspection modal)
    setIsReportCreationModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Inspections</h1>
            <p className="text-text-secondary">Manage and conduct safety audits.</p>
        </div>
        {can('create', 'inspections') && (
            <Button onClick={() => setIsInspectionCreationModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspectionList.map((inspection) => (
            <InspectionCard 
                key={inspection.id}
                inspection={inspection}
                onConduct={handleStartConduct}
            />
        ))}
         {inspectionList.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                <p>No inspections scheduled. Create one to get started.</p>
            </div>
        )}
      </div>

      {isInspectionCreationModalOpen && (
        <InspectionCreationModal
            isOpen={isInspectionCreationModalOpen}
            onClose={() => setIsInspectionCreationModalOpen(false)}
            onSubmit={handleCreateInspection}
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}

      {isConductModalOpen && selectedInspection && (
        <InspectionConductModal
            isOpen={isConductModalOpen}
            onClose={() => setConductModalOpen(false)}
            inspection={selectedInspection}
            onUpdate={handleUpdateAndCloseConduct}
            onConvertToReport={handleConvertToReport} // <--- Added this prop
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}
    </div>
  );
};