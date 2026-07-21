import React, { useMemo, useState } from 'react';
import { useDataContext, useAppContext, useModalContext } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import { SiteMap } from './SiteMap';
import {
  AlertTriangle, CheckCircle, Clock, Shield,
  TrendingUp, TrendingDown, Minus, FileText,
  Plus, ArrowRight, Activity, Users, Zap,
  ClipboardList, BookOpen, HardHat
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  trend?:  'up' | 'down' | 'flat';
  good?:   'up' | 'down';
  icon:    React.FC<any>;
  accent:  string;
  spark?:  number[];
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, trend, good, icon: Icon, accent, spark }) => {
  const isGood   = trend && good ? trend === good : null;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const sparkData = spark?.map((v, i) => ({ v }));

  return (
    <div className="giq-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: isGood === true ? '#10b981' : isGood === false ? '#ef4444' : 'var(--text-muted)' }}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend === 'flat' ? 'Stable' : trend === 'up' ? 'Up' : 'Down'}</span>
          </div>
        )}
      </div>

      {sparkData && (
        <div className="h-8 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <Area type="monotone" dataKey="v" stroke={accent} fill={`${accent}20`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; action?: { label: string; onClick: () => void } }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
    {action && (
      <button onClick={action.onClick}
        className="flex items-center gap-1 text-xs font-medium transition-colors"
        style={{ color: '#10b981' }}>
        {action.label}<ArrowRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Incident feed item ───────────────────────────────────────────────────────

const incidentColors: Record<string, string> = {
  'Incident':       '#ef4444',
  'Near Miss':      '#f97316',
  'Unsafe Act':     '#f59e0b',
  'Unsafe Condition': '#eab308',
  'Positive Observation': '#10b981',
};

const IncidentRow: React.FC<{ report: any; onClick: () => void }> = ({ report, onClick }) => {
  const color = incidentColors[report.type] || '#6b7280';
  const daysAgo = Math.floor((Date.now() - new Date(report.occurred_at || report.reported_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left transition-colors"
      style={{ borderBottom: '1px solid var(--border-default)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{report.type}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{report.location?.text || 'Location unknown'}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: `${color}15`, color }}>
          {report.type === 'Positive Observation' ? 'Positive' : report.type}
        </span>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</p>
      </div>
    </button>
  );
};

// ─── PTW status pill ──────────────────────────────────────────────────────────

const ptwColors: Record<string, { bg: string; text: string }> = {
  ACTIVE:   { bg: '#10b98115', text: '#10b981' },
  DRAFT:    { bg: '#6b728015', text: '#6b7280' },
  APPROVAL: { bg: '#f59e0b15', text: '#f59e0b' },
  REJECTED: { bg: '#ef444415', text: '#ef4444' },
  COMPLETED:{ bg: '#3b82f615', text: '#3b82f6' },
};

const PtwRow: React.FC<{ ptw: any; onClick: () => void }> = ({ ptw, onClick }) => {
  const cfg = ptwColors[ptw.status] || ptwColors.DRAFT;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left"
      style={{ borderBottom: '1px solid var(--border-default)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ptw.type?.replace(/_/g, ' ') || 'Permit'}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{ptw.permit_number || ptw.id?.slice(0, 8)}</p>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.text }}>
        {ptw.status}
      </span>
    </button>
  );
};

// ─── Quick action button ──────────────────────────────────────────────────────

const QuickAction: React.FC<{ label: string; icon: React.FC<any>; color: string; onClick: () => void }> = ({ label, icon: Icon, color, onClick }) => (
  <button onClick={onClick}
    className="giq-card flex flex-col items-center justify-center gap-2 p-4 transition-all hover:-translate-y-0.5 cursor-pointer"
    style={{ minHeight: '80px' }}>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <span className="text-xs font-medium text-center" style={{ color: 'var(--text-secondary)' }}>{label}</span>
  </button>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { reportList, ptwList, inspectionList } = useDataContext();
  const { activeUser, can } = useAppContext();
  const { setIsReportCreationModalOpen, setIsPtwCreationModalOpen, setPtwCreationMode,
          setSelectedReport, setSelectedPtw } = useModalContext();
  const { theme } = useTheme();
  const [mapView, setMapView] = useState(false);

  const stats = useMemo(() => {
    const open       = reportList.filter(r => r.status !== 'closed');
    const active     = ptwList.filter(p => p.status === 'ACTIVE');
    const lti        = reportList.filter(r => r.type === 'Lost Time Injury (LTI)');
    const nearMiss   = reportList.filter(r => r.type === 'Near Miss');
    const inspDone   = inspectionList.filter(i => i.status === 'Approved' || i.status === 'Closed');
    const inspRate   = inspectionList.length > 0 ? Math.round((inspDone.length / inspectionList.length) * 100) : 100;
    return { open: open.length, active: active.length, lti: lti.length, nearMiss: nearMiss.length, inspRate };
  }, [reportList, ptwList, inspectionList]);

  const recentReports = useMemo(() =>
    [...reportList].sort((a, b) => new Date(b.occurred_at || b.reported_at).getTime() - new Date(a.occurred_at || a.reported_at).getTime()).slice(0, 6),
    [reportList]);

  const recentPtws = useMemo(() =>
    [...ptwList].slice(0, 5),
    [ptwList]);

  const spark = [2, 3, 1, 4, 2, 5, 3, 2, 4, 3];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {activeUser?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} · GuardIQ HSE Platform
          </p>
        </div>
        {can('create', 'reports') && (
          <button onClick={() => setIsReportCreationModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#10b981', color: 'white' }}>
            <Plus className="w-4 h-4" />New Report
          </button>
        )}
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Incidents"    value={stats.open}       sub="Require attention"
          icon={AlertTriangle}  accent="#ef4444"  trend={stats.open > 5 ? 'up' : 'down'} good="down"  spark={spark} />
        <StatCard label="Active Permits"    value={stats.active}     sub="Currently on site"
          icon={FileText}       accent="#10b981"  trend="flat"                              spark={spark.reverse()} />
        <StatCard label="Near Misses"       value={stats.nearMiss}   sub="This month"
          icon={Activity}       accent="#f97316"  trend={stats.nearMiss > 3 ? 'up' : 'flat'} good="up" />
        <StatCard label="Inspection Rate"   value={`${stats.inspRate}%`} sub="Completion"
          icon={CheckCircle}    accent="#3b82f6"  trend={stats.inspRate >= 80 ? 'up' : 'down'} good="up" />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <QuickAction label="New Report"    icon={Plus}          color="#ef4444" onClick={() => setIsReportCreationModalOpen(true)} />
          <QuickAction label="New Permit"    icon={FileText}      color="#10b981" onClick={() => { setPtwCreationMode('new'); setIsPtwCreationModalOpen(true); }} />
          <QuickAction label="KPI Dashboard" icon={TrendingUp}    color="#3b82f6" onClick={() => {}} />
          <QuickAction label="Training"      icon={BookOpen}      color="#8b5cf6" onClick={() => {}} />
          <QuickAction label="Toolbox Talk"  icon={Users}         color="#f59e0b" onClick={() => {}} />
          <QuickAction label="Audit"         icon={ClipboardList} color="#06b6d4" onClick={() => {}} />
        </div>
      </div>

      {/* ── Main content grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent incidents */}
        <div className="lg:col-span-2 giq-card p-5">
          <SectionHeader title="Recent Incidents" action={{ label: 'View all', onClick: () => {} }} />
          {recentReports.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: '#10b981', opacity: 0.4 }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No incidents reported</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Keep up the great work</p>
            </div>
          ) : (
            <div>
              {recentReports.map(r => (
                <IncidentRow key={r.id} report={r} onClick={() => setSelectedReport(r)} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active permits */}
          <div className="giq-card p-5">
            <SectionHeader title="Permit Status" action={{ label: 'View all', onClick: () => {} }} />
            {recentPtws.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No permits yet</p>
            ) : (
              <div>
                {recentPtws.map(p => (
                  <PtwRow key={p.id} ptw={p} onClick={() => setSelectedPtw(p)} />
                ))}
              </div>
            )}
          </div>

          {/* Safety score */}
          <div className="giq-card p-5">
            <SectionHeader title="Safety Score" />
            <div className="flex items-end gap-3">
              <div>
                <p className="text-4xl font-bold" style={{ color: '#10b981', letterSpacing: '-0.03em' }}>
                  {Math.max(0, 100 - stats.open * 3 - stats.lti * 10)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>out of 100</p>
              </div>
              <div className="flex-1 pb-1">
                <div className="w-full rounded-full h-2" style={{ background: 'var(--border-default)' }}>
                  <div className="h-2 rounded-full transition-all" style={{
                    background: '#10b981',
                    width: `${Math.max(0, 100 - stats.open * 3 - stats.lti * 10)}%`
                  }} />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {stats.lti === 0 ? '✓ Zero LTIs this period' : `${stats.lti} LTI${stats.lti > 1 ? 's' : ''} recorded`}
                </p>
              </div>
            </div>
          </div>

          {/* Site map toggle */}
          <div className="giq-card overflow-hidden">
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Site Map</span>
              <button onClick={() => setMapView(p => !p)}
                className="text-xs font-medium" style={{ color: '#10b981' }}>
                {mapView ? 'Hide' : 'Show'}
              </button>
            </div>
            {mapView && (
              <div className="h-[240px]">
                <SiteMap embedded />
              </div>
            )}
            {!mapView && (
              <div className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <HardHat className="w-4 h-4" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{stats.active} active permits</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click show to view site map</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};