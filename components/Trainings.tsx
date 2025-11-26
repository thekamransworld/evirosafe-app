
import React, { useState, useMemo } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';

interface TrainingsProps {
  courses: TrainingCourse[];
  records: TrainingRecord[];
  sessions: TrainingSession[];
  users: User[];
  projects: Project[];
  onManageCourses: () => void;
  onScheduleSession: (course: TrainingCourse) => void;
  onManageAttendance: (session: TrainingSession) => void;
}

type Tab = 'Courses' | 'Sessions' | 'Training Matrix';

export const Trainings: React.FC<TrainingsProps> = (props) => {
  const { courses, records, sessions, users, projects, onManageCourses, onScheduleSession, onManageAttendance } = props;
  const { can } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Courses');

  const getCourseTitle = (courseId: string) => courses.find(c => c.id === courseId)?.title || 'Unknown';
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';
  
  const getSessionStatusColor = (status: TrainingSession['status']): 'green' | 'blue' | 'gray' => {
      switch(status) {
          case 'completed': return 'green';
          case 'scheduled': return 'blue';
          case 'cancelled': return 'gray';
      }
  };
  
  const getRecordStatusColor = (status: TrainingRecord['status']): 'green' | 'yellow' | 'red' => {
    switch(status) {
        case 'valid': return 'green';
        case 'expiring_soon': return 'yellow';
        case 'expired': return 'red';
    }
  };

  const TabButton: React.FC<{ tab: Tab }> = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${
        activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab}
    </button>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Training Management</h1>
         {can('create', 'training') && (
            <div className="space-x-2">
                <Button onClick={onManageCourses}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New / Manage Courses
                </Button>
            </div>
         )}
      </div>
      
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-4">
            <TabButton tab="Courses" />
            <TabButton tab="Sessions" />
            <TabButton tab="Training Matrix" />
        </nav>
      </div>

      {activeTab === 'Courses' && (
        <Card title="Course Library">
            <table className="min-w-full divide-y">
                <thead><tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y">
                    {courses.map(course => (
                        <tr key={course.id}>
                            <td className="px-4 py-3 font-semibold">{course.title}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{course.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{course.validity_months} months</td>
                            <td className="px-4 py-3 text-right">
                                {can('create', 'training') && <Button size="sm" onClick={() => onScheduleSession(course)}>Schedule Session</Button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
      )}

      {activeTab === 'Sessions' && (
        <Card title="Training Sessions">
           <table className="min-w-full divide-y">
                <thead><tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trainer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y">
                    {sessions.map(session => (
                        <tr key={session.id}>
                            <td className="px-4 py-3 font-semibold">{getCourseTitle(session.course_id)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(session.scheduled_at).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{getUserName(session.trainer_id)}</td>
                            <td className="px-4 py-3"><Badge color={getSessionStatusColor(session.status)}>{session.status}</Badge></td>
                            <td className="px-4 py-3 text-right">
                                {can('update', 'training') && (
                                    <Button size="sm" onClick={() => onManageAttendance(session)}>
                                        {session.status === 'scheduled' ? 'Mark Attendance' : 'View Record'}
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
      )}
      
      {activeTab === 'Training Matrix' && (
        <Card title="Training Compliance Matrix">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires On</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => {
                        const user = users.find(u => u.id === record.user_id);
                        if (!user) return null;
                        return (
                            <tr key={record.id}>
                                <td className="px-6 py-4"><div className="font-medium text-gray-900">{user.name}</div></td>
                                <td className="px-6 py-4">{getCourseTitle(record.course_id)}</td>
                                <td className="px-6 py-4">{new Date(record.expires_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4"><Badge color={getRecordStatusColor(record.status)}>{record.status.replace('_', ' ')}</Badge></td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>
        </Card>
      )}
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
