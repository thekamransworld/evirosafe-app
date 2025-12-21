import React, { useState, useMemo } from 'react';
import type { TrainingCourse, TrainingRecord, TrainingSession, User, Project } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { 
  Plus, Search, Filter, Calendar, Users, 
  GraduationCap, Award, Clock, CheckCircle, 
  AlertTriangle, BookOpen, ChevronRight, BarChart3 
} from 'lucide-react';

// === GEN 4 STYLES ===
const glassStyles = {
  card: "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/30 group relative",
  header: "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border-b border-white/10 p-6 sticky top-0 z-30",
  badge: "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
  filterBtn: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300"
};

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

type Tab = 'Courses' | 'Sessions' | 'Matrix';

const CourseCard: React.FC<{ 
  course: TrainingCourse; 
  onSchedule: (c: TrainingCourse) => void 
}> = ({ course, onSchedule }) => (
  <div className={glassStyles.card}>
    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
    <div className="p-5 pl-7">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className={`${glassStyles.badge} bg-slate-800 border-slate-700 text-slate-400`}>
          {course.category}
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-100 mb-2">{course.title}</h3>
      
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
        <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>Valid: {course.validity_months} Months</span>
        </div>
        <div className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Certified</span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs text-slate-600">Requires Assessment</span>
        <button 
          onClick={() => onSchedule(course)}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          SCHEDULE
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
);

const SessionRow: React.FC<{
  session: TrainingSession;
  courseTitle: string;
  trainerName: string;
  onManage: (s: TrainingSession) => void;
}> = ({ session, courseTitle, trainerName, onManage }) => {
  const isCompleted = session.status === 'completed';
  
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-slate-200 text-sm">{courseTitle}</h4>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
             <span>{new Date(session.scheduled_at).toLocaleString()}</span>
             <span>•</span>
             <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {session.roster.length} Enrolled</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
           <p className="text-xs text-slate-500 uppercase tracking-wider">Trainer</p>
           <p className="text-sm font-medium text-slate-300">{trainerName}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onManage(session)}>
            {isCompleted ? 'View Report' : 'Attendance'}
        </Button>
      </div>
    </div>
  );
};

export const Trainings: React.FC<TrainingsProps> = (props) => {
  const { courses, records, sessions, users, onManageCourses, onScheduleSession, onManageAttendance } = props;
  const { can } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Courses');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
      const totalRecords = records.length;
      const valid = records.filter(r => r.status === 'valid').length;
      const complianceRate = totalRecords > 0 ? Math.round((valid / totalRecords) * 100) : 0;
      return { totalRecords, valid, complianceRate };
  }, [records]);

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-purple-400" />
                Training & Competency
            </h1>
            <p className="text-slate-400 mt-1">Manage courses, schedules, and employee certifications.</p>
        </div>
        
        {can('create', 'training') && (
            <Button onClick={onManageCourses} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-900/20">
                <Plus className="w-5 h-5 mr-2" />
                Manage Courses
            </Button>
        )}
      </div>

      {/* STATS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Compliance Rate</p>
                      <p className="text-3xl font-black text-white mt-1">{stats.complianceRate}%</p>
                  </div>
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><BarChart3 className="w-6 h-6"/></div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 mt-4 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.complianceRate}%` }}></div>
              </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
               <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Active Courses</p>
                      <p className="text-3xl font-black text-white mt-1">{courses.length}</p>
                  </div>
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><BookOpen className="w-6 h-6"/></div>
              </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
               <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Scheduled Sessions</p>
                      <p className="text-3xl font-black text-white mt-1">{sessions.filter(s => s.status === 'scheduled').length}</p>
                  </div>
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Calendar className="w-6 h-6"/></div>
              </div>
          </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10 w-full lg:w-auto">
              {['Courses', 'Sessions', 'Matrix'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)}
                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                        activeTab === tab 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
          
          <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses or employees..." 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:border-purple-500/50 focus:outline-none placeholder:text-slate-600"
              />
          </div>
      </div>

      {/* CONTENT AREA */}
      <div className="animate-fade-in-up">
        {activeTab === 'Courses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map(course => (
                    <CourseCard key={course.id} course={course} onSchedule={onScheduleSession} />
                ))}
                {filteredCourses.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                        <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-400">No Courses Found</h3>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'Sessions' && (
            <div className="space-y-4">
                {sessions.map(session => (
                    <SessionRow 
                        key={session.id} 
                        session={session} 
                        courseTitle={courses.find(c => c.id === session.course_id)?.title || 'Unknown Course'}
                        trainerName={users.find(u => u.id === session.trainer_id)?.name || 'Unknown Trainer'}
                        onManage={onManageAttendance}
                    />
                ))}
                 {sessions.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                        <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-400">No Sessions Scheduled</h3>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'Matrix' && (
             <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40">
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-slate-950/50 text-slate-400 font-bold uppercase text-xs">
                             <tr>
                                 <th className="px-6 py-4">Employee</th>
                                 {courses.map(c => <th key={c.id} className="px-6 py-4 whitespace-nowrap">{c.title}</th>)}
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                             {users.slice(0, 10).map(user => (
                                 <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                     <td className="px-6 py-4 font-medium text-slate-200">{user.name}</td>
                                     {courses.map(course => {
                                         const record = records.find(r => r.user_id === user.id && r.course_id === course.id);
                                         return (
                                             <td key={course.id} className="px-6 py-4">
                                                 {record ? (
                                                     record.status === 'valid' 
                                                     ? <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">VALID</span>
                                                     : <span className="inline-flex items-center px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">EXPIRED</span>
                                                 ) : (
                                                     <span className="text-slate-700 text-xs">-</span>
                                                 )}
                                             </td>
                                         )
                                     })}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};