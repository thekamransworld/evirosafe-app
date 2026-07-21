import React, { useState, useMemo } from 'react';
import type { Project, User, Ptw as PtwDoc } from '../types';
import { ptwTypeDetails } from '../config';
import { useAppContext } from '../contexts';
import {
  Plus, Search, FileText, AlertTriangle,
  Clock, Calendar, MapPin, User as UserIcon,
  CheckCircle, Shield, ChevronRight, Filter
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE:             { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.1)',  dot: '#10b981' },
  APPROVAL:           { label: 'Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  APPROVER_SIGNED:    { label: 'Approved',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  dot: '#3b82f6' },
  SUBMITTED:          { label: 'Submitted',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  dot: '#8b5cf6' },
  PRE_SCREEN:         { label: 'Pre-Screen',      color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   dot: '#06b6d4' },
  SITE_INSPECTION:    { label: 'Inspection',      color: '#f97316', bg: 'rgba(249,115,22,0.1)',  dot: '#f97316' },
  HOLD:               { label: 'On Hold',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   dot: '#ef4444' },
  SUSPENDED:          { label: 'Suspended',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   dot: '#ef4444' },
  COMPLETED:          { label: 'Completed',       color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' },
  CLOSED:             { label: 'Closed',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' },
  DRAFT:              { label: 'Draft',           color: '#9ca3af', bg: 'rgba(156,163,175,0.08)',dot: '#9ca3af' },
};

const getStatus = (status: string) =>
  STATUS_MAP[status] || { label: status, color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', dot: '#9ca3af' };

// ─── Props ────────────────────────────────────────────────────────────────────

interface PtwProps {
  ptws:             PtwDoc[];
  users:            User[];
  projects:         Project[];
  onCreatePtw:      () => void;
  onAddExistingPtw: () => void;
  onSelectPtw:      (ptw: PtwDoc) => void;
}

// ─── Permit card ──────────────────────────────────────────────────────────────

const PermitCard: React.FC<{ ptw: PtwDoc; project: string; onClick: () => void }> = ({ ptw, project, onClick }) => {
  const statusCfg  = getStatus(ptw.status);
  const typeDetails = ptwTypeDetails[ptw.type] || { icon: '📋', hex: '#6b7280' };

  return (
    <div onClick={onClick}
      className="giq-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: typeDetails.hex }} />

      <div className="pl-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
              {ptw.payload?.permit_no || 'DRAFT'}
            </p>
            <h3 className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
              {ptw.title || 'Untitled Permit'}
            </h3>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: statusCfg.bg, color: statusCfg.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
            {statusCfg.label}
          </span>
        </div>

        {/* Type */}
        <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg"
          style={{ background: 'var(--bg-elevated)' }}>
          <span className="text-lg">{typeDetails.icon}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{ptw.type}</span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5">
          {ptw.payload?.work?.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ptw.payload.work.location}</span>
            </div>
          )}
          {ptw.payload?.requester?.name && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <UserIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ptw.payload.requester.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Shield className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project}</span>
          </div>
        </div>

        {/* Footer */}
        {ptw.payload?.work?.coverage && (
          <div className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(ptw.payload.work.coverage.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" />
              <span>{ptw.payload.work.coverage.start_time} – {ptw.payload.work.coverage.end_time}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Ptw: React.FC<PtwProps> = ({ ptws, users, projects, onCreatePtw, onAddExistingPtw, onSelectPtw }) => {
  const { can } = useAppContext();
  const [filter, setFilter] = useState<'All' | 'Active' | 'Draft' | 'Pending' | 'Closed'>('All');
  const [search, setSearch] = useState('');

  const filteredPtws = useMemo(() => ptws.filter(p => {
    const matchSearch = !search ||
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.payload?.permit_no || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Active')  return p.status === 'ACTIVE';
    if (filter === 'Draft')   return p.status === 'DRAFT';
    if (filter === 'Pending') return ['APPROVAL','SUBMITTED','PRE_SCREEN','SITE_INSPECTION','APPROVER_SIGNED'].includes(p.status);
    if (filter === 'Closed')  return ['CLOSED','COMPLETED','CANCELLED','REJECTED','ARCHIVED'].includes(p.status);
    return true;
  }), [ptws, filter, search]);

  const stats = useMemo(() => ({
    active:  ptws.filter(p => p.status === 'ACTIVE').length,
    pending: ptws.filter(p => ['APPROVAL','SUBMITTED','PRE_SCREEN','SITE_INSPECTION'].includes(p.status)).length,
    onHold:  ptws.filter(p => ['HOLD','SUSPENDED'].includes(p.status)).length,
    total:   ptws.length,
  }), [ptws]);

  const getProject = (id: string) => projects.find(p => p.id === id)?.name || '—';

  const FILTER_TABS = ['All', 'Active', 'Pending', 'Draft', 'Closed'] as const;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Permit to Work</h1>
          <p className="giq-page-subtitle mt-1">Manage authorisations for high-risk activities</p>
        </div>
        {can('create', 'ptw') && (
          <div className="flex gap-2">
            <button onClick={onAddExistingPtw}
              className="giq-btn-secondary text-sm px-4 py-2">
              Add Existing
            </button>
            <button onClick={onCreatePtw}
              className="giq-btn-primary text-sm px-4 py-2">
              <Plus className="w-4 h-4" />New Permit
            </button>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active',          value: stats.active,  color: '#10b981', icon: CheckCircle },
          { label: 'Pending Approval',value: stats.pending, color: '#f59e0b', icon: Clock },
          { label: 'On Hold',         value: stats.onHold,  color: '#ef4444', icon: AlertTriangle },
          { label: 'Total Permits',   value: stats.total,   color: '#3b82f6', icon: FileText },
        ].map(s => (
          <div key={s.label} className="giq-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {s.value > 0 ? `+${s.value}` : '0'}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {FILTER_TABS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === f
                ? { background: '#10b981', color: 'white' }
                : { color: 'var(--text-secondary)' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by permit number or title..."
            className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      {/* Grid */}
      {filteredPtws.length === 0 ? (
        <div className="giq-card py-20 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No permits found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Adjust your filters or create a new permit</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPtws.map(ptw => (
            <PermitCard key={ptw.id} ptw={ptw} project={getProject(ptw.project_id)} onClick={() => onSelectPtw(ptw)} />
          ))}
        </div>
      )}
    </div>
  );
};