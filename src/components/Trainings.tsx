import React, { useState, useMemo } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, Project, User } from '../types';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, BookOpen, Award, Clock, Users, ChevronRight, Calendar, AlertTriangle, CheckCircle, Search, Download, Link2, Loader2, Ban } from 'lucide-react';
import { useCertificateActions } from '../hooks/useCertificateActions';
import { planSessionCertificates } from '../lib/certificates';

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

// Same four-state classification the Records tab already uses (computed from
// expires_at, not the stored status field, so the two tabs never disagree).
type MatrixStatus = 'current' | 'expiring' | 'expired' | 'revoked' | 'not_started';

const MATRIX_STATUS_CFG: Record<MatrixStatus, { label: string; color: string }> = {
  current:     { label: 'Current',      color: '#10b981' },
  expiring:    { label: 'Expiring ≤30d',color: '#f59e0b' },
  expired:     { label: 'Expired',      color: '#ef4444' },
  revoked:     { label: 'Revoked',      color: '#b91c1c' },
  not_started: { label: 'Not started',  color: '#9ca3af' },
};

const ICON_BTN_CLASS = 'p-2 rounded-lg transition-colors disabled:opacity-40';
const ICON_BTN_STYLE: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)',
};

export const Trainings: React.FC<TrainingsProps> = ({
  courses, records, sessions, users, projects, onManageCourses, onScheduleSession, onManageAttendance,
}) => {
  const { can } = useAppContext();
  const certActions = useCertificateActions();
  const { handleIssueSessionCertificates } = useDataContext();
  const [issuingSessionId, setIssuingSessionId] = useState<string | null>(null);
  const [tab, setTab]       = useState<'courses' | 'sessions' | 'records' | 'matrix'>('courses');
  const [search, setSearch] = useState('');

  const { activeUser } = useAppContext();
  // Same project-restriction model as everywhere else: ADMIN/ORG_ADMIN see the
  // whole org's roster, everyone else only sees employees who share at least
  // one of their own assigned projects. Without this, a project-restricted
  // worker could see every other employee's name and certification status
  // company-wide through this page, even though every other module now
  // correctly hides other projects' data from them.
  const visibleUsers = useMemo(() => {
    if (!activeUser) return [];
    if (activeUser.role === 'ADMIN' || activeUser.role === 'ORG_ADMIN') return users;
    const myProjectIds = activeUser.project_ids || [];
    if (myProjectIds.length === 0) return [];
    return users.filter(u => (u.project_ids || []).some(p => myProjectIds.includes(p)));
  }, [users, activeUser]);

  const stats = useMemo(() => ({
    courses:    courses.length,
    sessions:   sessions.filter(s => s.status === 'scheduled').length,
    expiring:   records.filter(r => { if (r.revoked_at) return false; const d = daysLeft(r.expires_at); return d !== null && d >= 0 && d <= 30; }).length,
    expired:    records.filter(r => { if (r.revoked_at) return false; const d = daysLeft(r.expires_at); return d !== null && d < 0; }).length,
  }), [courses, sessions, records]);

  const filteredCourses  = useMemo(() => courses.filter(c => !search || (c.title ?? '').toLowerCase().includes(search.toLowerCase())), [courses, search]);
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!search) return true;
      const course = courses.find(c => c.id === s.course_id);
      return (course?.title ?? '').toLowerCase().includes(search.toLowerCase());
    });
  }, [sessions, search, courses]);
  const filteredRecords  = useMemo(() => {
    const visibleIds = new Set(visibleUsers.map(u => u.id));
    return records.filter(r => {
      if (!visibleIds.has(r.user_id)) return false;
      if (!search) return true;
      const u = visibleUsers.find(u => u.id === r.user_id);
      return (u?.name ?? '').toLowerCase().includes(search.toLowerCase());
    });
  }, [records, search, visibleUsers]);

  const filteredUsers = useMemo(() => visibleUsers.filter(u =>
    !search || (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  // Most recent record per (user, course) pair — a retake shouldn't leave an
  // old expired record shadowing a newer valid one.
  // A revoked certificate never counts as current compliance, so it's left out
  // here; if that was the person's only record for the course it shows as Revoked.
  const revokedKeys = useMemo(
    () => new Set(records.filter(r => r.revoked_at).map(r => `${r.user_id}::${r.course_id}`)),
    [records],
  );
  const latestRecordByUserCourse = useMemo(() => {
    const map = new Map<string, TrainingRecord>();
    for (const r of records) {
      if (r.revoked_at) continue;
      const key = `${r.user_id}::${r.course_id}`;
      const existing = map.get(key);
      if (!existing || new Date(r.issued_at).getTime() > new Date(existing.issued_at).getTime()) {
        map.set(key, r);
      }
    }
    return map;
  }, [records]);

  // How many attendees of a COMPLETED session earned a certificate but don't
  // have one yet (e.g. the session was closed before certificates existed).
  const pendingCertificates = (session: TrainingSession): number => {
    if (session.status !== 'completed') return 0;
    const course = courses.find(c => c.id === session.course_id);
    if (!course) return 0;
    return planSessionCertificates({
      session, attendance: session.attendance ?? [], course, users,
      orgId: '', orgName: '', existingRecords: records,
    }).issue.length;
  };

  const issueForSession = async (sessionId: string) => {
    setIssuingSessionId(sessionId);
    try { await handleIssueSessionCertificates(sessionId); } finally { setIssuingSessionId(null); }
  };

  const getMatrixStatus = (userId: string, courseId: string): MatrixStatus => {
    const key = `${userId}::${courseId}`;
    const record = latestRecordByUserCourse.get(key);
    if (!record) return revokedKeys.has(key) ? 'revoked' : 'not_started';
    const days = daysLeft(record.expires_at);
    if (days !== null && days < 0) return 'expired';
    if (days !== null && days <= 30) return 'expiring';
    return 'current';
  };

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
          {(['courses','sessions','records','matrix'] as const).map(t => (
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
                {certActions.canManage && pendingCertificates(session) > 0 && (
                  <button onClick={() => issueForSession(session.id)}
                    disabled={issuingSessionId === session.id}
                    title="Issue verifiable certificates to attendees who earned one but don't have one yet"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-60"
                    style={{ ...ICON_BTN_STYLE, color: 'var(--text-primary)' }}>
                    {issuingSessionId === session.id ? 'Issuing…' : `Issue certificates (${pendingCertificates(session)})`}
                  </button>
                )}
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
            const isRevoked = !!record.revoked_at;
            const isExpired = !isRevoked && days !== null && days < 0;
            const isExpiring = !isRevoked && days !== null && days >= 0 && days <= 30;
            const recUser  = visibleUsers.find(u => u.id === record.user_id);
            const recCourse = courses.find(c => c.id === record.course_id);
            const busy = certActions.busyId === record.id;
            return (
              <div key={record.id} className="giq-card p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#10b981' }}>
                  {(recUser?.name || 'U').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{recUser?.name || 'Unknown'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {recCourse?.title || record.course_id}
                    {record.certificate_no && <span className="font-mono"> · {record.certificate_no}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isRevoked ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(185,28,28,0.1)', color: '#b91c1c' }}>Revoked</span>
                  ) : isExpired ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Expired</span>
                  ) : isExpiring ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{days}d left</span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Current</span>
                  )}
                  {record.verification_code ? (
                    <>
                      <button
                        onClick={() => certActions.download(record)}
                        disabled={busy || isRevoked}
                        title="Download certificate (PDF)"
                        aria-label="Download certificate (PDF)"
                        className={ICON_BTN_CLASS}
                        style={ICON_BTN_STYLE}
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => certActions.copyLink(record)}
                        title="Copy verification link"
                        aria-label="Copy verification link"
                        className={ICON_BTN_CLASS}
                        style={ICON_BTN_STYLE}
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      {certActions.canManage && !isRevoked && (
                        <button
                          onClick={() => certActions.revoke(record)}
                          disabled={busy}
                          title="Revoke certificate"
                          aria-label="Revoke certificate"
                          className={ICON_BTN_CLASS}
                          style={{ ...ICON_BTN_STYLE, color: '#b91c1c' }}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : certActions.canManage ? (
                    <button
                      onClick={() => certActions.issue(record)}
                      disabled={busy}
                      title="Create a verifiable certificate (QR code + verification page) for this record"
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                      style={ICON_BTN_STYLE}
                    >
                      {busy ? 'Issuing…' : 'Issue certificate'}
                    </button>
                  ) : null}
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
      {/* Matrix — worker x course compliance grid. Columns are every course
          in this org's catalog; there's no "applies to this role" concept in
          the data model yet, so a course a worker was never meant to take
          will show as "Not started" like any other gap. Worth a role-based
          requirements list later if that noise becomes a problem. */}
      {tab === 'matrix' && (
        <div className="giq-card overflow-hidden">
          {courses.length === 0 ? (
            <div className="py-12 text-center">
              <Award className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No courses to show in the matrix yet</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-4 pt-4 pb-2 flex-wrap">
                {(Object.entries(MATRIX_STATUS_CFG) as [MatrixStatus, typeof MATRIX_STATUS_CFG[MatrixStatus]][]).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: cfg.color }} />
                    {cfg.label}
                  </span>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <th className="px-4 py-3 text-left sticky left-0 z-10" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Employee
                      </th>
                      {courses.map(course => (
                        <th key={course.id} className="px-3 py-3 text-center font-medium" style={{ color: 'var(--text-muted)', minWidth: '110px' }}>
                          {course.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ background: 'var(--bg-card)' }}>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.role}</p>
                        </td>
                        {courses.map(course => {
                          const status = getMatrixStatus(user.id, course.id);
                          const cfg = MATRIX_STATUS_CFG[status];
                          return (
                            <td key={course.id} className="px-3 py-3 text-center">
                              <span
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ background: cfg.color }}
                                title={`${course.title}: ${cfg.label}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="py-12 text-center">
                  <p style={{ color: 'var(--text-secondary)' }}>No employees match your search</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};