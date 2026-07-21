import React, { useState, useMemo } from 'react';
import { useDataContext, useAppContext, useModalContext } from '../contexts';
import { Plus, Search, Megaphone, Users, CheckCircle, Clock, ChevronRight, Calendar, UserCheck } from 'lucide-react';

const TOPIC_COLORS: Record<string, string> = {
  working_at_height: '#ef4444', electrical: '#eab308', fire: '#ef4444',
  manual_handling: '#3b82f6', chemical: '#8b5cf6', ppe: '#10b981',
  emergency: '#ef4444', housekeeping: '#6b7280', environment: '#10b981',
  permit_to_work: '#3b82f6', risk_assessment: '#f59e0b', incident_review: '#f97316', other: '#6b7280',
};

const TOPIC_LABELS: Record<string, string> = {
  working_at_height: 'Working at Height', electrical: 'Electrical Safety', fire: 'Fire Safety',
  manual_handling: 'Manual Handling', chemical: 'Chemical Safety', ppe: 'PPE',
  emergency: 'Emergency Response', housekeeping: 'Housekeeping', environment: 'Environment',
  permit_to_work: 'Permit to Work', risk_assessment: 'Risk Assessment', incident_review: 'Incident Review', other: 'Other',
};

export const Tbt: React.FC = () => {
  const { tbtList } = useDataContext();
  const { can } = useAppContext();
  const { setIsTbtCreationModalOpen, setSelectedTbt } = useModalContext();
  const [search, setSearch] = useState('');
  const [topicFilter, setTopic] = useState('all');

  const filtered = useMemo(() => tbtList.filter(t => {
    const tm = topicFilter === 'all' || (t as any).topic_category === topicFilter;
    const se = !search || (t.title || '').toLowerCase().includes(search.toLowerCase()) || t.conducted_by?.name?.toLowerCase().includes(search.toLowerCase());
    return tm && se;
  }), [tbtList, topicFilter, search]);

  const stats = useMemo(() => ({
    total:     tbtList.length,
    thisWeek:  tbtList.filter(t => new Date(t.date) > new Date(Date.now() - 7 * 86400000)).length,
    attendees: tbtList.reduce((s, t) => s + (t.attendees?.length || 0), 0),
    topics:    new Set(tbtList.map(t => (t as any).topic_category).filter(Boolean)).size,
  }), [tbtList]);

  const topics = Object.entries(TOPIC_LABELS);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Toolbox Talks</h1>
          <p className="giq-page-subtitle mt-1">Daily safety briefings with digital attendance</p>
        </div>
        {can('create', 'reports') && (
          <button onClick={() => setIsTbtCreationModalOpen(true)} className="giq-btn-primary">
            <Plus className="w-4 h-4" />New Talk
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Talks',    value: stats.total,     color: '#3b82f6', icon: Megaphone },
          { label: 'This Week',      value: stats.thisWeek,  color: '#8b5cf6', icon: Calendar },
          { label: 'Total Attendees',value: stats.attendees, color: '#10b981', icon: Users },
          { label: 'Topic Areas',    value: stats.topics,    color: '#f59e0b', icon: CheckCircle },
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

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search talks..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTopic('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={topicFilter === 'all' ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            All Topics
          </button>
          {topics.slice(0, 6).map(([k, v]) => (
            <button key={k} onClick={() => setTopic(k)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={topicFilter === k ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(tbt => {
          const topic  = (tbt as any).topic_category || 'other';
          const color  = TOPIC_COLORS[topic] || '#6b7280';
          const label  = TOPIC_LABELS[topic] || 'Other';
          const signed = tbt.attendees?.filter((a: any) => a.signed)?.length || 0;
          const total  = tbt.attendees?.length || 0;
          return (
            <div key={tbt.id} onClick={() => setSelectedTbt(tbt)}
              className="giq-card p-4 cursor-pointer transition-all hover:-translate-y-0.5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15` }}>
                <Megaphone className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}15`, color }}>{label}</span>
                </div>
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{tbt.title}</p>
                <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tbt.conducted_by?.name && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{tbt.conducted_by.name}</span>}
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{signed}/{total} signed</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(tbt.date).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="giq-card py-16 text-center">
            <Megaphone className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No toolbox talks found</p>
          </div>
        )}
      </div>
    </div>
  );
};