import React from 'react';
import { Card } from '../ui/Card';
import type { User, TrainingRecord } from '../../types';

interface CompetencyMatrixProps {
  users: User[];
  records: TrainingRecord[];
  requirements: any[];
}

export const CompetencyMatrix: React.FC<CompetencyMatrixProps> = ({ users, records }) => {
  const getUserStatus = (userId: string, courseIds: string[]) => {
    const userRecords = records.filter(r => r.user_id === userId && courseIds.includes(r.course_id));
    if (userRecords.length === 0) return 'missing';
    const hasExpired = userRecords.some(r => r.status === 'expired');
    if (hasExpired) return 'expired';
    const isExpiring = userRecords.some(r => r.status === 'expiring_soon');
    if (isExpiring) return 'warning';
    return 'valid';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'valid': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  return (
    <Card title="Workforce Competency Matrix" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-slate-900 z-10">Employee</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-center">HSE Induction</th>
              <th className="px-4 py-3 text-center">Work at Height</th>
              <th className="px-4 py-3 text-center">Confined Space</th>
              <th className="px-4 py-3 text-center">Electrical Safety</th>
              <th className="px-4 py-3 text-center">First Aid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-medium sticky left-0 bg-white dark:bg-slate-950 z-10">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar_url || 'https://i.pravatar.cc/150'} alt="" className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                {/* FIX: Safe role replacement */}
                <td className="px-4 py-3 text-gray-500">{(user.role || 'Unknown').replace('_', ' ')}</td>
                {['ind_001', 'wah_001', 'cs_001', 'elec_001', 'fa_001'].map(courseId => {
                   const status = getUserStatus(user.id, [courseId]);
                   return (
                     <td key={courseId} className="px-4 py-3 text-center">
                       <div className={`w-3 h-3 rounded-full mx-auto ${getStatusColor(status)}`} title={status} />
                     </td>
                   );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};