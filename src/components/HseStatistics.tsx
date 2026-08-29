import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useDataContext, useAppContext } from '../contexts';
import { exportTableToPdf } from '../lib/exportUtils';
import { useToast } from './ui/Toast';
import {
  TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, Shield, Activity,
  BarChart2, Download, RefreshCw
} from 'lucide-react';

// ─── EviroSafe chart palette ────────────────────────────────────────────────────

const COLORS = {
  primary:  '#10b981',
  blue:     '#3b82f6',
  amber:    '#f59e0b',
  red:      '#ef4444',
  purple:   '#8b5cf6',
  cyan:     '#06b6d4',
  gray:     '#6b7280',
};

const PIE_COLORS = [COLORS.primary, COLORS.blue, COLORS.amber, COLORS.red, COLORS.purple, COLORS.cyan];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const GiqTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-lg"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', minWidth: 120 }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat tile ────────────────────────────────────────────────────────────────

const StatTile: React.FC<{
  label:  string;
  value:  string | number;
  sub?:   string;
  color:  string;
  icon:   React.FC<any>;
  trend?: 'up' | 'down' | 'flat';
  good?:  'up' | 'down';
}> = ({ label, value, sub, color, icon: Icon, trend, good }) => {
  const isGood = trend && good ? trend === good : null;
  const TIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <div className="giq-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {TIcon && (
          <div className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: isGood === true ? '#10b981' : isGood === false ? '#ef4444' : 'var(--text-muted)' }}>
            <TIcon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
      <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
};

// ─── Chart card ───────────────────────────────────────────────────────────────

const ChartCard: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({
  title, sub, children, className = ''
}) => (
  <div className={`giq-card p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
    {children}
  </div>
);

// ─── Period selector ──────────────────────────────────────────────────────────

const PeriodSelector: React.FC<{
  period: string;
  onChange: (p: string) => void;
}> = ({ period, onChange }) => (
  <div className="flex items-center gap-1 p-1 rounded-xl"
    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
    {['3M', '6M', '12M', 'YTD'].map(p => (
      <button key={p} onClick={() => onChange(p)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={period === p
          ? { background: '#10b981', color: 'white' }
          : { color: 'var(--text-secondary)' }}>
        {p}
      </button>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const HseStatistics: React.FC = () => {
  const { reportList: allReports, inspectionList: allInspections, ptwList: allPtws, projects } = useDataContext();
  const { usersList, activeOrg } = useAppContext();
  const { error: toastError } = useToast();
  const [scopeProjectId, setScopeProjectId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const reportList     = useMemo(() => scopeProjectId === 'all' ? allReports     : allReports.filter(r => r.project_id === scopeProjectId), [allReports, scopeProjectId]);
  const inspectionList = useMemo(() => scopeProjectId === 'all' ? allInspections : allInspections.filter(i => i.project_id === scopeProjectId), [allInspections, scopeProjectId]);
  const ptwList        = useMemo(() => scopeProjectId === 'all' ? allPtws        : allPtws.filter(p => p.project_id === scopeProjectId), [allPtws, scopeProjectId]);

  const scopeLabel = scopeProjectId === 'all' ? 'All Projects (Organization-wide)' : (projects.find(p => p.id === scopeProjectId)?.name || 'Unknown Project');
  const [period, setPeriod] = useState('6M');

  // ── Core metrics ───────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const totalHours     = (usersList.length || 50) * 160 * 12;
    const lti            = reportList.filter(r => r.type === 'Lost Time Injury (LTI)').length;
    const recordable     = reportList.filter(r => !['Positive Observation','Near Miss','Unsafe Act','Unsafe Condition'].includes(r.type)).length;
    const nearMiss       = reportList.filter(r => r.type === 'Near Miss').length;
    const ltir           = totalHours > 0 ? +(lti * 200000 / totalHours).toFixed(2) : 0;
    const trir           = totalHours > 0 ? +(recordable * 200000 / totalHours).toFixed(2) : 0;
    const dart           = totalHours > 0 ? +((lti * 5) * 200000 / totalHours).toFixed(2) : 0;
    const inspDone       = inspectionList.filter(i => ['Approved','Closed'].includes(i.status)).length;
    const inspRate       = inspectionList.length > 0 ? Math.round(inspDone / inspectionList.length * 100) : 100;
    const safetyScore    = Math.max(0, Math.round(100 - ltir * 10 - trir * 4 - (reportList.filter(r => r.status !== 'closed').length * 2)));
    return { totalHours, lti, recordable, nearMiss, ltir, trir, dart, inspRate, safetyScore, totalReports: reportList.length };
  }, [reportList, inspectionList, usersList]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = [
        { metric: 'LTIR',              value: metrics.ltir,      unit: 'Target ≤ 0.50' },
        { metric: 'TRIR',              value: metrics.trir,      unit: 'Target ≤ 1.00' },
        { metric: 'DART Rate',         value: metrics.dart,      unit: 'Days away / restricted' },
        { metric: 'Safety Score',      value: `${metrics.safetyScore}%`, unit: 'Composite index' },
        { metric: 'Total Reports',     value: metrics.totalReports, unit: '' },
        { metric: 'Near Misses',       value: metrics.nearMiss,  unit: '' },
        { metric: 'Inspection Rate',   value: `${metrics.inspRate}%`, unit: '' },
        { metric: 'LTIs',              value: metrics.lti,       unit: '' },
      ];
      await exportTableToPdf(
        rows,
        [
          { key: 'metric', label: 'KPI',   width: 30 },
          { key: 'value',  label: 'Value', width: 15 },
          { key: 'unit',   label: 'Note',  width: 30 },
        ],
        `hse-statistics-${new Date().toISOString().slice(0, 10)}`,
        {
          title: 'HSE Statistics',
          orgName: activeOrg?.name ?? 'EviroSafe',
          subtitle: `${scopeLabel} · Last ${period}`,
          footerText: 'CONFIDENTIAL — HSE Management System',
        },
      );
    } catch (err) {
      console.error('[HseStatistics] Export failed:', err);
      toastError('Could not export the statistics. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Monthly trend ──────────────────────────────────────────────────────────

  const monthCount = period === '3M' ? 3 : period === '6M' ? 6 : 12;

  const monthlyTrend = useMemo(() => Array.from({ length: monthCount }, (_, i) => {
    const d     = new Date();
    d.setMonth(d.getMonth() - (monthCount - 1 - i));
    const mo    = d.getMonth();
    const yr    = d.getFullYear();
    const label = MONTHS[mo];
    const recs  = reportList.filter(r => {
      const rd = new Date(r.occurred_at || r.reported_at);
      return rd.getMonth() === mo && rd.getFullYear() === yr;
    });
    const hours = (usersList.length || 50) * 160;
    const lti   = recs.filter(r => r.type === 'Lost Time Injury (LTI)').length;
    const inc   = recs.filter(r => !['Positive Observation','Near Miss'].includes(r.type)).length;
    const nm    = recs.filter(r => r.type === 'Near Miss').length;
    const insp  = inspectionList.filter(r => {
      const rd = new Date(r.created_at || '');
      return rd.getMonth() === mo && rd.getFullYear() === yr;
    }).length;
    return { month: label, incidents: inc, nearMiss: nm, lti, ltir: hours > 0 ? +(lti * 200000 / hours).toFixed(2) : 0, inspections: insp };
  }), [reportList, inspectionList, usersList, monthCount]);

  // ── Incident type breakdown ────────────────────────────────────────────────

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    reportList.forEach(r => { map[r.type] = (map[r.type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [reportList]);

  // ── PTW type breakdown ─────────────────────────────────────────────────────

  const ptwTypeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    ptwList.forEach(p => { map[p.type] = (map[p.type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ptwList]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="giq-page-title">HSE Statistics</h1>
          <p className="giq-page-subtitle mt-1">Performance metrics, trends and regulatory KPIs</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              📊 Showing: {scopeLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={scopeProjectId} onChange={e => setScopeProjectId(e.target.value)} className="giq-input" style={{ minWidth: 180 }}>
            <option value="all">All Projects (Org-wide)</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <PeriodSelector period={period} onChange={setPeriod} />
          <button onClick={() => window.location.reload()} className="giq-btn-secondary flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
          <button onClick={handleExport} disabled={isExporting} className="giq-btn-secondary flex items-center gap-2 disabled:opacity-60">
            <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="LTIR"         value={metrics.ltir}      sub="Target ≤ 0.50"         color={COLORS.red}     icon={AlertTriangle} trend={metrics.ltir <= 0.5 ? 'down' : 'up'} good="down" />
        <StatTile label="TRIR"         value={metrics.trir}      sub="Target ≤ 1.00"         color={COLORS.amber}   icon={Activity}      trend={metrics.trir <= 1.0 ? 'down' : 'up'} good="down" />
        <StatTile label="DART Rate"    value={metrics.dart}      sub="Days away / restricted" color={COLORS.blue}    icon={Clock}         trend={metrics.dart <= 0.8 ? 'down' : 'up'} good="down" />
        <StatTile label="Safety Score" value={`${metrics.safetyScore}%`} sub="Composite index" color={COLORS.primary} icon={Shield}       trend={metrics.safetyScore >= 80 ? 'up' : 'down'} good="up" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total Reports"      value={metrics.totalReports} color={COLORS.purple} icon={BarChart2} />
        <StatTile label="Near Misses"        value={metrics.nearMiss}     color={COLORS.cyan}   icon={Activity} trend="up" good="up" />
        <StatTile label="Inspection Rate"    value={`${metrics.inspRate}%`} color={COLORS.primary} icon={CheckCircle} trend={metrics.inspRate >= 80 ? 'up' : 'down'} good="up" />
        <StatTile label="LTIs"               value={metrics.lti}          color={COLORS.red}    icon={AlertTriangle} trend={metrics.lti === 0 ? 'down' : 'up'} good="down" />
      </div>

      {/* LTIR / TRIR trend */}
      <ChartCard title="LTIR & TRIR Monthly Trend" sub="Rate per 200,000 man hours worked">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip content={<GiqTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ltir" name="LTIR" stroke={COLORS.red}   strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="lti"  name="LTIs" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Incident + Near Miss bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Incidents vs Near Misses" sub="Monthly comparison">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<GiqTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="incidents" name="Incidents"  fill={COLORS.red}     radius={[3,3,0,0]} />
              <Bar dataKey="nearMiss"  name="Near Misses" fill={COLORS.blue}   radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            High near-miss ratio = strong safety reporting culture
          </p>
        </ChartCard>

        <ChartCard title="Inspection Activity" sub="Inspections completed per month">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="inspGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<GiqTooltip />} />
              <Area type="monotone" dataKey="inspections" name="Inspections"
                stroke={COLORS.primary} fill="url(#inspGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Incident types + PTW types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Incident Type Breakdown">
          {typeBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No incidents recorded
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {typeBreakdown.map((item, i) => {
                const pct = Math.round((item.value / typeBreakdown[0].value) * 100);
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Permit Type Distribution">
          {ptwTypeBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No permits yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={ptwTypeBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="value">
                    {ptwTypeBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<GiqTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {ptwTypeBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* OSHA benchmarks */}
      <ChartCard title="KPI vs Industry Benchmark" sub="OSHA Construction sector averages">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {[
            { label: 'LTIR',     your: metrics.ltir, industry: 1.2,  target: 0.5,  color: COLORS.red },
            { label: 'TRIR',     your: metrics.trir, industry: 2.5,  target: 1.0,  color: COLORS.amber },
            { label: 'DART Rate',your: metrics.dart, industry: 2.0,  target: 0.8,  color: COLORS.blue },
          ].map(b => {
            const aboveIndustry = b.your > b.industry;
            const aboveTarget   = b.your > b.target;
            return (
              <div key={b.label} className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>{b.label}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Your rate</span>
                    <span className="font-bold" style={{ color: aboveTarget ? '#ef4444' : '#10b981' }}>{b.your}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Target</span>
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{b.target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Industry avg</span>
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{b.industry}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: aboveIndustry ? '#ef4444' : '#10b981' }}>
                  {aboveIndustry ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {aboveIndustry ? 'Above industry avg' : 'Below industry avg'}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
};