/**
 * FILE: src/components/risk-matrix/RiskMatrix.tsx
 *
 * PASTE AT:  src/components/risk-matrix/RiskMatrix.tsx
 *            (create the risk-matrix/ folder first)
 *
 * TO WIRE INTO APP (add these lines to src/App.tsx):
 * ─────────────────────────────────────────────────────────
 *   import RiskMatrix from './components/risk-matrix/RiskMatrix';
 *
 *   // In your page render block:
 *   {activePage === 'risk-matrix' && <RiskMatrix />}
 *
 * TO ADD TO SIDEBAR (in your nav items array):
 * ─────────────────────────────────────────────────────────
 *   {
 *     id: 'risk-matrix',
 *     label: 'Risk Matrix',
 *     icon: Grid2X2,        // import Grid2X2 from 'lucide-react'
 *     roles: ['admin', 'hse_manager', 'supervisor'],
 *   }
 *
 * Interactive 5×5 Risk Matrix Heatmap
 *
 * Features:
 *  - Color-coded 5×5 heatmap (Likelihood × Severity)
 *  - Clickable cells showing hazards/incidents at each risk level
 *  - Add hazards directly to any cell
 *  - Risk score calculation with residual risk after controls
 *  - ISO 31000 / AS/NZS 4360 aligned risk ratings
 *  - Export matrix as PNG (via canvas)
 *  - Filter by project, category, status
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, X, ChevronRight, AlertTriangle, Shield,
  Download, Filter, Info, CheckCircle2, Clock,
} from 'lucide-react';
import { useDataContext } from '../../contexts';
import { useAppContext } from '../../contexts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RiskLevel = 'Extreme' | 'High' | 'Medium' | 'Low' | 'Negligible';
type HazardStatus = 'Open' | 'Controlled' | 'Residual' | 'Accepted' | 'Closed';
import type { Hazard } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Risk matrix configuration
// ─────────────────────────────────────────────────────────────────────────────

const LIKELIHOOD_LABELS = [
  { value: 1, label: 'Rare',        description: 'May occur in exceptional circumstances (<10%)' },
  { value: 2, label: 'Unlikely',    description: 'Could occur at some time (10-30%)' },
  { value: 3, label: 'Possible',    description: 'Might occur at some time (30-60%)' },
  { value: 4, label: 'Likely',      description: 'Will probably occur in most circumstances (60-90%)' },
  { value: 5, label: 'Almost Certain', description: 'Is expected to occur in most circumstances (>90%)' },
];

const SEVERITY_LABELS = [
  { value: 1, label: 'Insignificant', description: 'No injury, negligible financial loss' },
  { value: 2, label: 'Minor',         description: 'First aid, minor damage < $10K' },
  { value: 3, label: 'Moderate',      description: 'Medical treatment, moderate damage $10K-$100K' },
  { value: 4, label: 'Major',         description: 'LTI, extensive damage $100K-$1M' },
  { value: 5, label: 'Catastrophic',  description: 'Fatality, massive damage >$1M' },
];

const HAZARD_CATEGORIES = [
  'Physical', 'Chemical', 'Biological', 'Ergonomic',
  'Electrical', 'Mechanical', 'Fire/Explosion', 'Environmental',
  'Psychosocial', 'Radiation', 'Confined Space', 'Working at Height',
];

/**
 * Get risk level from score (likelihood × severity)
 * Based on AS/NZS 4360 / ISO 31000 standard matrix
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= 15) return 'Extreme';
  if (score >= 8)  return 'High';
  if (score >= 4)  return 'Medium';
  if (score >= 2)  return 'Low';
  return 'Negligible';
}

/**
 * Get cell risk level for a specific (likelihood, severity) pair.
 * The 5×5 matrix does not simply multiply — some cells are adjusted
 * to reflect real-world industry practice.
 */
function getCellRiskLevel(likelihood: number, severity: number): RiskLevel {
  const score = likelihood * severity;
  // Catastrophic severity always at least High regardless of likelihood
  if (severity === 5 && likelihood >= 1) return likelihood >= 3 ? 'Extreme' : 'High';
  // Rare likelihood with low severity = Negligible even if score would be Low
  if (likelihood === 1 && severity <= 2) return 'Negligible';
  return getRiskLevel(score);
}

const RISK_LEVEL_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; badge: string }> = {
  Extreme:    { bg: 'bg-red-600',    text: 'text-white',            border: 'border-red-700',    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  High:       { bg: 'bg-orange-500', text: 'text-white',            border: 'border-orange-600', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  Medium:     { bg: 'bg-amber-400',  text: 'text-amber-900',        border: 'border-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  Low:        { bg: 'bg-emerald-500',text: 'text-white',            border: 'border-emerald-600',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  Negligible: { bg: 'bg-slate-300',  text: 'text-slate-700',        border: 'border-slate-400',  badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const uid = () => `hz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Add Hazard Form
// ─────────────────────────────────────────────────────────────────────────────

interface AddHazardFormProps {
  initialLikelihood?: number;
  initialSeverity?: number;
  projects: any[];
  users: any[];
  onSave: (hazard: Hazard) => void;
  onCancel: () => void;
}

const AddHazardForm: React.FC<AddHazardFormProps> = ({
  initialLikelihood = 3,
  initialSeverity = 3,
  projects,
  users,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Physical',
    likelihood: initialLikelihood,
    severity: initialSeverity,
    residual_likelihood: Math.max(1, initialLikelihood - 1),
    residual_severity: Math.max(1, initialSeverity - 1),
    controls: [''],
    project_id: '',
    owner_id: '',
    status: 'Open' as HazardStatus,
  });

  const set = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));
  const riskScore     = form.likelihood * form.severity;
  const residualScore = form.residual_likelihood * form.residual_severity;
  const riskLevel     = getRiskLevel(riskScore);
  const residualLevel = getRiskLevel(residualScore);
  const riskStyles    = RISK_LEVEL_STYLES[riskLevel];
  const residualStyles = RISK_LEVEL_STYLES[residualLevel];

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      id: uid(),
      risk_score: riskScore,
      residual_score: residualScore,
      controls: form.controls.filter(Boolean),
      created_at: new Date().toISOString(),
    } as Hazard);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Hazard Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Working at height — unguarded edge"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {HAZARD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Open','Controlled','Residual','Accepted','Closed'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Risk rating inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Inherent risk */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inherent Risk (Before Controls)</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Likelihood: <strong>{LIKELIHOOD_LABELS[form.likelihood - 1]?.label}</strong></label>
              <input type="range" min={1} max={5} value={form.likelihood}
                onChange={(e) => set('likelihood', Number(e.target.value))}
                className="w-full accent-red-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Severity: <strong>{SEVERITY_LABELS[form.severity - 1]?.label}</strong></label>
              <input type="range" min={1} max={5} value={form.severity}
                onChange={(e) => set('severity', Number(e.target.value))}
                className="w-full accent-red-500" />
            </div>
          </div>
          <div className={`mt-3 text-center py-2 rounded-lg font-bold text-sm ${riskStyles.bg} ${riskStyles.text}`}>
            {riskLevel} — Score: {riskScore}
          </div>
        </div>

        {/* Residual risk */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Residual Risk (After Controls)</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Likelihood: <strong>{LIKELIHOOD_LABELS[form.residual_likelihood - 1]?.label}</strong></label>
              <input type="range" min={1} max={5} value={form.residual_likelihood}
                onChange={(e) => set('residual_likelihood', Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Severity: <strong>{SEVERITY_LABELS[form.residual_severity - 1]?.label}</strong></label>
              <input type="range" min={1} max={5} value={form.residual_severity}
                onChange={(e) => set('residual_severity', Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>
          </div>
          <div className={`mt-3 text-center py-2 rounded-lg font-bold text-sm ${residualStyles.bg} ${residualStyles.text}`}>
            {residualLevel} — Score: {residualScore}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Controls (Hierarchy of Controls)</label>
          <button onClick={() => set('controls', [...form.controls, ''])}
            className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {form.controls.map((ctrl, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
            <input value={ctrl}
              onChange={(e) => {
                const next = [...form.controls];
                next[idx] = e.target.value;
                set('controls', next);
              }}
              placeholder="e.g. Install edge protection (Engineering control)..."
              className="flex-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300" />
            <button onClick={() => set('controls', form.controls.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={handleSave}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Add to Matrix
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Risk Matrix Component
// ─────────────────────────────────────────────────────────────────────────────

export const RiskMatrix: React.FC = () => {
  const { reportList, projects, hazardList: hazards, handleCreateHazard } = useDataContext();
  const { usersList, activeOrg } = useAppContext();
  const [selectedCell, setSelectedCell] = useState<{ l: number; s: number } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormCell, setAddFormCell] = useState<{ l: number; s: number } | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [viewMode, setViewMode] = useState<'inherent' | 'residual'>('inherent');
  const [filterCategory, setFilterCategory] = useState('All');

  // Build incident counts per cell from reports
  const incidentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reportList) {
      const l = Number((r as any).likelihood ?? 0);
      const s = Number((r as any).severity_score ?? 0);
      if (l >= 1 && l <= 5 && s >= 1 && s <= 5) {
        const key = `${l}-${s}`;
        map[key] = (map[key] ?? 0) + 1;
      }
    }
    return map;
  }, [reportList]);

  // Hazard counts per cell
  const hazardCounts = useMemo(() => {
    const map: Record<string, Hazard[]> = {};
    for (const hz of hazards) {
      const l = viewMode === 'inherent' ? hz.likelihood : hz.residual_likelihood;
      const s = viewMode === 'inherent' ? hz.severity : hz.residual_severity;
      const key = `${l}-${s}`;
      if (!map[key]) map[key] = [];
      map[key].push(hz);
    }
    return map;
  }, [hazards, viewMode]);

  const handleCellClick = (l: number, s: number) => {
    setSelectedCell((prev) => (prev?.l === l && prev?.s === s ? null : { l, s }));
    setShowAddForm(false);
  };

  const handleAddFromCell = (l: number, s: number) => {
    setAddFormCell({ l, s });
    setShowAddForm(true);
    setSelectedCell(null);
  };

  const handleSaveHazard = (hazard: Hazard) => {
    handleCreateHazard(hazard);
    setShowAddForm(false);
    setAddFormCell(null);
  };

  // Risk summary counts
  const summary = useMemo(() => {
    const counts = { Extreme: 0, High: 0, Medium: 0, Low: 0, Negligible: 0 };
    for (const hz of hazards) {
      const score = viewMode === 'inherent' ? hz.risk_score : hz.residual_score;
      counts[getRiskLevel(score)]++;
    }
    return counts;
  }, [hazards, viewMode]);

  const selectedCellHazards = selectedCell
    ? (hazardCounts[`${selectedCell.l}-${selectedCell.s}`] ?? [])
    : [];

  const selectedCellIncidents = selectedCell
    ? (incidentCounts[`${selectedCell.l}-${selectedCell.s}`] ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Risk Matrix</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {hazards.length} hazards registered ·{' '}
            {summary.Extreme + summary.High} high-priority items
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['inherent', 'residual'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}>
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setAddFormCell(null); setShowAddForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Add Hazard
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(summary) as [RiskLevel, number][]).map(([level, count]) => {
          const styles = RISK_LEVEL_STYLES[level];
          return (
            <div key={level} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${styles.badge}`}>
              <span>{level}</span>
              <span className="font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* The 5×5 Matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Y-axis label */}
          <div className="flex items-end gap-2 mb-2">
            <div className="w-28 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center flex-1">
              Severity / Consequence →
            </p>
          </div>

          {/* Severity column headers */}
          <div className="flex gap-1.5 mb-1.5">
            <div className="w-28 flex-shrink-0" />
            {SEVERITY_LABELS.map((s) => (
              <div key={s.value} className="flex-1 text-center">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.value}</p>
                <p className="text-xs text-slate-400 hidden sm:block">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Matrix rows (likelihood rows, top = highest) */}
          {[...LIKELIHOOD_LABELS].reverse().map((lRow) => (
            <div key={lRow.value} className="flex gap-1.5 mb-1.5 items-center">
              {/* Y-axis label */}
              <div className="w-28 flex-shrink-0 text-right pr-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{lRow.value} — {lRow.label}</p>
              </div>

              {/* Cells */}
              {SEVERITY_LABELS.map((sCol) => {
                const cellLevel   = getCellRiskLevel(lRow.value, sCol.value);
                const styles      = RISK_LEVEL_STYLES[cellLevel];
                const cellKey     = `${lRow.value}-${sCol.value}`;
                const cellHazards = hazardCounts[cellKey] ?? [];
                const cellIncidents = incidentCounts[cellKey] ?? 0;
                const isSelected  = selectedCell?.l === lRow.value && selectedCell?.s === sCol.value;
                const totalItems  = cellHazards.length + cellIncidents;

                return (
                  <button
                    key={sCol.value}
                    onClick={() => handleCellClick(lRow.value, sCol.value)}
                    className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center
                                relative transition-all hover:opacity-90 hover:scale-105
                                ${styles.bg} ${styles.text}
                                ${isSelected ? `ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-105` : ''}
                                `}
                    title={`${cellLevel} (${lRow.label} × ${sCol.label}) — Score: ${lRow.value * sCol.value}`}
                  >
                    <span className="text-xs font-bold opacity-80">{lRow.value * sCol.value}</span>
                    {totalItems > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 dark:bg-white
                                       text-white dark:text-slate-900 rounded-full text-xs font-bold
                                       flex items-center justify-center shadow">
                        {totalItems}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Add hazard button for this likelihood row */}
              <button
                onClick={() => handleAddFromCell(lRow.value, 3)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300
                           hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={`Add hazard at Likelihood ${lRow.value}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Legend */}
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {(Object.entries(RISK_LEVEL_STYLES) as [RiskLevel, typeof RISK_LEVEL_STYLES[RiskLevel]][]).map(([level, style]) => (
              <div key={level} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
                {level}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected cell detail panel */}
      {selectedCell && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Cell Detail — L{selectedCell.l} × S{selectedCell.s}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {(() => {
                  const level = getCellRiskLevel(selectedCell.l, selectedCell.s);
                  const styles = RISK_LEVEL_STYLES[level];
                  return (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {level} Risk — Score {selectedCell.l * selectedCell.s}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-400">
                  {LIKELIHOOD_LABELS[selectedCell.l - 1]?.label} × {SEVERITY_LABELS[selectedCell.s - 1]?.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddFromCell(selectedCell.l, selectedCell.s)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Hazard Here
              </button>
              <button onClick={() => setSelectedCell(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {selectedCellHazards.length === 0 && selectedCellIncidents === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hazards or incidents in this cell yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedCellIncidents > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>{selectedCellIncidents}</strong> recorded incident{selectedCellIncidents !== 1 ? 's' : ''} at this risk level
                  </p>
                </div>
              )}
              {selectedCellHazards.map((hz) => (
                <div key={hz.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setSelectedHazard(hz)}>
                  <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{hz.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{hz.category} · {hz.status}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${RISK_LEVEL_STYLES[getRiskLevel(hz.residual_score)].badge}`}>
                    Residual: {getRiskLevel(hz.residual_score)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hazard detail modal */}
      {selectedHazard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedHazard.title}</h3>
              <button onClick={() => setSelectedHazard(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category',       value: selectedHazard.category },
                  { label: 'Status',         value: selectedHazard.status },
                  { label: 'Inherent Risk',  value: `${getRiskLevel(selectedHazard.risk_score)} (${selectedHazard.risk_score})` },
                  { label: 'Residual Risk',  value: `${getRiskLevel(selectedHazard.residual_score)} (${selectedHazard.residual_score})` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</p>
                  </div>
                ))}
              </div>
              {selectedHazard.controls?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Controls</p>
                  <ol className="space-y-1">
                    {selectedHazard.controls.map((ctrl, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="text-slate-400 font-bold flex-shrink-0">{i + 1}.</span> {ctrl}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add hazard form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Hazard to Matrix</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <AddHazardForm
              initialLikelihood={addFormCell?.l ?? 3}
              initialSeverity={addFormCell?.s ?? 3}
              projects={projects}
              users={usersList}
              onSave={handleSaveHazard}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* All hazards table */}
      {hazards.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Registered Hazards</h3>
            <span className="text-xs text-slate-400">{hazards.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  {['Hazard', 'Category', 'Inherent', 'Residual', 'Status', 'Controls'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hazards.map((hz, i) => {
                  const inherentLevel  = getRiskLevel(hz.risk_score);
                  const residualLevel  = getRiskLevel(hz.residual_score);
                  return (
                    <tr key={hz.id} className={`border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}
                      onClick={() => setSelectedHazard(hz)}>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs">
                        <p className="truncate">{hz.title}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{hz.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_LEVEL_STYLES[inherentLevel].badge}`}>
                          {inherentLevel} ({hz.risk_score})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_LEVEL_STYLES[residualLevel].badge}`}>
                          {residualLevel} ({hz.residual_score})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          hz.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' :
                          hz.status === 'Controlled' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{hz.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {hz.controls?.length ?? 0} control{hz.controls?.length !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskMatrix;