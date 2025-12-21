import React, { useState } from 'react';
import type { TrainingSession, User } from '../types';
import { Button } from './ui/Button';

interface SessionAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sessionId: string, attendance: TrainingSession['attendance']) => void;
  session: TrainingSession;
  users: User[];
}

export const SessionAttendanceModal: React.FC<SessionAttendanceModalProps> = ({ isOpen, onClose, onSubmit, session, users }) => {
  const [attendance, setAttendance] = useState<TrainingSession['attendance']>(() => {
    // Initialize attendance from session roster if empty
    if (session.attendance.length > 0) return session.attendance;
    return session.roster.map(userId => ({ user_id: userId, attended: false, score: undefined }));
  });

  const handleAttendanceChange = (userId: string, attended: boolean) => {
    setAttendance(prev => prev.map(att => att.user_id === userId ? { ...att, attended } : att));
  };

  const handleScoreChange = (userId: string, score: string) => {
    const newScore = parseInt(score, 10);
    setAttendance(prev => prev.map(att => att.user_id === userId ? { ...att, score: isNaN(newScore) ? undefined : newScore } : att));
  };
  
  const getUser = (userId: string) => users.find(u => u.id === userId);

  const handleSubmit = () => {
    onSubmit(session.id, attendance);
  };

  if (!isOpen) return null;
  const isCompleted = session.status === 'completed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Manage Session Attendance</h3>
          <p className="text-sm text-gray-500">Session ID: {session.id}</p>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
            <table className="min-w-full divide-y">
                <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Attended</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score (%)</th>
                </tr></thead>
                <tbody className="divide-y">
                    {attendance.map(att => {
                        const user = getUser(att.user_id);
                        if (!user) return null;
                        return (
                            <tr key={att.user_id}>
                                <td className="px-4 py-3 font-semibold text-sm">{user.name}</td>
                                <td className="px-4 py-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={att.attended}
                                        onChange={e => handleAttendanceChange(att.user_id, e.target.checked)}
                                        disabled={isCompleted}
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
                                        className="w-24 p-1 border rounded-md"
                                    />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {!isCompleted && <Button onClick={handleSubmit}>Finalize & Issue Certificates</Button>}
        </div>
      </div>
    </div>
  );
};