import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { Plus, AlertTriangle, CheckCircle, Clock, X, Search, BookOpen, Award, ChevronRight, User } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingStatus = 'current' | 'expiring_soon' | 'expired' | 'not_started' | 'in_progress';
export type TrainingCategory =
  | 'safety_induction' | 'first_aid' | 'fire_fighting' | 'working_at_height'
  | 'confined_space' | 'rigging_lifting' | 'electrical' | 'scaffolding'
  | 'environmental' | 'leadership' | 'regulatory' | 'other';

export interface TrainingCourseReq {
  id:               string;
  name:             string;
  category:         TrainingCategory;
  description:      string;
  validity_months:  number;
  is_mandatory:     boolean;
  required_roles:   string[];
  provider?:        string;
}

export interface TrainingRecord {
  id:               string;
  worker_id:        string;
  worker_name:      string;
  worker_role:      string;
  worker_company:   string;
  course_id:        string;
  training_date:    string;
  expiry_date:      string | null;
  certificate_no:   string;
  result:           'pass' | 'fail' | 'pending';
  score?:           number;
  provider:         string;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: Record<TrainingCategory, { label: string; color: string }> = {
  safety_induction:  { label: 'Safety Induction',   color: 'blue' },
  first_aid:         { label: 'First Aid',           color: 'red' },
  fire_fighting:     { label: 'Fire Fighting',       color: 'red' },
  working_at_height: { label: 'Working at Height',   color: 'orange' },
  confined_space:    { label: 'Confined Space',      color: 'purple' },
  rigging_lifting:   { label: 'Rigging & Lifting',   color: 'amber' },
  electrical:        { label: 'Electrical Safety',   color: 'yellow' },
  scaffolding:       { label: 'Scaffolding',         color: 'blue' },
  environmental:     { label: 'Environmental',       color: 'green' },
  leadership:        { label: 'Leadership',          color: 'indigo' },
  regulatory:        { label: 'Regulatory',          color: 'gray' },
  other:             { label: 'Other',               color: 'gray' },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_COURSES: TrainingCourseReq[] = [
  { id: 'c1', name: 'Site Safety Induction',              category: 'safety_induction',  description: 'Mandatory induction for all site personnel',    validity_months: 12, is_mandatory: true,  required_roles: ['WORKER','SUPERVISOR'], provider: 'In-house' },
  { id: 'c2', name: 'First Aid at Work (3-day)',           category: 'first_aid',         description: 'Qualified first aider certification',           validity_months: 36, is_mandatory: false, required_roles: ['SUPERVISOR','HSE_MANAGER'], provider: 'St. John Ambulance' },
  { id: 'c3', name: 'Working at Height (PASMA/IPAF)',      category: 'working_at_height', description: 'Scaffold and MEWP operation certification',     validity_months: 60, is_mandatory: true,  required_roles: ['WORKER','SUPERVISOR'], provider: 'PASMA' },
  { id: 'c4', name: 'Confined Space Entry',               category: 'confined_space',    description: 'Entry, standby and rescue training',             validity_months: 12, is_mandatory: false, required_roles: ['WORKER','SUPERVISOR'], provider: 'British Safety Council' },
  { id: 'c5', name: 'Slinger/Signaller (CPCS)',           category: 'rigging_lifting',   description: 'Lifting operations certification',              validity_months: 60, is_mandatory: false, required_roles: ['WORKER'], provider: 'CPCS' },
  { id: 'c6', name: 'Fire Warden Training',               category: 'fire_fighting',     description: 'Fire prevention and emergency response',        validity_months: 12, is_mandatory: true,  required_roles: ['SUPERVISOR','HSE_MANAGER'], provider: 'In-house' },
  { id: 'c7', name: 'Manual Handling',                    category: 'other',             description: 'Safe lifting and handling techniques',          validity_months: 36, is_mandatory: true,  required_roles: ['WORKER','SUPERVISOR'], provider: 'In-house' },
  { id: 'c8', name: 'HSE Manager Certification (NEBOSH)', category: 'regulatory',        description: 'NEBOSH National General Certificate',           validity_months: 0,  is_mandatory: false, required_roles: ['HSE_MANAGER'], provider: 'NEBOSH' },
];

const MOCK_WORKERS = [
  { id: 'w1', name: 'Carlos Rivera',  role: 'Steel Fixer',     company: 'SteelCo' },
  { id: 'w2', name: 'James Okafor',   role: 'Rigger',          company: 'SteelCo' },
  { id: 'w3', name: 'Priya Sharma',   role: 'Carpenter',       company: 'FormworkPro' },
  { id: 'w4', name: 'Mohamed Hassan', role: 'Labourer',        company: 'SteelCo' },
  { id: 'w5', name: 'Sarah Mitchell', role: 'HSE Officer',     company: 'Main Contractor' },
  { id: 'w6', name: 'Tony Mensah',    role: 'Welder',          company: 'WeldPro' },
];

const MOCK_RECORDS: TrainingRecord[] = [
  { id: 'r1',  worker_id: 'w1', worker_name: 'Carlos Rivera',  worker_role: 'Steel Fixer', worker_company: 'SteelCo',         course_id: 'c1', training_date: '2024-01-15', expiry_date: '2025-01-15', certificate_no: 'IND-001', result: 'pass', score: 92,  provider: 'In-house' },
  { id: 'r2',  worker_id: 'w1', worker_name: 'Carlos Rivera',  worker_role: 'Steel Fixer', worker_company: 'SteelCo',         course_id: 'c3', training_date: '2022-03-10', expiry_date: '2027-03-10', certificate_no: 'PASMA-445', result: 'pass',           provider: 'PASMA' },
  { id: 'r3',  worker_id: 'w1', worker_name: 'Carlos Rivera',  worker_role: 'Steel Fixer', worker_company: 'SteelCo',         course_id: 'c7', training_date: '2023-06-01', expiry_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], certificate_no: 'MH-202', result: 'pass', provider: 'In-house' },
  { id: 'r4',  worker_id: 'w2', worker_name: 'James Okafor',   worker_role: 'Rigger',      worker_company: 'SteelCo',         course_id: 'c1', training_date: '2024-02-20', expiry_date: '2025-02-20', certificate_no: 'IND-002', result: 'pass',           provider: 'In-house' },
  { id: 'r5',  worker_id: 'w2', worker_name: 'James Okafor',   worker_role: 'Rigger',      worker_company: 'SteelCo',         course_id: 'c5', training_date: '2021-07-14', expiry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], certificate_no: 'CPCS-889', result: 'pass', provider: 'CPCS' },
  { id: 'r6',  worker_id: 'w3', worker_name: 'Priya Sharma',   worker_role: 'Carpenter',   worker_company: 'FormworkPro',     course_id: 'c1', training_date: '2024-03-05', expiry_date: '2025-03-05', certificate_no: 'IND-003', result: 'pass',           provider: 'In-house' },
  { id: 'r7',  worker_id: 'w3', worker_name: 'Priya Sharma',   worker_role: 'Carpenter',   worker_company: 'FormworkPro',     course_id: 'c7', training_date: '2022-09-12', expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], certificate_no: 'MH-410', result: 'pass', provider: 'In-house' },
  { id: 'r8',  worker_id: 'w4', worker_name: 'Mohamed Hassan', worker_role: 'Labourer',    worker_company: 'SteelCo',         course_id: 'c1', training_date: '2023-11-01', expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  certificate_no: 'IND-004', result: 'pass', provider: 'In-house' },
  { id: 'r9',  worker_id: 'w5', worker_name: 'Sarah Mitchell', worker_role: 'HSE Officer', worker_company: 'Main Contractor', course_id: 'c2', training_date: '2023-04-18', expiry_date: '2026-04-18', certificate_no: 'FA-2310', result: 'pass', score: 88,  provider: 'St. John Ambulance' },
  { id: 'r10', worker_id: 'w5', worker_name: 'Sarah Mitchell', worker_role: 'HSE Officer', worker_company: 'Main Contractor', course_id: 'c6', training_date: '2024-01-10', expiry_date: '2025-01-10', certificate_no: 'FW-501',  result: 'pass',           provider: 'In-house' },
  { id: 'r11', worker_id: 'w5', worker_name: 'Sarah Mitchell', worker_role: 'HSE Officer', worker_company: 'Main Contractor', course_id: 'c8', training_date: '2020-06-25', expiry_date: null,         certificate_no: 'NEBOSH-3344', result: 'pass', score: 74, provider: 'NEBOSH' },
  { id: 'r12', worker_id: 'w6', worker_name: 'Tony Mensah',    worker_role: 'Welder',      worker_company: 'WeldPro',         course_id: 'c1', training_date: '2024-04-01', expiry_date: '2025-04-01', certificate_no: 'IND-006', result: 'pass',           provider: 'In-house' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTrainingStatus = (record: TrainingRecord | undefined): TrainingStatus => {
  if (!record) return 'not_started';
  if (record.result === 'pending') return 'in_progress';
  if (!record.expiry_date) return 'current';
  const daysLeft = Math.ceil((new Date(record.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)  return 'expired';
  if (daysLeft <= 30) return 'expiring_soon';
  return 'current';
};

const statusConfig: Record<TrainingStatus, { label: string; color: any; icon: React.FC<any> }> = {
  current:       { label: 'Current',       color: 'green',  icon: CheckCircle },
  expiring_soon: { label: 'Expiring Soon', color: 'yellow', icon: Clock },
  expired:       { label: 'Expired',       color: 'red',    icon: AlertTriangle },
  not_started:   { label: 'Not Started',   color: 'gray',   icon: User },
  in_progress:   { label: 'In Progress',   color: 'blue',   icon: Clock },
};

const daysLeft = (date: string | null) => {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

// ─── Matrix Cell ──────────────────────────────────────────────────────────────

const MatrixCell: React.FC<{ record?: TrainingRecord; onClick: () => void }> = ({ record, onClick }) => {
  const status = getTrainingStatus(record);
  const cfg = statusConfig[status];
  const days = record?.expiry_date ? daysLeft(record.expiry_date) : null;

  const cellColors: Record<TrainingStatus, string> = {
    current:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    expiring_soon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    expired:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    not_started:   'bg-gray-50 dark:bg-gray-800/30 text-gray-400 border-gray-200 dark:border-gray-700',
    in_progress:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  };

  return (
    <td className="p-1">
      <button onClick={onClick}
        className={`w-full h-12 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 hover:scale-105 flex flex-col items-center justify-center ${cellColors[status]}`}>
        <cfg.icon className="w-3.5 h-3.5 mb-0.5" />
        {status === 'expiring_soon' && days !== null && <span>{days}d</span>}
        {status === 'expired' && days !== null && <span>{Math.abs(days)}d ago</span>}
        {status === 'current' && record?.expiry_date && <span>{new Date(record.expiry_date).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>}
        {status === 'not_started' && <span>—</span>}
      </button>
    </td>
  );
};

// ─── Record Detail Modal ──────────────────────────────────────────────────────

const RecordModal: React.FC<{
  worker: typeof MOCK_WORKERS[0];
  course: TrainingCourseReq;
  record?: TrainingRecord;
  onClose: () => void;
  onSave: (record: TrainingRecord) => void;
}> = ({ worker, course, record, onClose, onSave }) => {
  const status = getTrainingStatus(record);
  const [form, setForm] = useState({
    training_date: record?.training_date || new Date().toISOString().split('T')[0],
    expiry_date:   record?.expiry_date || (course.validity_months > 0
      ? new Date(Date.now() + course.validity_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : ''),
    certificate_no: record?.certificate_no || '',
    result:         record?.result || 'pass' as 'pass' | 'fail' | 'pending',
    score:          record?.score || undefined as number | undefined,
    provider:       record?.provider || course.provider || '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const cat = CATEGORIES[course.category];

  const handleSave = () => {
    onSave({
      id:             record?.id || `r-${Date.now()}`,
      worker_id:      worker.id,
      worker_name:    worker.name,
      worker_role:    worker.role,
      worker_company: worker.company,
      course_id:      course.id,
      ...form,
      expiry_date:    form.expiry_date || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={cat.color as any}>{cat.label}</Badge>
              <Badge color={statusConfig[status].color}>{statusConfig[status].label}</Badge>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{course.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{worker.name} — {worker.role}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Training Date</label>
              <input type="date" value={form.training_date} onChange={e => set('training_date', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Expiry Date {course.validity_months === 0 && <span className="text-gray-400">(no expiry)</span>}
              </label>
              <input type="date" value={form.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)} disabled={course.validity_months === 0} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white disabled:opacity-50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Result</label>
              <select value={form.result} onChange={e => set('result', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Score (%)</label>
              <input type="number" value={form.score || ''} onChange={e => set('score', e.target.value ? +e.target.value : undefined)} min={0} max={100} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Certificate Number</label>
            <input value={form.certificate_no} onChange={e => set('certificate_no', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. PASMA-12345" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Training Provider</label>
            <input value={form.provider} onChange={e => set('provider', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{record ? 'Update Record' : 'Add Record'}</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const TrainingMatrix: React.FC = () => {
  const [records, setRecords]     = useState<TrainingRecord[]>(MOCK_RECORDS);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<TrainingCategory | 'all'>('all');
  const [editCell, setEditCell]   = useState<{ worker: typeof MOCK_WORKERS[0]; course: TrainingCourseReq } | null>(null);
  const [viewMode, setViewMode]   = useState<'matrix' | 'alerts'>('matrix');

  const filteredCourses = useMemo(() =>
    MOCK_COURSES.filter(c => catFilter === 'all' || c.category === catFilter),
    [catFilter]);

  const filteredWorkers = useMemo(() =>
    MOCK_WORKERS.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.company.toLowerCase().includes(search.toLowerCase())),
    [search]);

  const getRecord = (workerId: string, courseId: string) =>
    records.find(r => r.worker_id === workerId && r.course_id === courseId);

  const alertRecords = useMemo(() =>
    records.filter(r => ['expiring_soon', 'expired'].includes(getTrainingStatus(r))).sort((a, b) => {
      const da = daysLeft(a.expiry_date) ?? 9999;
      const db = daysLeft(b.expiry_date) ?? 9999;
      return da - db;
    }),
    [records]);

  const stats = useMemo(() => ({
    total:   records.length,
    current: records.filter(r => getTrainingStatus(r) === 'current').length,
    expiring: records.filter(r => getTrainingStatus(r) === 'expiring_soon').length,
    expired: records.filter(r => getTrainingStatus(r) === 'expired').length,
  }), [records]);

  const handleSave = (record: TrainingRecord) =>
    setRecords(prev => {
      const exists = prev.find(r => r.id === record.id);
      return exists ? prev.map(r => r.id === record.id ? record : r) : [...prev, record];
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Training Matrix</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Competency and certification tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'matrix' ? 'primary' : 'secondary'} onClick={() => setViewMode('matrix')}>Matrix View</Button>
          <Button variant={viewMode === 'alerts' ? 'primary' : 'secondary'} onClick={() => setViewMode('alerts')}>
            Alerts {alertRecords.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{alertRecords.length}</span>}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records',  value: stats.total,   icon: Award,         color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Current',        value: stats.current, icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Expiring ≤30d',  value: stats.expiring,icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Expired',        value: stats.expired, icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
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

      {viewMode === 'matrix' ? (
        <>
          {/* Filters */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..." className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCatFilter('all')} className={`px-3 py-1 rounded-full text-xs font-semibold ${catFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>All</button>
                {(Object.entries(CATEGORIES) as [TrainingCategory, { label: string }][]).map(([k, v]) => (
                  <button key={k} onClick={() => setCatFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold ${catFilter === k ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>{v.label}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex gap-4 flex-wrap text-xs">
            {(Object.entries(statusConfig) as [TrainingStatus, any][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <v.icon className="w-3.5 h-3.5" />
                <span className="text-gray-600 dark:text-gray-400">{v.label}</span>
              </div>
            ))}
            <span className="text-gray-400">· Click any cell to add/edit record</span>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-dark-border">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-card">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-dark-card p-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 min-w-[180px] border-b dark:border-dark-border">Worker</th>
                  {filteredCourses.map(c => (
                    <th key={c.id} className="p-2 text-center border-b dark:border-dark-border min-w-[90px]">
                      <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 leading-tight">{c.name}</div>
                      {c.validity_months > 0 && <div className="text-[9px] text-gray-400">{c.validity_months}mo</div>}
                      {c.is_mandatory && <div className="text-[9px] text-red-500 font-bold">MANDATORY</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker, i) => (
                  <tr key={worker.id} className={i % 2 === 0 ? 'bg-white dark:bg-dark-background' : 'bg-gray-50/50 dark:bg-dark-card'}>
                    <td className="sticky left-0 z-10 p-3 bg-inherit border-b dark:border-dark-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs flex-shrink-0">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{worker.name}</p>
                          <p className="text-[10px] text-gray-500">{worker.role}</p>
                        </div>
                      </div>
                    </td>
                    {filteredCourses.map(course => (
                      <MatrixCell
                        key={course.id}
                        record={getRecord(worker.id, course.id)}
                        onClick={() => setEditCell({ worker, course })}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Alerts view */
        <div className="space-y-3">
          {alertRecords.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>All training records are current</p>
            </div>
          ) : (
            alertRecords.map(record => {
              const course = MOCK_COURSES.find(c => c.id === record.course_id);
              const status = getTrainingStatus(record);
              const cfg    = statusConfig[status];
              const days   = daysLeft(record.expiry_date);
              return (
                <div key={record.id}
                  onClick={() => {
                    const worker = MOCK_WORKERS.find(w => w.id === record.worker_id);
                    if (worker && course) setEditCell({ worker, course });
                  }}
                  className={`bg-white dark:bg-dark-card rounded-xl border ${status === 'expired' ? 'border-red-200 dark:border-red-900' : 'border-yellow-200 dark:border-yellow-900'} p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4`}>
                  <cfg.icon className={`w-8 h-8 flex-shrink-0 ${status === 'expired' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{record.worker_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{course?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{record.worker_company} — {record.worker_role}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge color={cfg.color}>{cfg.label}</Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {days !== null && days < 0 ? `Expired ${Math.abs(days)}d ago` : `Expires in ${days}d`}
                    </p>
                    <p className="text-xs text-gray-400">{record.expiry_date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              );
            })
          )}
        </div>
      )}

      {editCell && (
        <RecordModal
          worker={editCell.worker}
          course={editCell.course}
          record={getRecord(editCell.worker.id, editCell.course.id)}
          onClose={() => setEditCell(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};