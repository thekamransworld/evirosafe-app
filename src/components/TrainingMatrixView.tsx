import React from 'react';
import type { User, TrainingCourse, TrainingRecord } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react';

interface TrainingMatrixViewProps {
  users: User[];
  courses: TrainingCourse[];
  records: TrainingRecord[];
}

export const TrainingMatrixView: React.FC<TrainingMatrixViewProps> = ({ users, courses, records }) => {
  
  const getStatus = (userId: string, courseId: string) => {
    const record = records.find(r => r.user_id === userId && r.course_id === courseId);
    if (!record) return 'missing';
    
    // Check expiry
    const expiryDate = new Date(record.expires_at);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 30) return 'expiring';
    return 'valid';
  };

  const renderCell = (status: string) => {
    switch (status) {
      case 'valid':
        return <div className="flex justify-center"><CheckCircle className="w-5 h-5 text-green-500" /></div>;
      case 'expiring':
        return <div className="flex justify-center"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>;
      case 'expired':
        return <div className="flex justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>;
      default:
        return <div className="flex justify-center"><Minus className="w-4 h-4 text-gray-300" /></div>;
    }
  };

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 sticky left-0 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Employee Name
            </th>
            {courses.map(course => (
              <th key={course.id} className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                <div className="transform -rotate-45 h-20 w-24 flex items-end justify-center pb-2 translate-y-4">
                  <span className="block truncate w-32">{course.title}</span>
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
              Compliance
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map(user => {
            const userRecords = records.filter(r => r.user_id === user.id);
            const validCount = userRecords.filter(r => new Date(r.expires_at) > new Date()).length;
            const compliance = Math.round((validCount / courses.length) * 100);

            return (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center">
                    <img className="h-8 w-8 rounded-full mr-3" src={user.avatar_url || 'https://i.pravatar.cc/150'} alt="" />
                    <div>
                        <div className="font-bold">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                  </div>
                </td>
                {courses.map(course => (
                  <td key={course.id} className="px-2 py-3 whitespace-nowrap border-l dark:border-gray-800">
                    {renderCell(getStatus(user.id, course.id))}
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        compliance === 100 ? 'bg-green-100 text-green-800' :
                        compliance >= 70 ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {compliance}%
                    </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};