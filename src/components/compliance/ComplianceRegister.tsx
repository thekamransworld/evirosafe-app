/**
 * FILE: src/components/compliance/ComplianceRegister.tsx
 *
 * Legal & Regulatory Compliance Register
 *
 * Features:
 *  - Pre-loaded with ISO 45001, ISO 14001, OSHA 1910/1926, NEBOSH requirements
 *  - Status tracking: Compliant / Partial / Non-Compliant / Not Applicable
 *  - Owner assignment, evidence links, review dates
 *  - Filter by standard, status, owner
 *  - CSV export
 *  - Compliance score gauge per standard
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  Filter, Download, Plus, Search, ChevronDown, ExternalLink,
  BookOpen, Shield, Globe, HardHat,
} from 'lucide-react';
import { useAppContext } from '../../contexts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ComplianceStatus = 'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Applicable';
type Standard = 'ISO 45001' | 'ISO 14001' | 'OSHA' | 'NEBOSH' | 'LOCAL';

interface ComplianceItem {
  id: string;
  standard: Standard;
  clause: string;
  title: string;
  description: string;
  category: string;
  status: ComplianceStatus;
  owner_id: string;
  evidence: string;
  review_date: string;
  last_reviewed: string;
  notes: string;
  action_required: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data — pre-loaded requirements
// ─────────────────────────────────────────────────────────────────────────────

const SEED_REQUIREMENTS: Omit<ComplianceItem, 'status' | 'owner_id' | 'evidence' | 'review_date' | 'last_reviewed' | 'notes' | 'action_required'>[] = [
  // ISO 45001
  { id: 'iso45-41', standard: 'ISO 45001', clause: '4.1', title: 'Understanding the organization and its context', description: 'Determine external and internal issues relevant to OHS purpose and objectives.', category: 'Context' },
  { id: 'iso45-42', standard: 'ISO 45001', clause: '4.2', title: 'Understanding needs of interested parties', description: 'Identify workers and other parties, their needs and expectations.', category: 'Context' },
  { id: 'iso45-43', standard: 'ISO 45001', clause: '4.3', title: 'Determining the scope of the OHS MS', description: 'Determine boundaries and applicability to establish the scope.', category: 'Context' },
  { id: 'iso45-51', standard: 'ISO 45001', clause: '5.1', title: 'Leadership and commitment', description: 'Top management shall demonstrate leadership and commitment to OHS MS.', category: 'Leadership' },
  { id: 'iso45-52', standard: 'ISO 45001', clause: '5.2', title: 'OHS policy', description: 'Establish, implement and maintain OHS policy including commitments.', category: 'Leadership' },
  { id: 'iso45-53', standard: 'ISO 45001', clause: '5.3', title: 'Organizational roles, responsibilities, and authorities', description: 'Assign and communicate roles and responsibilities for OHS MS.', category: 'Leadership' },
  { id: 'iso45-54', standard: 'ISO 45001', clause: '5.4', title: 'Consultation and participation of workers', description: 'Establish processes for consultation and participation at all levels.', category: 'Leadership' },
  { id: 'iso45-61', standard: 'ISO 45001', clause: '6.1', title: 'Actions to address risks and opportunities', description: 'Determine risks and opportunities including hazards and legal requirements.', category: 'Planning' },
  { id: 'iso45-611', standard: 'ISO 45001', clause: '6.1.1', title: 'Hazard identification', description: 'Proactive and ongoing hazard identification process.', category: 'Planning' },
  { id: 'iso45-612', standard: 'ISO 45001', clause: '6.1.2', title: 'Assessment of OHS risks', description: 'Assess OHS risks from identified hazards; evaluate other risks.', category: 'Planning' },
  { id: 'iso45-613', standard: 'ISO 45001', clause: '6.1.3', title: 'Legal and other requirements', description: 'Determine and have access to up-to-date legal requirements.', category: 'Planning' },
  { id: 'iso45-62', standard: 'ISO 45001', clause: '6.2', title: 'OHS objectives and planning to achieve them', description: 'Establish OHS objectives consistent with policy, measurable and monitored.', category: 'Planning' },
  { id: 'iso45-71', standard: 'ISO 45001', clause: '7.1', title: 'Resources', description: 'Determine and provide resources needed for OHS MS.', category: 'Support' },
  { id: 'iso45-72', standard: 'ISO 45001', clause: '7.2', title: 'Competence', description: 'Determine competence needed; ensure workers are competent; take actions.', category: 'Support' },
  { id: 'iso45-73', standard: 'ISO 45001', clause: '7.3', title: 'Awareness', description: 'Ensure workers are aware of OHS policy, their contribution, and non-conformances.', category: 'Support' },
  { id: 'iso45-74', standard: 'ISO 45001', clause: '7.4', title: 'Communication', description: 'Establish processes for internal and external OHS communications.', category: 'Support' },
  { id: 'iso45-75', standard: 'ISO 45001', clause: '7.5', title: 'Documented information', description: 'Maintain and retain documented information as required.', category: 'Support' },
  { id: 'iso45-81', standard: 'ISO 45001', clause: '8.1', title: 'Operational planning and control', description: 'Plan, implement, and control processes; establish controls; adapt work.', category: 'Operation' },
  { id: 'iso45-82', standard: 'ISO 45001', clause: '8.2', title: 'Management of change', description: 'Establish processes for implementing and controlling planned changes.', category: 'Operation' },
  { id: 'iso45-83', standard: 'ISO 45001', clause: '8.3', title: 'Outsourcing', description: 'Ensure outsourced processes that affect OHS are controlled.', category: 'Operation' },
  { id: 'iso45-84', standard: 'ISO 45001', clause: '8.4', title: 'Procurement', description: 'Establish processes to control procurement of products and services.', category: 'Operation' },
  { id: 'iso45-85', standard: 'ISO 45001', clause: '8.5', title: 'Contractors', description: 'Coordinate procurement processes with contractors; communicate requirements.', category: 'Operation' },
  { id: 'iso45-86', standard: 'ISO 45001', clause: '8.6', title: 'Emergency preparedness and response', description: 'Establish processes for potential emergency situations.', category: 'Operation' },
  { id: 'iso45-91', standard: 'ISO 45001', clause: '9.1', title: 'Monitoring, measurement, analysis and evaluation', description: 'Establish what needs monitoring and measuring; methods; criteria.', category: 'Performance Evaluation' },
  { id: 'iso45-92', standard: 'ISO 45001', clause: '9.2', title: 'Internal audit', description: 'Conduct internal audits at planned intervals.', category: 'Performance Evaluation' },
  { id: 'iso45-93', standard: 'ISO 45001', clause: '9.3', title: 'Management review', description: 'Top management shall review OHS MS at planned intervals.', category: 'Performance Evaluation' },
  { id: 'iso45-101', standard: 'ISO 45001', clause: '10.1', title: 'Incident, nonconformity and corrective action', description: 'Establish process to report, investigate and take action on incidents.', category: 'Improvement' },
  { id: 'iso45-102', standard: 'ISO 45001', clause: '10.2', title: 'Continual improvement', description: 'Continually improve the suitability, adequacy and effectiveness of OHS MS.', category: 'Improvement' },

  // ISO 14001
  { id: 'iso14-41', standard: 'ISO 14001', clause: '4.1', title: 'Understanding the organization and its context', description: 'Determine environmental conditions affecting EMS objectives.', category: 'Context' },
  { id: 'iso14-61', standard: 'ISO 14001', clause: '6.1.2', title: 'Environmental aspects', description: 'Determine environmental aspects and their significant impacts.', category: 'Planning' },
  { id: 'iso14-613', standard: 'ISO 14001', clause: '6.1.3', title: 'Compliance obligations', description: 'Determine legal and other requirements applicable to environmental aspects.', category: 'Planning' },
  { id: 'iso14-62', standard: 'ISO 14001', clause: '6.2', title: 'Environmental objectives', description: 'Establish environmental objectives consistent with policy.', category: 'Planning' },
  { id: 'iso14-81', standard: 'ISO 14001', clause: '8.1', title: 'Operational control', description: 'Control operations to meet requirements and achieve objectives.', category: 'Operation' },
  { id: 'iso14-82', standard: 'ISO 14001', clause: '8.2', title: 'Emergency preparedness and response', description: 'Prepare for and respond to potential emergency situations.', category: 'Operation' },
  { id: 'iso14-91', standard: 'ISO 14001', clause: '9.1', title: 'Monitoring, measurement, analysis and evaluation', description: 'Monitor, measure, and evaluate environmental performance.', category: 'Performance Evaluation' },

  // OSHA
  { id: 'osha-1910-132', standard: 'OSHA', clause: '1910.132', title: 'Personal Protective Equipment — General', description: 'Provide and ensure use of appropriate PPE based on hazard assessment.', category: 'PPE' },
  { id: 'osha-1910-147', standard: 'OSHA', clause: '1910.147', title: 'Lockout / Tagout', description: 'Control of hazardous energy during servicing and maintenance.', category: 'Energy Control' },
  { id: 'osha-1910-146', standard: 'OSHA', clause: '1910.146', title: 'Permit-Required Confined Spaces', description: 'Requirements for practices and procedures for confined spaces.', category: 'Confined Space' },
  { id: 'osha-1926-502', standard: 'OSHA', clause: '1926.502', title: 'Fall Protection Systems', description: 'Specifications for fall protection systems used in construction.', category: 'Fall Protection' },
  { id: 'osha-1910-119', standard: 'OSHA', clause: '1910.119', title: 'Process Safety Management', description: 'Safety of highly hazardous chemicals in processes.', category: 'Process Safety' },
  { id: 'osha-1910-1200', standard: 'OSHA', clause: '1910.1200', title: 'Hazard Communication (HazCom)', description: 'Ensure hazards of chemicals are communicated via SDS and labels.', category: 'Chemicals' },
  { id: 'osha-300', standard: 'OSHA', clause: '300 Log', title: 'Recordkeeping — Work-Related Injuries and Illnesses', description: 'Record, classify and report work-related fatalities, injuries, and illnesses.', category: 'Recordkeeping' },

  // NEBOSH
  { id: 'nebosh-1', standard: 'NEBOSH', clause: 'Unit IG1', title: 'Management of Health and Safety', description: 'Effective HSE management systems, leadership, and culture.', category: 'Management' },
  { id: 'nebosh-2', standard: 'NEBOSH', clause: 'Unit IG2', title: 'Risk Assessment', description: 'Hazard identification and risk assessment in the workplace.', category: 'Risk' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComplianceStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  'Compliant':       { icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', label: 'Compliant' },
  'Partial':         { icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-950',   label: 'Partial' },
  'Non-Compliant':   { icon: XCircle,       color: 'text-red-700 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-950',        label: 'Non-Compliant' },
  'Not Applicable':  { icon: MinusCircle,   color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800',   label: 'N/A' },
};

const STANDARD_CONFIG: Record<Standard, { icon: React.ElementType; color: string }> = {
  'ISO 45001': { icon: Shield,  color: 'text-blue-600' },
  'ISO 14001': { icon: Globe,   color: 'text-emerald-600' },
  'OSHA':      { icon: HardHat, color: 'text-amber-600' },
  'NEBOSH':    { icon: BookOpen, color: 'text-purple-600' },
  'LOCAL':     { icon: Shield,  color: 'text-slate-600' },
};

function complianceScore(items: ComplianceItem[]): number {
  const applicable = items.filter((i) => i.status !== 'Not Applicable');
  if (!applicable.length) return 100;
  const score = applicable.reduce((acc, item) => {
    if (item.status === 'Compliant') return acc + 1;
    if (item.status === 'Partial')   return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((score / applicable.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score gauge
// ─────────────────────────────────────────────────────────────────────────────

const ScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = score >= 80 ? 'stroke-emerald-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';
  const textColor = score >= 80 ? 'text-emerald-700 dark:text-emerald-400' : score >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8"
          className="text-slate-100 dark:text-slate-700" />
        <circle cx="48" cy="48" r={r} fill="none" strokeWidth="8"
          className={color}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="48" y="48" textAnchor="middle" dominantBaseline="central"
          className={`text-lg font-bold ${textColor}`}
          style={{ font: 'bold 18px sans-serif', fill: 'currentColor' }}>
          {score}%
        </text>
      </svg>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">{label}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ComplianceRegister: React.FC = () => {
  const { activeUser, usersList } = useAppContext();

  // Initialise items with defaults
  const [items, setItems] = useState<ComplianceItem[]>(() =>
    SEED_REQUIREMENTS.map((req) => ({
      ...req,
      status: 'Partial' as ComplianceStatus,
      owner_id: '',
      evidence: '',
      review_date: '',
      last_reviewed: '',
      notes: '',
      action_required: '',
    })),
  );

  const [filterStandard, setFilterStandard]   = useState<Standard | 'All'>('All');
  const [filterStatus, setFilterStatus]       = useState<ComplianceStatus | 'All'>('All');
  const [filterCategory, setFilterCategory]   = useState('All');
  const [search, setSearch]                   = useState('');
  const [expandedId, setExpandedId]           = useState<string | null>(null);

  // Derived
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );

  const filtered = useMemo(() => items.filter((item) => {
    if (filterStandard !== 'All' && item.standard !== filterStandard) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    if (filterCategory !== 'All' && item.category !== filterCategory) return false;
    if (search && !`${item.clause} ${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, filterStandard, filterStatus, filterCategory, search]);

  const updateItem = (id: string, field: keyof ComplianceItem, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  // Scores per standard
  const scores = useMemo(() => {
    const standards: Standard[] = ['ISO 45001', 'ISO 14001', 'OSHA', 'NEBOSH'];
    return standards.map((std) => ({
      std,
      score: complianceScore(items.filter((i) => i.standard === std)),
    }));
  }, [items]);

  // CSV export
  const exportCsv = () => {
    const header = ['Standard', 'Clause', 'Title', 'Status', 'Owner', 'Review Date', 'Evidence', 'Notes', 'Action Required'];
    const rows = items.map((i) => [
      i.standard, i.clause, `"${i.title}"`, i.status,
      usersList.find((u: any) => u.id === i.owner_id)?.name ?? '',
      i.review_date, `"${i.evidence}"`, `"${i.notes}"`, `"${i.action_required}"`,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Legal & Compliance Register
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.filter((i) => i.status === 'Compliant').length} compliant ·{' '}
            {items.filter((i) => i.status === 'Non-Compliant').length} non-compliant ·{' '}
            {items.filter((i) => i.status === 'Partial').length} partial
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700
                     dark:text-emerald-300 rounded-xl text-sm font-semibold hover:bg-emerald-100"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Score gauges */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Compliance Score by Standard</h3>
        <div className="flex flex-wrap gap-6 justify-around">
          {scores.map(({ std, score }) => (
            <ScoreGauge key={std} score={score} label={std} />
          ))}
          <ScoreGauge score={complianceScore(items)} label="Overall" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clause, title, description..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200
                       dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300
                       outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(['All', 'ISO 45001', 'ISO 14001', 'OSHA', 'NEBOSH', 'LOCAL'] as const).map((std) => (
          <button key={std} onClick={() => setFilterStandard(std)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStandard === std
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {std}
          </button>
        ))}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                     rounded-lg text-xs text-slate-600 dark:text-slate-400 outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Compliant">Compliant</option>
          <option value="Partial">Partial</option>
          <option value="Non-Compliant">Non-Compliant</option>
          <option value="Not Applicable">N/A</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                     rounded-lg text-xs text-slate-600 dark:text-slate-400 outline-none"
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {items.length} requirements
      </p>

      {/* Items list */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const sc = STATUS_CONFIG[item.status];
          const StdIcon = STANDARD_CONFIG[item.standard]?.icon ?? Shield;
          const stdColor = STANDARD_CONFIG[item.standard]?.color ?? 'text-slate-500';
          const StatusIcon = sc.icon;
          const isOpen = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isOpen ? null : item.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <StdIcon className={`w-4 h-4 flex-shrink-0 ${stdColor}`} />
                <div className="flex-shrink-0 w-20 text-xs font-mono text-slate-500 dark:text-slate-400">
                  {item.clause}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.standard} · {item.category}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${sc.bg} ${sc.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Status */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                        Status
                      </label>
                      <select
                        value={item.status}
                        onChange={(e) => updateItem(item.id, 'status', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                      >
                        <option value="Compliant">Compliant</option>
                        <option value="Partial">Partial</option>
                        <option value="Non-Compliant">Non-Compliant</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>

                    {/* Owner */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                        Owner
                      </label>
                      <select
                        value={item.owner_id}
                        onChange={(e) => updateItem(item.id, 'owner_id', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                      >
                        <option value="">Unassigned</option>
                        {usersList.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Review date */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                        Next Review
                      </label>
                      <input
                        type="date"
                        value={item.review_date}
                        onChange={(e) => updateItem(item.id, 'review_date', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    {/* Evidence */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                        Evidence / Document Link
                      </label>
                      <input
                        value={item.evidence}
                        onChange={(e) => updateItem(item.id, 'evidence', e.target.value)}
                        placeholder="URL, document reference, or description of evidence..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    {/* Action required */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                        Action Required
                      </label>
                      <input
                        value={item.action_required}
                        onChange={(e) => updateItem(item.id, 'action_required', e.target.value)}
                        placeholder="What needs to be done to achieve compliance?"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                      Notes
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                      placeholder="Additional notes, context, or observations..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComplianceRegister;