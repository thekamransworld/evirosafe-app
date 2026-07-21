import React, { useState, useMemo } from 'react';
import type { Rams as RamsType, RamsStatus } from '../types';
import { useDataContext, useAppContext } from '../contexts';
import { getRiskColor, getRiskLevel } from '../utils/ramsUtils';
import { Plus, Search, FileText, AlertTriangle, ChevronRight, Zap, Shield } from 'lucide-react';

interface RamsProps {
  onSelectRams: (rams: RamsType) => void;
  onNewRams:    () => void;
}

const STATUS_MAP: Record<RamsStatus, { label: string; color: string; bg: string }> = {
  draft:        { label: 'Draft',        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  under_review: { label: 'Under Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  approved:     { label: 'Approved',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  published:    { label: 'Published',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  archived:     { label: 'Archived',     color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const RISK_COLORS: Record<string, string> = {
  Low:      '#10b981',
  Medium:   '#f59e0b',
  High:     '#f97316',
  Critical: '#ef4444',
};

const RamsCard: React.FC<{ rams: RamsType; onSelect: (r: RamsType) => void }> = ({ rams, onSelect }) => {
  const s           = STATUS_MAP[rams.status] || STATUS_MAP.draft;
  const riskBefore  = getRiskLevel(rams.overall_risk_before);
  const riskAfter   = getRiskLevel(rams.overall_risk_after);
  const reduction   = rams.overall_risk_before - rams.overall_risk_after;
  const steps       = rams.method_statement?.sequence_of_operations?.length || 0;

  return (
    <div onClick={() => onSelect(rams)}
      className="giq-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>{s.label}</span>
      </div>

      <div>
        <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{rams.activity}</h3>
        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>v{rams.version} · {steps} steps</p>
      </div>

      {/* Risk reduction visual */}
      <div className="flex items-center gap-3 py-3 px-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)' }}>
        <div className="text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Before</p>
          <span className="text-sm font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${RISK_COLORS[riskBefore]}18`, color: RISK_COLORS[riskBefore] }}>
            {riskBefore} · {rams.overall_risk_before}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full h-1 rounded-full" style={{ background: 'var(--border-default)' }}>
            <div className="h-1 rounded-full" style={{ width: '100%', background: '#10b981' }} />
          </div>
          {reduction > 0 && (
            <span className="text-xs font-semibold mt-1" style={{ color: '#10b981' }}>↓ {reduction} pts</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>After</p>
          <span className="text-sm font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${RISK_COLORS[riskAfter]}18`, color: RISK_COLORS[riskAfter] }}>
            {riskAfter} · {rams.overall_risk_after}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>Valid {new Date(rams.times.valid_from).toLocaleDateString()} – {new Date(rams.times.valid_until).toLocaleDateString()}</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
          {rams.status === 'draft' ? 'Edit' : 'View'}
        </span>
      </div>
    </div>
  );
};

export const Rams: React.FC<RamsProps> = ({ onSelectRams, onNewRams }) => {
  const { ramsList } = useDataContext();
  const { can } = useAppContext();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<RamsStatus | 'all'>('all');

  const filtered = useMemo(() => ramsList.filter(r => {
    const sm = statusFilter === 'all' || r.status === statusFilter;
    const se = !search || (r.activity || '').toLowerCase().includes(search.toLowerCase());
    return sm && se;
  }), [ramsList, statusFilter, search]);

  const stats = useMemo(() => ({
    total:     ramsList.length,
    published: ramsList.filter(r => r.status === 'published').length,
    review:    ramsList.filter(r => r.status === 'under_review').length,
    avgRisk:   ramsList.length > 0 ? Math.round(ramsList.reduce((s, r) => s + r.overall_risk_after, 0) / ramsList.length) : 0,
  }), [ramsList]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">RAMS Library</h1>
          <p className="giq-page-subtitle mt-1">Risk Assessment & Method Statements with AI generation</p>
        </div>
        {can('create', 'plans') && (
          <button onClick={onNewRams} className="giq-btn-primary">
            <Plus className="w-4 h-4" />New RAMS
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total RAMS',   value: stats.total,     color: '#3b82f6' },
          { label: 'Published',    value: stats.published, color: '#10b981' },
          { label: 'Under Review', value: stats.review,    color: '#f59e0b' },
          { label: 'Avg Risk Score',value: stats.avgRisk,  color: stats.avgRisk >= 8 ? '#ef4444' : '#10b981' },
        ].map(s => (
          <div key={s.label} className="giq-card p-4">
            <p className="text-2xl font-bold" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search RAMS..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {(['all', 'draft', 'under_review', 'approved', 'published'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={statusFilter === s ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {s === 'all' ? 'All' : STATUS_MAP[s as RamsStatus]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="giq-card py-16 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No RAMS found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create a new RAMS using the AI generator</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => <RamsCard key={r.id} rams={r} onSelect={onSelectRams} />)}
        </div>
      )}
    </div>
  );
};