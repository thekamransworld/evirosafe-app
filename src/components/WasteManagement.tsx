import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import type { WasteType, DisposalMethod, WasteRecord } from '../types';
import {
  Plus, X, Trash2, TrendingDown, BarChart2,
  Calendar, FileText, ChevronRight, Recycle,
  AlertTriangle, Droplets, Zap, Leaf
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const WASTE_CONFIG: Record<WasteType, { label: string; color: any; icon: React.FC<any>; bg: string }> = {
  general:      { label: 'General Waste',      color: 'gray',   icon: Trash2,         bg: 'bg-gray-50 dark:bg-gray-800/30' },
  hazardous:    { label: 'Hazardous',          color: 'red',    icon: AlertTriangle,  bg: 'bg-red-50 dark:bg-red-900/20' },
  recyclable:   { label: 'Recyclable',         color: 'green',  icon: Recycle,        bg: 'bg-green-50 dark:bg-green-900/20' },
  electronic:   { label: 'Electronic (WEEE)',  color: 'blue',   icon: Zap,            bg: 'bg-blue-50 dark:bg-blue-900/20' },
  chemical:     { label: 'Chemical',           color: 'purple', icon: Droplets,       bg: 'bg-purple-50 dark:bg-purple-900/20' },
  construction: { label: 'Construction Waste', color: 'amber',  icon: Trash2,         bg: 'bg-amber-50 dark:bg-amber-900/20' },
  organic:      { label: 'Organic',            color: 'green',  icon: Leaf,           bg: 'bg-green-50 dark:bg-green-900/20' },
  medical:      { label: 'Medical',            color: 'pink',   icon: AlertTriangle,  bg: 'bg-pink-50 dark:bg-pink-900/20' },
  other:        { label: 'Other',              color: 'gray',   icon: Trash2,         bg: 'bg-gray-50 dark:bg-gray-800/30' },
};

const DISPOSAL_CONFIG: Record<DisposalMethod, { label: string; color: any }> = {
  landfill:     { label: 'Landfill',     color: 'gray' },
  recycling:    { label: 'Recycling',    color: 'green' },
  incineration: { label: 'Incineration', color: 'red' },
  treatment:    { label: 'Treatment',    color: 'blue' },
  storage:      { label: 'Storage',      color: 'yellow' },
  reuse:        { label: 'Reuse',        color: 'green' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── New Entry Modal ──────────────────────────────────────────────────────────

const NewWasteModal: React.FC<{ onClose: () => void; onSave: (r: WasteRecord) => void }> = ({ onClose, onSave }) => {
  const { activeUser, activeOrg } = useAppContext();
  const { projects } = useDataContext();
  const [form, setForm] = useState({
    waste_date: new Date().toISOString().split('T')[0],
    waste_type: 'general' as WasteType, description: '',
    quantity: '', unit: 'kg', disposal_method: 'landfill' as DisposalMethod,
    disposal_contractor: '', manifest_number: '', notes: '',
    project_id: projects[0]?.id || '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.description || !form.quantity) { alert('Description and quantity required.'); return; }
    const { project_id, ...rest } = form;
    const project = projects.find(p => p.id === project_id);
    onSave({
      id: `w-${Date.now()}`,
      org_id: activeOrg?.id ?? '',
      ...rest,
      quantity: parseFloat(form.quantity),
      recorded_by: activeUser?.name || 'HSE Officer',
      project_id: project_id,
      project_name: project?.name || 'Unassigned',
      created_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold dark:text-white">Log Waste Disposal</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Date</label>
              <input type="date" value={form.waste_date} onChange={e => set('waste_date', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Waste Type</label>
              <select value={form.waste_type} onChange={e => set('waste_type', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                {(Object.entries(WASTE_CONFIG) as [WasteType, { label: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Description *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Describe the waste stream..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" min="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                {['kg', 't', 'L', 'm³', 'units'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Disposal Method</label>
              <select value={form.disposal_method} onChange={e => set('disposal_method', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                {(Object.entries(DISPOSAL_CONFIG) as [DisposalMethod, { label: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Contractor</label>
              <input value={form.disposal_contractor} onChange={e => set('disposal_contractor', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Waste contractor" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Project</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Waste Transfer Note / Manifest No.</label>
            <input value={form.manifest_number} onChange={e => set('manifest_number', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. MAN-2024-0342" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Record</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WasteManagement: React.FC = () => {
  const { can } = useAppContext();
  const { wasteRecordList, handleCreateWasteRecord } = useDataContext();
  const records = wasteRecordList;
  const [showNew, setShowNew]     = useState(false);
  const [typeFilter, setTypeFilter] = useState<WasteType | 'all'>('all');

  const filtered = useMemo(() =>
    records.filter(r => typeFilter === 'all' || r.waste_type === typeFilter)
           .sort((a, b) => b.waste_date.localeCompare(a.waste_date)),
    [records, typeFilter]);

  const stats = useMemo(() => {
    const active = records;
    const totalKg   = active.reduce((s, r) => s + (r.unit === 'kg' ? r.quantity : r.unit === 't' ? r.quantity * 1000 : 0), 0);
    const hazardous = active.filter(r => r.waste_type === 'hazardous' || r.waste_type === 'chemical').reduce((s, r) => s + r.quantity, 0);
    const recycled  = active.filter(r => r.disposal_method === 'recycling' || r.disposal_method === 'reuse').reduce((s, r) => s + r.quantity, 0);
    const totalAll  = active.reduce((s, r) => s + r.quantity, 0);
    const recycleRate = totalAll > 0 ? Math.round((recycled / totalAll) * 100) : 0;
    return { totalKg: Math.round(totalKg / 1000), hazardous: Math.round(hazardous), recycleRate, manifests: active.filter(r => r.manifest_number).length };
  }, [records]);

  // Monthly breakdown for last 6 months
  const monthlyBreakdown = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      const monthRecs = records.filter(r => {
        const rd = new Date(r.waste_date);
        return rd.getFullYear() === yr && rd.getMonth() === mo;
      });
      const general   = monthRecs.filter(r => r.waste_type === 'general').reduce((s, r) => s + r.quantity, 0);
      const recyc     = monthRecs.filter(r => r.waste_type === 'recyclable').reduce((s, r) => s + r.quantity, 0);
      const haz       = monthRecs.filter(r => r.waste_type === 'hazardous' || r.waste_type === 'chemical').reduce((s, r) => s + r.quantity, 0);
      const constr    = monthRecs.filter(r => r.waste_type === 'construction').reduce((s, r) => s + r.quantity, 0);
      return { month: MONTHS[mo], general: Math.round(general), recyclable: Math.round(recyc), hazardous: Math.round(haz), construction: Math.round(constr) };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Waste Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Disposal records and environmental reporting</p>
        </div>
        {can('create', 'reports') && (
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Waste</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Waste (tonnes)', value: stats.totalKg,     icon: Trash2,      color: 'text-gray-600',   bg: 'bg-gray-50 dark:bg-gray-800/40' },
          { label: 'Hazardous (kg)',       value: stats.hazardous,   icon: AlertTriangle,color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Recycle / Reuse Rate', value: `${stats.recycleRate}%`, icon: Recycle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Manifests Issued',     value: stats.manifests,   icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
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

      {/* Monthly summary table */}
      <Card title="Monthly Waste Summary (kg)">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b dark:border-dark-border">
                {['Month', 'General', 'Recyclable', 'Hazardous', 'Construction', 'Total'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((row, i) => {
                const total = row.general + row.recyclable + row.hazardous + row.construction;
                return (
                  <tr key={row.month} className={`border-b dark:border-dark-border/50 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-white/5'}`}>
                    <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">{row.month}</td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{row.general.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-green-600 dark:text-green-400">{row.recyclable.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-red-600 dark:text-red-400">{row.hazardous.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">{row.construction.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('all')} className={`px-3 py-1 rounded-full text-xs font-semibold ${typeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>All Types</button>
        {(Object.entries(WASTE_CONFIG) as [WasteType, { label: string }][]).map(([k, v]) => (
          <button key={k} onClick={() => setTypeFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold ${typeFilter === k ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>{v.label}</button>
        ))}
      </div>

      {/* Records list */}
      <div className="space-y-2">
        {filtered.map(record => {
          const wCfg = WASTE_CONFIG[record.waste_type];
          const dCfg = DISPOSAL_CONFIG[record.disposal_method];
          return (
            <div key={record.id} className={`${wCfg.bg} rounded-xl border border-gray-100 dark:border-dark-border p-4 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60 dark:bg-black/20">
                <wCfg.icon className={`w-5 h-5 text-${wCfg.color}-600`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge color={wCfg.color}>{wCfg.label}</Badge>
                  <Badge color={dCfg.color}>{dCfg.label}</Badge>
                  {record.manifest_number && <span className="text-xs font-mono text-gray-400">{record.manifest_number}</span>}
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{record.description}</p>
                <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{record.waste_date}</span>
                  <span>{record.disposal_contractor || 'No contractor'}</span>
                  <span>{record.recorded_by}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black text-gray-900 dark:text-white">{record.quantity.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{record.unit}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && <NewWasteModal onClose={() => setShowNew(false)} onSave={handleCreateWasteRecord} />}
    </div>
  );
};