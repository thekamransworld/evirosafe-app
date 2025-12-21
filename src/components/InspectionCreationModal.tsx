import React, { useEffect, useMemo, useState } from 'react';
import type { ChecklistTemplate, Inspection, Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { Badge } from './ui/Badge';
import { 
    Calendar, Clock, Shield, Users, Building, 
    FileText, Save, RefreshCw, Bell, AlertTriangle, 
    CheckCircle, X, Upload 
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
  const { language, t, activeOrg } = useAppContext();
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

  // Filter templates safely
  const filteredTemplates = useMemo(() => {
    const safeTemplates = checklistTemplates || [];
    const byType = safeTemplates.filter(tpl => (tpl.category || '').toLowerCase().includes(type.toLowerCase()));
    return byType.length > 0 ? byType : safeTemplates;
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

  const handleJumpToFix = () => {
    if (readiness.criticalMissing.length > 0) {
        setActiveTab('schedule'); // Jump to the tab where checkboxes are
    } else if (!projectId) {
        setActiveTab('identification');
    }
  };

  const getTemplateTitle = (tpl: ChecklistTemplate): string => {
    if (!tpl) return '';
    if (typeof tpl.title === 'string') return tpl.title;
    if (typeof tpl.title === 'object' && tpl.title !== null) {
      const record = tpl.title as Record<string, string>;
      return record['en'] || record[activeOrg?.primaryLanguage] || Object.values(record)[0] || 'Untitled Checklist';
    }
    return 'Untitled Checklist';
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-dark-border flex items-start justify-between shrink-0 bg-white dark:bg-dark-card sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Create Modern Inspection
            </h2>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
              Planning → Readiness → Evidence → Checklist
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <TabButton active={activeTab === 'identification'} onClick={() => setActiveTab('identification')} icon={<Building className="w-4 h-4"/>} label="Identification" />
            <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar className="w-4 h-4"/>} label="Schedule & Readiness" />
            <TabButton active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} icon={<Shield className="w-4 h-4"/>} label="Standards & PPE" />
            <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<Users className="w-4 h-4"/>} label="Team" />
        </div>

        <div className="p-6 space-y-6 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
          
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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

                        <div className="md:col-span-2">
                             <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Scope / Location / Area</label>
                            <input
                                value={locationArea}
                                onChange={(e) => setLocationArea(e.target.value)}
                                placeholder="e.g., Area-03, Workshop, Roof..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </CardSection>
            </div>
          )}

          {/* TAB 2: SCHEDULE & READINESS */}
          {activeTab === 'schedule' && (
              <div className="space-y-6">
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
                        <div>
                            <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 block">Frequency</label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as InspectionFrequency)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            >
                                <option value="One-off">One-off</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                            </select>
                        </div>
                    </div>
                </CardSection>

                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-xs">!</span>
                            Pre-Inspection Readiness
                        </h3>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${readiness.score === 100 ? 'bg-green-100 text-green-700' : 'bg-white text-blue-700 shadow-sm border border-blue-100'}`}>
                            {readiness.score}% Ready
                        </span>
                    </div>

                    {readiness.criticalMissing.length > 0 && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                            <p className="font-bold mb-1">Critical items missing:</p>
                            <ul className="list-disc ml-5 space-y-0.5">
                            {readiness.criticalMissing.map((x, i) => <li key={i}>{x}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {complianceLabels.map(item => (
                        <label key={item.key} className="flex items-start gap-3 text-sm cursor-pointer p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-blue-100">
                        <input
                            type="checkbox"
                            checked={hseCompliance[item.key]}
                            onChange={(e) => setHseCompliance(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="mt-0.5 rounded text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-300"
                        />
                        <span className={`${item.critical ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                            {item.label} {item.critical && <span className="text-red-500 ml-1" title="Required">*</span>}
                        </span>
                        </label>
                    ))}
                    </div>
                </div>
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

                     <div>
                        <label className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 block">Reference Standards</label>
                        <div className="flex flex-wrap gap-2">
                            {stdRefs.map(std => (
                            <button
                                key={std}
                                type="button"
                                onClick={() =>
                                setSelectedStandards(prev => prev.includes(std) ? prev.filter(x => x !== std) : [...prev, std])
                                }
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                selectedStandards.includes(std)
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {std}
                            </button>
                            ))}
                        </div>
                    </div>
                </CardSection>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CardSection title="Briefing & Hazards" className="h-full">
                         <textarea 
                            value={preInspectionBriefing}
                            onChange={(e) => setPreInspectionBriefing(e.target.value)}
                            className="w-full h-32 p-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none" 
                            placeholder="Key hazards discussed..."
                        />
                    </CardSection>
                    <CardSection title="PPE Requirements" className="h-full">
                         <textarea 
                            value={ppeRequirements}
                            onChange={(e) => setPpeRequirements(e.target.value)}
                            className="w-full h-32 p-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none" 
                            placeholder="Helmet, Boots, Vest..."
                         />
                    </CardSection>
                </div>
              </div>
          )}

          {/* TAB 4: TEAM & EVIDENCE */}
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

                {/* Evidence Upload */}
                <CardSection title="Pre-Inspection Media / Evidence">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*,video/*" 
                            onChange={handleFileChange} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600">
                                <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Click to upload photos or videos</span>
                            <span className="text-xs">Supports JPG, PNG, MP4</span>
                        </div>
                    </div>
                    
                    {evidenceFiles.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {evidenceFiles.map((file, i) => (
                                <div key={i} className="relative group bg-gray-100 dark:bg-gray-800 p-2 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">IMG</div>
                                    <span className="text-xs truncate flex-1 text-gray-700 dark:text-gray-300">{file.name}</span>
                                    <button 
                                        onClick={() => handleRemoveFile(i)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardSection>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 shrink-0">
          <div className="text-sm text-gray-500 flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${selectedProject ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
             <span>Linked to: <span className="font-bold text-gray-900 dark:text-white">{selectedProject ? selectedProject.name : 'No Project Selected'}</span></span>
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