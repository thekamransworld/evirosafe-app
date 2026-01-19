import React, { useState, useMemo } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
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
  DollarSign,
  Briefcase,
  Folder, Upload, Trash2, Settings
} from 'lucide-react';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// --- Reusable Dashboard Widget Component ---
const DashboardWidget: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  actions?: React.ReactNode;
}> = ({ title, children, className, actions }) => (
  <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
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
  subtext?: string;
}> = ({ label, value, icon, color, change, trend, subtext }) => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl flex items-center justify-between hover:border-blue-500/50 transition-all duration-300 group">
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Activity className="w-4 h-4 text-blue-500" />
          )}
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'}`}>
            {trend === 'up' ? '+' : ''}{change}%
          </span>
        </div>
      )}
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg bg-gray-50 dark:bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300`}>
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

    const typeLabel = activity.type ? (activity.type.charAt(0).toUpperCase() + activity.type.slice(1)) : 'Unknown';

    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/10 transition-colors group">
            <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {activity.user?.name?.charAt(0) || '?'}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{activity.user?.name || 'Unknown User'}</span>
                    <Badge color={getBadgeColor()} size="sm">
                        {typeLabel}
                    </Badge>
                    {activity.priority && (
                        <Badge color={activity.priority === 'high' ? 'red' : activity.priority === 'medium' ? 'amber' : 'green'} size="sm">
                            {activity.priority}
                        </Badge>
                    )}
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">{activity.title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{activity.description}</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
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
    const userActivities = activities.filter(a => a.user?.id === user.id);
    const recentActivity = userActivities[0];
    const roleLabel = (user.role || 'Unknown').replace(/_/g, ' ');

    return (
        <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-blue-400 dark:hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></div>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{user.name || 'Unknown'}</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                        <Badge color={
                            user.role === 'ADMIN' ? 'purple' :
                            user.role === 'HSE_MANAGER' ? 'blue' :
                            user.role === 'SUPERVISOR' ? 'green' :
                            user.role === 'INSPECTOR' ? 'amber' : 'gray'
                        } size="sm">
                            {roleLabel}
                        </Badge>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Activities Today</span>
                    <span className="text-gray-900 dark:text-white font-bold">{userActivities.length}</span>
                </div>

                {recentActivity && (
                    <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                        <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Recent Activity</p>
                        <p className="text-sm text-gray-800 dark:text-white truncate">{recentActivity.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            {new Date(recentActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )}
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
    tbtList,
    handleCreateProject // Used for updating project
  } = useDataContext();
  
  const { usersList } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [teamView, setTeamView] = useState<'grid' | 'list'>('grid');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

    const mostActiveUser = projectTeam.length > 0 ? projectTeam.reduce((mostActive, user) => {
      return userActivityCounts[user.id] > (userActivityCounts[mostActive.id] || 0) ? user : mostActive;
    }, projectTeam[0]) : { id: '', name: 'No users' };

    // Financials
    const budget = project.budget || 0;
    const spent = project.budget_spent || 0;
    const remaining = budget - spent;
    const burnRate = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    // Schedule
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.finish_date).getTime();
    const now = new Date().getTime();
    const totalDuration = end - start;
    const elapsed = now - start;
    const timeProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

    return {
      openReports: projectReports.filter(r => r.status !== 'closed').length,
      activePtws: projectPtws.filter(p => p.status === 'ACTIVE').length,
      pendingInspections: projectInspections.filter(i => i.status !== 'Closed').length,
      safetyScore: 92, // Mock
      progress: project.progress || 0,
      totalActivities: activityFeed.length,
      todayActivities: todayActivities.length,
      teamSize: projectTeam.length,
      mostActiveUser: mostActiveUser.name,
      mostActiveCount: mostActiveUser.id ? userActivityCounts[mostActiveUser.id] : 0,
      activityByType: {
        reports: projectReports.length,
        inspections: projectInspections.length,
        ptws: projectPtws.length,
        rams: projectRams.length,
        training: projectTraining.length,
        tbt: projectTbt.length
      },
      financials: { budget, spent, remaining, burnRate },
      schedule: { timeProgress, daysLeft: Math.ceil((end - now) / (1000 * 60 * 60 * 24)) }
    };
  }, [projectReports, projectPtws, projectInspections, projectRams, projectTraining, projectTbt, activityFeed, projectTeam, project]);

  const projectStatus = (project.status || 'Unknown').toUpperCase();

  const handleUpdateProject = (data: any) => {
      // In a real app, this would call an update function, not create
      // For now, we'll just log it as we are using mock data mostly
      console.log("Updating project:", data);
      setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 bg-gray-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border-transparent">Back</Button>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white dark:border-slate-800">
                {project.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                  <Badge color={project.status === 'active' ? 'green' : 'yellow'}>{projectStatus}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-slate-300 text-sm">
                  <span className="font-mono bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs">{project.code || 'PRJ-001'}</span>
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {project.location}</span>
                  <span className="flex items-center gap-2"><Users className="w-4 h-4"/> {stats.teamSize} members</span>
                  <span className="flex items-center gap-2"><ActivityIcon className="w-4 h-4"/> {stats.totalActivities} activities</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"><Download className="w-4 h-4" /></Button>
             <Button variant="outline" className="border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"><Share2 className="w-4 h-4" /></Button>
             <Button variant="outline" onClick={() => window.print()} className="border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"><Printer className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden px-6 py-3 shadow-sm">
        <nav className="flex space-x-8 overflow-x-auto">
          {['Overview', 'Financials', 'Schedule', 'Team', 'Safety', 'Documents', 'Settings'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`relative py-3 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}>
              {tab === 'Overview' && <BarChart3 className="w-4 h-4" />}
              {tab === 'Financials' && <DollarSign className="w-4 h-4" />}
              {tab === 'Schedule' && <Calendar className="w-4 h-4" />}
              {tab === 'Team' && <Users className="w-4 h-4" />}
              {tab === 'Safety' && <Shield className="w-4 h-4" />}
              {tab === 'Documents' && <FileText className="w-4 h-4" />}
              {tab === 'Settings' && <Settings className="w-4 h-4" />}
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>}
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
                                <ActivityIcon className="w-16 h-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-slate-500">No activities found</p>
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
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}

      {activeTab === 'Financials' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatBox label="Total Budget" value={`$${stats.financials.budget.toLocaleString()}`} icon={<DollarSign className="w-6 h-6"/>} color="text-green-600" />
                  <StatBox label="Spent to Date" value={`$${stats.financials.spent.toLocaleString()}`} icon={<TrendingDown className="w-6 h-6"/>} color="text-red-600" />
                  <StatBox label="Remaining" value={`$${stats.financials.remaining.toLocaleString()}`} icon={<Briefcase className="w-6 h-6"/>} color="text-blue-600" />
              </div>

              <DashboardWidget title="Budget Burn Rate">
                  <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Budget Used</span>
                          <span className="font-bold text-gray-900 dark:text-white">{stats.financials.burnRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full transition-all duration-1000 ${stats.financials.burnRate > 90 ? 'bg-red-500' : stats.financials.burnRate > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ width: `${stats.financials.burnRate}%` }}
                          ></div>
                      </div>
                  </div>
                  <p className="text-sm text-gray-500">
                      {stats.financials.burnRate > 100 
                        ? "⚠️ Project is over budget." 
                        : "✅ Project is within budget limits."}
                  </p>
              </DashboardWidget>
          </div>
      )}

      {activeTab === 'Schedule' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StatBox label="Days Remaining" value={stats.schedule.daysLeft} icon={<Clock className="w-6 h-6"/>} color="text-blue-600" subtext={`Ends on ${new Date(project.finish_date).toLocaleDateString()}`} />
                  <StatBox label="Timeline Progress" value={`${stats.schedule.timeProgress}%`} icon={<Calendar className="w-6 h-6"/>} color="text-purple-600" />
              </div>

              <DashboardWidget title="Project Timeline">
                  <div className="relative pt-8 pb-4">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div>
                      <div className="flex justify-between relative z-10">
                          <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-green-500 border-4 border-white dark:border-slate-900"></div>
                              <span className="mt-2 text-xs font-bold text-gray-600 dark:text-gray-400">Start</span>
                              <span className="text-[10px] text-gray-400">{new Date(project.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-col items-center" style={{ left: `${stats.schedule.timeProgress}%`, position: 'absolute' }}>
                              <div className="w-6 h-6 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 shadow-lg"></div>
                              <span className="mt-2 text-xs font-bold text-blue-600">Today</span>
                          </div>
                          <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-gray-400 border-4 border-white dark:border-slate-900"></div>
                              <span className="mt-2 text-xs font-bold text-gray-600 dark:text-gray-400">Finish</span>
                              <span className="text-[10px] text-gray-400">{new Date(project.finish_date).toLocaleDateString()}</span>
                          </div>
                      </div>
                  </div>
              </DashboardWidget>
          </div>
      )}

      {activeTab === 'Team' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Project Team</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">{stats.teamSize} members working on this project</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex border rounded-lg border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900">
                        <button 
                            onClick={() => setTeamView('grid')}
                            className={`p-2 rounded-l-lg ${teamView === 'grid' ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                        >
                            <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button 
                            onClick={() => setTeamView('list')}
                            className={`p-2 rounded-r-lg ${teamView === 'list' ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                        >
                            <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onEdit}>
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
                    {projectTeam.length === 0 && (
                        <p className="text-gray-500 italic col-span-full text-center">No team members assigned.</p>
                    )}
                </div>
            ) : (
                <DashboardWidget title="Team Members List">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/10">
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Member</th>
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Role</th>
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Activities</th>
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Last Active</th>
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Status</th>
                                    <th className="pb-3 text-left text-gray-500 dark:text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {projectTeam.map(user => {
                                    const userActivities = activityFeed.filter(a => a.user?.id === user.id);
                                    const lastActivity = userActivities[0];
                                    
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                        {user.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-slate-500">{user.email}</p>
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
                                                    {(user.role || 'Unknown').replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <div className="text-gray-900 dark:text-white font-medium">{userActivities.length}</div>
                                                <div className="text-xs text-gray-500">total activities</div>
                                            </td>
                                            <td className="py-3">
                                                {lastActivity ? (
                                                    <>
                                                        <div className="text-gray-900 dark:text-white text-sm">
                                                            {new Date(lastActivity.timestamp).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {lastActivity.type}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-gray-500 text-sm">No activity</div>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-sm text-gray-600 dark:text-slate-300">Active</span>
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
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }} />
                                <Area type="monotone" dataKey="val" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardWidget>
                <DashboardWidget title="Environmental Monitoring">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20"><div className="flex justify-between mb-2"><span className="text-sm text-gray-600 dark:text-slate-300">Temp</span><Thermometer className="w-5 h-5 text-blue-400"/></div><p className="text-2xl font-bold text-gray-900 dark:text-white">32°C</p></div>
                        <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/20"><div className="flex justify-between mb-2"><span className="text-sm text-gray-600 dark:text-slate-300">Humidity</span><Droplets className="w-5 h-5 text-cyan-400"/></div><p className="text-2xl font-bold text-gray-900 dark:text-white">65%</p></div>
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20"><div className="flex justify-between mb-2"><span className="text-sm text-gray-600 dark:text-slate-300">Air Quality</span><Wind className="w-5 h-5 text-emerald-400"/></div><p className="text-2xl font-bold text-gray-900 dark:text-white">Good</p></div>
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20"><div className="flex justify-between mb-2"><span className="text-sm text-gray-600 dark:text-slate-300">Noise</span><CloudLightning className="w-5 h-5 text-amber-400"/></div><p className="text-2xl font-bold text-gray-900 dark:text-white">85 dB</p></div>
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}

      {activeTab === 'Documents' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Documents</h3>
                  <Button leftIcon={<Upload className="w-4 h-4" />}>Upload File</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Blueprints', 'Safety Plans', 'Permits', 'Reports', 'Contracts'].map(folder => (
                      <div key={folder} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center gap-3 hover:shadow-md cursor-pointer transition-all">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                              <Folder className="w-6 h-6" />
                          </div>
                          <div>
                              <p className="font-bold text-gray-900 dark:text-white">{folder}</p>
                              <p className="text-xs text-gray-500">0 files</p>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                      <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">No documents yet</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Upload project files to share with your team.</p>
              </div>
          </div>
      )}

      {activeTab === 'Settings' && (
          <div className="space-y-6">
              <DashboardWidget title="Project Settings">
                  <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                          <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">Edit Project Details</h4>
                              <p className="text-sm text-gray-500">Update name, location, or timeline.</p>
                          </div>
                          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>Edit</Button>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg">
                          <div>
                              <h4 className="font-bold text-red-700 dark:text-red-400">Archive Project</h4>
                              <p className="text-sm text-red-600 dark:text-red-300">This will hide the project from the main list.</p>
                          </div>
                          <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}>Archive</Button>
                      </div>
                  </div>
              </DashboardWidget>
          </div>
      )}

      <ProjectCreationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateProject}
        users={usersList}
        initialData={project}
      />
    </div>
  );
};