import React from 'react';
import type { PtwIsolationPoint } from '../../types';
import { Button } from '../ui/Button';
import { fmtDateTime } from './ptwUi';

const input = 'w-full p-2 border rounded-md text-sm bg-white dark:bg-dark-background dark:border-dark-border text-gray-900 dark:text-gray-100 disabled:opacity-60';

/**
 * The isolation register. Applying, verifying and removing an isolation is
 * stamped with the logged-in person's name and the time: it is not typed in.
 * Once a step is stamped it is locked.
 */
export const IsolationRegister: React.FC<{
  points: PtwIsolationPoint[];
  onChange: (points: PtwIsolationPoint[]) => void;
  actorName: string;
  /** May add or edit the list of points (a draft, or before anything is applied). */
  canDefine: boolean;
  /** May stamp applied / verified / removed. */
  canStamp: boolean;
  required: boolean;
  now?: number;
}> = ({ points = [], onChange, actorName, canDefine, canStamp, required, now = Date.now() }) => {
  const update = (i: number, patch: Partial<PtwIsolationPoint>) => onChange(points.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const add = () => onChange([...points, { id: `iso_${now}_${points.length}`, point: '', method: '' }]);
  const stamp = (i: number, kind: 'applied' | 'verified' | 'removed') =>
    update(i, { [`${kind}_by`]: actorName, [`${kind}_at`]: new Date(now).toISOString() } as Partial<PtwIsolationPoint>);
  const at = (iso?: string) => (iso ? fmtDateTime(new Date(iso).getTime()) : '');

  return (
    <div className="border rounded-lg p-4 dark:border-dark-border" data-testid="isolation-register">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200">Isolation register {required && <span className="text-xs font-normal text-red-600">(required for this permit type)</span>}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Each step is stamped with your name and the time when you press the button.</p>
        </div>
        {canDefine && <Button size="sm" onClick={add}>+ Add isolation point</Button>}
      </div>
      {points.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{required ? 'No isolation points listed yet.' : 'No isolations for this permit.'}</p>}
      <div className="space-y-3">
        {points.map((p, i) => {
          const locked = !!p.applied_at;
          const same = p.applied_by && p.verified_by && p.applied_by.toLowerCase() === p.verified_by.toLowerCase();
          return (
            <div key={p.id} className="rounded-md border dark:border-dark-border p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Isolation point
                  <input className={input} value={p.point} disabled={!canDefine || locked} onChange={e => update(i, { point: e.target.value })} placeholder="e.g. Valve V-12, DB-3 breaker 14" />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">Method
                  <input className={input} value={p.method} disabled={!canDefine || locked} onChange={e => update(i, { method: e.target.value })} placeholder="Lock and tag, blank flange, ..." />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">Lock / tag no.
                  <input className={input} value={p.lock_no ?? ''} disabled={!canDefine || locked} onChange={e => update(i, { lock_no: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {(['applied', 'verified', 'removed'] as const).map((kind, k) => {
                  const by = (p as any)[`${kind}_by`] as string | undefined;
                  const when = (p as any)[`${kind}_at`] as string | undefined;
                  const prior = k === 0 ? true : !!(p as any)[`${(['applied', 'verified', 'removed'] as const)[k - 1]}_at`];
                  return (
                    <div key={kind} className="rounded bg-gray-50 dark:bg-white/5 px-2 py-2">
                      <div className="font-semibold capitalize text-gray-700 dark:text-gray-300">{kind}</div>
                      {when ? <div className="text-emerald-700 dark:text-emerald-300">{by} · {at(when)}</div>
                        : canStamp && prior && p.point.trim()
                          ? <Button size="sm" variant="secondary" onClick={() => stamp(i, kind)} data-testid={`stamp-${kind}-${i}`}>Mark {kind}</Button>
                          : <div className="text-gray-400">{prior ? 'Not yet' : `After it is ${(['applied', 'verified', 'removed'] as const)[k - 1]}`}</div>}
                    </div>
                  );
                })}
              </div>
              {same && <p className="text-xs text-amber-700 dark:text-amber-300">Applied and verified by the same person. A second person should verify.</p>}
              {canDefine && !locked && <button type="button" className="text-xs text-red-500" onClick={() => onChange(points.filter((_, k) => k !== i))}>Remove this point</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
