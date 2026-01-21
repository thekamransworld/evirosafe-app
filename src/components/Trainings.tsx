import React, { useState } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { CompetencyMatrix } from './training/CompetencyMatrix';
import { TrainingAnalytics } from './TrainingAnalytics'; // Fixed import path
import { Plus } from 'lucide-react';

// Removed props, using context
export const Trainings: React.FC = () => {
  const { trainingCourseList, trainingRecordList, trainingSessionList } = useDataContext();
  const { usersList, can } = useAppContext();
  const { setCourseModalOpen, setSessionModalOpen, setAttendanceModalOpen, setCourseForSession, setSessionForAttendance } = useModalContext();
  
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Matrix' | 'Courses' | 'Sessions'>('Dashboard');

  const getCourseTitle = (courseId: string) => trainingCourseList.find(c => c.id === courseId)?.title || 'Unknown';
  const getUserName = (userId: string) => usersList.find(u => u.id === userId)?.name || 'Unknown';
  
  const getSessionStatusColor = (status: TrainingSession['status']): 'green' | 'blue' | 'gray' => {
      switch(status) {
          case 'completed': return 'green';
          case 'scheduled': return 'blue';
          case 'cancelled': return 'gray';
          default: return 'gray';
      }
  };

  const TabButton: React.FC<{ tab: string }> = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
        activeTab === tab 
        ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-white/5' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      {tab}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Training & Competency</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage workforce skills, certifications, and compliance.</p>
        </div>
         {can('create', 'training') && (
            <Button onClick={() => setCourseModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Manage Courses
            </Button>
         )}
      </div>
      
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-1">
            <TabButton tab="Dashboard" />
            <TabButton tab="Matrix" />
            <TabButton tab="Courses" />
            <TabButton tab="Sessions" />
        </nav>
      </div>

      {activeTab === 'Dashboard' && <TrainingAnalytics records={trainingRecordList} courses={trainingCourseList} />}
      {activeTab === 'Matrix' && <CompetencyMatrix users={usersList} records={trainingRecordList} requirements={[]} />}
      
      {activeTab === 'Courses' && (
        <Card>
            <div className="p-6">
                <h3 className="text-lg font-bold mb-4">Course Library</h3>
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Validity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {trainingCourseList.map(course => (
                            <tr key={course.id}>
                                <td className="px-4 py-3 font-semibold">{course.title}</td>
                                <td className="px-4 py-3"><Badge color="blue" size="sm">{course.category}</Badge></td>
                                <td className="px-4 py-3 text-sm text-slate-500">{course.validity_months} months</td>
                                <td className="px-4 py-3 text-right">
                                    {can('create', 'training') && <Button size="sm" variant="secondary" onClick={() => { setCourseForSession(course); setSessionModalOpen(true); }}>Schedule</Button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      )}

      {activeTab === 'Sessions' && (
        <Card>
           <div className="p-6">
               <h3 className="text-lg font-bold mb-4">Training Sessions</h3>
               <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trainer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {trainingSessionList.map(session => (
                            <tr key={session.id}>
                                <td className="px-4 py-3 font-semibold">{getCourseTitle(session.course_id)}</td>
                                <td className="px-4 py-3 text-sm text-slate-500">{new Date(session.scheduled_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm text-slate-500">{getUserName(session.trainer_id)}</td>
                                <td className="px-4 py-3"><Badge color={getSessionStatusColor(session.status)}>{session.status}</Badge></td>
                                <td className="px-4 py-3 text-right">
                                    {can('update', 'training') && (
                                        <Button size="sm" variant="ghost" onClick={() => { setSessionForAttendance(session); setAttendanceModalOpen(true); }}>
                                            {session.status === 'scheduled' ? 'Manage' : 'View'}
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
           </div>
        </Card>
      )}
    </div>
  );
};