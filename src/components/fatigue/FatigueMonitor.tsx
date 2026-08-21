/**
 * FILE: src/components/fatigue/FatigueMonitor.tsx
 * PASTE AT: src/components/fatigue/FatigueMonitor.tsx
 *           (create fatigue/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import FatigueMonitor from './components/fatigue/FatigueMonitor';
 *   {activePage === 'fatigue' && <FatigueMonitor />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'fatigue', label: 'Fatigue & FFD', icon: Activity,
 *     roles: ['admin', 'hse_manager', 'supervisor'] }
 *
 * Fatigue & Fitness-for-Duty (FFD) Monitoring Module
 * Features:
 *  - Shift hour tracker (daily logs per worker)
 *  - Fatigue risk score calculator (hours worked, sleep, travel)
 *  - Supervisor FFD clearance workflow
 *  - Automatic alert when worker exceeds hour thresholds
 *  - Work hour limits: 12h/day, 60h/week, 240h/28-day period
 *  - FFD self-declaration form for workers
 *  - Risk band: Low / Moderate / High / Extreme
 */

import React, { useState, useMemo } from 'react';
import {
  Activity, Plus, AlertTriangle, CheckCircle2,
  Clock, User, Download, ChevronDown, XCircle,
  Moon, Sun, BarChart2,
} from 'lucide-react';
import { useAppContext, useDataContext } from '../../contexts';
import type { ShiftLog, FfdAssessment } from '../../types';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';
import { writeAuditLog } from '../../lib/auditLogger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FatigueRisk  = 'Low' | 'Moderate' | 'High' | 'Extreme';
type FfdStatus    = 'Cleared' | 'Restricted' | 'Unfit' | 'Pending';
type ShiftType    = 'Day' | 'Night' | 'Extended';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// IOGP / Safe Work Australia fatigue limits
const HOUR_LIMITS = {
  daily:      12,    // max hours per shift
  weekly:     60,    // max hours per 7 days
  monthly:    240,   // max hours per 28 days
  minSleep:   6,     // minimum sleep hours
  maxTravel:  4,     // max combined travel per day
};

const uid = () => `ftg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const RISK_CONFIG: Record<FatigueRisk, { color: string; bg: string; border: string; label: string }> = {
  Low:      { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950', border: 'border-emerald-300', label: 'Low Risk' },
  Moderate: { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950',    border: 'border-amber-300',   label: 'Moderate Risk' },
  High:     { color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-950',  border: 'border-orange-300',  label: 'High Risk' },
  Extreme:  { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950',        border: 'border-red-400',     label: 'Extreme Risk — Do Not Work' },
};

const FFD_CONFIG: Record<FfdStatus, { color: string; bg: string }> = {
  Cleared:    { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  Restricted: { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950' },
  Unfit:      { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950' },
  Pending:    { color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-950' },
};

const FATIGUE_SYMPTOMS = [
  'Difficulty concentrating', 'Irritability', 'Slowed reactions',
  'Microsleeps', 'Memory lapses', 'Poor decision making',
  'Blurred vision', 'Headache', 'Nausea',
];

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue score calculator
// Based on simplified FAST (Fatigue Avoidance Scheduling Tool) model
// ─────────────────────────────────────────────────────────────────────────────

function calcFatigueScore(params: {
  hoursLast24h: number;
  hoursLast7d: number;
  hoursLast28d: number;
  sleepLastNight: number;
  travelToday: number;
  isNightShift: boolean;
}): { score: number; risk: FatigueRisk; factors: string[] } {
  const { hoursLast24h, hoursLast7d, hoursLast28d, sleepLastNight, travelToday, isNightShift } = params;
  let score = 0;
  const factors: string[] = [];

  // Daily hours
  if (hoursLast24h >= HOUR_LIMITS.daily)   { score += 40; factors.push(`Daily limit reached (${hoursLast24h}h)`); }
  else if (hoursLast24h >= 10)             { score += 20; factors.push(`Long shift (${hoursLast24h}h)`); }
  else if (hoursLast24h >= 8)              { score += 10; }

  // Weekly hours
  if (hoursLast7d >= HOUR_LIMITS.weekly)   { score += 25; factors.push(`Weekly limit reached (${hoursLast7d}h)`); }
  else if (hoursLast7d >= 50)              { score += 12; factors.push(`High weekly hours (${hoursLast7d}h)`); }

  // 28-day hours
  if (hoursLast28d >= HOUR_LIMITS.monthly) { score += 15; factors.push(`28-day limit reached (${hoursLast28d}h)`); }

  // Sleep
  if (sleepLastNight < 4)                  { score += 30; factors.push(`Severely sleep deprived (<4h sleep)`); }
  else if (sleepLastNight < HOUR_LIMITS.minSleep) { score += 15; factors.push(`Low sleep (${sleepLastNight}h)`); }
  else if (sleepLastNight < 7)             { score += 5; }

  // Night shift penalty
  if (isNightShift)                        { score += 10; factors.push('Night shift'); }

  // Travel
  if (travelToday >= HOUR_LIMITS.maxTravel){ score += 15; factors.push(`High travel time (${travelToday}h)`); }
  else if (travelToday >= 2)               { score += 7; factors.push(`Travel (${travelToday}h)`); }

  score = Math.min(score, 100);

  const risk: FatigueRisk =
    score >= 80 ? 'Extreme' :
    score >= 60 ? 'High' :
    score >= 35 ? 'Moderate' : 'Low';

  return { score, risk, factors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shift Log Form
// ─────────────────────────────────────────────────────────────────────────────

interface ShiftFormProps {
  userId: string;
  orgId: string;
  projects: any[];
  onSave: (log: ShiftLog) => void;
  onCancel: () => void;
}

const ShiftLogForm: React.FC<ShiftFormProps> = ({ userId, orgId, projects, onSave, onCancel }) => {
  const [f, setF] = useState({
    worker_id: userId,
    shift_date: new Date().toISOString().slice(0, 10),
    shift_type: 'Day' as ShiftType,
    start_time: '07:00',
    end_time: '19:00',
    travel_hours: 0,
    sleep_hours: 7,
    project_id: '',
    notes: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  // Calculate hours worked from start/end time
  const hoursWorked = (() => {
    const [sh, sm] = f.start_time.split(':').map(Number);
    const [eh, em] = f.end_time.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // overnight shift
    return Math.round((mins / 60) * 10) / 10;
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date</label>
          <input type="date" value={f.shift_date} onChange={(e) => set('shift_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Shift Type</label>
          <select value={f.shift_type} onChange={(e) => set('shift_type', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="Day">Day</option>
            <option value="Night">Night</option>
            <option value="Extended">Extended (12h+)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Start Time</label>
          <input type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">End Time</label>
          <input type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-xs text-slate-500">Hours worked</p>
            <p className={`text-lg font-bold ${hoursWorked > HOUR_LIMITS.daily ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
              {hoursWorked}h
            </p>
          </div>
          {hoursWorked > HOUR_LIMITS.daily && (
            <AlertTriangle className="w-4 h-4 text-red-500 ml-auto" />
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Travel Hours (commute)
          </label>
          <input type="number" min={0} max={8} step={0.5} value={f.travel_hours}
            onChange={(e) => set('travel_hours', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Sleep Last Night (hours)
          </label>
          <input type="number" min={0} max={12} step={0.5} value={f.sleep_hours}
            onChange={(e) => set('sleep_hours', Number(e.target.value))}
            className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 ${
              f.sleep_hours < HOUR_LIMITS.minSleep ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'
            }`} />
          {f.sleep_hours < HOUR_LIMITS.minSleep && (
            <p className="text-xs text-amber-600 mt-1">Below minimum {HOUR_LIMITS.minSleep}h recommendation</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Project</label>
          <select value={f.project_id} onChange={(e) => set('project_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">No project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notes</label>
          <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            placeholder="Any relevant notes about this shift..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={() => onSave({ ...f, id: uid(), org_id: orgId, hours_worked: hoursWorked, created_at: new Date().toISOString() })}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Log Shift
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FFD Assessment Form
// ─────────────────────────────────────────────────────────────────────────────

interface FfdFormProps {
  workerId: string;
  assessorId: string;
  orgId: string;
  shiftLogs: ShiftLog[];
  onSave: (assessment: FfdAssessment) => void;
  onCancel: () => void;
}

const FfdForm: React.FC<FfdFormProps> = ({ workerId, assessorId, orgId, shiftLogs, onSave, onCancel }) => {
  const [sleepHours, setSleepHours] = useState(7);
  const [travelHours, setTravelHours] = useState(0);
  const [isNight, setIsNight] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [clearanceNote, setClearanceNote] = useState('');

  const now = new Date();
  const last24h = shiftLogs.filter((l) => l.worker_id === workerId && new Date(l.shift_date) >= new Date(now.getTime() - 24 * 3600 * 1000))
    .reduce((s, l) => s + l.hours_worked, 0);
  const last7d = shiftLogs.filter((l) => l.worker_id === workerId && new Date(l.shift_date) >= new Date(now.getTime() - 7 * 24 * 3600 * 1000))
    .reduce((s, l) => s + l.hours_worked, 0);
  const last28d = shiftLogs.filter((l) => l.worker_id === workerId && new Date(l.shift_date) >= new Date(now.getTime() - 28 * 24 * 3600 * 1000))
    .reduce((s, l) => s + l.hours_worked, 0);

  const { score, risk, factors } = calcFatigueScore({
    hoursLast24h: last24h, hoursLast7d: last7d, hoursLast28d: last28d,
    sleepLastNight: sleepHours, travelToday: travelHours, isNightShift: isNight,
  });

  const rc = RISK_CONFIG[risk];

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const defaultStatus: FfdStatus =
    risk === 'Extreme' ? 'Unfit' :
    risk === 'High' ? 'Restricted' : 'Cleared';

  const [status, setStatus] = useState<FfdStatus>(defaultStatus);

  return (
    <div className="space-y-4">
      {/* Fatigue score preview */}
      <div className={`rounded-xl p-4 border ${rc.border} ${rc.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-bold ${rc.color}`}>{rc.label}</p>
          <span className={`text-2xl font-bold ${rc.color}`}>{score}/100</span>
        </div>
        <div className="h-2 bg-white/40 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${
            risk === 'Extreme' ? 'bg-red-600' : risk === 'High' ? 'bg-orange-500' :
            risk === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'
          }`} style={{ width: `${score}%` }} />
        </div>
        {factors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {factors.map((f) => (
              <span key={f} className={`text-xs px-2 py-0.5 rounded-full bg-white/50 font-medium ${rc.color}`}>{f}</span>
            ))}
          </div>
        )}
      </div>

      {/* Work hours (auto-calculated) */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Last 24h', value: last24h.toFixed(1), limit: HOUR_LIMITS.daily },
          { label: 'Last 7d',  value: last7d.toFixed(1),  limit: HOUR_LIMITS.weekly },
          { label: 'Last 28d', value: last28d.toFixed(1), limit: HOUR_LIMITS.monthly },
        ].map(({ label, value, limit }) => {
          const exceeded = parseFloat(value) >= limit;
          return (
            <div key={label} className={`rounded-xl p-3 text-center ${exceeded ? 'bg-red-50 dark:bg-red-950/30 border border-red-200' : 'bg-slate-50 dark:bg-slate-900'}`}>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className={`text-lg font-bold ${exceeded ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{value}h</p>
              <p className="text-xs text-slate-400">Limit: {limit}h</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Sleep last night (hours)</label>
          <input type="number" min={0} max={12} step={0.5} value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Travel today (hours)</label>
          <input type="number" min={0} max={8} step={0.5} value={travelHours} onChange={(e) => setTravelHours(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isNight} onChange={(e) => setIsNight(e.target.checked)} className="rounded" />
        <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Moon className="w-4 h-4 text-slate-400" /> Worker on night shift
        </span>
      </label>

      {/* Symptoms */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Observed Symptoms (select all that apply)</label>
        <div className="flex flex-wrap gap-1.5">
          {FATIGUE_SYMPTOMS.map((s) => (
            <button key={s} onClick={() => toggleSymptom(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                symptoms.includes(s)
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* FFD decision */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">FFD Decision</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['Cleared','Restricted','Unfit','Pending'] as FfdStatus[]).map((s) => {
            const cfg = FFD_CONFIG[s];
            return (
              <label key={s} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                status === s ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
                <input type="radio" name="ffd" value={s} checked={status === s}
                  onChange={() => setStatus(s)} className="sr-only" />
                <span className={`text-xs font-semibold ${status === s ? cfg.color : 'text-slate-600 dark:text-slate-400'}`}>{s}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Clearance / Restriction Note</label>
        <textarea value={clearanceNote} onChange={(e) => setClearanceNote(e.target.value)} rows={2}
          placeholder="e.g. Cleared for light duties only. No driving or heavy machinery..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={() => onSave({
          id: uid(), org_id: orgId, worker_id: workerId, assessor_id: assessorId,
          assessment_date: new Date().toISOString().slice(0, 10),
          fatigue_score: score, risk_band: risk, status,
          hours_last_24h: last24h, hours_last_7d: last7d, hours_last_28d: last28d,
          sleep_last_night: sleepHours, travel_today: travelHours,
          symptoms, notes, clearance_note: clearanceNote,
          created_at: new Date().toISOString(),
        })}
          className={`px-6 py-2 rounded-xl text-sm font-semibold ${
            risk === 'Extreme' || risk === 'High'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800'
          }`}>
          Record Assessment
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const FatigueMonitor: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();
  const { shiftLogs, ffdAssessments: assessments, handleCreateShiftLog, handleCreateFfdAssessment } = useDataContext();
  const [activeTab, setActiveTab]       = useState<'shifts' | 'assessments' | 'limits'>('shifts');
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showFfdForm, setShowFfdForm]   = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(activeUser?.id ?? '');

  const handleSaveShift = (log: ShiftLog) => {
    handleCreateShiftLog(log);
    setShowShiftForm(false);
  };

  const handleSaveFfd = (assessment: FfdAssessment) => {
    handleCreateFfdAssessment(assessment);
    setShowFfdForm(false);
    writeAuditLog({
      org_id: activeOrg?.id ?? '',
      user_id: activeUser?.id ?? '',
      action: 'CREATE',
      resource_type: 'fatigue_assessment',
      resource_id: assessment.id,
      description: `FFD assessment: ${assessment.risk_band} risk — ${assessment.status}`,
      new_value: assessment,
      timestamp: new Date().toISOString(),
    });
  };

  // Hour limit checks for all workers
  const workerLimits = useMemo(() => {
    const now = new Date();
    return usersList.map((u: any) => {
      const workerLogs = shiftLogs.filter((l) => l.worker_id === u.id);
      const h24 = workerLogs.filter((l) => new Date(l.shift_date) >= new Date(now.getTime() - 24 * 3600 * 1000)).reduce((s, l) => s + l.hours_worked, 0);
      const h7d = workerLogs.filter((l) => new Date(l.shift_date) >= new Date(now.getTime() - 7 * 86400 * 1000)).reduce((s, l) => s + l.hours_worked, 0);
      const h28d = workerLogs.filter((l) => new Date(l.shift_date) >= new Date(now.getTime() - 28 * 86400 * 1000)).reduce((s, l) => s + l.hours_worked, 0);
      const exceeds = h24 >= HOUR_LIMITS.daily || h7d >= HOUR_LIMITS.weekly || h28d >= HOUR_LIMITS.monthly;
      return { user: u, h24, h7d, h28d, exceeds };
    });
  }, [usersList, shiftLogs]);

  const stats = useMemo(() => ({
    totalShifts:   shiftLogs.length,
    assessments:   assessments.length,
    unfit:         assessments.filter((a) => a.status === 'Unfit').length,
    limitBreaches: workerLimits.filter((w) => w.exceeds).length,
    highRisk:      assessments.filter((a) => a.risk_band === 'High' || a.risk_band === 'Extreme').length,
  }), [shiftLogs, assessments, workerLimits]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fatigue & Fitness for Duty</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.totalShifts} shifts logged · {stats.limitBreaches} hour limit breaches · {stats.unfit} unfit workers
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportTableToCsv(shiftLogs, [
            { key: 'shift_date', label: 'Date' }, { key: 'worker_id', label: 'Worker' },
            { key: 'shift_type', label: 'Type' }, { key: 'hours_worked', label: 'Hours' },
            { key: 'sleep_hours', label: 'Sleep' }, { key: 'travel_hours', label: 'Travel' },
          ], 'shift-logs')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="fatigue:create">
            {activeTab === 'shifts'
              ? <button onClick={() => setShowShiftForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
                  <Plus className="w-4 h-4" /> Log Shift
                </button>
              : <button onClick={() => setShowFfdForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
                  <Activity className="w-4 h-4" /> New Assessment
                </button>}
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Shifts Logged',    value: stats.totalShifts,   color: 'text-slate-700 dark:text-slate-300' },
          { label: 'FFD Assessments',  value: stats.assessments,   color: 'text-blue-600' },
          { label: 'High/Extreme Risk',value: stats.highRisk,      color: 'text-orange-600' },
          { label: 'Unfit Workers',    value: stats.unfit,         color: 'text-red-600' },
          { label: 'Hour Breaches',    value: stats.limitBreaches, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {[{ id: 'shifts', label: 'Shift Logs' }, { id: 'assessments', label: 'FFD Assessments' }, { id: 'limits', label: 'Hour Limits' }].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Shift form */}
      {showShiftForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Log Shift Hours</h3>
          <ShiftLogForm
            userId={activeUser?.id ?? ''}
            orgId={activeOrg?.id ?? ''}
            projects={[]}
            onSave={handleSaveShift}
            onCancel={() => setShowShiftForm(false)}
          />
        </div>
      )}

      {/* FFD form */}
      {showFfdForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Fitness-for-Duty Assessment</h3>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Worker Being Assessed</label>
            <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
              {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <FfdForm
            workerId={selectedWorker}
            assessorId={activeUser?.id ?? ''}
            orgId={activeOrg?.id ?? ''}
            shiftLogs={shiftLogs}
            onSave={handleSaveFfd}
            onCancel={() => setShowFfdForm(false)}
          />
        </div>
      )}

      {/* Shift Logs tab */}
      {activeTab === 'shifts' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {shiftLogs.length === 0 ? (
            <div className="text-center py-14">
              <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No shift logs yet. Click "Log Shift" to start tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {['Date','Shift','Start','End','Hours Worked','Sleep','Travel','Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shiftLogs.map((log) => {
                    const exceeded = log.hours_worked > HOUR_LIMITS.daily;
                    const lowSleep = log.sleep_hours < HOUR_LIMITS.minSleep;
                    const worker = usersList.find((u: any) => u.id === log.worker_id);
                    return (
                      <tr key={log.id} className={`border-t border-slate-100 dark:border-slate-700 ${exceeded ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{log.shift_date}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${log.shift_type === 'Night' ? 'bg-indigo-100 text-indigo-700' : log.shift_type === 'Extended' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                            {log.shift_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.start_time}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.end_time}</td>
                        <td className={`px-4 py-2.5 font-bold ${exceeded ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                          {log.hours_worked}h {exceeded && <AlertTriangle className="w-3.5 h-3.5 inline text-red-500 ml-1" />}
                        </td>
                        <td className={`px-4 py-2.5 text-xs ${lowSleep ? 'text-amber-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{log.sleep_hours}h</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.travel_hours}h</td>
                        <td className="px-4 py-2.5">
                          {exceeded
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Over limit</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">OK</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FFD Assessments tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-2">
          {assessments.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Activity className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No FFD assessments yet.</p>
            </div>
          ) : assessments.map((a) => {
            const rc = RISK_CONFIG[a.risk_band];
            const fc = FFD_CONFIG[a.status];
            const worker = usersList.find((u: any) => u.id === a.worker_id);
            const assessor = usersList.find((u: any) => u.id === a.assessor_id);
            return (
              <div key={a.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${rc.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${rc.bg} ${rc.color}`}>{rc.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fc.bg} ${fc.color}`}>{a.status}</span>
                      <span className="text-xs text-slate-400">{a.assessment_date}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {worker?.name ?? a.worker_id}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assessed by: {assessor?.name ?? a.assessor_id}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-3xl font-bold ${rc.color}`}>{a.fatigue_score}</p>
                    <p className="text-xs text-slate-400">/ 100</p>
                  </div>
                </div>
                {a.clearance_note && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs ${rc.bg} ${rc.color}`}>
                    {a.clearance_note}
                  </div>
                )}
                {a.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.symptoms.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hour Limits tab */}
      {activeTab === 'limits' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Work Hour Compliance — All Workers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Limits: {HOUR_LIMITS.daily}h/day · {HOUR_LIMITS.weekly}h/week · {HOUR_LIMITS.monthly}h/28 days</p>
          </div>
          {usersList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No workers in the system yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {['Worker', 'Last 24h', 'Last 7d', 'Last 28d', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workerLimits.map(({ user, h24, h7d, h28d, exceeds }) => (
                    <tr key={user.id} className={`border-t border-slate-100 dark:border-slate-700 ${exceeds ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{user.name}</td>
                      <td className={`px-4 py-2.5 text-xs font-bold ${h24 >= HOUR_LIMITS.daily ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        {h24.toFixed(1)}h / {HOUR_LIMITS.daily}h
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-bold ${h7d >= HOUR_LIMITS.weekly ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        {h7d.toFixed(1)}h / {HOUR_LIMITS.weekly}h
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-bold ${h28d >= HOUR_LIMITS.monthly ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        {h28d.toFixed(1)}h / {HOUR_LIMITS.monthly}h
                      </td>
                      <td className="px-4 py-2.5">
                        {exceeds
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" />Breach</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FatigueMonitor;