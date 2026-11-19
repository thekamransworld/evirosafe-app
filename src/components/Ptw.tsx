import React, { useMemo, useState } from 'react';
import type { Project, User, Ptw as PtwDoc } from '../types';
import { ptwTypeDetails } from '../config';
import { useAppContext, useDataContext } from '../contexts';
import {
  Plus, Search, FileText, AlertTriangle,
  Clock, Calendar, MapPin, User as UserIcon,
  CheckCircle, Shield, ChevronRight, Hand,
} from 'lucide-react';
import { ACTIONS, FORWARD_ACTIONS, STAGE_GROUPS, STAGE_LABEL, normalizeStage, type Stage } from '../lib/ptw/model';
import { checkActor, type EnginePermit } from '../lib/ptw/engine';
import { effectiveStatus, formatRemaining, remainingMs } from '../lib/ptw/validity';
import { useNow } from './ptw/useNow';

// ─── Status config (one entry per stage) ─────────────────────────────────────

const STATUS_STYLE: Record<Stage, { color: string; bg: string }> = {
  DRAFT:              { color: '#9ca3af', bg: 'rgba(156,163,175,0.10)' },
  SUBMITTED:          { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  SITE_INSPECTION:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)' },
  APPROVAL:           { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  SITE_HANDOVER:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  ACTIVE:             { color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  HOLD:               { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  EXPIRED:            { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  COMPLETION_PENDING: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  CLOSED:             { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  CANCELLED:          { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
  REJECTED:           { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  ARCHIVED:           { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};
const UNKNOWN_STYLE = { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };

// ─── Props ────────────────────────────────────────────────────────────────────

interface PtwProps {
  ptws:             PtwDoc[];
  users:            User[];
  projects:         Project[];
  onCreatePtw:      () => void;
  onAddExistingPtw: () => void;
  onSelectPtw:      (ptw: PtwDoc) => void;
}

type Tab = 'All' | 'Awaiting me' | 'Active' | 'Pending' | 'Draft' | 'Closing' | 'Closed';
const TABS: Tab[] = ['All', 'Awaiting me', 'Active', 'Pending', 'Draft', 'Closing', 'Closed'];

// ─── Permit card ──────────────────────────────────────────────────────────────

const PermitCard: React.FC<{ ptw: PtwDoc; project: string; now: number; mine: boolean; onClick: () => void }> = ({ ptw, project, now, mine, onClick }) => {
  const p = ptw as unknown as EnginePermit;
  const stage = effectiveStatus(p, now);
  const style = stage ? STATUS_STYLE[stage] : UNKNOWN_STYLE;
  const label = stage ? STAGE_LABEL[stage] : String(ptw.status).replace(/_/g, ' ');
  const typeDetails = (ptwTypeDetails as any)[ptw.type] || { icon: '📋', hex: '#6b7280' };
  const left = remainingMs(p, now);
  const legacy = !ptw.permit_no;

  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }} data-testid="permit-card"
      className="giq-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: typeDetails.hex }} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-mono mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              {legacy ? 'Legacy permit' : ptw.permit_no}
              {mine && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}><Hand className="w-3 h-3" />Your turn</span>}
            </p>
            <h3 className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--text-primary)' }}>{ptw.title || 'Untitled Permit'}</h3>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} />
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <span className="text-lg">{typeDetails.icon}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{ptw.type}</span>
          {left !== null && (
            <span className="ml-auto text-xs font-bold" style={{ color: left <= 15 * 60_000 ? '#ef4444' : left <= 60 * 60_000 ? '#f59e0b' : '#10b981' }}>{formatRemaining(left)}</span>
          )}
        </div>

        <div className="space-y-1.5">
          {ptw.payload?.work?.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{ptw.payload.work.location}</span>
            </div>
          )}
          {ptw.payload?.requester?.name && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <UserIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">{ptw.payload.requester.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Shield className="w-3 h-3 flex-shrink-0" /><span className="truncate">{project}</span>
          </div>
        </div>

        {ptw.payload?.work?.coverage?.start_date && (
          <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(`${ptw.payload.work.coverage.start_date}T00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
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

export const Ptw: React.FC<PtwProps> = ({ ptws, projects, onCreatePtw, onAddExistingPtw, onSelectPtw }) => {
  const { can } = useAppContext();
  const { ptwActor } = useDataContext();
  const now = useNow(30_000);
  const [filter, setFilter] = useState<Tab>('All');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => ptws.map(p => {
    const stage = effectiveStatus(p as unknown as EnginePermit, now);
    const mine = !!ptwActor && !!p.permit_no && !!stage &&
      (FORWARD_ACTIONS[stage] ?? []).some(id => checkActor(ACTIONS[id], p as unknown as EnginePermit, ptwActor).ok === true);
    return { p, stage, mine };
  }), [ptws, ptwActor, now]);

  const inGroup = (stage: Stage | null, g: keyof typeof STAGE_GROUPS) => !!stage && (STAGE_GROUPS[g] as readonly string[]).includes(stage);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(({ p, stage, mine }) => {
        if (q && !((p.title || '').toLowerCase().includes(q) || (p.permit_no || '').toLowerCase().includes(q) || (p.payload?.work?.location || '').toLowerCase().includes(q))) return false;
        switch (filter) {
          case 'Awaiting me': return mine;
          case 'Active': return inGroup(stage, 'active');
          case 'Pending': return inGroup(stage, 'pending');
          case 'Draft': return inGroup(stage, 'draft');
          case 'Closing': return inGroup(stage, 'closing');
          case 'Closed': return inGroup(stage, 'done');
          default: return true;
        }
      })
      .sort((a, b) => Number(b.mine) - Number(a.mine) || String(b.p.updated_at ?? '').localeCompare(String(a.p.updated_at ?? '')));
  }, [rows, filter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expired permits are NOT counted as active, however the database last saw them.
  const stats = useMemo(() => ({
    active: rows.filter(r => r.stage === 'ACTIVE').length,
    mine: rows.filter(r => r.mine).length,
    attention: rows.filter(r => r.stage === 'HOLD' || r.stage === 'EXPIRED').length,
    total: rows.filter(r => r.stage !== 'ARCHIVED').length,
  }), [rows]);

  const getProject = (id: string) => projects.find(p => p.id === id)?.name || '—';
  const counts: Record<Tab, number> = {
    All: rows.length, 'Awaiting me': stats.mine,
    Active: rows.filter(r => inGroup(r.stage, 'active')).length, Pending: rows.filter(r => inGroup(r.stage, 'pending')).length,
    Draft: rows.filter(r => inGroup(r.stage, 'draft')).length, Closing: rows.filter(r => inGroup(r.stage, 'closing')).length,
    Closed: rows.filter(r => inGroup(r.stage, 'done')).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="giq-page-title">Permit to Work</h1>
          <p className="giq-page-subtitle mt-1">Manage authorisations for high-risk activities</p>
        </div>
        {can('create', 'ptw') && (
          <div className="flex gap-2">
            <button onClick={onAddExistingPtw} className="giq-btn-secondary text-sm px-4 py-2">Add Existing</button>
            <button onClick={onCreatePtw} className="giq-btn-primary text-sm px-4 py-2"><Plus className="w-4 h-4" />New Permit</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="ptw-stats">
        {[
          { label: 'Active now',       value: stats.active,    color: '#10b981', icon: CheckCircle },
          { label: 'Waiting for you',  value: stats.mine,      color: '#3b82f6', icon: Hand },
          { label: 'On hold / expired', value: stats.attention, color: '#ef4444', icon: AlertTriangle },
          { label: 'Permits',          value: stats.total,     color: '#8b5cf6', icon: FileText },
        ].map(s => (
          <div key={s.label} className="giq-card p-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {TABS.map(f => (
            <button key={f} onClick={() => setFilter(f)} data-testid={`tab-${f}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              style={filter === f ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {f}{counts[f] > 0 ? ` (${counts[f]})` : ''}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by permit number, title or location..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="giq-card py-20 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filter === 'Awaiting me' ? 'Nothing is waiting for you' : 'No permits found'}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{filter === 'Awaiting me' ? 'Permits that need your action will appear here.' : 'Adjust your filters or create a new permit'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(({ p, mine }) => (
            <PermitCard key={p.id} ptw={p} project={getProject(p.project_id)} now={now} mine={mine} onClick={() => onSelectPtw(p)} />
          ))}
        </div>
      )}
    </div>
  );
};
