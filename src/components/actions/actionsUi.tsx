import React from 'react';
import { Badge } from '../ui/Badge';
import { PRIORITY_LABEL, SOURCE_LABEL, STAGE_LABEL, type Priority, type SourceType, type Stage } from '../../lib/actions/model';
import { normalizeStage, type ActionSource } from '../../lib/actions/engine';
import { daysUntil, toMillis } from '../../lib/actions/overdue';

type BadgeColor = React.ComponentProps<typeof Badge>['color'];

const STAGE_COLOR: Record<Stage, BadgeColor> = {
  OPEN: 'blue', IN_PROGRESS: 'amber', COMPLETED: 'purple', CLOSED: 'green', CANCELLED: 'gray',
};
const PRIORITY_COLOR: Record<Priority, BadgeColor> = { low: 'gray', medium: 'blue', high: 'amber', critical: 'red' };

export const StageBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = normalizeStage(status);
  return <Badge color={s ? STAGE_COLOR[s] : 'gray'} size="sm">{s ? STAGE_LABEL[s] : String(status).replace(/_/g, ' ')}</Badge>;
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <Badge color={PRIORITY_COLOR[priority as Priority] ?? 'gray'} size="sm">{PRIORITY_LABEL[priority as Priority] ?? priority}</Badge>
);

/** "2026-11-21" shown the way the reader's device shows dates. */
export const fmtDate = (ymd: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd ?? '')) return ymd || '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { dateStyle: 'medium' });
};

/** A server timestamp (or anything toMillis understands) as date and time. */
export const fmtStamp = (v: unknown): string => {
  const ms = toMillis(v);
  return Number.isFinite(ms) ? new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
};

/** How a due date reads against today: "Overdue by 3 days", "Due today", "Due in 5 days". */
export function dueText(due: string, today: string): { text: string; overdue: boolean; soon: boolean } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due ?? '')) return { text: 'No due date', overdue: false, soon: false };
  const n = daysUntil(due, today);
  if (n < 0) return { text: `Overdue by ${-n} day${n === -1 ? '' : 's'}`, overdue: true, soon: false };
  if (n === 0) return { text: 'Due today', overdue: false, soon: true };
  return { text: `Due in ${n} day${n === 1 ? '' : 's'}`, overdue: false, soon: n <= 3 };
}

export const sourceText = (s: ActionSource | undefined): string => {
  if (!s) return SOURCE_LABEL.manual;
  const base = SOURCE_LABEL[s.type as SourceType] ?? String(s.type);
  return s.ref ? `${base}: ${s.ref}` : base;
};

/** Only https links from an old record are shown as links. */
export const safeHref = (u: unknown): string | null => (typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u) ? u : null);

export interface PersonLike { id: string; name?: string; email?: string }
export const personName = (users: PersonLike[], id?: string): string => {
  if (!id) return 'Unassigned';
  const u = users.find(x => x.id === id);
  return u?.name || u?.email?.split('@')[0] || id;
};

/** A simple accessible dialog: Escape and the backdrop ask to close (the caller decides, e.g. to guard unsaved work). */
export const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testid?: string;
  wide?: boolean;
}> = ({ title, onClose, children, testid, wide }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog" aria-modal="true" aria-label={title} data-testid={testid}
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">✕</button>
        </div>
        <div className="overflow-y-auto px-4 sm:px-5 py-4">{children}</div>
      </div>
    </div>
  );
};
