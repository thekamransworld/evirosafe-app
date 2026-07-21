/**
 * FILE: src/components/emergency/EmergencyResponse.tsx
 *
 * Emergency Response Planning & Drill Tracking Module
 *
 * Features:
 *  - Emergency Response Plans (ERP) — create, view, assign owners
 *  - Drill scheduling and outcomes tracking
 *  - Response team role assignments
 *  - Muster point and assembly area registry
 *  - Emergency contact directory
 *  - Drill calendar view
 */

import React, { useState, useMemo } from 'react';
import {
  Siren, Users, MapPin, Phone, Calendar, Plus,
  ChevronRight, CheckCircle2, AlertTriangle, Clock,
  FileText, Edit3, Trash2, Shield, Download,
} from 'lucide-react';
import { useAppContext } from '../../contexts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EmergencyType =
  | 'Fire' | 'Medical' | 'Chemical Spill' | 'Explosion' | 'Structural Collapse'
  | 'Flood' | 'Gas Leak' | 'Power Outage' | 'Evacuation' | 'Security Threat'
  | 'Environmental Release' | 'Vehicle Accident';

type DrillStatus   = 'Scheduled' | 'Completed' | 'Cancelled' | 'Overdue';
type DrillOutcome  = 'Pass' | 'Partial' | 'Fail' | 'Pending';
type PlanStatus    = 'Draft' | 'Active' | 'Under Review' | 'Superseded';

interface ResponseTeamMember {
  id: string;
  user_id: string;
  role: string;
  primary_contact: string;
  backup_contact: string;
}

interface MusterPoint {
  id: string;
  name: string;
  location: string;
  capacity: number;
  coordinates?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  availability: '24/7' | 'Business Hours' | 'On-Call';
}

interface EmergencyPlan {
  id: string;
  title: string;
  emergency_type: EmergencyType;
  version: string;
  status: PlanStatus;
  owner_id: string;
  approved_by: string;
  approval_date: string;
  review_date: string;
  scope: string;
  immediate_actions: string[];
  escalation_steps: string[];
  resources_required: string[];
  team_members: ResponseTeamMember[];
  muster_points: MusterPoint[];
  contacts: EmergencyContact[];
  created_at: string;
}

interface EmergencyDrill {
  id: string;
  plan_id: string;
  title: string;
  emergency_type: EmergencyType;
  scheduled_date: string;
  actual_date?: string;
  location: string;
  duration_minutes: number;
  participants_expected: number;
  participants_actual?: number;
  status: DrillStatus;
  outcome: DrillOutcome;
  coordinator_id: string;
  objectives: string[];
  findings: string[];
  recommendations: string[];
  response_time_minutes?: number;
  score?: number; // 0-100
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => `em_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const EMERGENCY_TYPES: EmergencyType[] = [
  'Fire', 'Medical', 'Chemical Spill', 'Explosion', 'Structural Collapse',
  'Flood', 'Gas Leak', 'Power Outage', 'Evacuation', 'Security Threat',
  'Environmental Release', 'Vehicle Accident',
];

const TYPE_COLORS: Record<EmergencyType, string> = {
  'Fire':                  'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  'Medical':               'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  'Chemical Spill':        'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
  'Explosion':             'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200',
  'Structural Collapse':   'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  'Flood':                 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300',
  'Gas Leak':              'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  'Power Outage':          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  'Evacuation':            'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  'Security Threat':       'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  'Environmental Release': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  'Vehicle Accident':      'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
};

const DRILL_STATUS_CONFIG: Record<DrillStatus, { color: string; icon: React.ElementType }> = {
  Scheduled:  { color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300',   icon: Calendar },
  Completed:  { color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300', icon: CheckCircle2 },
  Cancelled:  { color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400', icon: Clock },
  Overdue:    { color: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300',        icon: AlertTriangle },
};

const OUTCOME_CONFIG: Record<DrillOutcome, { color: string; label: string }> = {
  Pass:    { color: 'text-emerald-700 bg-emerald-100', label: 'Pass' },
  Partial: { color: 'text-amber-700 bg-amber-100',    label: 'Partial' },
  Fail:    { color: 'text-red-700 bg-red-100',         label: 'Fail' },
  Pending: { color: 'text-slate-500 bg-slate-100',     label: 'Pending' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// Simple inline list editor
const StringListEditor: React.FC<{
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}> = ({ label, items, placeholder, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</label>
      <button
        onClick={() => onChange([...items, ''])}
        className="text-xs text-blue-600 flex items-center gap-1"
      ><Plus className="w-3 h-3" /> Add</button>
    </div>
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
            {idx + 1}
          </div>
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                       rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500
                       text-slate-700 dark:text-slate-300"
          />
          <button onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Plan form
// ─────────────────────────────────────────────────────────────────────────────

interface PlanFormProps {
  initial?: Partial<EmergencyPlan>;
  onSave: (plan: EmergencyPlan) => void;
  onCancel: () => void;
  usersList: any[];
}

const PlanForm: React.FC<PlanFormProps> = ({ initial, onSave, onCancel, usersList }) => {
  const [form, setForm] = useState<Partial<EmergencyPlan>>({
    title: '',
    emergency_type: 'Fire',
    version: '1.0',
    status: 'Draft',
    owner_id: '',
    scope: '',
    immediate_actions: [''],
    escalation_steps: [''],
    resources_required: [''],
    team_members: [],
    muster_points: [],
    contacts: [],
    created_at: new Date().toISOString(),
    ...initial,
  });

  const set = (field: keyof EmergencyPlan, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    if (!form.title || !form.emergency_type) return;
    onSave({ ...form, id: form.id ?? uid() } as EmergencyPlan);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Title *</label>
          <input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Fire Emergency Response Plan"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Emergency Type *</label>
          <select value={form.emergency_type} onChange={(e) => set('emergency_type', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Version</label>
          <input value={form.version ?? ''} onChange={(e) => set('version', e.target.value)}
            placeholder="1.0"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Plan Owner</label>
          <select value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">Select owner</option>
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Review Date</label>
          <input type="date" value={form.review_date ?? ''} onChange={(e) => set('review_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Draft','Active','Under Review','Superseded'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Scope</label>
        <textarea value={form.scope ?? ''} onChange={(e) => set('scope', e.target.value)}
          placeholder="Define the scope of this plan — locations, activities, personnel covered..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
      </div>

      <StringListEditor
        label="Immediate Actions (first 5 minutes)"
        items={form.immediate_actions ?? ['']}
        placeholder="e.g. Raise the alarm..."
        onChange={(v) => set('immediate_actions', v)}
      />

      <StringListEditor
        label="Escalation Steps"
        items={form.escalation_steps ?? ['']}
        placeholder="e.g. Notify site manager..."
        onChange={(v) => set('escalation_steps', v)}
      />

      <StringListEditor
        label="Resources Required"
        items={form.resources_required ?? ['']}
        placeholder="e.g. Fire extinguisher, first aid kit..."
        onChange={(v) => set('resources_required', v)}
      />

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Save Plan
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Drill form
// ─────────────────────────────────────────────────────────────────────────────

interface DrillFormProps {
  plans: EmergencyPlan[];
  onSave: (drill: EmergencyDrill) => void;
  onCancel: () => void;
  usersList: any[];
}

const DrillForm: React.FC<DrillFormProps> = ({ plans, onSave, onCancel, usersList }) => {
  const [form, setForm] = useState<Partial<EmergencyDrill>>({
    title: '',
    emergency_type: 'Fire',
    scheduled_date: '',
    location: '',
    duration_minutes: 60,
    participants_expected: 0,
    status: 'Scheduled',
    outcome: 'Pending',
    objectives: [''],
    findings: [],
    recommendations: [],
    created_at: new Date().toISOString(),
  });

  const set = (field: keyof EmergencyDrill, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    if (!form.title || !form.scheduled_date) return;
    onSave({ ...form, id: uid() } as EmergencyDrill);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Drill Title *</label>
          <input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Annual Fire Evacuation Drill"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Emergency Type</label>
          <select value={form.emergency_type} onChange={(e) => set('emergency_type', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Scheduled Date *</label>
          <input type="date" value={form.scheduled_date ?? ''} onChange={(e) => set('scheduled_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Location</label>
          <input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)}
            placeholder="Site / area name"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Duration (minutes)</label>
          <input type="number" value={form.duration_minutes ?? 60} onChange={(e) => set('duration_minutes', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Expected Participants</label>
          <input type="number" value={form.participants_expected ?? 0} onChange={(e) => set('participants_expected', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Coordinator</label>
          <select value={form.coordinator_id ?? ''} onChange={(e) => set('coordinator_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">Select coordinator</option>
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Linked Plan</label>
          <select value={form.plan_id ?? ''} onChange={(e) => set('plan_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">No plan linked</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      <StringListEditor
        label="Drill Objectives"
        items={form.objectives ?? ['']}
        placeholder="e.g. Test evacuation time to muster point..."
        onChange={(v) => set('objectives', v)}
      />

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">Schedule Drill</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'plans' | 'drills' | 'teams' | 'contacts';

export const EmergencyResponse: React.FC = () => {
  const { usersList } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [drills, setDrills] = useState<EmergencyDrill[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showDrillForm, setShowDrillForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive drill stats
  const drillStats = useMemo(() => ({
    scheduled: drills.filter((d) => d.status === 'Scheduled').length,
    completed: drills.filter((d) => d.status === 'Completed').length,
    overdue:   drills.filter((d) => {
      if (d.status !== 'Scheduled') return false;
      return new Date(d.scheduled_date) < new Date();
    }).length,
    passRate: (() => {
      const done = drills.filter((d) => d.status === 'Completed');
      if (!done.length) return 0;
      return Math.round((done.filter((d) => d.outcome === 'Pass').length / done.length) * 100);
    })(),
  }), [drills]);

  const updateDrillOutcome = (id: string, field: keyof EmergencyDrill, value: any) => {
    setDrills((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const tabs = [
    { id: 'plans' as Tab,    label: 'Response Plans',    icon: FileText },
    { id: 'drills' as Tab,   label: 'Drills & Exercises', icon: Siren },
    { id: 'teams' as Tab,    label: 'Response Teams',    icon: Users },
    { id: 'contacts' as Tab, label: 'Contacts',          icon: Phone },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Emergency Response</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {plans.filter((p) => p.status === 'Active').length} active plans ·{' '}
            {drillStats.scheduled} drills scheduled · {drillStats.overdue} overdue
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'plans' && (
            <button onClick={() => setShowPlanForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
          {activeTab === 'drills' && (
            <button onClick={() => setShowDrillForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Schedule Drill
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Plans',      value: plans.filter((p) => p.status === 'Active').length, color: 'text-blue-600' },
          { label: 'Drills Scheduled',  value: drillStats.scheduled,  color: 'text-amber-600' },
          { label: 'Drills Overdue',    value: drillStats.overdue,    color: 'text-red-600' },
          { label: 'Drill Pass Rate',   value: `${drillStats.passRate}%`, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Plans tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {showPlanForm && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">New Emergency Response Plan</h3>
              <PlanForm
                onSave={(plan) => { setPlans((p) => [plan, ...p]); setShowPlanForm(false); }}
                onCancel={() => setShowPlanForm(false)}
                usersList={usersList}
              />
            </div>
          )}

          {plans.length === 0 && !showPlanForm ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Siren className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No emergency plans yet.</p>
              <button onClick={() => setShowPlanForm(true)}
                className="mt-3 text-sm text-blue-600 font-medium hover:underline">
                Create your first plan
              </button>
            </div>
          ) : plans.map((plan) => {
            const isOpen = expandedId === plan.id;
            const typeStyle = TYPE_COLORS[plan.emergency_type] ?? '';
            return (
              <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button onClick={() => setExpandedId(isOpen ? null : plan.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-left">
                  <Siren className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{plan.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle}`}>
                        {plan.emergency_type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        plan.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>{plan.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">v{plan.version} · Review: {plan.review_date || 'Not set'}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                    {plan.scope && (
                      <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{plan.scope}</p></div>
                    )}
                    {plan.immediate_actions?.filter(Boolean).length > 0 && (
                      <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Immediate Actions</p>
                        <ol className="space-y-1">
                          {plan.immediate_actions.filter(Boolean).map((a, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-bold text-slate-400 flex-shrink-0">{i + 1}.</span> {a}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drills tab */}
      {activeTab === 'drills' && (
        <div className="space-y-4">
          {showDrillForm && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Schedule Emergency Drill</h3>
              <DrillForm
                plans={plans}
                onSave={(drill) => { setDrills((d) => [drill, ...d]); setShowDrillForm(false); }}
                onCancel={() => setShowDrillForm(false)}
                usersList={usersList}
              />
            </div>
          )}

          {drills.length === 0 && !showDrillForm ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No drills scheduled yet.</p>
            </div>
          ) : drills.map((drill) => {
            const sc = DRILL_STATUS_CONFIG[drill.status];
            const StatusIcon = sc.icon;
            const oc = OUTCOME_CONFIG[drill.outcome];
            const isOverdue = drill.status === 'Scheduled' && new Date(drill.scheduled_date) < new Date();
            const isOpen = expandedId === drill.id;

            return (
              <div key={drill.id} className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden ${
                isOverdue ? 'border-red-200 dark:border-red-800' : 'border-slate-100 dark:border-slate-700'
              }`}>
                <button onClick={() => setExpandedId(isOpen ? null : drill.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-left">
                  <div className={`p-1.5 rounded-lg ${sc.color.split(' ').slice(1).join(' ')}`}>
                    <StatusIcon className={`w-4 h-4 ${sc.color.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{drill.title}</p>
                      {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">OVERDUE</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {drill.emergency_type} · {drill.scheduled_date} · {drill.location}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${oc.color}`}>{oc.label}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Status', value: drill.status },
                        { label: 'Expected', value: `${drill.participants_expected} participants` },
                        { label: 'Duration', value: `${drill.duration_minutes} min` },
                        { label: 'Outcome', value: drill.outcome },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Update outcome */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Outcome</label>
                        <select value={drill.outcome}
                          onChange={(e) => updateDrillOutcome(drill.id, 'outcome', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none">
                          {['Pending','Pass','Partial','Fail'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Actual Date</label>
                        <input type="date" value={drill.actual_date ?? ''}
                          onChange={(e) => updateDrillOutcome(drill.id, 'actual_date', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Actual Participants</label>
                        <input type="number" value={drill.participants_actual ?? ''}
                          onChange={(e) => updateDrillOutcome(drill.id, 'participants_actual', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Response Time (min)</label>
                        <input type="number" value={drill.response_time_minutes ?? ''}
                          onChange={(e) => updateDrillOutcome(drill.id, 'response_time_minutes', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Findings / Observations</label>
                      <textarea rows={2} value={drill.findings?.join('\n') ?? ''}
                        onChange={(e) => updateDrillOutcome(drill.id, 'findings', e.target.value.split('\n'))}
                        placeholder="Key findings from the drill (one per line)..."
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">Recommendations</label>
                      <textarea rows={2} value={drill.recommendations?.join('\n') ?? ''}
                        onChange={(e) => updateDrillOutcome(drill.id, 'recommendations', e.target.value.split('\n'))}
                        placeholder="Improvement actions (one per line)..."
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none text-slate-700 dark:text-slate-300" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Teams / Contacts placeholder */}
      {(activeTab === 'teams' || activeTab === 'contacts') && (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {activeTab === 'teams' ? 'Response team management' : 'Emergency contacts directory'} — coming in Phase 3.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmergencyResponse;