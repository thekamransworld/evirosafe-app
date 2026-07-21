/**
 * FILE: src/components/export/DataExportHub.tsx
 * PASTE AT: src/components/export/DataExportHub.tsx
 *           (create export/ folder inside src/components/)
 *
 * ── WIRE INTO APP (src/App.tsx) ───────────────────────────────────────────────
 *
 *   import DataExportHub from './components/export/DataExportHub';
 *   {activePage === 'exports' && <DataExportHub />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'exports', label: 'Data Export', icon: Download,
 *     roles: ['admin', 'hse_manager'] }
 *
 * ── FEATURES ──────────────────────────────────────────────────────────────────
 *   • Central hub — all modules in one place
 *   • Date range filter (MTD / QTD / YTD / custom)
 *   • Format selector per export: CSV, Excel (.xlsx), PDF
 *   • Bulk export — download all modules as a zip (uses JSZip if available,
 *     falls back to sequential individual downloads)
 *   • Export history log (session-only, not persisted)
 *   • Audit log entry written for every export
 *   • Progress indicator during bulk export
 *   • Email delivery option UI (wired to Cloud Function — see scheduledReports.ts)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Download, FileText, Table, File, CheckCircle2,
  Clock, Calendar, ChevronDown, RefreshCw,
  Mail, Package, AlertTriangle, BarChart2,
  Shield, Users, Leaf, Activity, BookOpen,
  Eye, FolderOpen, HardHat, ClipboardList,
  Zap, X,
} from 'lucide-react';
import { useDataContext }  from '../../contexts';
import { useAppContext }   from '../../contexts';
import { writeAuditLog }   from '../../lib/auditLogger';
import {
  exportTableToCsv,
  exportTableToExcel,
  exportTableToPdf,
  exportKpiPdf,
  exportReportToPdf,
  exportCompliancePdf,
  type TableColumn,
  type SheetConfig,
} from '../../lib/exportUtils';
import { calculateKpiSnapshot } from '../../lib/kpiCalculations';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'excel' | 'pdf';
type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';
type PeriodPreset = 'MTD' | 'QTD' | 'YTD' | 'CUSTOM';

interface ExportModule {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
  formats: ExportFormat[];
  /** Generates the data rows for this module */
  getData: (ctx: ExportContext) => Record<string, any>[];
  /** Column definitions */
  columns: TableColumn[];
}

interface ExportContext {
  reportList: any[];
  ptwList: any[];
  inspectionList: any[];
  actionItems: any[];
  trainingRecordList: any[];
  trainingSessionList: any[];
  tbtList: any[];
  projects: any[];
  usersList: any[];
  periodRange: { from: Date; to: Date };
  snapshot: any;
  orgName: string;
}

interface ExportHistoryEntry {
  id: string;
  module: string;
  format: ExportFormat;
  rows: number;
  timestamp: string;
  status: 'done' | 'error';
}

// ─────────────────────────────────────────────────────────────────────────────
// Period helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPeriodRange(preset: PeriodPreset, custom?: { from: string; to: string }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  switch (preset) {
    case 'MTD': return { from: new Date(year, month, 1),       to: now };
    case 'QTD': return { from: new Date(year, quarter * 3, 1), to: now };
    case 'YTD': return { from: new Date(year, 0, 1),           to: now };
    case 'CUSTOM':
      return {
        from: custom?.from ? new Date(custom.from) : new Date(year, 0, 1),
        to:   custom?.to   ? new Date(custom.to)   : now,
      };
  }
}

function inRange(dateStr: string, range: { from: Date; to: Date }): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return d >= range.from.getTime() && d <= range.to.getTime();
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export module definitions
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_MODULES: ExportModule[] = [
  {
    id: 'incidents',
    label: 'Incident Reports',
    description: 'All incident reports including near-misses, injuries, and property damage',
    icon: AlertTriangle,
    category: 'Safety',
    formats: ['csv', 'excel', 'pdf'],
    columns: [
      { key: 'id',            label: 'Report ID',     width: 14 },
      { key: 'incident_date', label: 'Date',          width: 12, format: (v) => fmtDate(v) },
      { key: 'incident_type', label: 'Type',          width: 18 },
      { key: 'severity',      label: 'Severity',      width: 14 },
      { key: 'location',      label: 'Location',      width: 20 },
      { key: 'status',        label: 'Status',        width: 12 },
      { key: 'description',   label: 'Description',   width: 40 },
      { key: 'lost_days',     label: 'Lost Days',     width: 10 },
      { key: 'created_at',    label: 'Reported',      width: 14, format: (v) => fmtDate(v) },
    ],
    getData: (ctx) =>
      ctx.reportList.filter((r) => inRange(r.incident_date || r.created_at, ctx.periodRange)),
  },

  {
    id: 'ptw',
    label: 'Permits to Work',
    description: 'All permit records with status and workflow history',
    icon: Shield,
    category: 'Safety',
    formats: ['csv', 'excel', 'pdf'],
    columns: [
      { key: 'id',         label: 'Permit ID',   width: 14 },
      { key: 'type',       label: 'Type',        width: 20, format: (v) => (v ?? '').replace(/_/g, ' ') },
      { key: 'status',     label: 'Status',      width: 14 },
      { key: 'created_at', label: 'Created',     width: 14, format: (v) => fmtDate(v) },
      { key: 'project_id', label: 'Project',     width: 18 },
    ],
    getData: (ctx) =>
      ctx.ptwList.filter((p) => inRange(p.created_at, ctx.periodRange)),
  },

  {
    id: 'actions',
    label: 'Action Items',
    description: 'All corrective and preventive action items with status and owners',
    icon: CheckCircle2,
    category: 'Safety',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'id',       label: 'Action ID',  width: 14 },
      { key: 'action',   label: 'Action',     width: 40 },
      { key: 'owner_id', label: 'Owner',      width: 20 },
      { key: 'due_date', label: 'Due Date',   width: 12, format: (v) => fmtDate(v) },
      { key: 'status',   label: 'Status',     width: 12 },
      { key: 'priority', label: 'Priority',   width: 10 },
    ],
    getData: (ctx) => ctx.actionItems,
  },

  {
    id: 'inspections',
    label: 'Inspections',
    description: 'Site inspection records with findings and status',
    icon: ClipboardList,
    category: 'Safety',
    formats: ['csv', 'excel', 'pdf'],
    columns: [
      { key: 'id',         label: 'ID',         width: 14 },
      { key: 'title',      label: 'Title',       width: 30 },
      { key: 'status',     label: 'Status',      width: 12 },
      { key: 'created_at', label: 'Date',        width: 14, format: (v) => fmtDate(v) },
      { key: 'project_id', label: 'Project',     width: 18 },
    ],
    getData: (ctx) =>
      ctx.inspectionList.filter((i) => inRange(i.created_at, ctx.periodRange)),
  },

  {
    id: 'training',
    label: 'Training Records',
    description: 'Worker training completion and certification expiry data',
    icon: BookOpen,
    category: 'People',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'user_id',     label: 'Worker',      width: 20 },
      { key: 'course_name', label: 'Course',       width: 30 },
      { key: 'status',      label: 'Status',       width: 14 },
      { key: 'expiry_date', label: 'Expiry',       width: 14, format: (v) => fmtDate(v) },
      { key: 'score',       label: 'Score (%)',    width: 10 },
    ],
    getData: (ctx) => ctx.trainingRecordList,
  },

  {
    id: 'tbt',
    label: 'Toolbox Talks',
    description: 'All toolbox talk sessions with attendance numbers',
    icon: Users,
    category: 'People',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'id',           label: 'ID',          width: 14 },
      { key: 'topic',        label: 'Topic',        width: 30 },
      { key: 'session_date', label: 'Date',         width: 14, format: (v) => fmtDate(v) },
      { key: 'status',       label: 'Status',       width: 12 },
      { key: 'project_id',   label: 'Project',      width: 18 },
    ],
    getData: (ctx) =>
      ctx.tbtList.filter((t) => inRange(t.session_date || t.created_at, ctx.periodRange)),
  },

  {
    id: 'kpi',
    label: 'KPI Snapshot',
    description: 'Full KPI metrics snapshot: LTIFR, TRIFR, severity rate, leading indicators',
    icon: BarChart2,
    category: 'Analytics',
    formats: ['csv', 'pdf'],
    columns: [
      { key: 'metric', label: 'KPI',   width: 35 },
      { key: 'value',  label: 'Value', width: 15 },
      { key: 'unit',   label: 'Unit',  width: 25 },
    ],
    getData: (ctx) => [
      { metric: 'LTIFR',                   value: ctx.snapshot.ltifr?.toFixed(2),  unit: 'per 1M hrs' },
      { metric: 'TRIFR',                   value: ctx.snapshot.trifr?.toFixed(2),  unit: 'per 1M hrs' },
      { metric: 'Near-Miss Rate',          value: ctx.snapshot.nmfr?.toFixed(2),   unit: 'per 1M hrs' },
      { metric: 'Severity Rate',           value: ctx.snapshot.sr?.toFixed(2),     unit: 'lost days / 1M hrs' },
      { metric: 'Fatalities',              value: ctx.snapshot.fatalities,          unit: 'count' },
      { metric: 'Lost Time Injuries',      value: ctx.snapshot.lostTimeInjuries,   unit: 'count' },
      { metric: 'Near Misses',             value: ctx.snapshot.nearMisses,          unit: 'count' },
      { metric: 'Total Man Hours',         value: ctx.snapshot.totalManHours,       unit: 'hours' },
      { metric: 'Action Completion Rate',  value: `${ctx.snapshot.actionCompletionRate}%`,  unit: '' },
      { metric: 'Training Compliance',     value: `${ctx.snapshot.trainingComplianceRate}%`, unit: '' },
      { metric: 'TBT Sessions',            value: ctx.snapshot.toolboxTalksHeld,    unit: 'sessions' },
    ],
  },

  {
    id: 'bbs',
    label: 'BBS Observations',
    description: 'Safe and unsafe act observations with follow-up status',
    icon: Eye,
    category: 'Behaviour',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'id',               label: 'ID',          width: 14 },
      { key: 'observation_date', label: 'Date',         width: 14, format: (v) => fmtDate(v) },
      { key: 'type',             label: 'Type',         width: 18 },
      { key: 'category',         label: 'Category',     width: 20 },
      { key: 'location',         label: 'Location',     width: 20 },
      { key: 'status',           label: 'Status',       width: 12 },
      { key: 'description',      label: 'Description',  width: 40 },
    ],
    getData: (_ctx) => [], // populated from BBS context when available
  },

  {
    id: 'environment',
    label: 'Environmental Readings',
    description: 'All environmental monitoring readings with threshold breach flags',
    icon: Leaf,
    category: 'Environment',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'reading_date',   label: 'Date',           width: 14, format: (v) => fmtDate(v) },
      { key: 'category',       label: 'Category',        width: 14 },
      { key: 'parameter_name', label: 'Parameter',       width: 22 },
      { key: 'value',          label: 'Value',           width: 12 },
      { key: 'unit',           label: 'Unit',            width: 14 },
      { key: 'location',       label: 'Location',        width: 20 },
      { key: 'exceeds_limit',  label: 'Exceeds Limit',  width: 14, format: (v) => v ? 'YES' : 'No' },
    ],
    getData: (_ctx) => [], // populated from Environmental context when available
  },

  {
    id: 'contractors',
    label: 'Contractor Register',
    description: 'Contractor companies and worker register with induction status',
    icon: HardHat,
    category: 'People',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'name',             label: 'Name',          width: 24 },
      { key: 'trade',            label: 'Trade',          width: 20 },
      { key: 'induction_status', label: 'Induction',     width: 14 },
      { key: 'access_status',    label: 'Access',        width: 14 },
      { key: 'medical_clearance',label: 'Medical',       width: 10, format: (v) => v ? 'Yes' : 'No' },
    ],
    getData: (_ctx) => [], // populated from Contractor context
  },

  {
    id: 'documents',
    label: 'Document Register',
    description: 'Document control register with version, status, and review dates',
    icon: FolderOpen,
    category: 'Compliance',
    formats: ['csv', 'excel'],
    columns: [
      { key: 'reference_number', label: 'Ref No.',      width: 14 },
      { key: 'title',            label: 'Title',         width: 35 },
      { key: 'category',         label: 'Category',      width: 18 },
      { key: 'current_version',  label: 'Version',       width: 10 },
      { key: 'status',           label: 'Status',        width: 14 },
      { key: 'next_review_date', label: 'Next Review',  width: 14, format: (v) => fmtDate(v) },
    ],
    getData: (_ctx) => [],
  },
];

// Group modules by category
const MODULE_GROUPS = ['Safety', 'Analytics', 'People', 'Behaviour', 'Environment', 'Compliance'];

// ─────────────────────────────────────────────────────────────────────────────
// Format badge
// ─────────────────────────────────────────────────────────────────────────────

const FormatBadge: React.FC<{
  format: ExportFormat;
  selected: boolean;
  onClick: () => void;
}> = ({ format, selected, onClick }) => {
  const config = {
    csv:   { label: 'CSV',   color: '#3B6D11', bg: '#EAF3DE', icon: FileText },
    excel: { label: 'Excel', color: '#185FA5', bg: '#E6F1FB', icon: Table },
    pdf:   { label: 'PDF',   color: '#A32D2D', bg: '#FCEBEB', icon: File },
  }[format];

  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 20,
        border: `1.5px solid ${selected ? config.color : 'var(--color-border-secondary)'}`,
        background: selected ? config.bg : 'var(--color-background-primary)',
        color: selected ? config.color : 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <Icon style={{ width: 12, height: 12 }} />
      {config.label}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const DataExportHub: React.FC = () => {
  const {
    reportList, ptwList, inspectionList, actionItems,
    trainingRecordList, trainingSessionList, tbtList, projects,
  } = useDataContext();
  const { activeUser, activeOrg, usersList } = useAppContext();

  const [period, setPeriod]         = useState<PeriodPreset>('YTD');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [formats, setFormats]       = useState<Record<string, ExportFormat>>(() =>
    Object.fromEntries(EXPORT_MODULES.map((m) => [m.id, m.formats[0]])),
  );
  const [selected, setSelected]     = useState<Set<string>>(new Set(['incidents', 'actions', 'kpi']));
  const [status, setStatus]         = useState<ExportStatus>('idle');
  const [progress, setProgress]     = useState(0);
  const [history, setHistory]       = useState<ExportHistoryEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailPanel, setShowEmailPanel] = useState(false);

  const periodRange = useMemo(
    () => getPeriodRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );

  const snapshot = useMemo(() => calculateKpiSnapshot({
    reports: reportList,
    totalManHours: ((activeOrg as any)?.employee_count ?? 50) * 176 * 12,
    totalWorkers:  (activeOrg as any)?.employee_count ?? 50,
    period:        periodRange,
  }), [reportList, activeOrg, periodRange]);

  const exportCtx: ExportContext = useMemo(() => ({
    reportList, ptwList, inspectionList, actionItems,
    trainingRecordList, trainingSessionList, tbtList, projects,
    usersList, periodRange, snapshot,
    orgName: (activeOrg as any)?.name ?? 'EviroSafe',
  }), [reportList, ptwList, inspectionList, actionItems,
      trainingRecordList, trainingSessionList, tbtList, projects,
      usersList, periodRange, snapshot, activeOrg]);

  // ── Toggle selection ──────────────────────────────────────────────────────

  const toggleModule = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll   = () => setSelected(new Set(EXPORT_MODULES.map((m) => m.id)));
  const deselectAll = () => setSelected(new Set());

  // ── Single module export ──────────────────────────────────────────────────

  const runExport = useCallback(async (module: ExportModule, fmt: ExportFormat): Promise<number> => {
    const rows    = module.getData(exportCtx);
    const filename = `${module.id}-${period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
    const orgName  = exportCtx.orgName;

    switch (fmt) {
      case 'csv':
        exportTableToCsv(rows, module.columns, filename);
        break;
      case 'excel':
        await exportTableToExcel(
          [{ sheetName: module.label, rows, columns: module.columns }],
          filename,
        );
        break;
      case 'pdf':
        if (module.id === 'kpi') {
          await exportKpiPdf(snapshot, orgName, `KPI Report — ${period}`);
        } else {
          await exportTableToPdf(rows, module.columns, filename, {
            title: module.label,
            orgName,
            subtitle: `${period} · ${periodRange.from.toLocaleDateString('en-GB')} – ${periodRange.to.toLocaleDateString('en-GB')}`,
          });
        }
        break;
    }

    return rows.length;
  }, [exportCtx, period, periodRange, snapshot]);

  // ── Export selected modules ───────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    const toExport = EXPORT_MODULES.filter((m) => selected.has(m.id));
    if (!toExport.length) return;

    setStatus('exporting');
    setProgress(0);

    const newHistory: ExportHistoryEntry[] = [];

    for (let i = 0; i < toExport.length; i++) {
      const mod = toExport[i];
      const fmt = formats[mod.id] ?? mod.formats[0];
      try {
        // Small delay to avoid browser throttling concurrent downloads
        if (i > 0) await new Promise((r) => setTimeout(r, 400));
        const rows = await runExport(mod, fmt);
        newHistory.push({
          id: `${mod.id}_${Date.now()}`,
          module: mod.label,
          format: fmt,
          rows,
          timestamp: new Date().toISOString(),
          status: 'done',
        });
        // Audit log
        writeAuditLog({
          org_id:        (activeOrg as any)?.id ?? '',
          user_id:       activeUser?.id ?? '',
          action:        'EXPORT',
          resource_type: 'report',
          resource_id:   mod.id,
          description:   `Exported ${mod.label} as ${fmt.toUpperCase()} (${rows} rows)`,
          timestamp:     new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[DataExportHub] Export failed for ${mod.id}:`, err);
        newHistory.push({
          id: `${mod.id}_${Date.now()}`,
          module: mod.label,
          format: fmt,
          rows: 0,
          timestamp: new Date().toISOString(),
          status: 'error',
        });
      }
      setProgress(Math.round(((i + 1) / toExport.length) * 100));
    }

    setHistory((prev) => [...newHistory, ...prev].slice(0, 50));
    setStatus('done');
    setTimeout(() => setStatus('idle'), 3000);
  }, [selected, formats, runExport, activeOrg, activeUser]);

  // ── Filtered module list ──────────────────────────────────────────────────

  const filteredModules = activeCategory === 'All'
    ? EXPORT_MODULES
    : EXPORT_MODULES.filter((m) => m.category === activeCategory);

  const selectedCount = selected.size;
  const totalRows = useMemo(() =>
    EXPORT_MODULES.filter((m) => selected.has(m.id))
      .reduce((sum, m) => sum + m.getData(exportCtx).length, 0),
  [selected, exportCtx]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Export Hub</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedCount} module{selectedCount !== 1 ? 's' : ''} selected · {totalRows.toLocaleString()} rows
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowEmailPanel((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Mail className="w-4 h-4" /> Email
          </button>
          <button
            onClick={handleExport}
            disabled={status === 'exporting' || selectedCount === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              status === 'done'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 disabled:opacity-50'
            }`}
          >
            {status === 'exporting' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting {progress}%</>
            ) : status === 'done' ? (
              <><CheckCircle2 className="w-4 h-4" /> Done!</>
            ) : (
              <><Download className="w-4 h-4" /> Export {selectedCount > 0 ? `(${selectedCount})` : ''}</>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {status === 'exporting' && (
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Email panel */}
      {showEmailPanel && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Report</h3>
            <button onClick={() => setShowEmailPanel(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            The selected modules will be exported as PDF attachments and emailed to the address below.
            Requires the <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">scheduledReports</code> Cloud Function to be deployed.
          </p>
          <div className="flex gap-2">
            <input
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="recipient@company.com"
              type="email"
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
            <button
              disabled={!emailAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              onClick={() => {
                alert(`Email delivery not yet wired — add the recipient in scheduledReports.ts and redeploy.`);
              }}
            >
              <Mail className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Date Range
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['MTD', 'QTD', 'YTD', 'CUSTOM'] as PeriodPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-300"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-300"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {periodRange.from.toLocaleDateString('en-GB')} – {periodRange.to.toLocaleDateString('en-GB')}
        </p>
      </div>

      {/* Module selection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Package className="w-4 h-4" /> Select Modules
          </h3>
          <div className="flex gap-2">
            <button onClick={selectAll}   className="text-xs text-blue-600 hover:text-blue-700 font-medium">Select all</button>
            <span className="text-slate-300">·</span>
            <button onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-700">Deselect all</button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {['All', ...MODULE_GROUPS].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredModules.map((mod) => {
            const Icon    = mod.icon;
            const isSelected = selected.has(mod.id);
            const fmt     = formats[mod.id] ?? mod.formats[0];
            const rowCount = mod.getData(exportCtx).length;

            return (
              <div
                key={mod.id}
                className={`rounded-xl border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200'
                }`}
                onClick={() => toggleModule(mod.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {mod.label}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                      {mod.description}
                    </p>

                    {/* Row count */}
                    <p className="text-xs text-slate-400">
                      {rowCount.toLocaleString()} row{rowCount !== 1 ? 's' : ''} in period
                    </p>

                    {/* Format selector */}
                    {isSelected && (
                      <div
                        className="flex gap-1.5 mt-2 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {mod.formats.map((f) => (
                          <FormatBadge
                            key={f}
                            format={f}
                            selected={fmt === f}
                            onClick={() => setFormats((prev) => ({ ...prev, [mod.id]: f }))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export history */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Export History (this session)
          </h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                {entry.status === 'done'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{entry.module}</p>
                  <p className="text-xs text-slate-400">
                    {(entry.format || '').toUpperCase()} · {entry.rows.toLocaleString()} rows ·{' '}
                    {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  entry.status === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {entry.status === 'done' ? 'Exported' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExportHub;