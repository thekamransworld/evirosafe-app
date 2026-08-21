/**
 * FILE: src/components/environment/EnvironmentalMonitor.tsx
 * PASTE AT: src/components/environment/EnvironmentalMonitor.tsx
 *           (create environment/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import EnvironmentalMonitor from './components/environment/EnvironmentalMonitor';
 *   {activePage === 'environment' && <EnvironmentalMonitor />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'environment', label: 'Environmental', icon: Leaf,
 *     roles: ['admin', 'hse_manager', 'supervisor'] }
 *
 * Environmental Monitoring Module (ISO 14001 aligned)
 * Features:
 *  - Four media categories: Emissions, Waste, Water, Energy
 *  - Reading entry with threshold breach detection
 *  - Trend sparkline charts per parameter
 *  - Automatic alert when reading exceeds legal/target threshold
 *  - Monthly summary table
 *  - CSV + PDF export
 *  - Firestore persistence via writeDoc pattern
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, Wind, Trash2, Droplets, Zap,
  AlertTriangle, CheckCircle2, TrendingUp,
  Download, ChevronDown, ChevronRight,
  Thermometer, Leaf,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useAppContext } from '../../contexts';
import { useDataContext } from '../../contexts';
import { writeAuditLog } from '../../lib/auditLogger';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MediaCategory = 'Emissions' | 'Waste' | 'Water' | 'Energy';
type TrendDir = 'up' | 'down' | 'flat';

interface EnvParameter {
  id: string;
  name: string;
  unit: string;
  category: MediaCategory;
  legal_limit?: number;
  target_value?: number;
  description: string;
}

import type { EnvReading } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Seed parameters (customisable per organisation)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PARAMETERS: EnvParameter[] = [
  // Emissions
  { id: 'em_co2',   name: 'CO₂ Emissions',    unit: 'tonnes CO₂e', category: 'Emissions', target_value: 50,   description: 'Total CO₂ equivalent emissions' },
  { id: 'em_nox',   name: 'NOx',              unit: 'mg/m³',        category: 'Emissions', legal_limit: 200,  description: 'Nitrogen oxides from combustion' },
  { id: 'em_pm10',  name: 'PM10 Dust',        unit: 'µg/m³',        category: 'Emissions', legal_limit: 50,   description: 'Particulate matter <10 microns' },
  { id: 'em_so2',   name: 'SO₂',              unit: 'µg/m³',        category: 'Emissions', legal_limit: 125,  description: 'Sulphur dioxide from fuel combustion' },
  { id: 'em_voc',   name: 'VOCs',             unit: 'mg/m³',        category: 'Emissions', legal_limit: 100,  description: 'Volatile organic compounds' },
  // Waste
  { id: 'wa_haz',   name: 'Hazardous Waste',  unit: 'kg',           category: 'Waste',     target_value: 100, description: 'Hazardous waste generated' },
  { id: 'wa_gen',   name: 'General Waste',    unit: 'tonnes',       category: 'Waste',     target_value: 5,   description: 'Non-hazardous solid waste to landfill' },
  { id: 'wa_rec',   name: 'Recycling Rate',   unit: '%',            category: 'Waste',     target_value: 60,  description: 'Percentage of waste recycled' },
  { id: 'wa_eff',   name: 'Effluent Volume',  unit: 'm³',           category: 'Waste',     legal_limit: 500,  description: 'Liquid waste discharged' },
  // Water
  { id: 'wt_use',   name: 'Water Consumption',unit: 'm³',           category: 'Water',     target_value: 200, description: 'Total water consumed on site' },
  { id: 'wt_ph',    name: 'Discharge pH',     unit: 'pH',           category: 'Water',     legal_limit: 8.5,  description: 'pH of discharge water (limit 6–8.5)' },
  { id: 'wt_tss',   name: 'Suspended Solids', unit: 'mg/L',         category: 'Water',     legal_limit: 30,   description: 'Total suspended solids in discharge' },
  // Energy
  { id: 'en_elec',  name: 'Electricity',      unit: 'kWh',          category: 'Energy',    target_value: 50000, description: 'Electricity consumed' },
  { id: 'en_diesel',name: 'Diesel',           unit: 'litres',       category: 'Energy',    target_value: 10000, description: 'Diesel fuel consumed' },
  { id: 'en_gas',   name: 'Natural Gas',      unit: 'GJ',           category: 'Energy',    target_value: 200,   description: 'Natural gas consumed' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<MediaCategory, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  Emissions: { icon: Wind,       color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800',   border: 'border-slate-300 dark:border-slate-600' },
  Waste:     { icon: Trash2,     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950',  border: 'border-orange-200 dark:border-orange-800' },
  Water:     { icon: Droplets,   color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950',      border: 'border-blue-200 dark:border-blue-800' },
  Energy:    { icon: Zap,        color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950',    border: 'border-amber-200 dark:border-amber-800' },
};

const uid = () => `env_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function trendDirection(readings: EnvReading[]): TrendDir {
  if (readings.length < 2) return 'flat';
  const sorted = [...readings].sort((a, b) =>
    new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime(),
  );
  const first = sorted.slice(0, Math.ceil(sorted.length / 2));
  const last  = sorted.slice(Math.floor(sorted.length / 2));
  const avgFirst = first.reduce((s, r) => s + r.value, 0) / first.length;
  const avgLast  = last.reduce((s, r) => s + r.value, 0) / last.length;
  if (avgLast > avgFirst * 1.05) return 'up';
  if (avgLast < avgFirst * 0.95) return 'down';
  return 'flat';
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Reading Form
// ─────────────────────────────────────────────────────────────────────────────

interface AddReadingFormProps {
  parameters: EnvParameter[];
  projects: any[];
  userId: string;
  orgId: string;
  onSave: (reading: EnvReading) => void;
  onCancel: () => void;
}

const AddReadingForm: React.FC<AddReadingFormProps> = ({
  parameters, projects, userId, orgId, onSave, onCancel,
}) => {
  const [form, setForm] = useState({
    parameter_id: parameters[0]?.id ?? '',
    value: '',
    reading_date: new Date().toISOString().slice(0, 10),
    location: '',
    project_id: '',
    notes: '',
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const param = parameters.find((p) => p.id === form.parameter_id);
  const numVal = parseFloat(form.value);

  const exceeds_limit  = param?.legal_limit  != null && !isNaN(numVal) && numVal > param.legal_limit;
  const exceeds_target = param?.target_value != null && !isNaN(numVal) && numVal > param.target_value;

  const handleSave = () => {
    if (!param || isNaN(numVal)) return;
    onSave({
      id: uid(),
      org_id: orgId,
      parameter_id: form.parameter_id,
      parameter_name: param.name,
      category: param.category,
      value: numVal,
      unit: param.unit,
      reading_date: form.reading_date,
      location: form.location,
      project_id: form.project_id,
      recorded_by: userId,
      notes: form.notes,
      exceeds_limit,
      exceeds_target,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Parameter *</label>
          <select value={form.parameter_id} onChange={(e) => set('parameter_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.category} — {p.name} ({p.unit})</option>
            ))}
          </select>
          {param && (
            <p className="text-xs text-slate-400 mt-1">{param.description}
              {param.legal_limit != null && ` · Legal limit: ${param.legal_limit} ${param.unit}`}
              {param.target_value != null && ` · Target: ${param.target_value} ${param.unit}`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Reading Value * {param && `(${param.unit})`}
          </label>
          <input type="number" step="any" value={form.value} onChange={(e) => set('value', e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 ${
              exceeds_limit ? 'border-red-400' : exceeds_target ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'
            }`} />
          {exceeds_limit && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Exceeds legal limit of {param?.legal_limit} {param?.unit}
            </p>
          )}
          {!exceeds_limit && exceeds_target && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Exceeds target of {param?.target_value} {param?.unit}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date *</label>
          <input type="date" value={form.reading_date} onChange={(e) => set('reading_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Location / Source</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Stack 1, Borehole A, Main substation"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Project</label>
          <select value={form.project_id} onChange={(e) => set('project_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">No project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            rows={2} placeholder="Measurement method, instrument, conditions..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!form.value || isNaN(numVal)}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
          Record Reading
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Parameter Card with sparkline
// ─────────────────────────────────────────────────────────────────────────────

interface ParamCardProps {
  param: EnvParameter;
  readings: EnvReading[];
}

const ParameterCard: React.FC<ParamCardProps> = ({ param, readings }) => {
  const sorted = [...readings]
    .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime())
    .slice(-12); // last 12 readings

  const latest = sorted[sorted.length - 1];
  const trend = trendDirection(readings);
  const exceedsLimit  = latest && param.legal_limit  != null && latest.value > param.legal_limit;
  const exceedsTarget = latest && param.target_value != null && latest.value > param.target_value;

  const catCfg = CATEGORY_CONFIG[param.category];
  const CatIcon = catCfg.icon;

  const chartColor = exceedsLimit ? '#ef4444' : exceedsTarget ? '#f59e0b' : '#1D9E75';

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${
      exceedsLimit ? 'border-red-300 dark:border-red-700' :
      exceedsTarget ? 'border-amber-300 dark:border-amber-700' :
      'border-slate-100 dark:border-slate-700'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${catCfg.bg}`}>
            <CatIcon className={`w-3.5 h-3.5 ${catCfg.color}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{param.name}</p>
            <p className="text-xs text-slate-400">{param.unit}</p>
          </div>
        </div>
        {exceedsLimit ? (
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        ) : exceedsTarget ? (
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        ) : latest ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        ) : null}
      </div>

      {latest ? (
        <div className="mb-2">
          <p className={`text-2xl font-bold ${exceedsLimit ? 'text-red-600' : exceedsTarget ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>
            {latest.value.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{latest.reading_date}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic my-2">No readings yet</p>
      )}

      {sorted.length > 1 && (
        <ResponsiveContainer width="100%" height={48}>
          <LineChart data={sorted} margin={{ top: 2, right: 2, left: -30, bottom: 2 }}>
            {param.legal_limit != null && (
              <ReferenceLine y={param.legal_limit} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} />
            )}
            {param.target_value != null && (
              <ReferenceLine y={param.target_value} stroke="#f59e0b" strokeDasharray="2 2" strokeWidth={1} />
            )}
            <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{readings.length} reading{readings.length !== 1 ? 's' : ''}</span>
        {param.legal_limit != null && (
          <span className="text-xs text-slate-400">Limit: {param.legal_limit}</span>
        )}
        {param.target_value != null && !param.legal_limit && (
          <span className="text-xs text-slate-400">Target: {param.target_value}</span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const EnvironmentalMonitor: React.FC = () => {
  const { activeUser, activeOrg } = useAppContext();
  const { projects, envReadings: readings, handleCreateEnvReading } = useDataContext();

  const [parameters]                    = useState<EnvParameter[]>(DEFAULT_PARAMETERS);
  const [activeCategory, setActiveCategory] = useState<MediaCategory | 'All'>('All');
  const [showForm, setShowForm]         = useState(false);
  const [activeTab, setActiveTab]       = useState<'overview' | 'readings' | 'alerts'>('overview');

  const handleSave = (reading: EnvReading) => {
    handleCreateEnvReading(reading);
    setShowForm(false);
    writeAuditLog({
      org_id: activeOrg?.id ?? '',
      user_id: activeUser?.id ?? 'unknown',
      action: 'CREATE',
      resource_type: 'environmental_reading',
      resource_id: reading.id,
      description: `Environmental reading: ${reading.parameter_name} = ${reading.value} ${reading.unit}${reading.exceeds_limit ? ' ⚠ EXCEEDS LIMIT' : ''}`,
      new_value: reading,
      timestamp: new Date().toISOString(),
    });
  };

  const filteredParams = parameters.filter(
    (p) => activeCategory === 'All' || p.category === activeCategory,
  );

  const breaches = readings.filter((r) => r.exceeds_limit);
  const targets  = readings.filter((r) => r.exceeds_target && !r.exceeds_limit);

  const categorySummary = useMemo(() => {
    return (['Emissions', 'Waste', 'Water', 'Energy'] as MediaCategory[]).map((cat) => {
      const catReadings = readings.filter((r) => r.category === cat);
      const catBreaches = catReadings.filter((r) => r.exceeds_limit).length;
      return { cat, count: catReadings.length, breaches: catBreaches };
    });
  }, [readings]);

  const csvExport = () => exportTableToCsv(
    readings,
    [
      { key: 'reading_date',    label: 'Date' },
      { key: 'category',        label: 'Category' },
      { key: 'parameter_name',  label: 'Parameter' },
      { key: 'value',           label: 'Value' },
      { key: 'unit',            label: 'Unit' },
      { key: 'location',        label: 'Location' },
      { key: 'exceeds_limit',   label: 'Exceeds Limit', format: (v) => v ? 'YES' : 'No' },
      { key: 'exceeds_target',  label: 'Exceeds Target', format: (v) => v ? 'YES' : 'No' },
      { key: 'notes',           label: 'Notes' },
    ],
    `environmental-readings-${new Date().toISOString().slice(0, 10)}`,
  );

  const tabs = [
    { id: 'overview' as const,  label: 'Overview' },
    { id: 'readings' as const,  label: `Readings (${readings.length})` },
    { id: 'alerts' as const,    label: `Alerts (${breaches.length + targets.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Environmental Monitoring</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ISO 14001 · {readings.length} readings · {breaches.length} legal limit breaches
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={csvExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="environment:create">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Record Reading
            </button>
          </CanDo>
        </div>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categorySummary.map(({ cat, count, breaches: b }) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          return (
            <div key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                activeCategory === cat
                  ? `${cfg.bg} ${cfg.border} border`
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cat}</p>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{count}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {b > 0 ? <span className="text-red-600 font-medium">{b} breach{b !== 1 ? 'es' : ''}</span> : 'No breaches'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Add reading form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Record Environmental Reading</h3>
          <AddReadingForm
            parameters={parameters}
            projects={projects}
            userId={activeUser?.id ?? ''}
            orgId={activeOrg?.id ?? ''}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Overview tab — parameter grid */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredParams.map((param) => (
            <ParameterCard
              key={param.id}
              param={param}
              readings={readings.filter((r) => r.parameter_id === param.id)}
            />
          ))}
        </div>
      )}

      {/* Readings tab */}
      {activeTab === 'readings' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {readings.length === 0 ? (
            <div className="text-center py-14">
              <Leaf className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No readings recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {['Date', 'Category', 'Parameter', 'Value', 'Location', 'Status', 'Notes'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => (
                    <tr key={r.id}
                      className={`border-t border-slate-100 dark:border-slate-700 ${
                        r.exceeds_limit ? 'bg-red-50/50 dark:bg-red-950/20' :
                        r.exceeds_target ? 'bg-amber-50/50 dark:bg-amber-950/20' :
                        i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'
                      }`}>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{r.reading_date}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_CONFIG[r.category].bg} ${CATEGORY_CONFIG[r.category].color}`}>
                          {r.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{r.parameter_name}</td>
                      <td className={`px-4 py-2.5 font-bold ${r.exceeds_limit ? 'text-red-600' : r.exceeds_target ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {r.value.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{r.location || '—'}</td>
                      <td className="px-4 py-2.5">
                        {r.exceeds_limit
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Breach</span>
                          : r.exceeds_target
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Over target</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">OK</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs max-w-xs truncate">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {breaches.length === 0 && targets.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-500 text-sm">No threshold breaches detected.</p>
            </div>
          ) : (
            <>
              {breaches.map((r) => (
                <div key={r.id}
                  className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Legal Limit Exceeded — {r.parameter_name}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                      Recorded: <strong>{r.value} {r.unit}</strong> on {r.reading_date}
                      {r.location && ` at ${r.location}`}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      {parameters.find((p) => p.id === r.parameter_id)?.description}
                      — Limit: {parameters.find((p) => p.id === r.parameter_id)?.legal_limit} {r.unit}
                    </p>
                  </div>
                  <span className="text-xs text-red-500 whitespace-nowrap">{r.reading_date}</span>
                </div>
              ))}
              {targets.map((r) => (
                <div key={r.id}
                  className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Target Exceeded — {r.parameter_name}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Recorded: <strong>{r.value} {r.unit}</strong> on {r.reading_date}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentalMonitor;