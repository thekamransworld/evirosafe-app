import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { TYPE_RULES, type PermitType } from '../lib/ptw/model';
import { buildPermitPayload, localDateTimeInput, requesterFromUser, splitLocalInput } from '../lib/ptw/payload';
import { requestedWindow } from '../lib/ptw/validity';
import { findConflicts, type SimopsPermit } from '../lib/ptw/simops';
import { ptwTypeDetails } from '../config';

interface PtwCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 'existing' = a permit already issued on paper is being brought into the system. */
  mode?: 'new' | 'existing';
}

const CONFIRMATIONS = [
  'Risk Assessment completed and reviewed',
  'Emergency procedures communicated',
  'Energy isolation procedures defined (LOTO)',
  'Competent personnel identified',
];

const fieldCls = 'mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm';

const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }> = ({ label, required, hint, children, className }) => (
  <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className ?? ''}`}>
    {label}{required && <span className="text-red-500"> *</span>}
    {children}
    {hint && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">{hint}</span>}
  </label>
);

/** Next quarter hour, so the default start is a sensible, local time (the old form used UTC). */
const defaultStart = () => { const q = 15 * 60_000; return Math.ceil(Date.now() / q) * q; };

export const PtwCreationModal: React.FC<PtwCreationModalProps> = ({ isOpen, onClose, mode = 'new' }) => {
  const { usersList } = useAppContext();
  const { projects, ptwList, ptwActor, handleCreatePtw } = useDataContext();
  const { setSelectedPtw } = useModalContext();

  const initial = () => {
    const s = defaultStart();
    return {
      project_id: projects?.[0]?.id ?? '', type: 'General Work' as PermitType, title: '', description: '', location: '',
      start: localDateTimeInput(s), end: localDateTimeInput(s + 8 * 3_600_000),
      workers: '1', emergency: '', rams: '', receiver: '', externalRef: '',
      confirmed: CONFIRMATIONS.map(() => false),
    };
  };
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ReturnType<typeof initial>>) => setF(prev => ({ ...prev, ...patch }));

  useEffect(() => { if (isOpen) { setF(initial()); setError(''); setBusy(false); } }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isOpen && !f.project_id && projects?.[0]) set({ project_id: projects[0].id }); }, [isOpen, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const rule = TYPE_RULES[f.type];
  const details = (ptwTypeDetails as any)?.[f.type];
  const s = splitLocalInput(f.start), e = splitLocalInput(f.end);
  const coverage = { start_date: s.date, start_time: s.time, end_date: e.date, end_time: e.time };
  const win = requestedWindow({ work: { coverage } });
  const windowProblem = !win ? 'The end must be after the start.' : win.end <= Date.now() ? 'The end time has already passed.' : '';

  // SIMOPS: checked automatically, as soon as there is a project, location and time window.
  const conflicts = useMemo(() => {
    if (!f.project_id || !f.location.trim() || !win) return [];
    const draft: SimopsPermit = { id: '__new__', project_id: f.project_id, type: f.type, status: 'DRAFT', payload: { work: { location: f.location, coverage } } };
    return findConflicts(draft, (ptwList ?? []).filter(p => p.project_id === f.project_id) as unknown as SimopsPermit[], Date.now());
  }, [f.project_id, f.location, f.type, f.start, f.end, ptwList]); // eslint-disable-line react-hooks/exhaustive-deps
  const blocking = conflicts.filter(c => c.severity === 'block');

  const receivers = useMemo(
    () => (usersList ?? []).filter(u => u.role !== 'CLIENT_VIEWER' && (!u.status || u.status === 'active') && (u.project_ids?.includes(f.project_id) || u.role === 'ADMIN' || u.role === 'ORG_ADMIN')),
    [usersList, f.project_id],
  );

  const allConfirmed = f.confirmed.every(Boolean);
  const workers = Number(f.workers);
  const missing: string[] = [];
  if (!f.project_id) missing.push('project');
  if (!f.location.trim()) missing.push('work location');
  if (f.description.trim().length < 10) missing.push('work description (at least 10 characters)');
  if (!(workers >= 1)) missing.push('number of workers');
  if (!f.emergency.trim()) missing.push('emergency contact');
  const canCreate = !busy && !!ptwActor && missing.length === 0 && !windowProblem && blocking.length === 0 && allConfirmed;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canCreate) return;
    const me = usersList?.find(u => u.id === ptwActor!.id);
    setBusy(true);
    setError('');
    try {
      const payload = buildPermitPayload({
        type: f.type,
        requester: me ? requesterFromUser(me) : { id: ptwActor!.id, name: ptwActor!.name },
        location: f.location, description: f.description,
        startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time,
        numberOfWorkers: workers, emergencyContact: f.emergency, ramsRef: f.rams,
        externalRef: mode === 'existing' ? f.externalRef : undefined,
        declarations: Object.fromEntries(CONFIRMATIONS.map((c, i) => [c, f.confirmed[i]])),
      });
      const title = (f.title.trim() || f.description.trim()).slice(0, 80);
      const r = await handleCreatePtw({ project_id: f.project_id, type: f.type, title, payload, receiver_id: f.receiver || undefined });
      if (r.ok === true) { onClose(); setSelectedPtw(r.permit); }
      else setError(r.reason);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-start md:items-center p-2 md:p-4 overflow-y-auto" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ptw-create-title">
      <form onSubmit={submit} className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-3xl my-auto max-h-[96vh] flex flex-col" onClick={ev => ev.stopPropagation()}>
        <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 id="ptw-create-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">{mode === 'existing' ? 'Add existing permit' : 'New permit to work'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">It is created as a draft with the next permit number. Nothing is active until it has been reviewed, approved and handed over.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </header>

        <div className="p-4 overflow-y-auto space-y-5">
          {mode === 'existing' && (
            <div className="space-y-2">
              <Field label="Number on the paper permit" hint="Kept as a reference. The system still gives this permit its own number.">
                <input className={fieldCls} value={f.externalRef} onChange={ev => set({ externalRef: ev.target.value })} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project" required>
              <select className={fieldCls} value={f.project_id} onChange={ev => set({ project_id: ev.target.value })}>
                {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Permit type" required>
              <select className={fieldCls} value={f.type} onChange={ev => set({ type: ev.target.value as PermitType })}>
                {Object.keys(TYPE_RULES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="rounded-lg border dark:border-dark-border p-3 text-sm bg-gray-50 dark:bg-white/5" data-testid="type-info">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge color={rule.risk === 'high' ? 'red' : rule.risk === 'medium' ? 'yellow' : 'green'}>{rule.risk} risk</Badge>
              <span className="text-gray-700 dark:text-gray-300">Valid for at most <strong>{rule.maxHours} h</strong> at a time, never more than 7 days in total.</span>
            </div>
            <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc ml-5 space-y-0.5">
              {rule.rams && <li>Needs a risk assessment / method statement reference before it can be submitted.</li>}
              {rule.isolation && <li>Needs its isolation points listed, then applied and verified before work starts.</li>}
              {rule.gasMaxAgeMin && <li>Needs a passing gas test, no older than {rule.gasMaxAgeMin} minutes, before work starts.</li>}
              {rule.fireWatch && <li>Needs a named fire watcher and at least 30 minutes of watch after the work.</li>}
              {rule.competency.length > 0 && <li>Workers' training certificates are checked.</li>}
              {details?.description && <li>{details.description}</li>}
            </ul>
          </div>

          <Field label="Title (short)" hint="Shown in lists. Leave blank to use the start of the description.">
            <input className={fieldCls} maxLength={80} value={f.title} onChange={ev => set({ title: ev.target.value })} />
          </Field>
          <Field label="Work description" required>
            <textarea className={fieldCls} rows={3} value={f.description} onChange={ev => set({ description: ev.target.value })} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Work location" required><input className={fieldCls} value={f.location} onChange={ev => set({ location: ev.target.value })} placeholder="e.g. Level 3 corridor, Plant room B4" /></Field>
            <Field label="Number of workers" required><input type="number" min={1} className={fieldCls} value={f.workers} onChange={ev => set({ workers: ev.target.value })} /></Field>
            <Field label="Start (local time)" required><input type="datetime-local" className={fieldCls} value={f.start} onChange={ev => set({ start: ev.target.value })} /></Field>
            <Field label="End (local time)" required><input type="datetime-local" className={fieldCls} value={f.end} onChange={ev => set({ end: ev.target.value })} /></Field>
            <Field label="Emergency contact (name and phone)" required><input className={fieldCls} value={f.emergency} onChange={ev => set({ emergency: ev.target.value })} /></Field>
            <Field label={`Risk assessment / method statement ref.${rule.rams ? '' : ' (optional)'}`} hint={rule.rams ? 'Required before the permit can be submitted.' : undefined}>
              <input className={fieldCls} value={f.rams} onChange={ev => set({ rams: ev.target.value })} />
            </Field>
            <Field label="Receiver (accepts the handover on site)" className="md:col-span-2">
              <select className={fieldCls} value={f.receiver} onChange={ev => set({ receiver: ev.target.value })}>
                <option value="">Same as me</option>
                {receivers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>
          {windowProblem && <p role="alert" className="text-sm text-red-600">{windowProblem}</p>}

          {conflicts.length > 0 && (
            <div className="space-y-2" data-testid="simops">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Other work in the same area</h3>
              {conflicts.map(c => (
                <div key={c.other_id} className={`flex items-start gap-2 rounded px-3 py-2 text-sm ${c.severity === 'block' ? 'bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200'}`}>
                  {c.severity === 'block' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                  <span>{c.reason}</span>
                </div>
              ))}
              {blocking.length > 0 && <p className="text-xs text-red-700 dark:text-red-300">This cannot be created while those permits overlap. Change the location or the time, or wait until they are closed.</p>}
            </div>
          )}

          <div className="rounded-lg border dark:border-dark-border p-3">
            <h3 className="text-sm font-bold mb-2 text-gray-800 dark:text-gray-200">Before you create it, confirm</h3>
            <div className="space-y-2">
              {CONFIRMATIONS.map((c, i) => (
                <label key={c} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <input type="checkbox" className="mt-0.5 w-4 h-4" checked={f.confirmed[i]} onChange={ev => set({ confirmed: f.confirmed.map((v, k) => (k === i ? ev.target.checked : v)) })} />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">File attachments are not available yet (file storage is not enabled), so nothing can be attached to a permit.</p>
          {error && <p role="alert" className="text-sm rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-3 py-2" data-testid="create-error">{error}</p>}
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex flex-wrap justify-between items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {!ptwActor ? 'Loading your profile...' : missing.length > 0 ? `Still needed: ${missing.join(', ')}.` : !allConfirmed ? 'Tick all four confirmations.' : ''}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!canCreate} data-testid="create-permit">{busy ? 'Creating...' : 'Create draft permit'}</Button>
          </div>
        </footer>
      </form>
    </div>
  );
};
