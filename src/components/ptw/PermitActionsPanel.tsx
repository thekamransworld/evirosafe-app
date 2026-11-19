import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { Ptw } from '../../types';
import { availableActions, type ActionOption, type ActorLike, type EnginePermit } from '../../lib/ptw/engine';
import type { GateContext, GateResult } from '../../lib/ptw/gates';
import { MIN_JUSTIFICATION_CHARS, MIN_REASON_CHARS, normalizeStage, type ActionId } from '../../lib/ptw/model';
import { effectiveStatus } from '../../lib/ptw/validity';
import type { TransitionOutcome, TransitionRequest } from '../../services/ptwService';
import { canReauth as defaultCanReauth, reauthenticate as defaultReauth, type ReauthResult } from '../../services/reauth';
import { Button } from '../ui/Button';
import { useNow } from './useNow';
import { STAGE_HELP } from './ptwUi';

type GateInputs = Pick<GateContext, 'others' | 'competency'>;
type PerformOpts = Pick<TransitionRequest, 'note' | 'justification' | 'reauthenticated'>;

export interface PermitActionsPanelProps {
  permit: Ptw;
  actor: ActorLike | null;
  gateInputs: GateInputs;
  /** The form has unsaved edits: the checks run on the SAVED permit, so save first. */
  dirty: boolean;
  onPerform: (action: ActionId, opts: PerformOpts) => Promise<TransitionOutcome>;
  /** Name of the user being impersonated, if any: actions are still recorded as the real signed-in person. */
  impersonatingAs?: string | null;
  /** Injectable for tests. */
  confirmPassword?: (password: string) => Promise<ReauthResult>;
  passwordAvailable?: () => boolean;
}

const GateList: React.FC<{ results: GateResult[] }> = ({ results }) => {
  const problems = results.filter(r => r.level !== 'ok');
  const oks = results.filter(r => r.level === 'ok');
  return (
    <div className="space-y-1.5 text-sm" data-testid="gate-list">
      {problems.map(r => (
        <div key={r.id} className={`flex items-start gap-2 rounded px-2 py-1.5 ${r.level === 'block' ? 'bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200'}`}>
          {r.level === 'block' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <span>{r.message}{r.level === 'block' && r.overridable ? ' (an approver can override this in writing)' : ''}</span>
        </div>
      ))}
      {oks.length > 0 && (
        <details className="text-emerald-800 dark:text-emerald-300">
          <summary className="cursor-pointer flex items-center gap-2"><CheckCircle2 size={16} /> {oks.length} check{oks.length === 1 ? '' : 's'} passed</summary>
          <ul className="mt-1 ml-6 list-disc text-xs space-y-0.5">{oks.map(r => <li key={r.id}>{r.message}</li>)}</ul>
        </details>
      )}
    </div>
  );
};

const variantFor = (o: ActionOption) =>
  o.def.tone === 'primary' ? 'primary' : o.def.tone === 'danger' ? 'danger' : o.def.tone === 'warning' ? 'outline' : 'secondary';

export const PermitActionsPanel: React.FC<PermitActionsPanelProps> = ({
  permit, actor, gateInputs, dirty, onPerform, impersonatingAs,
  confirmPassword = defaultReauth, passwordAvailable = defaultCanReauth,
}) => {
  const now = useNow(10_000);
  const [selectedId, setSelectedId] = useState<ActionId | null>(null);
  const [note, setNote] = useState('');
  const [justification, setJustification] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const p = permit as unknown as EnginePermit;
  const stage = effectiveStatus(p, now) ?? normalizeStage(permit.status);
  const options = useMemo(
    () => (actor ? availableActions(p, actor, now, gateInputs) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permit, actor, now, gateInputs.others, gateInputs.competency],
  );

  const reset = () => { setSelectedId(null); setNote(''); setJustification(''); setPassword(''); setError(''); };
  const selected = options.find(o => o.def.id === selectedId) ?? null;
  const clickable = (o: ActionOption) => o.enabled || !!o.needsOverride;

  if (!actor) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Your profile is still loading. Actions will appear in a moment.</p>;
  }

  const act = options.filter(clickable);
  const unavailable = options.filter(o => !clickable(o));
  const overrideNeeded = !!selected && (!!selected.needsOverride || !!selected.needsGateOverride);
  const needsPassword = !!selected?.def.reauth;
  const noteOk = !selected?.def.reason || note.trim().length >= MIN_REASON_CHARS;
  const justOk = !overrideNeeded || justification.trim().length >= MIN_JUSTIFICATION_CHARS;
  const passOk = !needsPassword || password.length > 0;
  const canConfirm = !!selected && !busy && !dirty && noteOk && justOk && passOk && (!needsPassword || passwordAvailable());

  const confirm = async () => {
    if (!selected || !canConfirm) return;
    setBusy(true);
    setError('');
    try {
      let reauthenticated: boolean | undefined;
      if (needsPassword) {
        const r = await confirmPassword(password);
        if (r.ok === false) { setError(r.reason); return; }
        reauthenticated = true;
      }
      const r = await onPerform(selected.def.id, {
        note: note.trim() || undefined,
        justification: overrideNeeded ? justification.trim() : undefined,
        reauthenticated,
      });
      if (r.ok === false) setError(r.reason);
      else reset();
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  const inputCls = 'w-full p-2 border rounded-md text-sm bg-white dark:bg-dark-background dark:border-dark-border text-gray-900 dark:text-gray-100';

  return (
    <div className="w-full space-y-3" data-testid="actions-panel">
      {stage && <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5"><Info size={14} className="mt-0.5 shrink-0" />{STAGE_HELP[stage]}</p>}
      {impersonatingAs && (
        <p className="text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1">
          You are viewing the app as {impersonatingAs}. Permit actions are recorded as <strong>you ({actor.name})</strong>, not as them.
        </p>
      )}
      {dirty && (
        <p role="alert" className="text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1.5" data-testid="dirty-warning">
          You have unsaved changes. Save them first: the checks run on the saved permit.
        </p>
      )}

      {!selected && (
        <div className="flex flex-wrap gap-2">
          {act.map(o => (
            <Button key={o.def.id} variant={variantFor(o)} disabled={dirty} onClick={() => { setSelectedId(o.def.id); setError(''); }} data-testid={`action-${o.def.id}`}>
              {o.def.label}{!o.enabled && o.needsOverride ? ' (admin override)' : ''}
            </Button>
          ))}
          {act.length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400 italic">Nothing for you to do on this permit right now.</span>}
        </div>
      )}

      {!selected && unavailable.length > 0 && (
        <details className="text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer">Not available to you ({unavailable.length})</summary>
          <ul className="mt-1 space-y-1">
            {unavailable.map(o => <li key={o.def.id}><strong>{o.def.label}:</strong> {o.reason}</li>)}
          </ul>
        </details>
      )}

      {selected && (
        <div className="rounded-lg border border-gray-200 dark:border-dark-border p-3 space-y-3 bg-white dark:bg-dark-card max-h-[45vh] overflow-y-auto" data-testid="action-sheet">
          <div className="font-bold text-gray-900 dark:text-gray-100">{selected.def.label}</div>

          {selected.gates.length > 0 && <GateList results={selected.gates} />}

          {selected.needsOverride && (
            <p className="text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1.5">
              {selected.reason} It will be recorded and flagged in the permit history.
            </p>
          )}
          {selected.needsGateOverride && (
            <p className="text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1.5">
              Some checks are blocking. As an approver you can override them, in writing. The override is recorded and flagged in the permit history.
            </p>
          )}

          {overrideNeeded && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Written justification (required, at least {MIN_JUSTIFICATION_CHARS} characters)</span>
              <textarea className={`${inputCls} mt-1`} rows={2} value={justification} onChange={e => setJustification(e.target.value)} data-testid="justification" />
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{selected.def.reason ? `Reason (required, at least ${MIN_REASON_CHARS} characters)` : 'Note (optional)'}</span>
            <textarea className={`${inputCls} mt-1`} rows={2} value={note} onChange={e => setNote(e.target.value)} data-testid="note" />
          </label>

          {needsPassword && (
            <label className="block text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Confirm with your password to sign this step</span>
              <input type="password" autoComplete="current-password" className={`${inputCls} mt-1`} value={password} onChange={e => setPassword(e.target.value)} data-testid="password" />
              {!passwordAvailable() && <span className="text-xs text-red-600">Password confirmation is not available right now. Sign out and back in.</span>}
            </label>
          )}

          {error && <p role="alert" className="text-sm rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1.5" data-testid="action-error">{error}</p>}

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
            <Button variant={variantFor(selected)} onClick={confirm} disabled={!canConfirm} data-testid="confirm-action">
              {busy ? 'Working...' : `${selected.def.label}${overrideNeeded ? ' (override)' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
