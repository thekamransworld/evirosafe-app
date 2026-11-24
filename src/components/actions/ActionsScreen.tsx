import React, { useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Eye, User as UserIcon } from 'lucide-react';
import { useAppContext, useDataContext } from '../../contexts';
import {
  PRIORITIES, PRIORITY_LABEL, SOURCE_LABEL, SOURCE_TYPES, STAGE_GROUPS, type Stage,
} from '../../lib/actions/model';
import { awaitingFor, canCreate, normalizeStage, type ActionDoc } from '../../lib/actions/engine';
import { isOverdue, summarize, ymd } from '../../lib/actions/overdue';
import { useNow } from '../ptw/useNow';
import { ActionCreateModal } from './ActionCreateModal';
import { ActionDetailModal } from './ActionDetailModal';
import { PriorityBadge, StageBadge, dueText, fmtDate, personName, sourceText } from './actionsUi';

type TabKey = 'me' | 'todo' | 'verify' | 'done' | 'all';
const TAB_LABEL: Record<TabKey, string> = { me: 'Awaiting me', todo: 'To do', verify: 'To verify', done: 'Done', all: 'All' };
const TABS: TabKey[] = ['me', 'todo', 'verify', 'done', 'all'];

const inGroup = (a: ActionDoc, g: keyof typeof STAGE_GROUPS) => (STAGE_GROUPS[g] as readonly string[]).includes(a.status);

const Chip: React.FC<{ icon: React.ReactNode; label: string; value: number; tone?: string }> = ({ icon, label, value, tone = '' }) => (
  <div className={`flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2 ${tone}`}>
    {icon}
    <div><p className="text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p></div>
  </div>
);

/** The Action Tracker: every corrective and preventive action, from every source, in one live list. */
export const ActionsScreen: React.FC = () => {
  const { actionItems, projects, actionActor, actionsReady } = useDataContext();
  const { usersList } = useAppContext();
  const now = useNow(60_000);
  const today = ymd(now);

  const all = actionItems as ActionDoc[];
  const numbered = useMemo(() => all.filter(a => !!a.number), [all]);
  const legacy = useMemo(() => all.filter(a => !a.number), [all]);

  const mine = useMemo(() => (actionActor ? numbered.filter(a => awaitingFor(a, actionActor)) : []), [numbered, actionActor]);
  const [tab, setTab] = useState<TabKey | null>(null);
  const shown: TabKey = tab ?? (mine.length > 0 ? 'me' : 'todo');

  const [q, setQ] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('');
  const [source, setSource] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const summary = useMemo(() => summarize(numbered as any, today), [numbered, today]);

  const inTab = (a: ActionDoc) =>
    shown === 'all' ? true
    : shown === 'me' ? !!actionActor && !!awaitingFor(a, actionActor)
    : inGroup(a, shown);

  const needle = q.trim().toLowerCase();
  const list = numbered
    .filter(inTab)
    .filter(a => !project || a.project_id === project)
    .filter(a => !priority || a.priority === priority)
    .filter(a => !source || a.source?.type === source)
    .filter(a => !onlyOverdue || isOverdue(a, today))
    .filter(a => !needle || `${a.number} ${a.title} ${a.description ?? ''} ${personName(usersList, a.owner_id)}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const doneA = a.status === 'CLOSED' || a.status === 'CANCELLED', doneB = b.status === 'CLOSED' || b.status === 'CANCELLED';
      if (doneA !== doneB) return doneA ? 1 : -1;
      return String(a.due_date).localeCompare(String(b.due_date)) || String(a.number).localeCompare(String(b.number));
    });

  const count = (k: TabKey) =>
    k === 'all' ? numbered.length : k === 'me' ? mine.length : numbered.filter(a => inGroup(a, k)).length;

  return (
    <div className="space-y-5" data-testid="actions-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Action Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Corrective and preventive actions from incidents, inspections, audits and your own list, in one place.</p>
        </div>
        {actionActor && canCreate(actionActor) && (
          <button type="button" onClick={() => setCreating(true)} className="giq-btn-primary inline-flex items-center gap-2" data-testid="raise-action">
            <Plus className="w-4 h-4" aria-hidden /> Raise action
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="actions-summary">
        <Chip icon={<Clock className="w-5 h-5 text-blue-500" aria-hidden />} label="Open or in progress" value={summary.live} />
        <Chip icon={<Eye className="w-5 h-5 text-purple-500" aria-hidden />} label="Awaiting verification" value={summary.byStage.COMPLETED} />
        <Chip icon={<AlertTriangle className="w-5 h-5 text-red-500" aria-hidden />} label="Overdue" value={summary.overdue} tone={summary.overdue ? 'border-red-300 dark:border-red-700/50' : ''} />
        <Chip icon={<CheckCircle className="w-5 h-5 text-emerald-500" aria-hidden />} label="Closed" value={summary.closed} />
      </div>

      {legacy.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200" data-testid="legacy-notice">
          <p><strong>{legacy.length} older action{legacy.length === 1 ? '' : 's'}</strong> from before this version {legacy.length === 1 ? 'is' : 'are'} waiting to be imported and cannot be changed here. An administrator runs the import once (see docs/ACTIONS_SYSTEM.md).</p>
          <button type="button" onClick={() => setShowLegacy(v => !v)} className="mt-1 text-xs font-semibold underline">{showLegacy ? 'Hide them' : 'Show them (read-only)'}</button>
          {showLegacy && (
            <ul className="mt-2 space-y-1 text-xs" data-testid="legacy-list">
              {legacy.map(a => (
                <li key={a.id} className="rounded bg-white/60 dark:bg-black/20 px-2 py-1">
                  {(a as any).action ?? a.title} · {personName(usersList, a.owner_id)} · due {fmtDate(a.due_date)} · {String(a.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-dark-border" role="tablist">
        {TABS.map(k => (
          <button
            key={k} type="button" role="tab" aria-selected={shown === k} data-testid={`tab-${k}`}
            onClick={() => setTab(k)}
            className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${shown === k ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
          >
            {TAB_LABEL[k]} <span className="ml-1 text-xs opacity-70">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search number, title or person" className="giq-input w-full pl-9" aria-label="Search actions" data-testid="actions-search" />
        </div>
        <select value={project} onChange={e => setProject(e.target.value)} className="giq-input" aria-label="Project" data-testid="filter-project">
          <option value="">All projects</option>
          {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="giq-input" aria-label="Priority" data-testid="filter-priority">
          <option value="">Any priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <select value={source} onChange={e => setSource(e.target.value)} className="giq-input" aria-label="Source" data-testid="filter-source">
          <option value="">Any source</option>
          {SOURCE_TYPES.map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={onlyOverdue} onChange={e => setOnlyOverdue(e.target.checked)} data-testid="filter-overdue" /> Overdue only
        </label>
      </div>

      {!actionsReady && numbered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center" data-testid="actions-loading">Loading actions…</p>
      ) : list.length === 0 ? (
        <div className="py-12 text-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700" data-testid="actions-empty">
          <p className="font-semibold text-gray-900 dark:text-white">{shown === 'me' ? 'Nothing is waiting for you.' : 'No actions here.'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{needle || project || priority || source || onlyOverdue ? 'Try clearing the filters.' : shown === 'me' ? 'Actions you own, and actions you can verify, appear here.' : 'Raise an action to get started.'}</p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="actions-list">
          {list.map(a => {
            const due = dueText(a.due_date, today);
            const over = isOverdue(a, today);
            const stage = normalizeStage(a.status) as Stage | null;
            const finished = stage === 'CLOSED' || stage === 'CANCELLED';
            return (
              <li key={a.id}>
                <button type="button" onClick={() => setOpenId(a.id)} data-testid="action-card"
                  className={`w-full text-left rounded-xl border p-3 sm:p-4 bg-white dark:bg-dark-card hover:shadow-md transition ${over ? 'border-red-300 dark:border-red-700/60' : 'border-gray-200 dark:border-dark-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{a.number}{a.imported ? ' · imported' : ''}</p>
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words">{a.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0"><StageBadge status={a.status} /><PriorityBadge priority={a.priority} /></div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" aria-hidden />{personName(usersList, a.owner_id)}</span>
                    <span>{sourceText(a.source)}</span>
                    {!finished && <span className={over ? 'font-bold text-red-600 dark:text-red-400' : due.soon ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>{due.text}</span>}
                    {finished && <span>Due {fmtDate(a.due_date)}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ActionCreateModal isOpen={creating} onClose={() => setCreating(false)} />
      {openId && <ActionDetailModal actionId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};
