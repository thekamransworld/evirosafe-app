import React, { useState, useMemo } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext } from '../contexts';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  ArrowLeft, AlertTriangle, FileText, 
  Users, Shield, MapPin, TrendingUp, TrendingDown, 
  BarChart3, Activity as ActivityIcon, ShieldAlert, 
  Download, Share2, Printer, Thermometer, Droplets, Wind, CloudLightning,
  MessageSquare, Eye, Plus, List
} from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// --- Activity Feed Item ---
interface ActivityItem {
    id: string;
    type: 'report' | 'inspection' | 'ptw' | 'rams' | 'equipment' | 'training' | 'message' | 'incident' | 'milestone';
    title: string;
    description: string;
    user: User;
    timestamp: string;
    data: any;
    status?: string;
    priority?: 'low' | 'medium' | 'high';
}

const ActivityFeedItem: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
    // ... (Keep existing implementation or simplistic version for brevity)
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
             <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {activity.user?.name?.charAt(0) || '?'}
                </div>
            </div>
            <div>
                <p className="text-white font-medium">{activity.title}</p>
                <p className="text-slate-400 text-sm">{activity.description}</p>
            </div>
        </div>
    );
};

// --- Team Member Card ---
const TeamMemberCard: React.FC<{ user: User; activities: ActivityItem[] }> = ({ user, activities }) => {
    const userActivities = activities.filter(a => a.user.id === user.id);
    const recentActivity = userActivities[0];
    
    // SAFE GUARD: Check if role exists
    const roleLabel = user.role ? user.role.replace('_', ' ') : 'Unknown Role';

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900"></div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white">{user.name}</h4>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <Badge color="blue" size="sm">
                            {roleLabel}
                        </Badge>
                    </div>
                </div>
            </div>
            {/* ... rest of card ... */}
        </div>
    );
};

// --- Stat Box ---
const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; change?: number; trend?: 'up' | 'down' }> = ({ label, value, icon, color, change, trend }) => (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
        <div>
            <p className="text-slate-400 text-xs uppercase font-semibold tracking-wide mb-2">{label}</p>
            <p className="text-3xl font-black text-white mb-1">{value}</p>
        </div>
        <div className={`p-4 rounded-xl bg-white/5 ${color}`}>{icon}</div>
    </div>
);

const DashboardWidget: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">{title}</h3>
        <div className="flex-1">{children}</div>
    </div>
);

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack, onEdit }) => {
  const { 
    reportList, 
    ptwList, 
    inspectionList, 
    ramsList, 
    trainingSessionList, 
    tbtList
  } = useDataContext();
  
  const { usersList } = useAppContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const [teamView, setTeamView] = useState<'grid' | 'list'>('grid');

  // Filter Data
  const projectReports = useMemo(() => reportList.filter(r => r.project_id === project.id), [reportList, project.id]);
  const projectPtws = useMemo(() => ptwList.filter(p => p.project_id === project.id), [ptwList, project.id]);
  const projectInspections = useMemo(() => inspectionList.filter(i => i.project_id === project.id), [inspectionList, project.id]);
  
  // Get project team members
  const projectTeam = useMemo(() => {
    return usersList.filter(u => 
      u.org_id === project.org_id && 
      (u.role === 'ADMIN' || u.role === 'ORG_ADMIN' || u.role === 'HSE_MANAGER' || u.role === 'SUPERVISOR' || u.role === 'INSPECTOR')
    );
  }, [usersList, project.org_id]);

  // Mock activity feed for display
  const activityFeed: ActivityItem[] = []; // Populate if needed

  const stats = {
      teamSize: projectTeam.length,
      totalActivities: 120, // Mock
      openReports: projectReports.filter(r => r.status !== 'closed').length,
      activePtws: projectPtws.filter(p => p.status === 'ACTIVE').length,
      safetyScore: 92,
      activityByType: { reports: projectReports.length, inspections: projectInspections.length }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-gradient-to-b from-slate-950 to-slate-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />} className="bg-white/5 hover:bg-white/10 border-white/10">Back</Button>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl border-4 border-white/20">
                {project.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                  <Badge color={project.status === 'active' ? 'green' : 'yellow'}>{(project.status || 'Unknown').toUpperCase()}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm">
                  <span className="font-mono bg-white/10 px-3 py-1 rounded-lg text-xs">{project.code || 'PRJ-001'}</span>
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {project.location}</span>
                  <span className="flex items-center gap-2"><Users className="w-4 h-4"/> {stats.teamSize} members</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => window.print()} className="border-white/10 text-white hover:bg-white/10"><Printer className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden px-6 py-3">
        <nav className="flex space-x-8">
          {['Overview', 'Team', 'Activities'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`relative py-3 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === tab ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500"></span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Team Members" value={stats.teamSize} icon={<Users className="w-6 h-6" />} color="text-blue-500" change={8} trend="up" />
                <StatBox label="Total Activities" value={stats.totalActivities} icon={<ActivityIcon className="w-6 h-6" />} color="text-purple-500" change={15} trend="up" />
                <StatBox label="Open Issues" value={stats.openReports} icon={<AlertTriangle className="w-6 h-6" />} color="text-red-500" change={2} trend="up" />
                <StatBox label="Safety Score" value={`${stats.safetyScore}%`} icon={<ShieldAlert className="w-6 h-6" />} color="text-amber-500" change={3} trend="up" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardWidget title="Incident Trend">
                    <div className="h-72 flex items-center justify-center text-slate-500">
                        Chart Placeholder
                    </div>
                </DashboardWidget>
                <DashboardWidget title="Environmental Monitoring">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Temp</span><Thermometer className="w-5 h-5 text-blue-400"/></div><p className="text-2xl font-bold text-white">32°C</p></div>
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Humidity</span><Droplets className="w-5 h-5 text-cyan-400"/></div><p className="text-2xl font-bold text-white">65%</p></div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Air Quality</span><Wind className="w-5 h-5 text-emerald-400"/></div><p className="text-2xl font-bold text-white">Good</p></div>
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Noise</span><CloudLightning className="w-5 h-5 text-amber-400"/></div><p className="text-2xl font-bold text-white">85 dB</p></div>
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}

      {activeTab === 'Team' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Project Team</h2>
                    <p className="text-slate-400 text-sm">{stats.teamSize} members working on this project</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex border rounded-lg border-white/10">
                        <button onClick={() => setTeamView('grid')} className={`p-2 ${teamView === 'grid' ? 'bg-white/10' : ''}`}><BarChart3 className="w-4 h-4" /></button>
                        <button onClick={() => setTeamView('list')} className={`p-2 ${teamView === 'list' ? 'bg-white/10' : ''}`}><List className="w-4 h-4" /></button>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" onClick={onEdit}>
                        <Plus className="w-4 h-4 mr-2" /> Add Member
                    </Button>
                </div>
            </div>

            {teamView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectTeam.map(user => (
                        <TeamMemberCard key={user.id} user={user} activities={activityFeed} />
                    ))}
                </div>
            ) : (
                <DashboardWidget title="Team Members List">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="pb-3 text-left text-slate-400 font-medium">Member</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Role</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Status</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {projectTeam.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
                                                <div><p className="font-medium text-white">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            {/* --- FIX IS HERE: Safe replace --- */}
                                            <Badge color="blue" size="sm">{(user.role || 'Unknown').replace(/_/g, ' ')}</Badge>
                                        </td>
                                        <td className="py-3"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-sm text-slate-300">Active</span></div></td>
                                        <td className="py-3"><div className="flex gap-2"><Button size="sm" variant="ghost"><MessageSquare className="w-4 h-4" /></Button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardWidget>
            )}
        </div>
      )}
    </div>
  );
};