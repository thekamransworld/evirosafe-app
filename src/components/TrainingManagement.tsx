import React, { useState } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { TrainingMatrixView } from './TrainingMatrixView';
import { TrainingAnalytics } from './TrainingAnalytics';
// FIX: Swapped Heroicons for Lucide React (already installed)
import { 
    GraduationCap, Calendar, Users, 
    BarChart3, Table, Plus 
} from 'lucide-react';

// Import Modals
import { TrainingCourseModal } from './TrainingCourseModal';
import { TrainingSessionModal } from './TrainingSessionModal';
import { SessionAttendanceModal } from './SessionAttendanceModal';

interface TrainingManagementProps {
  courses: TrainingCourse[];
  records: TrainingRecord[];
  sessions: TrainingSession[];
  users: User[];
  projects: Project[];
  onManageCourses: () => void;
  onScheduleSession: (course: TrainingCourse) => void;
  onManageAttendance: (session: TrainingSession) => void;
}

export const EnhancedTrainings: React.FC<TrainingManagementProps> = (props) => {
  const { courses, records, sessions, users, projects, onManageCourses, onScheduleSession, onManageAttendance } = props;
  const { can } = useAppContext();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Matrix' | 'Sessions' | 'Courses'>('Overview');

  const stats = {
      totalCourses: courses.length,
      activeSessions: sessions.filter(s => s.status === 'scheduled').length,
      certifiedUsers: new Set(records.map(r => r.user_id)).size,
      complianceRate: 92 // Mock for now
  };

  const getCourseTitle = (id: string) => courses.find(c => c.id === id)?.title || 'Unknown';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Training Academy</h1>
          <p className="text-text-secondary dark:text-gray-400">Manage competency, schedule sessions, and track compliance.</p>
        </div>
        <div className="flex gap-2">
            {can('create', 'training') && (
                <>
                    <Button onClick={onManageCourses} variant="outline">
                        <GraduationCap className="w-5 h-5 mr-2" /> Manage Courses
                    </Button>
                    <Button onClick={() => courses.length > 0 && onScheduleSession(courses[0])}>
                        <Plus className="w-5 h-5 mr-2" /> Schedule Session
                    </Button>
                </>
            )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><GraduationCap className="w-6 h-6"/></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</p><p className="text-xs text-gray-500">Active Courses</p></div>
          </div>
           <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Calendar className="w-6 h-6"/></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSessions}</p><p className="text-xs text-gray-500">Upcoming Sessions</p></div>
          </div>
           <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Users className="w-6 h-6"/></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.certifiedUsers}</p><p className="text-xs text-gray-500">Trained Personnel</p></div>
          </div>
           <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><BarChart3 className="w-6 h-6"/></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.complianceRate}%</p><p className="text-xs text-gray-500">Compliance Rate</p></div>
          </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6">
            {['Overview', 'Matrix', 'Sessions', 'Courses'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`
                        py-4 px-1 border-b-2 font-medium text-sm flex items-center
                        ${activeTab === tab 
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                    {tab === 'Overview' && <BarChart3 className="w-4 h-4 mr-2"/>}
                    {tab === 'Matrix' && <Table className="w-4 h-4 mr-2"/>}
                    {tab}
                </button>
            ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
          {activeTab === 'Overview' && (
              <TrainingAnalytics records={records} courses={courses} />
          )}

          {activeTab === 'Matrix' && (
              <TrainingMatrixView users={users} courses={courses} records={records} />
          )}

          {activeTab === 'Sessions' && (
             <Card title="Scheduled Sessions">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trainer</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {sessions.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{getCourseTitle(s.course_id)}</td>
                                <td className="px-6 py-4 text-gray-500">{new Date(s.scheduled_at).toLocaleString()}</td>
                                <td className="px-6 py-4 text-gray-500">{getUserName(s.trainer_id)}</td>
                                <td className="px-6 py-4">
                                    <Badge color={s.status === 'completed' ? 'green' : 'blue'}>{s.status}</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Button size="sm" variant="ghost" onClick={() => onManageAttendance(s)}>
                                        {s.status === 'scheduled' ? 'Mark Attendance' : 'View Report'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </Card>
          )}

          {activeTab === 'Courses' && (
               <Card title="Course Catalog">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(c => (
                        <div key={c.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{c.title}</h3>
                            <Badge color="purple" size="sm">{c.category}</Badge>
                            <p className="text-xs text-gray-500 mt-3 mb-4 line-clamp-2">{c.syllabus.substring(0, 100)}...</p>
                            <div className="flex justify-between items-center text-xs text-gray-400 border-t dark:border-gray-700 pt-3">
                                <span>Valid: {c.validity_months} months</span>
                                <Button size="sm" variant="ghost" onClick={() => onScheduleSession(c)}>Schedule</Button>
                            </div>
                        </div>
                    ))}
                </div>
               </Card>
          )}
      </div>
    </div>
  );
};