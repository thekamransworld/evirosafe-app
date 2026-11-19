import React from 'react';
import type { PtwWorkflowLog, User } from '../../types';
import { ACTIONS, STAGE_LABEL, normalizeStage, type ActionId } from '../../lib/ptw/model';
import { Badge } from '../ui/Badge';
import { fmtDateTime } from './ptwUi';

/** The permit's history, from the log the database keeps append-only. */
export const PermitTimeline: React.FC<{ log: PtwWorkflowLog[]; users?: User[] }> = ({ log, users = [] }) => {
  if (!log || log.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>;
  const entries = [...log].reverse();
  return (
    <ol className="relative border-l-2 border-gray-200 dark:border-dark-border ml-2 space-y-5" data-testid="permit-timeline">
      {entries.map((e, i) => {
        const def = ACTIONS[e.action as ActionId];
        const stage = normalizeStage(e.stage as string);
        const who = e.user_name || users.find(u => u.id === e.user_id)?.name || e.user_id || 'Unknown';
        const ts = new Date(e.timestamp).getTime();
        return (
          <li key={`${e.timestamp}-${i}`} className="ml-4">
            <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-dark-card ${e.override ? 'bg-amber-500' : 'bg-primary-500'}`} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{e.action === 'create' ? 'Created' : def?.label ?? String(e.action).replace(/_/g, ' ')}</span>
              {stage && <Badge color="gray" size="sm">{STAGE_LABEL[stage]}</Badge>}
              {e.override && <Badge color="amber" size="sm">Override</Badge>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {who}{e.role ? ` (${String(e.role).replace(/_/g, ' ').toLowerCase()})` : ''}{Number.isFinite(ts) ? ` · ${fmtDateTime(ts)}` : ''}
            </div>
            {e.comments && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{e.comments}</p>}
            {e.override && e.justification && (
              <p className="mt-1 text-xs rounded bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-2 py-1">
                <strong>Written justification:</strong> {e.justification}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
};
