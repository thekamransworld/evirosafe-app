import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight, X, User, Calendar, FileText, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

import type { CarStatus, CarPriority, CarType, CorrectiveAction } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<CarStatus, { label: string; color: string; badgeColor: any; icon: React.FC<any> }> = {
  open:        { label: 'Open',        color: 'text-blue-600',   badgeColor: 'blue',   icon: FileText },
  in_progress: { label: 'In Progress', color: 'text-amber-600',  badgeColor: 'yellow', icon: Clock },
  completed:   { label: 'Completed',   color: 'text-green-600',  badgeColor: 'green',  icon: CheckCircle },
  verified:    { label: 'Verified',    color: 'text-emerald-600',badgeColor: 'green',  icon: CheckCircle },
  overdue:     { label: 'Overdue',     color: 'text-red-600',    badgeColor: 'red',    icon: AlertTriangle },
  cancelled:   { label: 'Cancelled',   color: 'text-gray-500',   badgeColor: 'gray',   icon: XCircle },
};

const priorityConfig: Record<CarPriority, { label: string; badgeColor: any; border: string }> = {
  low:      { label: 'Low',      badgeColor: 'gray',   border: 'border-l-gray-400' },
  medium:   { label: 'Medium',   badgeColor: 'yellow', border: 'border-l-yellow-400' },
  high:     { label: 'High',     badgeColor: 'amber',  border: 'border-l-orange-400' },
  critical: { label: 'Critical', badgeColor: 'red',    border: 'border-l-red-500' },
};

const daysUntil = (date: string) => {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── CAR Detail Modal ─────────────────────────────────────────────────────────

const CarDetailModal: React.FC<{
  car: CorrectiveAction;
  onClose: () => void;
  onUpdate: (car: CorrectiveAction) => void;
}> = ({ car, onClose, onUpdate }) => {
  const { can } = useAppContext();
  const [notes, setNotes] = useState(car.notes);
  const [status, setStatus] = useState<CarStatus>(car.status);
  const cfg = statusConfig[car.status];

  const handleSave = () => {
    onUpdate({ ...car, notes, status, updated_at: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-1">{car.car_number}</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{car.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge color={priorityConfig[car.priority].badgeColor}>{priorityConfig[car.priority].label} Priority</Badge>
            <Badge color={statusConfig[status].badgeColor}>{statusConfig[status].label}</Badge>
            <Badge color="gray">{car.action_type.charAt(0).toUpperCase() + car.action_type.slice(1)}</Badge>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300">{car.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span><span className="font-medium">Assigned to:</span> {car.assigned_to}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span><span className="font-medium">Raised by:</span> {car.assigned_by}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span><span className="font-medium">Due:</span> {new Date(car.target_date).toLocaleDateString()}</span>
              </div>
              {car.source_ref && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span><span className="font-medium">Source:</span> {car.source_ref}</span>
                </div>
              )}
            </div>
          </div>

          {car.evidence.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Evidence</p>
              <div className="space-y-1">
                {car.evidence.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <FileText className="w-3 h-3" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {can('update', 'reports') && (
            <div className="space-y-3 pt-4 border-t dark:border-dark-border">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Update Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as CarStatus)}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-dark-background dark:border-dark-border dark:text-white text-sm"
                >
                  {(Object.keys(statusConfig) as CarStatus[]).map(s => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes / Progress Update</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-dark-background dark:border-dark-border dark:text-white text-sm"
                  placeholder="Add progress notes..."
                />
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {can('update', 'reports') && <Button onClick={handleSave}>Save Changes</Button>}
        </footer>
      </div>
    </div>
  );
};

// ─── New CAR Modal ─────────────────────────────────────────────────────────────

const NewCarModal: React.FC<{ onClose: () => void; onSave: (car: Omit<CorrectiveAction, 'org_id'>) => void }> = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    title: '', description: '', action_type: 'corrective' as CarType,
    priority: 'medium' as CarPriority, source: 'management' as CorrectiveAction['source'],
    source_ref: '', assigned_to: '', target_date: '', notes: '',
  });
  const { activeUser } = useAppContext();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title || !form.assigned_to || !form.target_date) {
      alert('Please fill in Title, Assigned To, and Target Date.');
      return;
    }
    const now = new Date().toISOString();
    const count = Math.floor(Math.random() * 9000) + 1000;
    onSave({
      id: `car-${Date.now()}`,
      car_number: `CAR-${new Date().getFullYear()}-${count}`,
      ...form,
      status: 'open',
      evidence: [],
      assigned_by: activeUser?.name || 'HSE Manager',
      created_at: now, updated_at: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Corrective Action</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="Brief description of required action" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="Detailed description of the action required..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Type</label>
              <select value={form.action_type} onChange={e => set('action_type', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm">
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm">
                <option value="incident">Incident</option>
                <option value="audit">Audit</option>
                <option value="inspection">Inspection</option>
                <option value="observation">Observation</option>
                <option value="management">Management</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Source Reference</label>
              <input value={form.source_ref} onChange={e => set('source_ref', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="e.g. INC-2024-0043" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Assigned To *</label>
              <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" placeholder="Name or role" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Target Date *</label>
              <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white text-sm" />
            </div>
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create CAR</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CorrectiveActions: React.FC = () => {
  const { can } = useAppContext();
  const { correctiveActions: cars, handleCreateCorrectiveAction, handleUpdateCorrectiveAction } = useDataContext();
  const [selected, setSelected]   = useState<CorrectiveAction | null>(null);
  const [showNew, setShowNew]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<CarStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<CarPriority | 'all'>('all');

  const filtered = useMemo(() => cars.filter(c => {
    const sMatch = statusFilter   === 'all' || c.status   === statusFilter;
    const pMatch = priorityFilter === 'all' || c.priority === priorityFilter;
    return sMatch && pMatch;
  }), [cars, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    open:     cars.filter(c => c.status === 'open').length,
    overdue:  cars.filter(c => c.status === 'overdue').length,
    progress: cars.filter(c => c.status === 'in_progress').length,
    verified: cars.filter(c => c.status === 'verified').length,
  }), [cars]);

  const handleUpdate = (updated: CorrectiveAction) => handleUpdateCorrectiveAction(updated);

  const handleCreate = (car: Omit<CorrectiveAction, 'org_id'>) => handleCreateCorrectiveAction(car as CorrectiveAction);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Corrective Actions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and close all corrective and preventive actions</p>
        </div>
        {can('create', 'reports') && (
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>New CAR</Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: FileText },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertTriangle },
          { label: 'In Progress', value: stats.progress, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock },
          { label: 'Verified', value: stats.verified, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-4`}>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-1">Status</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', ...Object.keys(statusConfig)] as (CarStatus | 'all')[]).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'}`}>
                  {s === 'all' ? 'All' : statusConfig[s as CarStatus].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-1">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'critical', 'high', 'medium', 'low'] as (CarPriority | 'all')[]).map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${priorityFilter === p ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'}`}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* CAR list */}
      <div className="space-y-3">
        {filtered.map(car => {
          const days = daysUntil(car.target_date);
          const pCfg = priorityConfig[car.priority];
          const sCfg = statusConfig[car.status];
          return (
            <div key={car.id}
              onClick={() => setSelected(car)}
              className={`bg-white dark:bg-dark-card rounded-xl border-l-4 ${pCfg.border} border border-gray-100 dark:border-dark-border p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{car.car_number}</span>
                  <Badge color={pCfg.badgeColor} >{pCfg.label}</Badge>
                  <Badge color={sCfg.badgeColor}>{sCfg.label}</Badge>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white truncate">{car.title}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{car.assigned_to}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {car.status === 'verified' || car.status === 'completed'
                      ? `Closed ${new Date(car.completed_at || car.updated_at).toLocaleDateString()}`
                      : days < 0
                        ? <span className="text-red-500 font-semibold">{Math.abs(days)}d overdue</span>
                        : days === 0
                          ? <span className="text-orange-500 font-semibold">Due today</span>
                          : `${days}d remaining`
                    }
                  </span>
                  {car.source_ref && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />Ref: {car.source_ref}</span>}
                </div>
                {car.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate italic">{car.notes}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No corrective actions match the current filters</p>
          </div>
        )}
      </div>

      {selected && <CarDetailModal car={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
      {showNew && <NewCarModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
    </div>
  );
};