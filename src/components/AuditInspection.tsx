import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import {
  Plus, ClipboardList, CheckCircle, XCircle, MinusCircle,
  AlertTriangle, ChevronRight, X, Search, TrendingUp,
  Calendar, User, MapPin, Camera
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditType =
  | 'hse_inspection' | 'site_audit' | 'environmental_audit'
  | 'fire_inspection' | 'scaffolding_inspection' | 'lifting_inspection'
  | 'electrical_inspection' | 'ptw_audit' | 'compliance_audit';

export type ItemResponse = 'yes' | 'no' | 'na' | 'partial';

export interface AuditItem {
  id:             string;
  category:       string;
  question:       string;
  response:       ItemResponse | null;
  finding:        string;
  action_required: boolean;
  photo_url?:     string;
  score:          number;
  max_score:      number;
}

export interface Audit {
  id:            string;
  audit_number:  string;
  type:          AuditType;
  title:         string;
  conducted_by:  string;
  conducted_at:  string;
  location:      string;
  status:        'in_progress' | 'completed' | 'cancelled';
  overall_score: number | null;
  items:         AuditItem[];
  observations:  string;
  recommendations: string;
}

// ─── Checklist templates ──────────────────────────────────────────────────────

const CHECKLIST_TEMPLATES: Record<AuditType, { category: string; questions: string[] }[]> = {
  hse_inspection: [
    { category: 'General Site Conditions', questions: [
      'Is the site clean and orderly — housekeeping maintained?',
      'Are walkways and access routes clear and free of obstructions?',
      'Is adequate lighting provided in all work areas?',
      'Are all waste disposal areas clearly marked and maintained?',
    ]},
    { category: 'PPE Compliance', questions: [
      'Are all workers wearing mandatory PPE (hard hat, hi-vis, safety boots)?',
      'Is task-specific PPE being used correctly?',
      'Is PPE in good condition — no damaged or expired items in use?',
    ]},
    { category: 'Working at Height', questions: [
      'Are all edges and openings adequately guarded or covered?',
      'Are harnesses being worn and anchored correctly?',
      'Are ladders secured and used at correct angles?',
      'Are MEWPs / scaffolds inspected and tagged?',
    ]},
    { category: 'Permit to Work', questions: [
      'Are active PTWs displayed at the work location?',
      'Are permit conditions being fully complied with?',
      'Are site isolations in place as required by the permit?',
    ]},
    { category: 'Emergency Preparedness', questions: [
      'Are emergency evacuation routes clearly posted and unobstructed?',
      'Are fire extinguishers in place, charged and inspected?',
      'Is first aid equipment accessible and fully stocked?',
    ]},
  ],
  site_audit: [
    { category: 'Management Systems', questions: [
      'Are HSE policies displayed and communicated to all workers?',
      'Are risk assessments available for all activities?',
      'Are toolbox talks being conducted and records maintained?',
      'Are incident reports completed within 24 hours?',
    ]},
    { category: 'Contractor Management', questions: [
      'Do all contractors have valid insurance and approvals?',
      'Are contractor inductions completed before site entry?',
      'Are contractor competency records current?',
    ]},
    { category: 'Documentation', questions: [
      'Are all legal registers up to date?',
      'Are training records current for all site personnel?',
      'Are inspection records completed and filed?',
    ]},
  ],
  fire_inspection: [
    { category: 'Fire Prevention', questions: [
      'Is hot work controlled by a valid permit?',
      'Are combustible materials stored away from heat sources?',
      'Are electrical panels clear and accessible?',
      'Is smoking restricted to designated areas only?',
    ]},
    { category: 'Fire Detection & Suppression', questions: [
      'Are fire detectors/alarms tested and functional?',
      'Are fire extinguishers correctly sited and inspected?',
      'Are sprinkler systems operational (if applicable)?',
      'Are fire hose reels accessible and serviceable?',
    ]},
    { category: 'Emergency Egress', questions: [
      'Are all fire exits clearly marked and unobstructed?',
      'Are emergency lighting systems functional?',
      'Are assembly points clearly identified?',
      'Is the fire evacuation plan posted?',
    ]},
  ],
  environmental_audit: [
    { category: 'Waste Management', questions: [
      'Are waste segregation bins provided and labelled?',
      'Is hazardous waste stored in appropriate containers?',
      'Are waste disposal records maintained?',
    ]},
    { category: 'Spill Prevention', questions: [
      'Are spill kits available in chemical storage areas?',
      'Are secondary containment bunds in place and intact?',
      'Are drainage systems protected from contamination?',
    ]},
    { category: 'Environmental Controls', questions: [
      'Is dust suppression being used during earthworks?',
      'Is noise monitored and controlled at boundaries?',
      'Are fuel and oil stored in bunded areas?',
    ]},
  ],
  scaffolding_inspection: [
    { category: 'Structural Integrity', questions: [
      'Are all standards, ledgers and transoms properly connected?',
      'Are base plates and sole boards in place on all standards?',
      'Are ties installed at correct intervals?',
      'Are braces properly fitted?',
    ]},
    { category: 'Access & Egress', questions: [
      'Are stairways or ladders properly secured and positioned?',
      'Are working platforms fully boarded with no gaps?',
      'Are toe boards and guard rails installed at all open edges?',
    ]},
    { category: 'Inspection & Tagging', questions: [
      'Does the scaffold have a current inspection tag?',
      'Was the scaffold inspected after adverse weather?',
      'Are loading limits clearly posted?',
    ]},
  ],
  lifting_inspection: [
    { category: 'Equipment Certification', questions: [
      'Do all lifting accessories have valid test certificates?',
      'Are SWL markings visible on all lifting gear?',
      'Is a current crane test certificate available on site?',
    ]},
    { category: 'Pre-lift Checks', questions: [
      'Has a lift plan been prepared and approved?',
      'Are exclusion zones established and enforced?',
      'Are all slingers and banks persons competent and certified?',
      'Are tag lines being used to control load movement?',
    ]},
  ],
  electrical_inspection: [
    { category: 'Isolation & Lockout', questions: [
      'Are all electrical isolations locked out and tagged?',
      'Are lockout/tagout procedures being followed?',
      'Is voltage tested before and after isolation?',
    ]},
    { category: 'Equipment Condition', questions: [
      'Are portable tools PAT tested and within test date?',
      'Are electrical cables protected from damage?',
      'Are distribution boards secured and weatherproof?',
    ]},
  ],
  ptw_audit: [
    { category: 'Permit Administration', questions: [
      'Are permits being issued for all high-risk activities?',
      'Are permit registers maintained and up to date?',
      'Are expired permits being properly closed?',
    ]},
    { category: 'Site Compliance', questions: [
      'Are permit conditions being adhered to on site?',
      'Are gas readings being performed as required?',
      'Are isolations verified before work commences?',
    ]},
  ],
  compliance_audit: [
    { category: 'Legal Compliance', questions: [
      'Are all statutory inspections completed and recorded?',
      'Are all required licenses and permits current?',
      'Are RIDDOR/regulatory reports submitted on time?',
    ]},
    { category: 'HSE Management System', questions: [
      'Is the HSE management system being implemented effectively?',
      'Are objectives and targets being measured and reviewed?',
      'Are management reviews conducted at planned intervals?',
    ]},
  ],
};

const AUDIT_TYPES: Record<AuditType, { label: string; color: any }> = {
  hse_inspection:        { label: 'HSE Inspection',         color: 'blue' },
  site_audit:            { label: 'Site Audit',             color: 'purple' },
  environmental_audit:   { label: 'Environmental Audit',    color: 'green' },
  fire_inspection:       { label: 'Fire Inspection',        color: 'red' },
  scaffolding_inspection:{ label: 'Scaffolding Inspection', color: 'amber' },
  lifting_inspection:    { label: 'Lifting Inspection',     color: 'yellow' },
  electrical_inspection: { label: 'Electrical Inspection',  color: 'yellow' },
  ptw_audit:             { label: 'PTW Audit',              color: 'indigo' },
  compliance_audit:      { label: 'Compliance Audit',       color: 'gray' },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const buildItems = (type: AuditType): AuditItem[] => {
  const template = CHECKLIST_TEMPLATES[type] || CHECKLIST_TEMPLATES.hse_inspection;
  let id = 0;
  return template.flatMap(section =>
    section.questions.map(q => ({
      id: `item-${++id}`,
      category:        section.category,
      question:        q,
      response:        null,
      finding:         '',
      action_required: false,
      score:           0,
      max_score:       1,
    }))
  );
};

const MOCK_AUDITS: Audit[] = [
  {
    id: 'aud-001', audit_number: 'AUD-2024-0001',
    type: 'hse_inspection', title: 'Weekly HSE Site Inspection — Tower A',
    conducted_by: 'Sarah Mitchell', conducted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Tower A — Levels 3–6', status: 'completed', overall_score: 76,
    observations: 'Generally good housekeeping on Level 3. Levels 4–5 require improvement.',
    recommendations: '1. Install additional waste bins on Level 5. 2. Enforce 100% harness compliance.',
    items: buildItems('hse_inspection').map((item, i) => ({
      ...item,
      response: i % 5 === 0 ? 'no' : i % 7 === 0 ? 'partial' : 'yes' as ItemResponse,
      score: i % 5 === 0 ? 0 : i % 7 === 0 ? 0.5 : 1,
      finding: i % 5 === 0 ? 'Non-compliance observed — corrective action required' : '',
      action_required: i % 5 === 0,
    })),
  },
  {
    id: 'aud-002', audit_number: 'AUD-2024-0002',
    type: 'fire_inspection', title: 'Monthly Fire Safety Inspection',
    conducted_by: 'Ahmed Al-Rashid', conducted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'All Site Areas', status: 'completed', overall_score: 88,
    observations: 'Fire extinguishers all current. One exit route partially obstructed.',
    recommendations: 'Clear exit route at north stairwell — immediate action.',
    items: buildItems('fire_inspection').map((item, i) => ({
      ...item,
      response: i === 3 ? 'no' : 'yes' as ItemResponse,
      score: i === 3 ? 0 : 1,
      finding: i === 3 ? 'Exit route obstructed by stored materials' : '',
      action_required: i === 3,
    })),
  },
  {
    id: 'aud-003', audit_number: 'AUD-2024-0003',
    type: 'scaffolding_inspection', title: 'Scaffolding Inspection — Tower B Facade',
    conducted_by: 'James Okafor', conducted_at: new Date().toISOString(),
    location: 'Tower B — West Facade', status: 'in_progress', overall_score: null,
    observations: '', recommendations: '',
    items: buildItems('scaffolding_inspection'),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateScore = (items: AuditItem[]): number => {
  const answered = items.filter(i => i.response && i.response !== 'na');
  if (answered.length === 0) return 0;
  const total   = answered.reduce((s, i) => s + i.max_score, 0);
  const achieved = answered.reduce((s, i) => s + i.score, 0);
  return total > 0 ? Math.round((achieved / total) * 100) : 0;
};

const scoreColor = (score: number) => {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const responseBg: Record<ItemResponse, string> = {
  yes:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300',
  no:      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300',
  partial: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300',
  na:      'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300',
};

// ─── Audit Conduct Modal ──────────────────────────────────────────────────────

const AuditConductModal: React.FC<{
  audit: Audit;
  onClose: () => void;
  onSave: (audit: Audit) => void;
}> = ({ audit, onClose, onSave }) => {
  const [local, setLocal] = useState<Audit>(JSON.parse(JSON.stringify(audit)));
  const grouped = useMemo(() => {
    const groups: Record<string, AuditItem[]> = {};
    local.items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [local.items]);

  const score = calculateScore(local.items);
  const findings = local.items.filter(i => i.action_required).length;
  const answered = local.items.filter(i => i.response !== null).length;

  const updateItem = (id: string, updates: Partial<AuditItem>) =>
    setLocal(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, ...updates } : i),
    }));

  const setResponse = (id: string, response: ItemResponse) => {
    const scoreMap: Record<ItemResponse, number> = { yes: 1, partial: 0.5, no: 0, na: 0 };
    updateItem(id, {
      response,
      score: scoreMap[response],
      action_required: response === 'no',
    });
  };

  const handleComplete = () => {
    const completed = { ...local, status: 'completed' as const, overall_score: score };
    onSave(completed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={AUDIT_TYPES[local.type].color}>{AUDIT_TYPES[local.type].label}</Badge>
              <Badge color={local.status === 'completed' ? 'green' : 'yellow'}>
                {local.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{local.title}</h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{local.conducted_by}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{local.location}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(local.conducted_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        {/* Score strip */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-dark-background border-b dark:border-dark-border flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <p className={`text-3xl font-black ${scoreColor(score)}`}>{score}%</p>
            <p className="text-xs text-gray-500">Overall Score</p>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="flex gap-6 text-center text-xs">
            <div><p className="font-bold text-gray-700 dark:text-white">{answered}/{local.items.length}</p><p className="text-gray-400">Answered</p></div>
            <div><p className="font-bold text-red-600">{findings}</p><p className="text-gray-400">Findings</p></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            const catScore = calculateScore(items);
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-white">{category}</h3>
                  <span className={`text-sm font-semibold ${scoreColor(catScore)}`}>{catScore}%</span>
                </div>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className={`p-4 rounded-xl border ${item.response === 'no' ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-dark-border bg-white dark:bg-dark-background'}`}>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">{item.question}</p>
                      <div className="flex gap-2 mb-3">
                        {(['yes', 'no', 'partial', 'na'] as ItemResponse[]).map(r => (
                          <button key={r}
                            onClick={() => setResponse(item.id, r)}
                            className={`flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${item.response === r ? responseBg[r] : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {r === 'na' ? 'N/A' : r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                      {(item.response === 'no' || item.response === 'partial') && (
                        <textarea
                          value={item.finding}
                          onChange={e => updateItem(item.id, { finding: e.target.value })}
                          placeholder="Describe the finding and required action..."
                          rows={2}
                          className="w-full p-2 border rounded-lg text-xs dark:bg-dark-card dark:border-dark-border dark:text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="space-y-4 border-t dark:border-dark-border pt-6">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Overall Observations</label>
              <textarea value={local.observations} onChange={e => setLocal(p => ({ ...p, observations: e.target.value }))} rows={3} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="General site observations..." />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Recommendations</label>
              <textarea value={local.recommendations} onChange={e => setLocal(p => ({ ...p, recommendations: e.target.value }))} rows={3} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="List recommended actions..." />
            </div>
          </div>
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-gray-400">{findings} finding{findings !== 1 ? 's' : ''} require corrective actions</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="outline" onClick={() => { onSave(local); onClose(); }}>Save Progress</Button>
            {local.status !== 'completed' && (
              <Button onClick={handleComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />Complete Audit
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── New Audit Modal ──────────────────────────────────────────────────────────

const NewAuditModal: React.FC<{ onClose: () => void; onSave: (a: Audit) => void }> = ({ onClose, onSave }) => {
  const { activeUser } = useAppContext();
  const [form, setForm] = useState({ type: 'hse_inspection' as AuditType, title: '', location: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const count = Math.floor(Math.random() * 9000) + 1000;

  const handleCreate = () => {
    if (!form.title || !form.location) { alert('Title and location required.'); return; }
    onSave({
      id:             `aud-${Date.now()}`,
      audit_number:   `AUD-${new Date().getFullYear()}-${count}`,
      type:           form.type,
      title:          form.title,
      conducted_by:   activeUser?.name || 'HSE Officer',
      conducted_at:   new Date().toISOString(),
      location:       form.location,
      status:         'in_progress',
      overall_score:  null,
      observations:   '',
      recommendations:'',
      items:          buildItems(form.type),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Audit / Inspection</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Audit Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
              {(Object.entries(AUDIT_TYPES) as [AuditType, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. Weekly HSE Inspection — Zone B" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Location *</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. Tower A — Levels 3–6" />
          </div>
          <p className="text-xs text-gray-400">
            Checklist will be auto-generated from the {AUDIT_TYPES[form.type].label} template ({(CHECKLIST_TEMPLATES[form.type] || []).reduce((s, c) => s + c.questions.length, 0)} questions).
          </p>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate}>Start Audit</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AuditInspection: React.FC = () => {
  const { can } = useAppContext();
  const [audits, setAudits]       = useState<Audit[]>(MOCK_AUDITS);
  const [selected, setSelected]   = useState<Audit | null>(null);
  const [showNew, setShowNew]     = useState(false);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<AuditType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const filtered = useMemo(() => audits.filter(a => {
    const sMatch = !search || (a.title || '').toLowerCase().includes(search.toLowerCase()) || (a.conducted_by || '').toLowerCase().includes(search.toLowerCase());
    const tMatch = typeFilter   === 'all' || a.type   === typeFilter;
    const stMatch = statusFilter === 'all' || a.status === statusFilter;
    return sMatch && tMatch && stMatch;
  }), [audits, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const completed = audits.filter(a => a.status === 'completed' && a.overall_score !== null);
    const avgScore  = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + (a.overall_score || 0), 0) / completed.length) : 0;
    const findings  = audits.reduce((s, a) => s + a.items.filter(i => i.action_required).length, 0);
    return {
      total:      audits.length,
      inProgress: audits.filter(a => a.status === 'in_progress').length,
      avgScore,
      findings,
    };
  }, [audits]);

  const handleSave = (updated: Audit) =>
    setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Audits & Inspections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Scored checklists with automatic CAR generation</p>
        </div>
        {can('create', 'reports') && (
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>New Audit</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Audits',   value: stats.total,      icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'In Progress',    value: stats.inProgress, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Average Score',  value: `${stats.avgScore}%`, icon: TrendingUp, color: stats.avgScore >= 85 ? 'text-green-600' : 'text-red-600', bg: 'bg-gray-50 dark:bg-gray-800/40' },
          { label: 'Open Findings',  value: stats.findings,   icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-4`}>
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audits..." className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'in_progress', 'completed'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map(audit => {
          const typeCfg   = AUDIT_TYPES[audit.type];
          const findings  = audit.items.filter(i => i.action_required).length;
          const answered  = audit.items.filter(i => i.response !== null).length;
          const progress  = audit.items.length > 0 ? Math.round((answered / audit.items.length) * 100) : 0;
          return (
            <div key={audit.id} onClick={() => setSelected(audit)}
              className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-4 cursor-pointer hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{audit.audit_number}</span>
                    <Badge color={typeCfg.color}>{typeCfg.label}</Badge>
                    <Badge color={audit.status === 'completed' ? 'green' : 'yellow'}>
                      {audit.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </Badge>
                    {findings > 0 && <Badge color="red">{findings} finding{findings !== 1 ? 's' : ''}</Badge>}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{audit.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{audit.conducted_by}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{audit.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(audit.conducted_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${audit.status === 'completed' ? (audit.overall_score || 0) >= 85 ? 'bg-green-500' : (audit.overall_score || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${audit.status === 'completed' ? (audit.overall_score || 0) : progress}%` }} />
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${audit.status === 'completed' ? scoreColor(audit.overall_score || 0) : 'text-blue-600'}`}>
                      {audit.status === 'completed' ? `${audit.overall_score}%` : `${progress}% done`}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-3" />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No audits found</p>
          </div>
        )}
      </div>

      {selected && <AuditConductModal audit={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
      {showNew && <NewAuditModal onClose={() => setShowNew(false)} onSave={a => setAudits(prev => [a, ...prev])} />}
    </div>
  );
};