import React, { useState, useMemo } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, Project, User } from '../types';
import { useAppContext } from '../contexts';
import { Plus, BookOpen, Award, Clock, Users, ChevronRight, Calendar, AlertTriangle, CheckCircle, Search } from 'lucide-react';

interface TrainingsProps {
  courses:               TrainingCourse[];
  records:               TrainingRecord[];
  sessions:              TrainingSession[];
  users:                 User[];
  projects:              Project[];
  onManageCourses:       () => void;
  onScheduleSession:     (course: TrainingCourse) => void;
  onManageAttendance:    (session: TrainingSession) => void;
}

const SESSION_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const daysLeft = (d: string | null | undefined) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

export const Trainings: React.FC<TrainingsProps> = ({
  courses, records, sessions, users, projects, onManageCourses, onScheduleSession, onManageAttendance,
}) => {
  const { can } = useAppContext();
  const [tab, setTab]       = useState<'courses' | 'sessions' | 'records'>('courses');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    courses:    courses.length,
    sessions:   sessions.filter(s => s.status === 'scheduled').length,
    expiring:   records.filter(r => { const d = daysLeft(r.expires_at); return d !== null && d >= 0 && d <= 30; }).length,
    expired:    records.filter(r => { const d = daysLeft(r.expires_at); return d !== null && d < 0; }).length,
  }), [courses, sessions, records]);

  const filteredCourses  = useMemo(() => courses.filter(c => !search || (c.title ?? '').toLowerCase().includes(search.toLowerCase())), [courses, search]);
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!search) return true;
      const course = courses.find(c => c.id === s.course_id);
      return (course?.title ?? '').toLowerCase().includes(search.toLowerCase());
    });
  }, [sessions, search, courses]);
  const filteredRecords  = useMemo(() => records.filter(r => {
    if (!search) return true;
    const u = users.find(u => u.id === r.user_id);
    return (u?.name ?? '').toLowerCase().includes(search.toLowerCase());
  }), [records, search, users]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Training</h1>
          <p className="giq-page-subtitle mt-1">Courses, sessions and competency records</p>
        </div>
        {can('create', 'reports') && (
          <button onClick={onManageCourses} className="giq-btn-primary">
            <Plus className="w-4 h-4" />Manage Courses
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Courses',        value: stats.courses,  color: '#3b82f6', icon: BookOpen },
          { label: 'Upcoming Sessions',value: stats.sessions,color: '#8b5cf6', icon: Calendar },
          { label: 'Expiring ≤30d',  value: stats.expiring, color: '#f59e0b', icon: Clock },
          { label: 'Expired',        value: stats.expired,  color: '#ef4444', icon: AlertTriangle },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {(['courses','sessions','records'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={tab === t ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Courses */}
      {tab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map(course => (
            <div key={course.id} className="giq-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <BookOpen className="w-4 h-4" style={{ color: '#3b82f6' }} />
                </div>
                {course.validity_months > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    {course.validity_months}mo validity
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{course.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{course.category}</p>
              </div>
              <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {sessions.filter(s => s.course_id === course.id).length} sessions
                </span>
                {can('create', 'reports') && (
                  <button onClick={() => onScheduleSession(course)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    Schedule
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredCourses.length === 0 && (
            <div className="col-span-3 giq-card py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No courses found</p>
            </div>
          )}
        </div>
      )}

      {/* Sessions */}
      {tab === 'sessions' && (
        <div className="space-y-3">
          {filteredSessions.map(session => {
            const sCfg = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled;
            const enrolled = session.attendance?.length || 0;
            const sessCourse = courses.find(c => c.id === session.course_id);
            return (
              <div key={session.id} className="giq-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: sCfg.bg }}>
                  <Calendar className="w-5 h-5" style={{ color: sCfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sessCourse?.title || 'Training Session'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString() : 'TBD'}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolled} enrolled</span>
                  </div>
                </div>
                {can('create', 'reports') && session.status !== 'cancelled' && (
                  <button onClick={() => onManageAttendance(session)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    Attendance
                  </button>
                )}
              </div>
            );
          })}
          {filteredSessions.length === 0 && (
            <div className="giq-card py-12 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No sessions found</p>
            </div>
          )}
        </div>
      )}

      {/* Records */}
      {tab === 'records' && (
        <div className="space-y-2">
          {filteredRecords.map(record => {
            const days     = daysLeft(record.expires_at);
            const isExpired = days !== null && days < 0;
            const isExpiring = days !== null && days >= 0 && days <= 30;
            const recUser  = users.find(u => u.id === record.user_id);
            const recCourse = courses.find(c => c.id === record.course_id);
            return (
              <div key={record.id} className="giq-card p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#10b981' }}>
                  {(recUser?.name || 'U').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{recUser?.name || 'Unknown'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{recCourse?.title || record.course_id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {isExpired ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Expired</span>
                  ) : isExpiring ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{days}d left</span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Current</span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="giq-card py-12 text-center">
              <Award className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No training records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};