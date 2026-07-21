import React, { useState, useMemo } from 'react';
import type { Report, ReportStatus } from '../types';
import { useDataContext, useAppContext, useModalContext } from '../contexts';
import { getRiskResult } from '../utils/riskUtils';
import {
  Plus, Search, AlertTriangle, ChevronRight,
  MapPin, Calendar, Filter, FileText,
  TrendingUp, CheckCircle, Clock, Activity
} from 'lucide-react';

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  'Incident':                  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Accident':                  { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  'Near Miss':                 { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  'Unsafe Act':                { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Unsafe Condition':          { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  'First Aid Case (FAC)':      { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  'Medical Treatment Case (MTC)': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'Lost Time Injury (LTI)':    { color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
  'Restricted Work Case (RWC)':{ color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  'Property / Asset Damage':   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  'Environmental Incident':    { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Fire Event':                { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Leadership Event':          { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'Positive Observation':      { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

const getType = (t: string) => TYPE_COLORS[t] || { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:           { label: 'Submitted',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  under_investigation: { label: 'Investigating',       color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  under_review:        { label: 'Under Review',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  pending_action:      { label: 'Pending Action',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  closed:              { label: 'Closed',              color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  active:              { label: 'Active',              color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled:           { label: 'Cancelled',           color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};
const getStatusCfg = (s: string) => STATUS_CFG[s] || STATUS_CFG.submitted;

const REPORT_TYPES = [
  'Incident', 'Accident', 'Near Miss', 'Unsafe Act', 'Unsafe Condition',
  'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)',
  'Restricted Work Case (RWC)', 'Property / Asset Damage', 'Environmental Incident',
  'Fire Event', 'Leadership Event', 'Positive Observation',
];

// ─── Report card ──────────────────────────────────────────────────────────────

const ReportCard: React.FC<{ report: Report; onClick: () => void }> = ({ report, onClick }) => {
  const typeCfg = getType(report.type);
  const sCfg    = getStatusCfg(report.status);
  const risk    = getRiskResult(report.risk_pre_control || { severity: 1, likelihood: 1 });
  const daysAgo = Math.floor((Date.now() - new Date(report.occurred_at || report.reported_at || '').getTime()) / 86400000);

  const riskStyle = {
    background: `${risk.cssColor}15`,
    color: risk.cssColor,
    border: `1px solid ${risk.cssColor}25`,
  };

  return (
    <div onClick={onClick}
      className="giq-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden">
      {/* Type accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: typeCfg.color }} />

      <div className="pl-2">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: typeCfg.bg, color: typeCfg.color }}>
            {report.type}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: sCfg.bg, color: sCfg.color }}>
            {sCfg.label}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={riskStyle}>
            {risk.level}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm font-medium leading-snug line-clamp-2 mb-3"
          style={{ color: 'var(--text-primary)' }}>
          {report.description || (report.details as any)?.key_observations || 'No description'}
        </p>

        {/* Meta */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{report.location?.text || 'Location unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`} · {new Date(report.occurred_at || report.reported_at || '').toLocaleDateString()}</span>
          </div>
        </div>

        {/* Classification codes */}
        {report.classification_codes && report.classification_codes.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            {report.classification_codes.map(code => (
              <span key={code} className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {code}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const { reportList } = useDataContext();
  const { setSelectedReport, setIsReportCreationModalOpen } = useModalContext();
  const { can } = useAppContext();

  const [typeFilter, setTypeFilter]     = useState('All');
  const [riskFilter, setRiskFilter]     = useState('All');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [search, setSearch]             = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [view, setView]                 = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => reportList.filter(r => {
    const tm = typeFilter   === 'All' || r.type   === typeFilter;
    const rm = riskFilter   === 'All' || getRiskResult(r.risk_pre_control || { severity: 1, likelihood: 1 }).level === riskFilter;
    const sm = statusFilter === 'All' || r.status === statusFilter;
    const se = !search || (r.description || '').toLowerCase().includes(search.toLowerCase()) || (r.type || '').toLowerCase().includes(search.toLowerCase()) || (r.location?.text || '').toLowerCase().includes(search.toLowerCase());
    return tm && rm && sm && se;
  }), [reportList, typeFilter, riskFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total:   reportList.length,
    open:    reportList.filter(r => !['closed','cancelled'].includes(r.status)).length,
    lti:     reportList.filter(r => r.type === 'Lost Time Injury (LTI)').length,
    positive:reportList.filter(r => r.type === 'Positive Observation').length,
  }), [reportList]);

  const FilterPill: React.FC<{ label: string; active: boolean; onClick: () => void; color?: string }> = ({ label, active, onClick, color }) => (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: color || '#10b981', color: 'white' }
        : { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Incident Reports</h1>
          <p className="giq-page-subtitle mt-1">All safety events, observations and incidents</p>
        </div>
        {can('create', 'reports') && (
          <button onClick={() => setIsReportCreationModalOpen(true)} className="giq-btn-primary">
            <Plus className="w-4 h-4" />New Report
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total,    color: '#3b82f6', icon: FileText },
          { label: 'Open',          value: stats.open,     color: '#f59e0b', icon: Clock },
          { label: 'LTIs',          value: stats.lti,      color: '#ef4444', icon: AlertTriangle },
          { label: 'Positive Obs.', value: stats.positive, color: '#10b981', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="giq-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reports..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <button onClick={() => setShowFilters(p => !p)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: showFilters ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
            color: showFilters ? '#10b981' : 'var(--text-secondary)',
            border: `1px solid ${showFilters ? 'rgba(16,185,129,0.3)' : 'var(--border-default)'}`,
          }}>
          <Filter className="w-4 h-4" />Filters
          {(typeFilter !== 'All' || riskFilter !== 'All' || statusFilter !== 'All') && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          )}
        </button>
        {/* Grid / List toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {(['grid','list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={view === v ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="giq-card p-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Type</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill label="All" active={typeFilter === 'All'} onClick={() => setTypeFilter('All')} />
              {REPORT_TYPES.map(t => {
                const cfg = getType(t);
                return <FilterPill key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} color={cfg.color} />;
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Risk Level</p>
            <div className="flex gap-2 flex-wrap">
              {['All','Low','Medium','High','Critical'].map(r => (
                <FilterPill key={r} label={r} active={riskFilter === r} onClick={() => setRiskFilter(r)}
                  color={r === 'Critical' ? '#ef4444' : r === 'High' ? '#f97316' : r === 'Medium' ? '#f59e0b' : '#10b981'} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Status</p>
            <div className="flex gap-2 flex-wrap">
              <FilterPill label="All" active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <FilterPill key={k} label={v.label} active={statusFilter === k}
                  onClick={() => setStatusFilter(k as ReportStatus)} color={v.color} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{filtered.length}</span> of {reportList.length} reports
        </p>
        {(typeFilter !== 'All' || riskFilter !== 'All' || statusFilter !== 'All') && (
          <button onClick={() => { setTypeFilter('All'); setRiskFilter('All'); setStatusFilter('All'); }}
            className="text-xs font-medium" style={{ color: '#10b981' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        filtered.length === 0 ? (
          <div className="giq-card py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No reports match the current filters</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => <ReportCard key={r.id} report={r} onClick={() => setSelectedReport(r)} />)}
          </div>
        )
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.map(r => {
            const typeCfg = getType(r.type);
            const sCfg    = getStatusCfg(r.status);
            const risk    = getRiskResult(r.risk_pre_control || { severity: 1, likelihood: 1 });
            const daysAgo = Math.floor((Date.now() - new Date(r.occurred_at || r.reported_at || '').getTime()) / 86400000);
            return (
              <div key={r.id} onClick={() => setSelectedReport(r)}
                className="giq-card px-5 py-4 cursor-pointer flex items-center gap-4 hover:-translate-y-0.5 transition-all">
                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: typeCfg.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: typeCfg.color }}>{r.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                    <span className="text-xs font-semibold" style={{ color: risk.cssColor }}>{risk.level}</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {r.description || (r.details as any)?.key_observations || 'No description'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location?.text || 'Unknown'}</span>
                    <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="giq-card py-12 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No reports found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};