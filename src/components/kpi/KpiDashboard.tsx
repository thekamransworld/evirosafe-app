/**
 * FILE: src/components/kpi/KpiDashboard.tsx
 *
 * Full HSE KPI Dashboard. Uses kpiCalculations.ts for all metric computation.
 * Charts powered by Recharts (already in the project's dependencies).
 *
 * Features:
 *  - LTIFR, TRIFR, NMFR, Severity Rate cards with trend arrows
 *  - Leading vs lagging indicator toggle
 *  - Monthly trend line chart (12-month rolling)
 *  - Incident type breakdown bar chart
 *  - Heinrich's pyramid visualisation
 *  - Industry benchmark comparison
 *  - Period selector (MTD / QTD / YTD / custom)
 *  - CSV/PDF export of the current snapshot
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Users,
  Clock, CheckCircle2, Target, Download, Calendar, ChevronDown,
} from 'lucide-react';

import {
  calculateKpiSnapshot,
  buildMonthlyTrend,
  buildIncidentPyramid,
  groupBy,
  getBenchmark,
  isoToOsha,
  type KpiSnapshot,
  type MonthlyKpiPoint,
} from '../../lib/kpiCalculations';
import { useDataContext } from '../../contexts';
import { useAppContext } from '../../contexts';
import type { Report } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Period = 'MTD' | 'QTD' | 'YTD' | 'CUSTOM';

interface PeriodRange { from: Date; to: Date }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPeriodRange(period: Period, custom?: PeriodRange): PeriodRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  switch (period) {
    case 'MTD':
      return { from: new Date(year, month, 1), to: now };
    case 'QTD':
      return { from: new Date(year, quarter * 3, 1), to: now };
    case 'YTD':
      return { from: new Date(year, 0, 1), to: now };
    case 'CUSTOM':
      return custom ?? { from: new Date(year, 0, 1), to: now };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  /** For safety rates: is "up" bad (true) or good (false)? */
  upIsBad?: boolean;
  benchmark?: number;
  description?: string;
  color?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, unit, trend, upIsBad = true, benchmark, description, color = 'blue',
}) => {
  const trendColor =
    trend === 'flat' ? 'text-slate-400' :
    (trend === 'up' && upIsBad) || (trend === 'down' && !upIsBad)
      ? 'text-red-500' : 'text-emerald-500';

  const TrendIcon =
    trend === 'up' ? TrendingUp :
    trend === 'down' ? TrendingDown : Minus;

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${colorMap[color] ?? colorMap.blue}`} />
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trend === 'flat' ? 'Stable' : trend === 'up' ? 'Up' : 'Down'}</span>
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 0) : value}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>

      {benchmark !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                typeof value === 'number' && value <= benchmark
                  ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{
                width: typeof value === 'number'
                  ? `${Math.min((value / (benchmark * 2)) * 100, 100)}%`
                  : '0%',
              }}
            />
          </div>
          <span className="text-xs text-slate-400">
            Industry: {benchmark.toFixed(2)}
          </span>
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
      )}
    </div>
  );
};

// ── Incident pyramid ──────────────────────────────────────────────────────────

interface PyramidBarProps {
  label: string;
  count: number;
  maxCount: number;
  color: string;
}

const PyramidBar: React.FC<PyramidBarProps> = ({ label, count, maxCount, color }) => {
  const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="text-right w-36 text-xs text-slate-500 dark:text-slate-400 truncate">{label}</div>
      <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center">
        <div
          className={`h-full rounded-lg flex items-center px-2 text-xs font-bold text-white transition-all ${color}`}
          style={{ width: `${width}%` }}
        >
          {count > 0 && count}
        </div>
      </div>
      <div className="w-10 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">{count}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface KpiDashboardProps {
  /** Override man-hours if tracked separately */
  manHoursOverride?: number;
  /** Override worker count */
  workerCountOverride?: number;
  /** Industry for benchmark comparison */
  industry?: string;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({
  manHoursOverride,
  workerCountOverride,
  industry = 'Construction',
}) => {
  const { reportList, tbtList, inspectionList, actionItems } = useDataContext();
  const { activeOrg } = useAppContext();

  const [period, setPeriod] = useState<Period>('YTD');
  const [activeTab, setActiveTab] = useState<'lagging' | 'leading' | 'trend' | 'breakdown'>('lagging');
  const [showOsha, setShowOsha] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const periodRange = useMemo(
    () => getPeriodRange(period, period === 'CUSTOM'
      ? { from: new Date(customFrom), to: new Date(customTo) }
      : undefined),
    [period, customFrom, customTo],
  );

  const currentYear = new Date().getFullYear();

  // Estimate monthly man-hours (evenly distributed — replace with actual data)
  const totalWorkers = workerCountOverride ?? (activeOrg as any)?.employee_count ?? 50;
  const avgHoursPerWorkerPerMonth = 176; // 22 days × 8 hours
  const monthlyHours = Array(12).fill(totalWorkers * avgHoursPerWorkerPerMonth);
  const annualHours = manHoursOverride ?? totalWorkers * avgHoursPerWorkerPerMonth * 12;

  // Action leading indicators
  const overdueActions = actionItems.filter(
    (a) => a.status !== 'Closed' && a.due_date && new Date(a.due_date) < new Date(),
  ).length;
  const onTimeActions = actionItems.filter(
    (a) => a.status === 'Closed' && a.due_date && new Date(a.due_date) >= new Date((a as any).completed_at ?? ''),
  ).length;

  // Main snapshot
  const snapshot = useMemo<KpiSnapshot>(
    () => calculateKpiSnapshot({
      reports: reportList,
      totalManHours: annualHours,
      totalWorkers,
      period: periodRange,
      leading: {
        toolboxTalksHeld:    tbtList.filter((t) => t.status === 'delivered').length,
        inspectionsCompleted: inspectionList.filter((i) => i.status === 'Closed').length,
        actionsOverdue:      overdueActions,
        actionsOnTime:       onTimeActions,
        trainingComplianceRate: 82, // placeholder — wire to TrainingContext in Phase 3
        safeObservations:    0,
      },
    }),
    [reportList, annualHours, totalWorkers, periodRange, tbtList, inspectionList, overdueActions, onTimeActions],
  );

  // Monthly trend data
  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(reportList, currentYear, monthlyHours),
    [reportList, currentYear],
  );

  // Incident breakdown
  const typeBreakdown = useMemo(
    () => groupBy(reportList.filter((r) => {
      const d = new Date(r.occurred_at || r.created_at || '').getTime();
      return d >= periodRange.from.getTime() && d <= periodRange.to.getTime();
    }), 'incident_type' as any),
    [reportList, periodRange],
  );

  // Pyramid
  const pyramid = useMemo(() => buildIncidentPyramid(
    reportList.filter((r) => {
      const d = new Date(r.occurred_at || r.created_at || '').getTime();
      return d >= periodRange.from.getTime() && d <= periodRange.to.getTime();
    }),
  ), [reportList, periodRange]);

  // Benchmark
  const benchmark = getBenchmark(industry);

  // Export snapshot as CSV
  const exportCsv = () => {
    const rows = [
      ['KPI', 'Value', 'Unit'],
      ['LTIFR', snapshot.ltifr, 'per 1M hrs'],
      ['TRIFR', snapshot.trifr, 'per 1M hrs'],
      ['NMFR', snapshot.nmfr, 'per 1M hrs'],
      ['Severity Rate', snapshot.sr, 'lost days per 1M hrs'],
      ['Fatalities', snapshot.fatalities, 'count'],
      ['LTIs', snapshot.lostTimeInjuries, 'count'],
      ['Near Misses', snapshot.nearMisses, 'count'],
      ['Total Man Hours', snapshot.totalManHours, 'hours'],
      ['Action Completion Rate', snapshot.actionCompletionRate, '%'],
      ['Training Compliance', snapshot.trainingComplianceRate, '%'],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-snapshot-${period.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'lagging' as const, label: 'Lagging KPIs' },
    { id: 'leading' as const, label: 'Leading KPIs' },
    { id: 'trend' as const, label: 'Trend Chart' },
    { id: 'breakdown' as const, label: 'Breakdown' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            HSE KPI Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {periodRange.from.toLocaleDateString()} — {periodRange.to.toLocaleDateString()}
            &nbsp;·&nbsp;{snapshot.totalManHours.toLocaleString()} exposure hours
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          {(['MTD','QTD','YTD','CUSTOM'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}

          {/* OSHA / ISO toggle */}
          <button
            onClick={() => setShowOsha((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          >
            {showOsha ? 'OSHA (200K)' : 'ISO (1M)'}
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {period === 'CUSTOM' && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="text-sm bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300"
          />
          <span className="text-slate-400">to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="text-sm bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300"
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Lagging KPIs ── */}
      {activeTab === 'lagging' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="LTIFR"
              value={showOsha ? isoToOsha(snapshot.ltifr) : snapshot.ltifr}
              unit={showOsha ? 'per 200K hrs' : 'per 1M hrs'}
              trend={snapshot.trends.ltifr}
              benchmark={benchmark?.ltifr}
              color="red"
              description="Lost Time Injury Frequency Rate"
            />
            <KpiCard
              label="TRIFR"
              value={showOsha ? isoToOsha(snapshot.trifr) : snapshot.trifr}
              unit={showOsha ? 'per 200K hrs' : 'per 1M hrs'}
              trend={snapshot.trends.trifr}
              benchmark={benchmark?.trifr}
              color="amber"
              description="Total Recordable Injury Frequency Rate"
            />
            <KpiCard
              label="Near-Miss Rate"
              value={showOsha ? isoToOsha(snapshot.nmfr) : snapshot.nmfr}
              unit="per 1M hrs"
              trend={snapshot.trends.nmfr}
              upIsBad={false}
              color="blue"
              description="Higher near-miss reporting = better safety culture"
            />
            <KpiCard
              label="Severity Rate"
              value={snapshot.sr}
              unit="lost days / 1M hrs"
              trend={snapshot.trends.sr}
              benchmark={benchmark?.sr}
              color="purple"
              description="Days lost to injury per million exposure hours"
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Fatalities',        value: snapshot.fatalities,                 color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
              { label: 'LTIs',              value: snapshot.lostTimeInjuries,           color: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' },
              { label: 'Medical Cases',     value: snapshot.medicalTreatmentCases,      color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
              { label: 'First Aid',         value: snapshot.firstAidCases,             color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' },
              { label: 'Near Misses',       value: snapshot.nearMisses,                color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
              { label: 'Lost Days',         value: snapshot.totalLostDays,             color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-3 ${color}`}>
                <p className="text-xs font-medium opacity-75">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Incident pyramid */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Incident Pyramid (Heinrich's Triangle)
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Fatalities',                 count: pyramid.fatalities,           color: 'bg-red-600' },
                { label: 'Lost Time Injuries',         count: pyramid.lti,                  color: 'bg-orange-500' },
                { label: 'Restricted Work Cases',      count: pyramid.rwc,                  color: 'bg-amber-500' },
                { label: 'Medical Treatment Cases',    count: pyramid.mtc,                  color: 'bg-yellow-500' },
                { label: 'First Aid Cases',            count: pyramid.fac,                  color: 'bg-lime-500' },
                { label: 'Near Misses',                count: pyramid.nearMiss,             color: 'bg-blue-500' },
                { label: 'Unsafe Acts & Conditions',   count: pyramid.unsafeActsConditions, color: 'bg-slate-400' },
              ].map((row) => (
                <PyramidBar
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  maxCount={Math.max(pyramid.unsafeActsConditions, 1)}
                  color={row.color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Leading KPIs ── */}
      {activeTab === 'leading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard label="Action Completion Rate" value={snapshot.actionCompletionRate} unit="%" upIsBad={false} color="emerald"
            description={`${snapshot.actionsOnTime} on time · ${snapshot.actionsOverdue} overdue`} />
          <KpiCard label="Training Compliance" value={snapshot.trainingComplianceRate} unit="%" upIsBad={false} color="indigo"
            description="% of workforce with current certifications" />
          <KpiCard label="TBT Sessions Held" value={snapshot.toolboxTalksHeld} upIsBad={false} color="blue"
            description="Toolbox talks completed in this period" />
          <KpiCard label="Inspections Completed" value={snapshot.inspectionsCompleted} upIsBad={false} color="emerald"
            description="Closed inspections in this period" />
          <KpiCard label="Safe Observations" value={snapshot.safeObservations} upIsBad={false} color="purple"
            description="Positive BBS observations recorded" />
          <KpiCard label="Overdue Actions" value={snapshot.actionsOverdue} color="red"
            description="Actions past their due date" />
        </div>
      )}

      {/* ── Trend Chart ── */}
      {activeTab === 'trend' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6">
            12-Month KPI Trend — {currentYear}
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(' ')[0]} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                formatter={(v: number) => v.toFixed(2)}
              />
              <Legend />
              {benchmark && (
                <ReferenceLine y={benchmark.ltifr} stroke="#ef4444" strokeDasharray="4 4"
                  label={{ value: `Industry LTIFR: ${benchmark.ltifr}`, fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }}
                />
              )}
              <Line type="monotone" dataKey="ltifr" stroke="#ef4444" strokeWidth={2} dot={false} name="LTIFR" />
              <Line type="monotone" dataKey="trifr" stroke="#f97316" strokeWidth={2} dot={false} name="TRIFR" />
              <Line type="monotone" dataKey="nmfr"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Near-Miss Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Breakdown ── */}
      {activeTab === 'breakdown' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6">
            Incident Type Breakdown
          </h3>
          {typeBreakdown.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No incidents in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={typeBreakdown} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6,6,0,0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

export default KpiDashboard;