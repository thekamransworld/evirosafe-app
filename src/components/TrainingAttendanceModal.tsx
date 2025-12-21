import React, { useState } from 'react';
import { Button } from './ui/Button';
import type { TrainingSession, User } from '../types';

interface TrainingAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sessionId: string, attendance: TrainingSession['attendance']) => void;
  session: TrainingSession;
  users: User[];
}

export const TrainingAttendanceModal: React.FC<TrainingAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  session,
  users
}) => {
  // Initialize state with existing attendance or default to false
  const [attendance, setAttendance] = useState<TrainingSession['attendance']>(() => {
    // If we have previous attendance data, use it
    if (session.attendance && session.attendance.length > 0) {
        return session.attendance;
    }
    // Otherwise create default entries for everyone in the roster
    if (session.roster) {
        return session.roster.map(uid => ({ user_id: uid, attended: false, score: undefined }));
    }
    return [];
  });

  const handleToggle = (userId: string) => {
    setAttendance(prev => prev.map(a => 
        a.user_id === userId ? { ...a, attended: !a.attended } : a
    ));
  };

  const handleScoreChange = (userId: string, val: string) => {
    const score = parseInt(val);
    setAttendance(prev => prev.map(a => 
        a.user_id === userId ? { ...a, score: isNaN(score) ? undefined : score } : a
    ));
  };

  const handleSubmit = () => {
    onSubmit(session.id, attendance);
    onClose();
  };

  if (!isOpen) return null;

  // Get user objects for the roster IDs
  const enrolledUsers = session.roster 
    ? session.roster.map(id => users.find(u => u.id === id)).filter(Boolean) as User[]
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-700 bg-white dark:bg-dark-card shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mark Attendance</h3>
          <p className="text-sm text-gray-500 mt-1">Session ID: {session.id}</p>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {enrolledUsers.length > 0 ? (
            <div className="space-y-3">
              {enrolledUsers.map(user => {
                const record = attendance.find(a => a.user_id === user.id);
                const isAttended = record?.attended;
                
                return (
                    <div key={user.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isAttended ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-white border-gray-200 dark:bg-dark-background dark:border-gray-700'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isAttended ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {user.name.charAt(0)}
                        </div>
                        <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isAttended && (
                             <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 font-medium">Score:</label>
                                <input 
                                    type="number" 
                                    min="0" max="100" 
                                    className="w-16 p-1 text-sm border rounded text-center dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                    value={record?.score ?? ''}
                                    onChange={(e) => handleScoreChange(user.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="%"
                                />
                             </div>
                        )}
                        <button 
                            onClick={() => handleToggle(user.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isAttended ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                        >
                            {isAttended ? 'Present' : 'Absent'}
                        </button>
                    </div>
                    </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No employees are enrolled in this session.</p>
                <p className="text-xs mt-1">Edit the session to add attendees.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-dark-background/50 shrink-0 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Attendance</Button>
        </div>
      </div>
    </div>
  );
};