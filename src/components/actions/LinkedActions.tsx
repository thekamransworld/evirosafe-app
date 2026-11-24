import React, { useState } from 'react';
import { useAppContext, useDataContext } from '../../contexts';
import { canCreate, type ActionDoc, type ActionSource } from '../../lib/actions/engine';
import { isOverdue, ymd } from '../../lib/actions/overdue';
import { ActionCreateModal } from './ActionCreateModal';
import { ActionDetailModal } from './ActionDetailModal';
import { PriorityBadge, StageBadge, fmtDate, personName } from './actionsUi';

/**
 * The actions that came from one source (an incident, an inspection...), with a button to raise another.
 * This is how an incident's corrective and preventive actions are tracked: in the one action store.
 */
export const LinkedActions: React.FC<{ source: ActionSource & { id: string }; projectId?: string; title?: string }> = ({ source, projectId, title = 'Corrective & Preventive Actions' }) => {
  const { actionItems, actionActor } = useDataContext();
  const { usersList } = useAppContext();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = ymd(Date.now());

  const linked = (actionItems as ActionDoc[])
    .filter(a => !!a.number && a.source?.type === source.type && a.source?.id === source.id)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const finished = linked.filter(a => a.status === 'CLOSED').length;
  const mayRaise = !!actionActor && canCreate(actionActor);

  return (
    <div data-testid="linked-actions">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            {finished}/{linked.length} closed
          </span>
          {mayRaise && (
            <button type="button" onClick={() => setCreating(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#10b981', color: 'white' }} data-testid="linked-raise">
              + Raise action
            </button>
          )}
        </div>
      </div>

      {linked.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }} data-testid="linked-empty">No actions raised from this yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-dark-border">
          {linked.map(a => (
            <li key={a.id}>
              <button type="button" onClick={() => setOpenId(a.id)} className="w-full text-left py-3 flex items-start gap-3" data-testid="linked-row">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words"><span className="font-mono text-xs text-gray-500 mr-2">{a.number}</span>{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {personName(usersList, a.owner_id)} · due {fmtDate(a.due_date)}
                    {isOverdue({ status: a.status, due_date: a.due_date }, today) && <strong className="text-red-600 dark:text-red-400"> · overdue</strong>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1"><StageBadge status={a.status} /><PriorityBadge priority={a.priority} /></div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ActionCreateModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        initial={{ project_id: projectId, source, kind: 'corrective' }}
      />
      {openId && <ActionDetailModal actionId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};
