/**
 * FILE: src/components/bbs/BbsObservations.tsx
 * PASTE AT: src/components/bbs/BbsObservations.tsx  (create bbs/ folder)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import BbsObservations from './components/bbs/BbsObservations';
 *   {activePage === 'bbs' && <BbsObservations />}
 *
 * SIDEBAR NAV:
 *   { id: 'bbs', label: 'Safety Observations', icon: Eye,
 *     roles: ['admin','hse_manager','supervisor','worker'] }
 *
 * Behavior-Based Safety (BBS) Observation Program
 * Features:
 *  - Log safe and unsafe acts / conditions
 *  - Observation categories (PPE, housekeeping, procedures, etc.)
 *  - Trend charts by category and observer
 *  - Recognition workflow for positive behaviours
 *  - Anonymous observation option
 *  - AI-powered feedback suggestions via Gemini
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, Eye, CheckCircle2, AlertTriangle, TrendingUp,
  User, Tag, Calendar, MessageSquare, ChevronDown,
  ChevronRight, RefreshCw, Download, ThumbsUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../../contexts';
import { useDataContext } from '../../contexts';
import { writeAuditLog } from '../../lib/auditLogger';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ObservationType = 'Safe Act' | 'Unsafe Act' | 'Safe Condition' | 'Unsafe Condition' | 'Near Miss';
type ObservationCategory =
  | 'PPE Usage' | 'Housekeeping' | 'Procedures & Permits' | 'Tool & Equipment Use'
  | 'Body Position & Ergonomics' | 'Communication' | 'Environmental' | 'Line of Fire'
  | 'Energy Isolation' | 'Working at Height' | 'Driving & Vehicles' | 'Other';

interface BbsObservation {
  id: string;
  org_id: string;
  observer_id: string;
  is_anonymous: boolean;
  observation_date: string;
  project_id: string;
  location: string;
  type: ObservationType;
  category: ObservationCategory;
  description: string;
  immediate_action: string;
  positive_recognition: string;
  follow_up_required: boolean;
  follow_up_action: string;
  follow_up_by: string;
  status: 'Open' | 'In Progress' | 'Closed';
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OBSERVATION_TYPES: ObservationType[] = [
  'Safe Act', 'Unsafe Act', 'Safe Condition', 'Unsafe Condition', 'Near Miss',
];

const CATEGORIES: ObservationCategory[] = [
  'PPE Usage', 'Housekeeping', 'Procedures & Permits', 'Tool & Equipment Use',
  'Body Position & Ergonomics', 'Communication', 'Environmental', 'Line of Fire',
  'Energy Isolation', 'Working at Height', 'Driving & Vehicles', 'Other',
];

const TYPE_CONFIG: Record<ObservationType, { color: string; bg: string; icon: React.ElementType }> = {
  'Safe Act':          { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: CheckCircle2 },
  'Unsafe Act':        { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950',        icon: AlertTriangle },
  'Safe Condition':    { color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-950',      icon: CheckCircle2 },
  'Unsafe Condition':  { color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-950',  icon: AlertTriangle },
  'Near Miss':         { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950',    icon: AlertTriangle },
};

const PIE_COLORS = ['#1D9E75','#ef4444','#3b82f6','#f97316','#f59e0b'];
const uid = () => `bbs_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Add Observation Form
// ─────────────────────────────────────────────────────────────────────────────

interface AddFormProps {
  onSave: (obs: BbsObservation) => void;
  onCancel: () => void;
  projects: any[];
  userId: string;
  orgId: string;
}

const AddObservationForm: React.FC<AddFormProps> = ({ onSave, onCancel, projects, userId, orgId }) => {
  const [form, setForm] = useState({
    type: 'Safe Act' as ObservationType,
    category: 'PPE Usage' as ObservationCategory,
    location: '',
    project_id: '',
    observation_date: new Date().toISOString().slice(0, 10),
    description: '',
    immediate_action: '',
    positive_recognition: '',
    follow_up_required: false,
    follow_up_action: '',
    follow_up_by: '',
    is_anonymous: false,
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const isSafe = form.type === 'Safe Act' || form.type === 'Safe Condition';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Observation type */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Type *</label>
          <div className="grid grid-cols-1 gap-1.5">
            {OBSERVATION_TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <label key={t} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  form.type === t
                    ? `${cfg.bg} border-current ${cfg.color}`
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                  <input type="radio" name="type" value={t} checked={form.type === t}
                    onChange={() => set('type', t)} className="sr-only" />
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${form.type === t ? cfg.color : 'text-slate-400'}`} />
                  <span className={`text-xs font-medium ${form.type === t ? cfg.color : 'text-slate-600 dark:text-slate-400'}`}>{t}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Category *</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date *</label>
            <input type="date" value={form.observation_date} onChange={(e) => set('observation_date', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Location</label>
            <input value={form.location} onChange={(e) => set('location', e.target.value)}
              placeholder="Area, building, level..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Project</label>
            <select value={form.project_id} onChange={(e) => set('project_id', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
              <option value="">No project</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Anonymous */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_anonymous} onChange={(e) => set('is_anonymous', e.target.checked)}
              className="rounded" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Submit anonymously</span>
          </label>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          {isSafe ? 'What safe behaviour was observed? *' : 'What unsafe behaviour/condition was observed? *'}
        </label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          rows={3} placeholder="Describe what you observed in specific, factual terms..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
      </div>

      {/* Positive recognition (for safe acts) */}
      {isSafe && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Positive Recognition (optional)
          </label>
          <input value={form.positive_recognition} onChange={(e) => set('positive_recognition', e.target.value)}
            placeholder="e.g. Worker proactively wore harness before being asked..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      )}

      {/* Immediate action (for unsafe) */}
      {!isSafe && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Immediate Action Taken *
          </label>
          <textarea value={form.immediate_action} onChange={(e) => set('immediate_action', e.target.value)}
            rows={2} placeholder="What did you do immediately to address the risk?"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
        </div>
      )}

      {/* Follow-up */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.follow_up_required}
            onChange={(e) => set('follow_up_required', e.target.checked)} className="rounded" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Follow-up action required</span>
        </label>
      </div>

      {form.follow_up_required && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-amber-400">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Follow-up action</label>
            <input value={form.follow_up_action} onChange={(e) => set('follow_up_action', e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Assign to</label>
            <input value={form.follow_up_by} onChange={(e) => set('follow_up_by', e.target.value)}
              placeholder="Name or role"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!form.description.trim()) return;
            onSave({
              ...form,
              id: uid(),
              org_id: orgId,
              observer_id: form.is_anonymous ? 'anonymous' : userId,
              status: form.follow_up_required ? 'Open' : 'Closed',
              created_at: new Date().toISOString(),
            } as BbsObservation);
          }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Submit Observation
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const BbsObservations: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();
  const { projects } = useDataContext();

  const [observations, setObservations] = useState<BbsObservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'trends'>('list');
  const [filterType, setFilterType] = useState<ObservationType | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Closed'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSave = (obs: BbsObservation) => {
    setObservations((prev) => [obs, ...prev]);
    setShowForm(false);
    writeAuditLog({
      org_id: activeOrg.id,
      user_id: activeUser?.id ?? 'unknown',
      action: 'CREATE',
      resource_type: 'bbs_observation',
      resource_id: obs.id,
      description: `BBS observation submitted: ${obs.type} — ${obs.category}`,
      new_value: obs,
      timestamp: new Date().toISOString(),
    });
  };

  const filtered = observations.filter((o) => {
    if (filterType !== 'All' && o.type !== filterType) return false;
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    return true;
  });

  // Stats
  const stats = useMemo(() => ({
    total:   observations.length,
    safe:    observations.filter((o) => o.type === 'Safe Act' || o.type === 'Safe Condition').length,
    unsafe:  observations.filter((o) => o.type === 'Unsafe Act' || o.type === 'Unsafe Condition').length,
    nearMiss: observations.filter((o) => o.type === 'Near Miss').length,
    openFollowUps: observations.filter((o) => o.status === 'Open').length,
    safeRatio: observations.length
      ? Math.round((observations.filter((o) => o.type === 'Safe Act' || o.type === 'Safe Condition').length / observations.length) * 100)
      : 0,
  }), [observations]);

  // Chart data
  const categoryData = useMemo(() => {
    const map = new Map<string, { safe: number; unsafe: number }>();
    for (const o of observations) {
      const existing = map.get(o.category) ?? { safe: 0, unsafe: 0 };
      const isSafe = o.type === 'Safe Act' || o.type === 'Safe Condition';
      map.set(o.category, {
        safe:   existing.safe   + (isSafe ? 1 : 0),
        unsafe: existing.unsafe + (isSafe ? 0 : 1),
      });
    }
    return Array.from(map.entries()).map(([name, counts]) => ({ name: name.slice(0, 12), ...counts }));
  }, [observations]);

  const typeData = useMemo(() =>
    OBSERVATION_TYPES.map((t, i) => ({
      name: t,
      value: observations.filter((o) => o.type === t).length,
      color: PIE_COLORS[i] ?? '#888',
    })).filter((d) => d.value > 0),
  [observations]);

  const csvExport = () => exportTableToCsv(
    observations,
    [
      { key: 'observation_date', label: 'Date' },
      { key: 'type',             label: 'Type' },
      { key: 'category',         label: 'Category' },
      { key: 'location',         label: 'Location' },
      { key: 'description',      label: 'Description' },
      { key: 'immediate_action', label: 'Immediate Action' },
      { key: 'status',           label: 'Status' },
    ],
    'bbs-observations',
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Safety Observations (BBS)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} total · {stats.safeRatio}% safe · {stats.openFollowUps} open follow-ups
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={csvExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="bbs:create">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> New Observation
            </button>
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: stats.total,         color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Safe',        value: stats.safe,          color: 'text-emerald-600' },
          { label: 'Unsafe',      value: stats.unsafe,        color: 'text-red-600' },
          { label: 'Near Miss',   value: stats.nearMiss,      color: 'text-amber-600' },
          { label: 'Open Items',  value: stats.openFollowUps, color: 'text-orange-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(['list', 'trends'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === t
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>{t}</button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">New Safety Observation</h3>
          <AddObservationForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            projects={projects}
            userId={activeUser?.id ?? ''}
            orgId={activeOrg?.id ?? ''}
          />
        </div>
      )}

      {/* List */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(['All', ...OBSERVATION_TYPES] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === t
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>{t}</button>
            ))}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-600 dark:text-slate-400">
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Eye className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No observations yet.</p>
            </div>
          ) : filtered.map((obs) => {
            const cfg = TYPE_CONFIG[obs.type];
            const Icon = cfg.icon;
            const isOpen = expandedId === obs.id;
            const observer = usersList.find((u: any) => u.id === obs.observer_id);

            return (
              <div key={obs.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button onClick={() => setExpandedId(isOpen ? null : obs.id)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-left">
                  <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{obs.type}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{obs.category}</span>
                      {obs.follow_up_required && obs.status === 'Open' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Follow-up needed</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 line-clamp-2">{obs.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{obs.observation_date}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {obs.is_anonymous ? 'Anonymous' : (observer?.name ?? obs.observer_id)}
                      </span>
                      {obs.location && (
                        <span className="text-xs text-slate-400">{obs.location}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                    {obs.immediate_action && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Immediate Action Taken</p>
                        <p className="text-sm text-amber-800 dark:text-amber-300">{obs.immediate_action}</p>
                      </div>
                    )}
                    {obs.positive_recognition && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
                        <ThumbsUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">{obs.positive_recognition}</p>
                      </div>
                    )}
                    {obs.follow_up_required && (
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Follow-up Required</p>
                        <p className="text-sm text-orange-800 dark:text-orange-300">{obs.follow_up_action}</p>
                        {obs.follow_up_by && <p className="text-xs text-orange-600 mt-1">Assigned to: {obs.follow_up_by}</p>}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <CanDo permission="bbs:update">
                        <button
                          onClick={() => setObservations((prev) =>
                            prev.map((o) => o.id === obs.id ? { ...o, status: 'Closed' } : o)
                          )}
                          disabled={obs.status === 'Closed'}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                        >
                          {obs.status === 'Closed' ? 'Closed' : 'Mark Closed'}
                        </button>
                      </CanDo>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Trends */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Observations by Category</h3>
            {categoryData.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData} margin={{ bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }} />
                  <Bar dataKey="safe"   fill="#1D9E75" radius={[4,4,0,0]} name="Safe" />
                  <Bar dataKey="unsafe" fill="#ef4444" radius={[4,4,0,0]} name="Unsafe" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Observation Type Split</h3>
            {typeData.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${Math.round(percent * 100)}%`}
                      labelLine={false}>
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {typeData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BbsObservations;