import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext, useDataContext } from '../../contexts';
import {
  KINDS, KIND_LABEL, PRIORITIES, PRIORITY_DUE_DAYS, PRIORITY_LABEL, STAFF, CAR_KEYS, CAR_LABEL, MAX,
  type Kind, type Priority,
} from '../../lib/actions/model';
import { validateNewAction, type ActionDoc, type ActionSource } from '../../lib/actions/engine';
import { addDays, ymd } from '../../lib/actions/overdue';
import { ModalShell, personName, sourceText } from './actionsUi';

export interface NewActionInitial {
  project_id?: string;
  title?: string;
  description?: string;
  kind?: Kind;
  priority?: Priority;
  /** Where the action comes from (an incident, an inspection...). Shown as a fixed link; "raised directly" when absent. */
  source?: ActionSource;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial?: NewActionInitial;
  onCreated?: (action: ActionDoc) => void;
}

const FIELD = 'giq-input w-full mt-1';
const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-gray-300';

export const ActionCreateModal: React.FC<Props> = ({ isOpen, onClose, initial, onCreated }) => {
  const { projects, handleCreateAction, actionActor, actionProjectIds } = useDataContext();
  const { usersList, activeOrg } = useAppContext();

  const myProjects = useMemo(
    () => (projects ?? []).filter((p: any) => !actionProjectIds || actionProjectIds.includes(p.id)),
    [projects, actionProjectIds],
  );
  const owners = useMemo(
    () => (usersList ?? []).filter((u: any) => (!u.status || u.status === 'active') && (STAFF as readonly string[]).includes(u.role) && (!activeOrg || u.org_id === activeOrg.id)),
    [usersList, activeOrg],
  );

  const start = useMemo(() => ({
    project_id: initial?.project_id ?? (myProjects.length === 1 ? myProjects[0].id : ''),
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    kind: (initial?.kind ?? 'corrective') as Kind,
    priority: (initial?.priority ?? 'medium') as Priority,
    owner_id: '',
  }), [initial, myProjects]);

  const [f, setF] = useState(start);
  const [due, setDue] = useState('');
  const [dueTouched, setDueTouched] = useState(false);
  const [car, setCar] = useState<Record<string, string>>({});
  const [showCar, setShowCar] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Each time the dialog opens it starts clean.
  useEffect(() => {
    if (!isOpen) return;
    setF(start); setCar({}); setShowCar(false); setProblems([]); setDueTouched(false); setBusy(false);
  }, [isOpen, start]);

  // The due date follows the priority until the person picks one.
  useEffect(() => {
    if (!isOpen || dueTouched) return;
    setDue(addDays(ymd(Date.now()), PRIORITY_DUE_DAYS[f.priority]));
  }, [isOpen, f.priority, dueTouched]);

  if (!isOpen) return null;

  const dirty = !!(f.title.trim() || f.description.trim() || f.owner_id || Object.values(car).some(v => v.trim())) ;
  const close = () => {
    if (dirty && !busy && !window.confirm('Discard this action? What you typed will be lost.')) return;
    onClose();
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = validateNewAction({ ...f, due_date: due, source: initial?.source ?? { type: 'manual' }, car });
    if (checked.ok === false) { setProblems(checked.problems); return; }
    setProblems([]);
    setBusy(true);
    const r = await handleCreateAction(checked.value);
    setBusy(false);
    if (r.ok === true) { onCreated?.(r.action); onClose(); } else setProblems([r.reason]);
  };

  return (
    <ModalShell title="Raise an action" onClose={close} testid="action-create">
      <form onSubmit={submit} className="space-y-4">
        {initial?.source && (
          <p className="text-xs rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 px-3 py-2" data-testid="create-source">
            Linked to: {sourceText(initial.source)}
          </p>
        )}
        <label className={LABEL}>What has to be done
          <input value={f.title} onChange={set('title')} maxLength={MAX.title} className={FIELD} placeholder="e.g. Replace the damaged guard rail on level 3" data-testid="create-title" />
        </label>
        <label className={LABEL}>Details (optional)
          <textarea value={f.description} onChange={set('description')} rows={3} maxLength={MAX.description} className={FIELD} data-testid="create-description" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={LABEL}>Project
            <select value={f.project_id} onChange={set('project_id')} className={FIELD} data-testid="create-project">
              <option value="">Choose a project…</option>
              {myProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className={LABEL}>Responsible person (owner)
            <select value={f.owner_id} onChange={set('owner_id')} className={FIELD} data-testid="create-owner">
              <option value="">Choose an owner…</option>
              {owners.map((u: any) => <option key={u.id} value={u.id}>{personName(usersList, u.id)}</option>)}
            </select>
          </label>
          <label className={LABEL}>Type
            <select value={f.kind} onChange={set('kind')} className={FIELD} data-testid="create-kind">
              {KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label className={LABEL}>Priority
            <select value={f.priority} onChange={set('priority')} className={FIELD} data-testid="create-priority">
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          <label className={`${LABEL} sm:col-span-2`}>Due date
            <input type="date" value={due} onChange={e => { setDue(e.target.value); setDueTouched(true); }} className={FIELD} data-testid="create-due" />
            <span className="block mt-1 font-normal text-[11px] text-gray-500 dark:text-gray-400">
              Suggested from the priority ({PRIORITY_DUE_DAYS[f.priority]} day{PRIORITY_DUE_DAYS[f.priority] === 1 ? '' : 's'}); change it if the client's procedure says otherwise.
            </span>
          </label>
        </div>

        <div>
          <button type="button" onClick={() => setShowCar(v => !v)} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400" data-testid="create-car-toggle">
            {showCar ? '− Hide' : '+ Add'} corrective-action details (root cause, effectiveness check)
          </button>
          {showCar && (
            <div className="mt-2 space-y-3">
              {CAR_KEYS.filter(k => k !== 'effectiveness_result').map(k => (
                <label key={k} className={LABEL}>{CAR_LABEL[k]}
                  <textarea value={car[k] ?? ''} onChange={e => setCar(p => ({ ...p, [k]: e.target.value }))} rows={2} maxLength={MAX.car} className={FIELD} data-testid={`create-${k}`} />
                </label>
              ))}
            </div>
          )}
        </div>

        {problems.length > 0 && (
          <ul role="alert" className="text-sm text-red-600 dark:text-red-400 list-disc pl-5 space-y-0.5" data-testid="create-problems">
            {problems.map(p => <li key={p}>{p}</li>)}
          </ul>
        )}
        {!actionActor && <p className="text-xs text-gray-500">Checking who you are…</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={close} className="giq-btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={busy || !actionActor} className="giq-btn-primary text-sm" data-testid="create-submit">{busy ? 'Saving…' : 'Raise action'}</button>
        </div>
      </form>
    </ModalShell>
  );
};
