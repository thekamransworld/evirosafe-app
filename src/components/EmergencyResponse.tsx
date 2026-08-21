import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import {
  Plus, X, Phone, MapPin, Calendar, Clock,
  CheckCircle, AlertTriangle, ChevronRight,
  Flame, Zap, Droplets, Activity, Wind,
  ShieldAlert, FileText, Bell, Users
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErpType =
  | 'fire' | 'medical' | 'spill' | 'evacuation'
  | 'earthquake' | 'flood' | 'explosion' | 'other';

export interface EmergencyContact {
  name:  string;
  role:  string;
  phone: string;
}

export interface DrillLog {
  id:              string;
  drill_date:      string;
  conducted_by:    string;
  participants:    number;
  evacuation_secs: number;
  result:          'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  observations:    string;
  improvements:    string;
}

import type { EmergencyPlan } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const ERP_TYPES: Record<ErpType, { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  fire:       { label: 'Fire',               icon: Flame,      color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
  medical:    { label: 'Medical Emergency',  icon: Activity,   color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
  spill:      { label: 'Chemical Spill',     icon: Droplets,   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  evacuation: { label: 'Evacuation',         icon: ShieldAlert,color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  earthquake: { label: 'Earthquake',         icon: Wind,       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  flood:      { label: 'Flood',              icon: Droplets,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  explosion:  { label: 'Explosion/Blast',    icon: Zap,        color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  other:      { label: 'Other',              icon: Bell,       color: 'text-gray-600',   bg: 'bg-gray-50 dark:bg-gray-900/20' },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PLANS: Omit<EmergencyPlan, 'org_id'>[] = [
  {
    id: 'erp-001', type: 'fire', title: 'Site Fire Emergency Response Plan',
    description: 'Comprehensive fire emergency procedure for all site areas including offices, storage and construction zones.',
    assembly_point: 'Main car park — north gate, Gate 1',
    status: 'active',
    review_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_drilled_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    emergency_contacts: [
      { name: 'Ahmed Al-Rashid',  role: 'Site HSE Manager',    phone: '+966-50-123-4567' },
      { name: 'Sarah Mitchell',   role: 'Fire Warden Lead',    phone: '+966-50-234-5678' },
      { name: 'Civil Defence',    role: 'Emergency Services',  phone: '998' },
      { name: 'Site Director',    role: 'Site Director',       phone: '+966-50-345-6789' },
    ],
    procedures: `## Immediate Actions (First 60 seconds)\n1. Raise the alarm — activate nearest fire alarm point\n2. Call Civil Defence: 998\n3. Notify Site HSE Manager immediately\n4. Do NOT attempt to fight the fire unless trained and safe to do so\n\n## Evacuation Procedure\n1. All personnel evacuate via nearest safe exit — do not use lifts\n2. Proceed to assembly point: Main car park, Gate 1\n3. Fire wardens to sweep their zones and report to Warden Lead\n4. Roll call at assembly point — report missing persons to HSE Manager\n5. Do not re-enter site until "all clear" given by Civil Defence\n\n## Hot Work Operations\n- Immediately stop all hot work and secure gas/fuel supplies\n- Remove ignition sources\n- Keep fire watch personnel at post until fire brigade arrives\n\n## Assembly Point\nMain car park, Gate 1 — minimum 50m from any structure`,
    drill_logs: [
      {
        id: 'd1', drill_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        conducted_by: 'Ahmed Al-Rashid', participants: 124, evacuation_secs: 312,
        result: 'satisfactory', observations: 'All personnel evacuated within target time of 6 minutes.',
        improvements: 'Zone C sweep took 45 seconds longer than target — additional warden assigned.',
      },
      {
        id: 'd2', drill_date: new Date(Date.now() - 135 * 24 * 60 * 60 * 1000).toISOString(),
        conducted_by: 'Sarah Mitchell', participants: 98, evacuation_secs: 428,
        result: 'needs_improvement', observations: 'North stairwell route was partially blocked — corrected immediately.',
        improvements: 'Weekly stairwell inspection added to site checks.',
      },
    ],
  },
  {
    id: 'erp-002', type: 'medical', title: 'Medical Emergency & Mass Casualty Response',
    description: 'Response procedure for medical emergencies including single casualties, multiple injury events and heat stress incidents.',
    assembly_point: 'Site Medical Centre — east of main office block',
    status: 'active',
    review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_drilled_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    emergency_contacts: [
      { name: 'Mohamed Hassan',  role: 'Site First Aider',    phone: '+966-50-456-7890' },
      { name: 'Red Crescent',    role: 'Ambulance Service',   phone: '997' },
      { name: 'Nearest Hospital',role: 'King Fahad Hospital', phone: '+966-13-857-7777' },
    ],
    procedures: `## Single Casualty\n1. Ensure scene safety before approaching\n2. Call for first aider — do not move casualty unless immediate danger\n3. First aider to assess ABC (Airway, Breathing, Circulation)\n4. Call 997 if serious — give site address and Gate number\n5. Meet ambulance at site entrance\n6. Notify HSE Manager and complete incident report within 1 hour\n\n## Heat Stress Protocol\n- Move casualty to shade/cool area immediately\n- Apply cool water to neck, armpits and groin\n- Call 997 if unconscious or not improving within 10 minutes\n- Never leave casualty alone\n\n## Mass Casualty Event\n1. Activate site emergency alarm\n2. Immediately call 997 and 998\n3. Establish incident command at main gate\n4. Triage casualties — do not move critical patients\n5. Clear access route for emergency vehicles`,
    drill_logs: [],
  },
  {
    id: 'erp-003', type: 'spill', title: 'Chemical Spill & Environmental Incident Response',
    description: 'Response procedure for chemical spills, fuel leaks and environmental contamination events.',
    assembly_point: 'Upwind assembly point — designated per wind direction flags',
    status: 'under_review',
    review_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_drilled_at: null,
    emergency_contacts: [
      { name: 'Ahmed Al-Rashid',     role: 'HSE Manager',            phone: '+966-50-123-4567' },
      { name: 'Civil Defence',       role: 'HAZMAT Unit',            phone: '998' },
      { name: 'Environmental Agency',role: 'Regulatory Authority',   phone: '+966-11-441-9555' },
    ],
    procedures: `## Immediate Actions\n1. STOP the source if safe to do so — close valves, isolate supply\n2. Raise alarm — notify HSE Manager immediately\n3. Evacuate personnel from spill zone — minimum 20m exclusion\n4. Determine wind direction — evacuate upwind\n5. Deploy spill kit if trained and safe — contain, do not wash into drain\n\n## Containment\n- Use absorbent granules for small spills (<20L)\n- For large spills: activate secondary containment bunds\n- Never wash chemical into storm drains or ground\n- Collect all contaminated materials in labelled hazardous waste bags\n\n## Reporting\n- Notify environmental authority if spill reaches drainage/watercourse\n- Complete spill report within 4 hours\n- Preserve scene for investigation`,
    drill_logs: [],
  },
];

// ─── Drill Result badge ───────────────────────────────────────────────────────

const drillResultConfig = {
  satisfactory:      { color: 'green'  as const, label: 'Satisfactory' },
  needs_improvement: { color: 'yellow' as const, label: 'Needs Improvement' },
  unsatisfactory:    { color: 'red'    as const, label: 'Unsatisfactory' },
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
};

const daysSince = (date: string | null) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

const daysUntil = (date: string) =>
  Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

// ─── Plan Detail Modal ────────────────────────────────────────────────────────

const PlanDetailModal: React.FC<{
  plan:     EmergencyPlan;
  onClose:  () => void;
  onUpdate: (plan: EmergencyPlan) => void;
}> = ({ plan, onClose, onUpdate }) => {
  const [tab, setTab]       = useState<'procedures' | 'contacts' | 'drills'>('procedures');
  const [showDrill, setShowDrill] = useState(false);
  const [drillForm, setDrillForm] = useState({
    participants: '100', evacuation_secs: '300', result: 'satisfactory' as DrillLog['result'],
    observations: '', improvements: '',
  });
  const { activeUser } = useAppContext();
  const cfg = ERP_TYPES[plan.type];
  const ds  = daysSince(plan.last_drilled_at);

  const logDrill = () => {
    const newDrill: DrillLog = {
      id:              `d-${Date.now()}`,
      drill_date:      new Date().toISOString(),
      conducted_by:    activeUser?.name || 'HSE Manager',
      participants:    parseInt(drillForm.participants),
      evacuation_secs: parseInt(drillForm.evacuation_secs),
      result:          drillForm.result,
      observations:    drillForm.observations,
      improvements:    drillForm.improvements,
    };
    onUpdate({ ...plan, drill_logs: [newDrill, ...plan.drill_logs], last_drilled_at: new Date().toISOString() });
    setShowDrill(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} flex-shrink-0`}>
              <cfg.icon className={`w-6 h-6 ${cfg.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge color={plan.status === 'active' ? 'green' : plan.status === 'under_review' ? 'yellow' : 'gray'}>
                  {plan.status.replace('_', ' ')}
                </Badge>
                {ds !== null && ds > 90 && <Badge color="red">Drill overdue — {ds}d ago</Badge>}
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{plan.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{plan.assembly_point}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="border-b dark:border-dark-border flex-shrink-0">
          <div className="flex px-6">
            {(['procedures', 'contacts', 'drills'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 capitalize ${tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>
                {t} {t === 'drills' && `(${plan.drill_logs.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'procedures' && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed bg-gray-50 dark:bg-dark-background p-4 rounded-xl">
                {plan.procedures}
              </pre>
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-3">
              {plan.emergency_contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-background rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-600">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.role}</p>
                  </div>
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline">
                    <Phone className="w-4 h-4" />{c.phone}
                  </a>
                </div>
              ))}
            </div>
          )}

          {tab === 'drills' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last drill: {plan.last_drilled_at
                      ? `${daysSince(plan.last_drilled_at)} days ago (${new Date(plan.last_drilled_at).toLocaleDateString()})`
                      : 'Never conducted'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Recommended: every 90 days</p>
                </div>
                <Button onClick={() => setShowDrill(true)} leftIcon={<Plus className="w-4 h-4" />}>Log Drill</Button>
              </div>

              {plan.drill_logs.map(drill => {
                const resCfg = drillResultConfig[drill.result];
                return (
                  <div key={drill.id} className="border dark:border-dark-border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge color={resCfg.color}>{resCfg.label}</Badge>
                          <span className="text-xs text-gray-500">{new Date(drill.drill_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white mt-1">Conducted by {drill.conducted_by}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{formatTime(drill.evacuation_secs)}</p>
                        <p className="text-gray-400">Evacuation time</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Observations</p>
                        <p className="text-gray-700 dark:text-gray-300">{drill.observations || 'None recorded'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Improvements</p>
                        <p className="text-gray-700 dark:text-gray-300">{drill.improvements || 'None required'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{drill.participants} participants</p>
                  </div>
                );
              })}
              {plan.drill_logs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No drills logged yet</p>
                </div>
              )}

              {showDrill && (
                <div className="border dark:border-dark-border rounded-xl p-4 bg-gray-50 dark:bg-dark-background mt-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4">Log New Drill</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Participants</label>
                      <input type="number" value={drillForm.participants} onChange={e => setDrillForm(f => ({ ...f, participants: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-sm dark:bg-dark-card dark:border-dark-border dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Evacuation Time (seconds)</label>
                      <input type="number" value={drillForm.evacuation_secs} onChange={e => setDrillForm(f => ({ ...f, evacuation_secs: e.target.value }))}
                        className="w-full p-2 border rounded-lg text-sm dark:bg-dark-card dark:border-dark-border dark:text-white" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Result</label>
                    <select value={drillForm.result} onChange={e => setDrillForm(f => ({ ...f, result: e.target.value as DrillLog['result'] }))}
                      className="w-full p-2 border rounded-lg text-sm dark:bg-dark-card dark:border-dark-border dark:text-white">
                      <option value="satisfactory">Satisfactory</option>
                      <option value="needs_improvement">Needs Improvement</option>
                      <option value="unsatisfactory">Unsatisfactory</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Observations</label>
                      <textarea value={drillForm.observations} onChange={e => setDrillForm(f => ({ ...f, observations: e.target.value }))} rows={3}
                        className="w-full p-2 border rounded-lg text-sm dark:bg-dark-card dark:border-dark-border dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Improvements Required</label>
                      <textarea value={drillForm.improvements} onChange={e => setDrillForm(f => ({ ...f, improvements: e.target.value }))} rows={3}
                        className="w-full p-2 border rounded-lg text-sm dark:bg-dark-card dark:border-dark-border dark:text-white" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowDrill(false)}>Cancel</Button>
                    <Button onClick={logDrill}>Save Drill Record</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-gray-400">
            Review due: {new Date(plan.review_date).toLocaleDateString()} ·
            {daysUntil(plan.review_date) < 0
              ? <span className="text-red-500 font-semibold"> OVERDUE</span>
              : <span> {daysUntil(plan.review_date)}d remaining</span>}
          </p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const EmergencyResponse: React.FC = () => {
  const { emergencyPlans, handleCreateEmergencyPlan } = useDataContext();
  // Real data if this org has saved any plans yet; otherwise show the
  // default template set so there's something to edit from on first use.
  const plans = emergencyPlans.length > 0 ? emergencyPlans : (MOCK_PLANS as EmergencyPlan[]);
  const [selected, setSelected] = useState<EmergencyPlan | null>(null);

  const stats = useMemo(() => ({
    total:       plans.length,
    active:      plans.filter(p => p.status === 'active').length,
    drillOverdue: plans.filter(p => {
      const ds = daysSince(p.last_drilled_at);
      return ds === null || ds > 90;
    }).length,
    reviewOverdue: plans.filter(p => daysUntil(p.review_date) < 0).length,
  }), [plans]);

  // setDoc-based (create/upsert), not updateDoc - a plan being edited for
  // the first time doesn't exist in Firestore yet (it was only ever a
  // default template), so a strict update would fail with "no document
  // to update".
  const handleUpdate = (updated: EmergencyPlan) => handleCreateEmergencyPlan(updated);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Emergency Response Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Procedures, contacts and drill records</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans',      value: stats.total,        icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Active',           value: stats.active,       icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Drills Overdue',   value: stats.drillOverdue, icon: Calendar,    color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Reviews Overdue',  value: stats.reviewOverdue,icon: AlertTriangle,color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => {
          const cfg = ERP_TYPES[plan.type];
          const ds  = daysSince(plan.last_drilled_at);
          const drillOverdue = ds === null || ds > 90;
          const reviewOverdue = daysUntil(plan.review_date) < 0;
          return (
            <div key={plan.id} onClick={() => setSelected(plan)}
              className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5 cursor-pointer hover:shadow-md transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} flex-shrink-0`}>
                  <cfg.icon className={`w-6 h-6 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={plan.status === 'active' ? 'green' : 'yellow'}>
                      {plan.status.replace('_', ' ')}
                    </Badge>
                    {drillOverdue && <Badge color="red">Drill overdue</Badge>}
                    {reviewOverdue && <Badge color="amber">Review overdue</Badge>}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{plan.title}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{plan.assembly_point}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{plan.emergency_contacts.length} emergency contacts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Last drill: {ds === null ? 'Never' : `${ds}d ago`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{plan.drill_logs.length} drill{plan.drill_logs.length !== 1 ? 's' : ''} on record</span>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <PlanDetailModal
          plan={selected}
          onClose={() => setSelected(null)}
          onUpdate={p => { handleUpdate(p); setSelected(p); }}
        />
      )}
    </div>
  );
};