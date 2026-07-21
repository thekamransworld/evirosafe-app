import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, Clock, Users, TrendingUp, Calendar, X, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManHoursEntry {
  id:               string;
  project_id:       string;
  project_name:     string;
  log_date:         string;
  headcount:        number;
  hours_worked:     number;
  contractor_hours: number;
  notes:            string;
  recorded_by:      string;
  created_at:       string;
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const generateMockEntries = (): ManHoursEntry[] => {
  const entries: ManHoursEntry[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    const headcount = Math.floor(Math.random() * 30) + 80;
    entries.push({
      id:               `mh-${i}`,
      project_id:       'proj-001',
      project_name:     'Tower A & B Construction',
      log_date:         date.toISOString().split('T')[0],
      headcount,
      hours_worked:     headcount * (Math.random() > 0.2 ? 9 : 10),
      contractor_hours: Math.floor(Math.random() * 200) + 100,
      notes:            '',
      recorded_by:      'Site HSE Manager',
      created_at:       date.toISOString(),
    });
  }
  return entries;
};

const MOCK_ENTRIES = generateMockEntries();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatHours = (h: number) => h.toLocaleString('en-US', { maximumFractionDigits: 0 });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getWeeklyTotals = (entries: ManHoursEntry[]) => {
  const weeks: { week: string; hours: number; headcount: number }[] = [];
  const sorted = [...entries].sort((a, b) => a.log_date.localeCompare(b.log_date));
  let weekStart = '';
  let weekHours = 0;
  let weekHead  = 0;
  sorted.forEach((e, i) => {
    const d    = new Date(e.log_date);
    const wk   = `W${Math.ceil(d.getDate() / 7)} ${MONTHS[d.getMonth()]}`;
    if (wk !== weekStart) {
      if (weekStart) weeks.push({ week: weekStart, hours: weekHours, headcount: weekHead });
      weekStart = wk; weekHours = 0; weekHead = 0;
    }
    weekHours += e.hours_worked + e.contractor_hours;
    weekHead   = Math.max(weekHead, e.headcount);
    if (i === sorted.length - 1) weeks.push({ week: wk, hours: weekHours, headcount: weekHead });
  });
  return weeks.slice(-6);
};

// ─── New Entry Modal ──────────────────────────────────────────────────────────

const NewEntryModal: React.FC<{
  onClose: () => void;
  onSave:  (entry: ManHoursEntry) => void;
  projects: { id: string; name: string }[];
}> = ({ onClose, onSave, projects }) => {
  const { activeUser } = useAppContext();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    project_id:       projects[0]?.id || '',
    log_date:         today,
    headcount:        '100',
    hours_worked:     '900',
    contractor_hours: '0',
    notes:            '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const hc = parseInt(form.headcount);
    const hw = parseFloat(form.hours_worked);
    if (!hc || !hw) { alert('Headcount and Hours Worked are required.'); return; }
    const proj = projects.find(p => p.id === form.project_id);
    onSave({
      id:               `mh-${Date.now()}`,
      project_id:       form.project_id,
      project_name:     proj?.name || '',
      log_date:         form.log_date,
      headcount:        hc,
      hours_worked:     hw,
      contractor_hours: parseFloat(form.contractor_hours) || 0,
      notes:            form.notes,
      recorded_by:      activeUser?.name || 'HSE Officer',
      created_at:       new Date().toISOString(),
    });
    onClose();
  };

  const totalHours = (parseFloat(form.hours_worked) || 0) + (parseFloat(form.contractor_hours) || 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Man Hours</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Date *</label>
              <input type="date" value={form.log_date} onChange={e => set('log_date', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Project</label>
              <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {projects.length === 0 && <option value="">No projects</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Headcount *</label>
              <input type="number" value={form.headcount} onChange={e => set('headcount', e.target.value)} min="0"
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Own Staff Hours *</label>
              <input type="number" value={form.hours_worked} onChange={e => set('hours_worked', e.target.value)} min="0"
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Contractor Hours</label>
            <input type="number" value={form.contractor_hours} onChange={e => set('contractor_hours', e.target.value)} min="0"
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>

          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">Total Hours Today</span>
            <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{formatHours(totalHours)}</span>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Holiday, shutdown, weather delay..."
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Entry</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────

const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1">
    <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ManHoursLogger: React.FC = () => {
  const { projects } = useDataContext();
  const { can } = useAppContext();
  const [entries, setEntries]   = useState<ManHoursEntry[]>(MOCK_ENTRIES);
  const [showNew, setShowNew]   = useState(false);
  const [showAll, setShowAll]   = useState(false);

  const stats = useMemo(() => {
    const total     = entries.reduce((s, e) => s + e.hours_worked + e.contractor_hours, 0);
    const thisMonth = entries.filter(e => e.log_date.startsWith(new Date().toISOString().slice(0, 7)))
                             .reduce((s, e) => s + e.hours_worked + e.contractor_hours, 0);
    const today     = entries.find(e => e.log_date === new Date().toISOString().split('T')[0]);
    const avgDaily  = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.headcount, 0) / entries.length) : 0;
    return { total, thisMonth, today: today ? today.hours_worked + today.contractor_hours : 0, avgDaily };
  }, [entries]);

  const weeklyData = useMemo(() => getWeeklyTotals(entries), [entries]);
  const maxWeekly  = Math.max(...weeklyData.map(w => w.hours), 1);

  const displayEntries = showAll ? entries : entries.slice(-10);

  const handleSave = (entry: ManHoursEntry) =>
    setEntries(prev => {
      const existing = prev.findIndex(e => e.log_date === entry.log_date && e.project_id === entry.project_id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [entry, ...prev].sort((a, b) => b.log_date.localeCompare(a.log_date));
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Man Hours Logger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Daily records feed LTIR / TRIR / DART rate calculations
          </p>
        </div>
        {can('create', 'reports') && (
          <Button onClick={() => setShowNew(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Log Today's Hours
          </Button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total (All Time)',  value: formatHours(stats.total),     icon: Clock,      color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'This Month',        value: formatHours(stats.thisMonth), icon: Calendar,   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: "Today's Hours",     value: formatHours(stats.today),     icon: TrendingUp, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Avg Daily Workers', value: stats.avgDaily,               icon: Users,      color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
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

      {/* Weekly trend */}
      <Card title="Weekly Hours Trend (Last 6 Weeks)">
        <div className="space-y-3">
          {weeklyData.map(w => (
            <div key={w.week}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{w.week}</span>
                <span className="text-gray-500">{formatHours(w.hours)} hrs · {w.headcount} workers</span>
              </div>
              <MiniBar value={w.hours} max={maxWeekly} color="bg-primary-500" />
            </div>
          ))}
        </div>
      </Card>

      {/* Log table */}
      <Card title={`Daily Log (${entries.length} entries)`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b dark:border-dark-border">
                {['Date', 'Project', 'Headcount', 'Own Hours', 'Contractor Hrs', 'Total', 'Recorded By'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...displayEntries].sort((a, b) => b.log_date.localeCompare(a.log_date)).map((entry, i) => (
                <tr key={entry.id} className={`border-b dark:border-dark-border/50 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-white/5'}`}>
                  <td className="py-2.5 px-3 font-mono text-xs text-gray-600 dark:text-gray-400">{entry.log_date}</td>
                  <td className="py-2.5 px-3 text-xs text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{entry.project_name || '—'}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-gray-800 dark:text-gray-200">{entry.headcount}</td>
                  <td className="py-2.5 px-3 text-center text-gray-700 dark:text-gray-300">{formatHours(entry.hours_worked)}</td>
                  <td className="py-2.5 px-3 text-center text-gray-500 dark:text-gray-400">{formatHours(entry.contractor_hours)}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-primary-600 dark:text-primary-400">
                    {formatHours(entry.hours_worked + entry.contractor_hours)}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{entry.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 10 && (
          <button onClick={() => setShowAll(p => !p)}
            className="w-full mt-4 py-2 text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1 hover:underline">
            <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? 'Show less' : `Show all ${entries.length} entries`}
          </button>
        )}
      </Card>

      {showNew && (
        <NewEntryModal
          onClose={() => setShowNew(false)}
          onSave={handleSave}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
};