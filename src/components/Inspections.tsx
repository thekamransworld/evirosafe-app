import React, { useState, useMemo } from 'react';
import { useDataContext, useAppContext, useModalContext } from '../contexts';
import { InspectionConductModal } from './InspectionConductModal';
import type { Inspection, InspectionFinding } from '../types';
import { Plus, Search, ClipboardCheck, ChevronRight, Calendar, User } from 'lucide-react';

// Real InspectionStatus enum (types.ts):
// 'Draft' | 'Ongoing' | 'Submitted' | 'Under Review' | 'Approved' | 'Closed' |
// 'Archived' | 'In Progress' | 'Scheduled' | 'Pending Review' | 'Overdue' | 'Completed'
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  Draft:            { label: 'Draft',          color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  Scheduled:        { label: 'Scheduled',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  Ongoing:          { label: 'Ongoing',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'In Progress':    { label: 'In Progress',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Submitted:        { label: 'Submitted',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'Under Review':   { label: 'Under Review',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'Pending Review': { label: 'Pending Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  Approved:         { label: 'Approved',       color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Completed:        { label: 'Completed',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Closed:           { label: 'Closed',         color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
  Archived:         { label: 'Archived',       color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
  Overdue:          { label: 'Overdue',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};
const getStatus = (s: string) => STATUS_CFG[s] || { label: s || 'Unknown', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };

// Groups every real status into one of 4 stat buckets so nothing falls through the cracks.
const SCHEDULED_STATUSES  = ['Scheduled', 'Draft'];
const IN_PROGRESS_STATUSES = ['Ongoing', 'In Progress', 'Submitted', 'Under Review', 'Pending Review'];
const COMPLETED_STATUSES  = ['Completed', 'Approved', 'Closed', 'Archived'];
const OVERDUE_STATUSES    = ['Overdue'];

// Filter tabs — grouped so the bar stays usable instead of listing all 12 raw values.
const FILTER_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'All',         label: 'All',         statuses: [] },
  { key: 'Scheduled',   label: 'Scheduled',   statuses: SCHEDULED_STATUSES },
  { key: 'InProgress',  label: 'In Progress', statuses: IN_PROGRESS_STATUSES },
  { key: 'Completed',   label: 'Completed',   statuses: COMPLETED_STATUSES },
  { key: 'Overdue',     label: 'Overdue',     statuses: OVERDUE_STATUSES },
];

export const Inspections: React.FC = () => {
  const { inspectionList, handleUpdateInspection, handleCreateReport, checklistTemplates, projects } = useDataContext();
  const { can, usersList, activeOrg } = useAppContext();
  const { setIsInspectionCreationModalOpen } = useModalContext();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('All');
  const [selected, setSelected]   = useState<Inspection | null>(null);

  const filtered = useMemo(() => inspectionList.filter(i => {
    const tab = FILTER_TABS.find(t => t.key === statusFilter);
    const sm = statusFilter === 'All' || (tab ? tab.statuses.includes(i.status) : true);
    const se = !search || (i.title || '').toLowerCase().includes(search.toLowerCase());
    return sm && se;
  }), [inspectionList, statusFilter, search]);

  const stats = useMemo(() => ({
    total:      inspectionList.length,
    completed:  inspectionList.filter(i => COMPLETED_STATUSES.includes(i.status)).length,
    inProgress: inspectionList.filter(i => IN_PROGRESS_STATUSES.includes(i.status)).length,
    scheduled:  inspectionList.filter(i => SCHEDULED_STATUSES.includes(i.status)).length,
    overdue:    inspectionList.filter(i => OVERDUE_STATUSES.includes(i.status)).length,
  }), [inspectionList]);

  const handleConvertToReport = (finding: InspectionFinding) => {
    handleCreateReport({
      type: finding.category === 'Unsafe Act' ? 'Unsafe Act' : finding.category === 'Unsafe Condition' ? 'Unsafe Condition' : 'Incident',
      occurred_at: new Date().toISOString(),
      description: finding.description,
      location: { text: selected?.location_area || '' },
      details: { severity: finding.risk_level },
      project_id: selected?.project_id,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Inspections</h1>
          <p className="giq-page-subtitle mt-1">Site inspections and checklist-based audits</p>
        </div>
        {can('create', 'inspections') && (
          <button onClick={() => setIsInspectionCreationModalOpen(true)} className="giq-btn-primary">
            <Plus className="w-4 h-4" />New Inspection
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',       value: stats.total,      color: '#3b82f6' },
          { label: 'Scheduled',   value: stats.scheduled,  color: '#8b5cf6' },
          { label: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
          { label: 'Completed',   value: stats.completed,  color: '#10b981' },
          { label: 'Overdue',     value: stats.overdue,    color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="giq-card p-4">
            <p className="text-2xl font-bold" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inspections..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={statusFilter === t.key ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(insp => {
          const sCfg  = getStatus(insp.status);
          const findingCount = insp.findings?.length || 0;
          const title = insp.title || 'Inspection';
          return (
            <div key={insp.id} onClick={() => setSelected(insp)}
              className="giq-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: sCfg.bg }}>
                <ClipboardCheck className="w-5 h-5" style={{ color: sCfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{insp.type}</span>
                  {findingCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      {findingCount} finding{findingCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {insp.person_responsible?.name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{insp.person_responsible.name}</span>}
                  {insp.schedule_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(insp.schedule_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="giq-card py-16 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No inspections found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {inspectionList.length === 0 ? 'Click "New Inspection" to schedule your first one.' : 'Try a different filter or search term.'}
            </p>
          </div>
        )}
      </div>

      {selected && (
        <InspectionConductModal
          isOpen={true}
          onClose={() => setSelected(null)}
          inspection={selected}
          onUpdate={(inspection, action) => {
            handleUpdateInspection(inspection, action);
            setSelected(null);
          }}
          onConvertToReport={handleConvertToReport}
          checklistTemplates={checklistTemplates}
          users={usersList}
          projects={projects}
        />
      )}
    </div>
  );
};