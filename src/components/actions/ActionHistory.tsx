import React from 'react';
import { Badge } from '../ui/Badge';
import { ACTIONS, STAGE_LABEL, type ActionId } from '../../lib/actions/model';
import { normalizeStage, type ActionDoc } from '../../lib/actions/engine';
import { fmtStamp, personName, type PersonLike } from './actionsUi';

const LABELS: Record<string, string> = { create: 'Raised', import: 'Imported from the old system' };

/** The action's history, from the log the database keeps append-only. Newest first. */
export const ActionHistory: React.FC<{ action: ActionDoc; users: PersonLike[] }> = ({ action, users }) => {
  const log = action.history ?? [];
  if (log.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>;
  const entries = [...log].reverse();
  return (
    <div data-testid="action-history">
      <ol className="relative border-l-2 border-gray-200 dark:border-dark-border ml-2 space-y-5">
        {entries.map((e, i) => {
          const stage = normalizeStage(e.stage);
          const label = LABELS[e.action] ?? ACTIONS[e.action as ActionId]?.label ?? String(e.action).replace(/_/g, ' ');
          const when = Date.parse(e.timestamp);
          return (
            <li key={`${e.timestamp}-${i}`} className="ml-4">
              <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-dark-card ${e.override ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{label}</span>
                {stage && <Badge color="gray" size="sm">{STAGE_LABEL[stage]}</Badge>}
                {e.override && <Badge color="amber" size="sm">Override</Badge>}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {e.user_name || personName(users, e.user_id)}{e.role ? ` (${String(e.role).replace(/_/g, ' ').toLowerCase()})` : ''}
                {Number.isFinite(when) ? ` · ${new Date(when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
              </div>
              {e.note && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{e.note}</p>}
              {e.changes && (
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  {Object.entries(e.changes).map(([k, v]) => (
                    <li key={k}>{k.replace(/_/g, ' ')}: {k === 'owner_id' ? `${personName(users, String(v.from))} → ${personName(users, String(v.to))}` : `${String(v.from)} → ${String(v.to)}`}</li>
                  ))}
                </ul>
              )}
              {e.override && e.justification && (
                <p className="mt-1 text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1">
                  <strong>Written justification:</strong> {e.justification}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400">
        Times in this list come from the device that made each change. The database's own clock stamped the latest change at {fmtStamp(action.last_transition_at) || 'a moment ago'}.
      </p>
    </div>
  );
};
