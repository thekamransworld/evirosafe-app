import React, { useState, useMemo } from 'react';
import type { Plan, PlanStatus } from '../types';
import { planTypes } from '../config';
import { useDataContext, useAppContext } from '../contexts';
import { Plus, FileText, CheckCircle, Clock, ChevronRight, Search, BookOpen } from 'lucide-react';

interface PlansProps {
  onSelectPlan: (plan: Plan) => void;
  onNewPlan:    () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:        { label: 'Draft',        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  under_review: { label: 'Under Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  approved:     { label: 'Approved',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  published:    { label: 'Published',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  archived:     { label: 'Archived',     color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};
const getStatus = (s: string) => STATUS_MAP[s] || STATUS_MAP.draft;

const PlanCard: React.FC<{ plan: Plan; onSelect: (plan: Plan) => void }> = ({ plan, onSelect }) => {
  const s = getStatus(plan.status || 'draft');
  return (
    <div onClick={() => onSelect(plan)}
      className="giq-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)' }}>
            <BookOpen className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              {plan.type}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{plan.title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>v{plan.version}</p>
      </div>
      {plan.people?.approved_by_client?.signed_at && (
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10b981' }}>
          <CheckCircle className="w-3.5 h-3.5" />Client Approved
        </div>
      )}
      <div className="pt-3 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>By {plan.people?.prepared_by?.name || 'Unknown'}</p>
          {plan.dates?.next_review_at && (
            <p className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />Review {new Date(plan.dates.next_review_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
          {plan.status === 'draft' ? 'Edit' : 'View'}
        </span>
      </div>
    </div>
  );
};

export const Plans: React.FC<PlansProps> = ({ onSelectPlan, onNewPlan }) => {
  const { planList, projects } = useDataContext();
  const { can } = useAppContext();
  const [typeFilter, setTypeFilter]       = useState('All');
  const [statusFilter, setStatusFilter]   = useState<PlanStatus | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [search, setSearch]               = useState('');

  const filtered = useMemo(() => planList.filter(p => {
    const tm = typeFilter    === 'All' || p.type       === typeFilter;
    const sm = statusFilter  === 'All' || p.status     === statusFilter;
    const pm = projectFilter === 'All' || p.project_id === projectFilter;
    const se = !search || (p.title || '').toLowerCase().includes(search.toLowerCase());
    return tm && sm && pm && se;
  }), [planList, typeFilter, statusFilter, projectFilter, search]);

  const stats = useMemo(() => ({
    total:     planList.length,
    published: planList.filter(p => p.status === 'published').length,
    review:    planList.filter(p => p.status === 'under_review').length,
    draft:     planList.filter(p => p.status === 'draft').length,
  }), [planList]);

  const FilterPill: React.FC<{ label: string; value: string; current: string; set: (v: any) => void }> = ({ label, value, current, set }) => (
    <button onClick={() => set(value)}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={current === value ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">HSE Plans Library</h1>
          <p className="giq-page-subtitle mt-1">Method statements, risk assessments and HSE plans</p>
        </div>
        {can('create', 'plans') && (
          <button onClick={onNewPlan} className="giq-btn-primary">
            <Plus className="w-4 h-4" />New Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans',  value: stats.total,     color: '#3b82f6' },
          { label: 'Published',    value: stats.published, color: '#10b981' },
          { label: 'Under Review', value: stats.review,    color: '#f59e0b' },
          { label: 'Draft',        value: stats.draft,     color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} className="giq-card p-4">
            <p className="text-2xl font-bold" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="giq-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Type</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All" value="All" current={typeFilter} set={setTypeFilter} />
            {planTypes.map(t => <FilterPill key={t} label={t} value={t} current={typeFilter} set={setTypeFilter} />)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All" value="All" current={statusFilter} set={setStatusFilter} />
            {['draft','under_review','approved','published','archived'].map(s => (
              <FilterPill key={s} label={s.replace('_',' ')} value={s} current={statusFilter} set={setStatusFilter} />
            ))}
          </div>
        </div>
        {projects.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Project</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill label="All Projects" value="All" current={projectFilter} set={setProjectFilter} />
              {projects.map(p => <FilterPill key={p.id} label={p.name} value={p.id} current={projectFilter} set={setProjectFilter} />)}
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="giq-card py-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No plans match the filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => <PlanCard key={p.id} plan={p} onSelect={onSelectPlan} />)}
        </div>
      )}
    </div>
  );
};