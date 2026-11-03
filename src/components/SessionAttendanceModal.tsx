import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { TrainingSession, User } from '../types';
import { Button } from './ui/Button';
import { DEFAULT_PASS_MARK, cleanAttendance } from '../lib/certificates';

type Attendance = TrainingSession['attendance'];

interface SessionAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Finalise: closes the session and issues certificates. */
  onSubmit: (sessionId: string, attendance: Attendance) => void;
  /** Save the attendee list without finalising. */
  onSave?: (sessionId: string, attendance: Attendance) => void;
  session: TrainingSession;
  users: User[];
}

// Sessions saved by older versions have no `attendance` (and sometimes no
// `roster`), which used to crash this dialog the moment it opened.
const initialAttendance = (session: TrainingSession): Attendance => {
  const saved = session.attendance ?? [];
  if (saved.length > 0) return saved;
  return (session.roster ?? []).map(userId => ({ user_id: userId, attended: false }));
};

export const SessionAttendanceModal: React.FC<SessionAttendanceModalProps> = ({ isOpen, onClose, onSubmit, onSave, session, users }) => {
  const [attendance, setAttendance] = useState<Attendance>(() => initialAttendance(session));
  const [query, setQuery] = useState('');

  // This component stays mounted while closed, so its state outlives each
  // opening. Without this reset, opening a different session showed the previous
  // session's attendees, and finalising would have certified the wrong people.
  useEffect(() => {
    if (isOpen) {
      setAttendance(initialAttendance(session));
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session.id]);

  const isCompleted = session.status === 'completed';

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const onList = new Set(attendance.map(a => a.user_id));
    return users
      .filter(u => !onList.has(u.id) && u.status !== 'inactive')
      .filter(u => u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, users, attendance]);

  const getUser = (userId: string) => users.find(u => u.id === userId);

  const addPerson = (userId: string) => {
    // Someone you add here is normally someone who was in the room.
    setAttendance(prev => [...prev, { user_id: userId, attended: true }]);
    setQuery('');
  };

  const removePerson = (userId: string) => setAttendance(prev => prev.filter(a => a.user_id !== userId));

  const handleAttendanceChange = (userId: string, attended: boolean) => {
    setAttendance(prev => prev.map(att => att.user_id === userId ? { ...att, attended } : att));
  };

  const handleScoreChange = (userId: string, score: string) => {
    const newScore = parseInt(score, 10);
    setAttendance(prev => prev.map(att => {
      if (att.user_id !== userId) return att;
      const { score: _old, ...rest } = att;
      return isNaN(newScore) ? rest : { ...rest, score: Math.max(0, Math.min(100, newScore)) };
    }));
  };

  const handleSave = () => {
    onSave?.(session.id, cleanAttendance(attendance));
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(session.id, cleanAttendance(attendance));
    // Close right away: finalising issues certificates in the background and
    // reports the outcome by toast. Leaving the dialog open invited a second
    // click while issuance was still running.
    onClose();
  };

  if (!isOpen) return null;

  const attendedCount = attendance.filter(a => a.attended).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Session Attendance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isCompleted ? 'This session is finalised.' : `${attendance.length} on the list, ${attendedCount} marked as attended`}
          </p>
        </div>

        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {!isCompleted && (
            <div className="relative">
              <label htmlFor="attendee-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add an attendee</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="attendee-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search employees by name or email"
                  autoComplete="off"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md dark:bg-slate-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              {query.trim() && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:bg-slate-800 dark:border-gray-700">
                  {candidates.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching employees</p>
                  ) : candidates.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addPerson(u.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <span className="font-semibold">{u.name}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {attendance.length === 0 ? (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
              {isCompleted ? 'No attendees were recorded for this session.' : 'No one on the list yet. Search for an employee above to add them.'}
            </p>
          ) : (
            <table className="min-w-full divide-y dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-slate-800/60"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Attended</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score (%)</th>
                {!isCompleted && <th className="w-10" />}
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-800">
                {attendance.map(att => {
                  const user = getUser(att.user_id);
                  if (!user) return null;
                  return (
                    <tr key={att.user_id}>
                      <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white">{user.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={att.attended}
                          onChange={e => handleAttendanceChange(att.user_id, e.target.checked)}
                          disabled={isCompleted}
                          aria-label={`${user.name} attended`}
                          className="h-5 w-5 rounded text-primary-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0" max="100"
                          value={att.score ?? ''}
                          onChange={e => handleScoreChange(att.user_id, e.target.value)}
                          disabled={isCompleted}
                          aria-label={`${user.name} score`}
                          className="w-24 p-1 border rounded-md dark:bg-slate-800 dark:border-gray-700 dark:text-white"
                        />
                      </td>
                      {!isCompleted && (
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removePerson(att.user_id)}
                            title="Remove from this session"
                            aria-label={`Remove ${user.name}`}
                            className="p-1 rounded text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!isCompleted && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only people marked as attended receive a certificate. If the course has an assessment, a score of {DEFAULT_PASS_MARK}% or more is also required.
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-b-lg px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>{isCompleted ? 'Close' : 'Cancel'}</Button>
          {!isCompleted && onSave && <Button variant="secondary" onClick={handleSave}>Save</Button>}
          {!isCompleted && <Button onClick={handleSubmit}>Finalize & Issue Certificates</Button>}
        </div>
      </div>
    </div>
  );
};
