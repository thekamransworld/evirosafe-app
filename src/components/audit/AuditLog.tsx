import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, RefreshCw, Clock,
  User, FileText, ChevronDown, ChevronRight,
  Shield,
} from 'lucide-react';
import {
  fetchAuditLogs,
  fetchResourceAuditTrail,
  ACTION_LABELS,
  ACTION_COLORS,
  RESOURCE_LABELS,
} from '../../lib/auditLogger';
import type { AuditLogEntry, AuditAction, AuditResourceType } from '../../lib/auditLogger';
import { useAppContext } from '../../contexts';

interface AuditLogProps {
  resourceType?: AuditResourceType;
  resourceId?: string;
  compact?: boolean;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatFullTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

const DiffViewer: React.FC<{
  oldVal?: Record<string, any> | null;
  newVal?: Record<string, any> | null;
}> = ({ oldVal, newVal }) => {
  if (!oldVal && !newVal) return null;

  const keys = new Set([
    ...Object.keys(oldVal ?? {}),
    ...Object.keys(newVal ?? {}),
  ]);

  const changedKeys = [...keys].filter((k) => {
    const o = JSON.stringify((oldVal ?? {})[k]);
    const n = JSON.stringify((newVal ?? {})[k]);
    return o !== n;
  });

  if (changedKeys.length === 0) {
    return <p className="text-xs text-slate-400 italic">No field-level changes recorded.</p>;
  }

  return (
    <div className="space-y-1">
      {changedKeys.slice(0, 10).map((key) => {
        const oldStr = JSON.stringify((oldVal ?? {})[key] ?? null);
        const newStr = JSON.stringify((newVal ?? {})[key] ?? null);
        return (
          <div key={key} className="grid grid-cols-3 gap-2 text-xs">
            <span className="font-mono text-slate-500 truncate">{key}</span>
            <span className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-mono truncate">
              {oldStr === 'null' ? '-' : (oldStr ?? '').slice(0, 60)}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono truncate">
              {newStr === 'null' ? '-' : (newStr ?? '').slice(0, 60)}
            </span>
          </div>
        );
      })}
      {changedKeys.length > 10 && (
        <p className="text-xs text-slate-400">+{changedKeys.length - 10} more fields changed</p>
      )}
    </div>
  );
};

const LogEntry: React.FC<{
  entry: AuditLogEntry;
  compact: boolean;
  usersList: any[];
}> = ({ entry, compact, usersList }) => {
  const [expanded, setExpanded] = useState(false);
  const actionColor = ACTION_COLORS[entry.action] ?? 'bg-slate-100 text-slate-600';
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
  const resourceLabel = RESOURCE_LABELS[entry.resource_type] ?? entry.resource_type;
  const userName = usersList.find((u: any) => u.id === entry.user_id)?.name
    ?? entry.user_name
    ?? entry.user_id;
  const hasDiff = !!(entry.old_value || entry.new_value);

  return (
    <div className={
      'bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-sm' +
      (compact ? '' : ' mb-2')
    }>
      <div
        className={'flex items-start gap-3 p-3.5' + (hasDiff ? ' cursor-pointer' : '')}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        <span className={'text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 whitespace-nowrap ' + actionColor}>
          {actionLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className={'font-medium text-slate-800 dark:text-slate-200 truncate ' + (compact ? 'text-xs' : 'text-sm')}>
            {entry.description}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" />{userName}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />{resourceLabel}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span title={formatFullTimestamp(entry.timestamp)}>
                {formatTimestamp(entry.timestamp)}
              </span>
            </span>
          </div>
        </div>
        {hasDiff && (
          <button className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        )}
      </div>
      {expanded && hasDiff && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Field</span>
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Before</span>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">After</span>
          </div>
          <DiffViewer oldVal={entry.old_value} newVal={entry.new_value} />
          <p className="text-xs text-slate-400 mt-3 font-mono">
            {formatFullTimestamp(entry.timestamp)}
          </p>
        </div>
      )}
    </div>
  );
};

export const AuditLog: React.FC<AuditLogProps> = ({
  resourceType,
  resourceId,
  compact = false,
}) => {
  const { activeOrg, usersList, activeUser } = useAppContext();
  const [entries, setEntries]           = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [search, setSearch]             = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'All'>('All');
  const [filterResource, setFilterResource] = useState<AuditResourceType | 'All'>('All');
  const [filterUser, setFilterUser]     = useState('All');
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    if (!(activeOrg as any)?.id) return;
    setIsLoading(true);
    try {
      let data: AuditLogEntry[];
      if (resourceType && resourceId) {
        data = await fetchResourceAuditTrail((activeOrg as any).id, resourceType, resourceId);
      } else {
        data = await fetchAuditLogs({
          org_id: (activeOrg as any).id,
          resource_type: filterResource !== 'All' ? filterResource : undefined,
          action: filterAction !== 'All' ? filterAction : undefined,
          user_id: filterUser !== 'All' ? filterUser : undefined,
          limit: 500,
        });
      }
      setEntries(data);
    } catch (e) {
      console.error('[AuditLog] Failed to load:', e);
    } finally {
      setIsLoading(false);
    }
  }, [(activeOrg as any)?.id, resourceType, resourceId, filterResource, filterAction, filterUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.description ?? '').toLowerCase().includes(s) ||
      (e.resource_id ?? '').toLowerCase().includes(s) ||
      (e.user_id ?? '').toLowerCase().includes(s) ||
      (e.user_name ?? '').toLowerCase().includes(s)
    );
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCsv = () => {
    const header = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Description'];
    const rows = filtered.map((e) => [
      formatFullTimestamp(e.timestamp),
      usersList.find((u: any) => u.id === e.user_id)?.name ?? e.user_id,
      ACTION_LABELS[e.action] ?? e.action,
      RESOURCE_LABELS[e.resource_type] ?? e.resource_type,
      e.resource_id,
      '"' + (e.description ?? '').replace(/"/g, '""') + '"',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No activity recorded yet.</p>
        ) : (
          entries.slice(0, 10).map((e) => (
            <LogEntry key={e.id} entry={e} compact usersList={usersList} />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length.toLocaleString()} entries
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700">
            <RefreshCw className={'w-4 h-4' + (isLoading ? ' animate-spin' : '')} /> Refresh
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search description, user, resource ID..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300" />
        </div>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value as any); setPage(0); }}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 outline-none">
          <option value="All">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {!resourceType && (
          <select value={filterResource} onChange={(e) => { setFilterResource(e.target.value as any); setPage(0); }}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 outline-none">
            <option value="All">All resources</option>
            {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 outline-none">
          <option value="All">All users</option>
          {usersList.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total entries',   value: entries.length },
          { label: 'Shown',           value: filtered.length },
          { label: 'Creates',         value: entries.filter((e) => e.action === 'CREATE').length },
          { label: 'Status changes',  value: entries.filter((e) => e.action === 'STATUS_CHANGE').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Shield className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">No audit entries match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((entry) => (
            <LogEntry key={entry.id} entry={entry} compact={false} usersList={usersList} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;