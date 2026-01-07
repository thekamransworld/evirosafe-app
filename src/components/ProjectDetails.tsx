import React, { useState, useMemo } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext } from '../contexts';
import { roles } from '../config';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  ArrowLeft, AlertTriangle, FileText, ClipboardCheck, 
  Users, Shield, MapPin, Calendar, TrendingUp, TrendingDown, 
  BarChart3, Activity, ShieldAlert, Wrench, 
  Download, Share2, Printer, Thermometer, Droplets, Wind, CloudLightning,
  Clock, MessageSquare, Eye,
  Plus, MoreVertical, 
  Award, Trophy,
  FileCheck,
  Activity as ActivityIcon,
  List,
  Search
} from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// --- Invite Member Modal ---
const InviteMemberModal: React.FC<{ isOpen: boolean; onClose: () => void; onInvite: (data: any) => void }> = ({ isOpen, onClose, onInvite }) => {
    const [formData, setFormData] = useState({ name: '', email: '', role: 'WORKER' });

    const handleSubmit = () => {
        if (!formData.name || !formData.email) return;
        onInvite(formData);
        setFormData({ name: '', email: '', role: 'WORKER' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-dark-border" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite Team Member</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="John Doe" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="john@company.com" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                        <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                            {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-4 flex justify-end space-x-3 border-t dark:border-dark-border rounded-b-xl">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invite</Button>
                </div>
            </div>
        </div>
    );
};

// --- Reusable Dashboard Widget Component ---
const DashboardWidget: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  actions?: React.ReactNode;
}> = ({ title, children, className, actions }) => (
  <div className={`bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 backdrop-blur-md rounded-xl p-6 flex flex-col shadow-xl ${className}`}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        {title}
      </h3>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);

// --- Stat Box Component ---
const StatBox: React.FC<{ 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, icon, color, change, trend }) => (
  <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-white/5 p-5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all duration-300 group hover:scale-[1.02]">
    <div>
      <p className="text-slate-400 text-xs uppercase font-semibold tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Activity className="w-4 h-4 text-blue-500" />
          )}
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-blue-400'}`}>
            {trend === 'up' ? '+' : ''}{change}% from last month
          </span>
        </div>
      )}
    </div>
    <div className={`p-3 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
  </div>
);

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
    const getIcon = () => {
        switch (activity.type) {
            case 'report': return <FileText className="w-5 h-5 text-blue-500" />;
            case 'inspection': return <ClipboardCheck className="w-5 h-5 text-emerald-500" />;
            case 'ptw': return <FileCheck className="w-5 h-5 text-purple-500" />;
            case 'rams': return <ShieldAlert className="w-5 h-5 text-amber-500" />;
            case 'equipment': return <Wrench className="w-5 h-5 text-blue-500" />;
            case 'training': return <Award className="w-5 h-5 text-purple-500" />;
            case 'message': return <MessageSquare className="w-5 h-5 text-slate-400" />;
            case 'incident': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'milestone': return <Trophy className="w-5 h-5 text-yellow-500" />;
            default: return <ActivityIcon className="w-5 h-5 text-slate-400" />;
        }
    };

    const getBadgeColor = () => {
        switch (activity.type) {
            case 'report': return 'blue';
            case 'inspection': return 'green';
            case 'ptw': return 'purple';
            case 'rams': return 'amber';
            case 'equipment': return 'blue';
            case 'training': return 'purple';
            case 'message': return 'gray';
            case 'incident': return 'red';
            case 'milestone': return 'yellow';
            default: return 'gray';
        }
    };

    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {activity.user.name.charAt(0)}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{activity.user.name}</span>
                    <Badge color={getBadgeColor()} size="sm">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </Badge>
                    {activity.priority && (
                        <Badge color={activity.priority === 'high' ? 'red' : activity.priority === 'medium' ? 'amber' : 'green'} size="sm">
                            {activity.priority}
                        </Badge>
                    )}
                </div>
                <p className="text-white font-medium mb-1">{activity.title}</p>
                <p className="text-slate-400 text-sm mb-2">{activity.description}</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                        {activity.status && (
                            <span className={`flex items-center gap-1 ${activity.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {activity.status}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0">
                {getIcon()}
            </div>
        </div>
    );
};

// --- Team Member Card ---
const TeamMemberCard: React.FC<{ user: User; activities: ActivityItem[] }> = ({ user, activities }) => {
    const userActivities = activities.filter(a => a.user.id === user.id);
    const recentActivity = userActivities[0];

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900"></div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white">{user.name}</h4>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <Badge color={
                            user.role === 'ADMIN' ? 'purple' :
                            user.role === 'HSE_MANAGER' ? 'blue' :
                            user.role === 'SUPERVISOR' ? 'green' :
                            user.role === 'INSPECTOR' ? 'amber' : 'gray'
                        } size="sm">
                            {user.role.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <button className="text-slate-400 hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Activities Today</span>
                    <span className="text-white font-bold">{userActivities.length}</span>
                </div>

                {recentActivity && (
                    <div className="pt-3 border-t border-white/5">
                        <p className="text-xs text-slate-400 mb-1">Recent Activity</p>
                        <p className="text-sm text-white truncate">{recentActivity.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {new Date(recentActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )}

                <div className="pt-3 border-t border-white/5">
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack, onEdit }) => {
  const { 
    reportList, 
    ptwList, 
    inspectionList, 
    ramsList, 
    trainingSessionList, 
    tbtList
  } = useDataContext();
  
  const { usersList, handleInviteUser, activeOrg } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [teamView, setTeamView] = useState<'grid' | 'list'>('grid');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // <--- Added State

  // Filter Data for this Project
  const projectReports = useMemo(() => reportList.filter(r => r.project_id === project.id), [reportList, project.id]);
  const projectPtws = useMemo(() => ptwList.filter(p => p.project_id === project.id), [ptwList, project.id]);
  const projectInspections = useMemo(() => inspectionList.filter(i => i.project_id === project.id), [inspectionList, project.id]);
  const projectRams = useMemo(() => ramsList.filter(r => r.project_id === project.id), [ramsList, project.id]);
  const projectTraining = useMemo(() => trainingSessionList.filter(t => t.project_id === project.id), [trainingSessionList, project.id]);
  const projectTbt = useMemo(() => tbtList.filter(t => t.project_id === project.id), [tbtList, project.id]);

  // Get project team members
  const projectTeam = useMemo(() => {
    return usersList.filter(u => 
      u.org_id === project.org_id && 
      (u.role === 'ADMIN' || 
       u.role === 'ORG_ADMIN' ||
       u.role === 'HSE_MANAGER' ||
       u.role === 'SUPERVISOR' ||
       u.role === 'INSPECTOR')
    );
  }, [usersList, project.org_id]);

  // Create comprehensive activity feed
  const activityFeed = useMemo(() => {
    const activities: ActivityItem[] = [];

    // Add reports
    projectReports.forEach(report => {
      const user = usersList.find(u => u.id === report.reporter_id);
      if (user) {
        activities.push({
          id: report.id,
          type: 'report',
          title: `${report.type} Report`,
          description: report.description || 'No description provided',
          user,
          timestamp: report.reported_at || new Date().toISOString(),
          data: report,
          status: report.status,
          priority: report.risk_pre_control.severity > 3 ? 'high' : 'medium'
        });
      }
    });

    // Add inspections
    projectInspections.forEach(inspection => {
      const user = usersList.find(u => u.id === inspection.person_responsible_id);
      if (user) {
        activities.push({
          id: inspection.id,
          type: 'inspection',
          title: `${inspection.type} Inspection`,
          description: inspection.overall_comments || 'Inspection completed',
          user,
          timestamp: inspection.schedule_at || new Date().toISOString(),
          data: inspection,
          status: inspection.status,
          priority: 'medium'
        });
      }
    });

    // Add PTW
    projectPtws.forEach(ptw => {
      const user = usersList.find(u => u.id === ptw.payload.creator_id);
      if (user) {
        activities.push({
          id: ptw.id,
          type: 'ptw',
          title: `PTW: ${ptw.type}`,
          description: ptw.payload.work.description || 'Permit to Work',
          user,
          timestamp: ptw.updated_at || new Date().toISOString(),
          data: ptw,
          status: ptw.status.toLowerCase(),
          priority: 'medium'
        });
      }
    });

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [projectReports, projectInspections, projectPtws, usersList]);

  // Filter activities based on selected filter
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activityFeed;
    return activityFeed.filter(activity => activity.type === activityFilter);
  }, [activityFeed, activityFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    const todayActivities = activityFeed.filter(a => 
      new Date(a.timestamp).toDateString() === today.toDateString()
    );

    const userActivityCounts = projectTeam.reduce((acc, user) => {
      acc[user.id] = activityFeed.filter(a => a.user.id === user.id).length;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveUser = projectTeam.reduce((mostActive, user) => {
      return userActivityCounts[user.id] > userActivityCounts[mostActive.id] ? user : mostActive;
    }, projectTeam[0] || { id: '', name: 'No users' });

    return {
      openReports: projectReports.filter(r => r.status !== 'closed').length,
      activePtws: projectPtws.filter(p => p.status === 'ACTIVE').length,
      pendingInspections: projectInspections.filter(i => i.status !== 'Closed').length,
      safetyScore: 92, // Mock
      progress: 0, // Mock
      totalActivities: activityFeed.length,
      todayActivities: todayActivities.length,
      teamSize: projectTeam.length,
      mostActiveUser: mostActiveUser.name,
      mostActiveCount: userActivityCounts[mostActiveUser.id] || 0,
      activityByType: {
        reports: projectReports.length,
        inspections: projectInspections.length,
        ptws: projectPtws.length,
        rams: projectRams.length,
        training: projectTraining.length,
        tbt: projectTbt.length
      }
    };
  }, [projectReports, projectPtws, projectInspections, projectRams, projectTraining, projectTbt, activityFeed, projectTeam]);

  const handleInvite = (data: any) => {
    handleInviteUser({
        ...data,
        org_id: activeOrg.id,
        project_id: project.id // <--- Link invite to this project
    });
    setIsInviteModalOpen(false);
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
                  <Badge color={project.status === 'active' ? 'green' : 'yellow'}>{project.status.toUpperCase()}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm">
                  <span className="font-mono bg-white/10 px-3 py-1 rounded-lg text-xs">{project.code || 'PRJ-001'}</span>
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {project.location}</span>
                  {/* ADDED DATES HERE */}
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {new Date(project.start_date).toLocaleDateString()} - {new Date(project.finish_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-2"><Users className="w-4 h-4"/> {stats.teamSize} members</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="border-white/10 text-white hover:bg-white/10"><Download className="w-4 h-4" /></Button>
             <Button variant="outline" className="border-white/10 text-white hover:bg-white/10"><Share2 className="w-4 h-4" /></Button>
             <Button variant="outline" onClick={() => window.print()} className="border-white/10 text-white hover:bg-white/10"><Printer className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden px-6 py-3">
        <nav className="flex space-x-8">
          {['Overview', 'Team', 'Activities', 'Safety', 'Documents'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`relative py-3 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === tab ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab === 'Overview' && <BarChart3 className="w-4 h-4" />}
              {tab === 'Team' && <Users className="w-4 h-4" />}
              {tab === 'Activities' && <ActivityIcon className="w-4 h-4" />}
              {tab === 'Safety' && <Shield className="w-4 h-4" />}
              {tab === 'Documents' && <FileText className="w-4 h-4" />}
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500"></span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Team Members" value={stats.teamSize} icon={<Users className="w-6 h-6" />} color="text-blue-500" change={8} trend="up" />
                <StatBox label="Total Activities" value={stats.totalActivities} icon={<ActivityIcon className="w-6 h-6" />} color="text-purple-500" change={15} trend="up" />
                <StatBox label="Open Issues" value={stats.openReports} icon={<AlertTriangle className="w-6 h-6" />} color="text-red-500" change={2} trend="up" />
                <StatBox label="Safety Score" value={`${stats.safetyScore}%`} icon={<ShieldAlert className="w-6 h-6" />} color="text-amber-500" change={3} trend="up" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardWidget title="Recent Team Activities">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredActivities.length > 0 ? (
                            filteredActivities.slice(0, 5).map(activity => (
                                <ActivityFeedItem key={activity.id} activity={activity} />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <ActivityIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500">No activities found</p>
                            </div>
                        )}
                    </div>
                </DashboardWidget>

                <DashboardWidget title="Activity by Type">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(stats.activityByType).map(([key, value]) => ({
                                        name: key.charAt(0).toUpperCase() + key.slice(1),
                                        value
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {Object.keys(stats.activityByType).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
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
                        <button 
                            onClick={() => setTeamView('grid')}
                            className={`p-2 ${teamView === 'grid' ? 'bg-white/10' : ''}`}
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setTeamView('list')}
                            className={`p-2 ${teamView === 'list' ? 'bg-white/10' : ''}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" onClick={() => setIsInviteModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Member
                    </Button>
                </div>
            </div>

            {teamView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectTeam.map(user => (
                        <TeamMemberCard 
                            key={user.id} 
                            user={user} 
                            activities={activityFeed} 
                        />
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
                                    <th className="pb-3 text-left text-slate-400 font-medium">Activities</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Last Active</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Status</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {projectTeam.map(user => {
                                    const userActivities = activityFeed.filter(a => a.user.id === user.id);
                                    const lastActivity = userActivities[0];
                                    
                                    return (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <Badge color={
                                                    user.role === 'ADMIN' ? 'purple' :
                                                    user.role === 'HSE_MANAGER' ? 'blue' :
                                                    user.role === 'SUPERVISOR' ? 'green' :
                                                    user.role === 'INSPECTOR' ? 'amber' : 'gray'
                                                } size="sm">
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <div className="text-white font-medium">{userActivities.length}</div>
                                                <div className="text-xs text-slate-500">total activities</div>
                                            </td>
                                            <td className="py-3">
                                                {lastActivity ? (
                                                    <>
                                                        <div className="text-white text-sm">
                                                            {new Date(lastActivity.timestamp).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {lastActivity.type}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-500 text-sm">No activity</div>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-sm text-slate-300">Active</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost">
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </DashboardWidget>
            )}
        </div>
      )}

      {activeTab === 'Activities' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Project Activity Feed</h2>
                    <p className="text-slate-400 text-sm">Real-time updates from all team members</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search activities..." 
                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-64"
                        />
                    </div>
                    <select 
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    >
                        <option value="all">All Activities</option>
                        <option value="report">Reports</option>
                        <option value="inspection">Inspections</option>
                        <option value="ptw">PTW</option>
                        <option value="rams">RAMS</option>
                        <option value="training">Training</option>
                        <option value="message">Messages</option>
                    </select>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                        <Plus className="w-4 h-4 mr-2" />
                        New Activity
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardWidget title="Activity Feed" className="lg:col-span-2">
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredActivities.length > 0 ? (
                            filteredActivities.map(activity => (
                                <ActivityFeedItem key={activity.id} activity={activity} />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <ActivityIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500">No activities found</p>
                                <p className="text-slate-600 text-sm mt-1">Try changing your filters</p>
                            </div>
                        )}
                    </div>
                </DashboardWidget>

                <div className="space-y-6">
                    <DashboardWidget title="Activity Stats">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Total Activities</span>
                                <span className="text-white font-bold">{stats.totalActivities}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Today</span>
                                <span className="text-emerald-400 font-bold">{stats.todayActivities}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">This Week</span>
                                <span className="text-white font-bold">
                                    {activityFeed.filter(a => 
                                        new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                    ).length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Active Users</span>
                                <span className="text-white font-bold">{stats.teamSize}</span>
                            </div>
                        </div>
                    </DashboardWidget>

                    <DashboardWidget title="Top Contributors">
                        <div className="space-y-4">
                            {projectTeam
                                .map(user => ({
                                    user,
                                    count: activityFeed.filter(a => a.user.id === user.id).length
                                }))
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 3)
                                .map(({ user, count }, index) => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-white">{user.name}</p>
                                            <p className="text-xs text-slate-400">{count} activities</p>
                                        </div>
                                        <div className={`text-lg font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
                                            #{index + 1}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </DashboardWidget>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'Safety' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Safe Man Hours" value="125,000" icon={<Shield className="w-6 h-6" />} color="text-emerald-500" change={12} trend="up" />
                <StatBox label="Active Permits" value={stats.activePtws} icon={<FileText className="w-6 h-6" />} color="text-blue-500" change={-5} trend="down" />
                <StatBox label="Open Incidents" value={stats.openReports} icon={<AlertTriangle className="w-6 h-6" />} color="text-red-500" change={2} trend="up" />
                <StatBox label="Safety Score" value={`${stats.safetyScore}%`} icon={<ShieldAlert className="w-6 h-6" />} color="text-amber-500" change={3} trend="up" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardWidget title="Incident Trend">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{name: 'Mon', val: 2}, {name: 'Tue', val: 1}, {name: 'Wed', val: 3}, {name: 'Thu', val: 0}, {name: 'Fri', val: 1}]}>
                                <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="val" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardWidget>
                <DashboardWidget title="Environmental Monitoring">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-300">Temp</span>
                                <Thermometer className="w-5 h-5 text-blue-400"/>
                            </div>
                            <p className="text-2xl font-bold text-white">32°C</p>
                        </div>
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-300">Humidity</span>
                                <Droplets className="w-5 h-5 text-cyan-400"/>
                            </div>
                            <p className="text-2xl font-bold text-white">65%</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-300">Air Quality</span>
                                <Wind className="w-5 h-5 text-emerald-400"/>
                            </div>
                            <p className="text-2xl font-bold text-white">Good</p>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-300">Noise</span>
                                <CloudLightning className="w-5 h-5 text-amber-400"/>
                            </div>
                            <p className="text-2xl font-bold text-white">85 dB</p>
                        </div>
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}

      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInvite={handleInvite} 
      />
    </div>
  );
};