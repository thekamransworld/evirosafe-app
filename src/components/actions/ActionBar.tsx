import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import {
  ACTIONS, MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, PRIORITIES, PRIORITY_LABEL, STAFF, STAGE_HELP,
  type ActionId,
} from '../../lib/actions/model';
import {
  availableActions, normalizeStage, prepareTransition,
  type ActionDoc, type ActorLike, type Reschedule,
} from '../../lib/actions/engine';
import type { StepOptions } from '../../hooks/useActionsController';
import type { StepOutcome } from '../../services/actionsService';
import { personName } from './actionsUi';

interface UserLite { id: string; name?: string; email?: string; org_id?: string; role?: string; status?: string }

interface Props {
  action: ActionDoc;
  actor: ActorLike;
  users: UserLite[];
  onStep: (step: ActionId, opts: StepOptions) => Promise<StepOutcome>;
}

const TONE: Record<string, string> = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  neutral: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

/**
 * The steps this person can take on this action, each with the reason when it is not available (role, or the
 * segregation-of-duties rule). A step that needs a note, a new due date or a written override opens a small form;
 * the engine checks it again before anything is sent, so what is refused here is what the database would refuse.
 */
export const ActionBar: React.FC<Props> = ({ action, actor, users, onStep }) => {
  const [open, setOpen] = useState<{ id: ActionId; override: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [justification, setJustification] = useState('');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const stage = normalizeStage(action.status);
  const options = availableActions(action, actor);
  const owners = users.filter(u => (!u.status || u.status === 'active') && (STAFF as readonly string[]).includes(u.role ?? ''));

  const reset = () => { setOpen(null); setNote(''); setJustification(''); setOwner(''); setDue(''); setPriority(''); setProblem(''); };
  const begin = (id: ActionId, override: boolean) => {
    setProblem(''); setNote(''); setJustification('');
    setOwner(action.owner_id); setDue(action.due_date); setPriority(action.priority);
    setOpen({ id, override });
  };

  const changes = (): Reschedule | undefined => {
    if (open?.id !== 'reschedule') return undefined;
    const c: Reschedule = {};
    if (owner && owner !== action.owner_id) c.owner_id = owner;
    if (due && due !== action.due_date) c.due_date = due;
    if (priority && priority !== action.priority) c.priority = priority;
    return c;
  };

  const submit = async (id: ActionId, override: boolean) => {
    const opts: StepOptions = { note, justification: override ? justification : undefined, changes: changes() };
    // The same check the service runs; shown here first so the person can fix it without a round trip.
    const dry = prepareTransition({ action, step: id, actor, now: Date.now(), note: opts.note, justification: opts.justification, changes: opts.changes });
    if (dry.ok === false) { setProblem(dry.reason); return; }
    setBusy(true);
    const r = await onStep(id, opts);
    setBusy(false);
    if (r.ok === true) reset(); else setProblem(r.reason);
  };

  const needsForm = (id: ActionId, override: boolean) => ACTIONS[id].reason || override || id === 'reschedule';

  async function submitNow(id: ActionId) {
    setProblem('');
    setBusy(true);
    const r = await onStep(id, {});
    setBusy(false);
    if (r.ok === false) setProblem(r.reason);
  }

  if (options.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="action-bar">Nothing to do on this action at the moment.</p>;
  }

  return (
    <div data-testid="action-bar" className="space-y-3">
      {stage && <p className="text-xs text-gray-600 dark:text-gray-400">{STAGE_HELP[stage]}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const id = o.def.id;
          const usable = o.enabled || o.needsOverride;
          return (
            <button
              key={id}
              type="button"
              data-testid={`step-${id}`}
              disabled={!usable || busy}
              aria-disabled={!usable}
              title={o.enabled ? undefined : o.reason}
              onClick={() => (needsForm(id, !!o.needsOverride) ? begin(id, !!o.needsOverride) : void submitNow(id))}
              className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${usable ? TONE[o.def.tone] : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500'}`}
            >
              {!o.enabled && !o.needsOverride && <Lock className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden />}
              {o.needsOverride && <ShieldAlert className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden />}
              {o.def.label}
            </button>
          );
        })}
      </div>

      {/* Every blocked step says why, in words. */}
      <ul className="space-y-1">
        {options.filter(o => !o.enabled).map(o => (
          <li key={o.def.id} data-testid={`blocked-${o.def.id}`} className="text-xs text-gray-600 dark:text-gray-400">
            <strong className="font-semibold">{o.def.label}:</strong> {o.reason}
          </li>
        ))}
      </ul>

      {open && (
        <form
          data-testid="step-form"
          onSubmit={e => { e.preventDefault(); void submit(open.id, open.override); }}
          className="rounded-xl border border-gray-200 dark:border-dark-border p-3 space-y-3 bg-gray-50 dark:bg-white/5"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ACTIONS[open.id].label}</p>
          {open.id === 'reschedule' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">Owner
                <select value={owner} onChange={e => setOwner(e.target.value)} className="giq-input w-full mt-1" data-testid="reschedule-owner">
                  {!action.owner_id && <option value="">Choose an owner…</option>}
                  {owners.map(u => <option key={u.id} value={u.id}>{personName(users, u.id)}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">Due date
                <input type="date" value={due} onChange={e => setDue(e.target.value)} className="giq-input w-full mt-1" data-testid="reschedule-due" />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">Priority
                <select value={priority} onChange={e => setPriority(e.target.value)} className="giq-input w-full mt-1" data-testid="reschedule-priority">
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </label>
            </div>
          )}
          {(ACTIONS[open.id].reason) && (
            <label className="block text-xs text-gray-600 dark:text-gray-400">
              {open.id === 'complete' ? 'What was done (written note)' : open.id === 'verify' ? 'What you checked (written note)' : 'Written note'} · at least {MIN_REASON_CHARS} characters
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="giq-input w-full mt-1" data-testid="step-note" />
            </label>
          )}
          {open.override && (
            <label className="block text-xs text-amber-800 dark:text-amber-200">
              Written justification for the override · at least {MIN_JUSTIFICATION_CHARS} characters. It is kept in the history and flagged.
              <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={2} className="giq-input w-full mt-1" data-testid="step-justification" />
            </label>
          )}
          {problem && <p role="alert" className="text-sm text-red-600 dark:text-red-400" data-testid="step-problem">{problem}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={reset} className="giq-btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="giq-btn-primary text-sm" data-testid="step-submit">{busy ? 'Saving…' : ACTIONS[open.id].label}</button>
          </div>
        </form>
      )}
    </div>
  );
};
