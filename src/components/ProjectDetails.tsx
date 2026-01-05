import React, { useState, useMemo } from 'react';
import type { Project, User, ActivityItem } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext } from '../contexts';
import { useToast } from './ui/Toast';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  ArrowLeft, AlertTriangle, FileText, ClipboardCheck, 
  Users, Shield, MapPin, TrendingUp, TrendingDown, 
  BarChart3, Activity as ActivityIcon, ShieldAlert, Wrench, 
  Download, Share2, Printer, Thermometer, Droplets, Wind,
  Clock, MessageSquare, Eye, Plus, MoreVertical, 
  List, Search, Mail, Phone, Briefcase, X, FileCheck
} from 'lucide-react';
import { roles } from '../config';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// --- Add Member Modal ---
const AddMemberModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    project: Project;
    existingTeamIds: string[];
}> = ({ isOpen, onClose, project, existingTeamIds }) => {
    const { usersList, handleInviteUser, activeOrg } = useAppContext();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'existing' | 'invite'>('existing');
    
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('WORKER');
    const [selectedUserId, setSelectedUserId] = useState('');

    const availableUsers = usersList.filter(u => 
        u.org_id === activeOrg.id && !existingTeamIds.includes(u.id)
    );

    const handleAddExisting = () => {
        if (!selectedUserId) return;
        const user = usersList.find(u => u.id === selectedUserId);
        if (user) {
            toast.success(`${user.name} added to ${project.name}`);
            onClose();
        }
    };

    const handleInviteNew = () => {
        if (!email || !name) return;
        // @ts-ignore
        handleInviteUser({
            email,
            name,
            role,
            org_id: activeOrg.id,
            project_id: project.id
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Team Member</h3>
                    <p className="text-sm text-gray-500">Add to {project.name}</p>
                </div>
                
                <div className="p-4">
                    <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('existing')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'existing' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            Select Existing
                        </button>
                        <button 
                            onClick={() => setActiveTab('invite')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'invite' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            Invite New
                        </button>
                    </div>

                    {activeTab === 'existing' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
                                <select 
                                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                >
                                    <option value="">-- Choose a member --</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            {availableUsers.length === 0 && (
                                <p className="text-sm text-amber-500">No available users found in organization.</p>
                            )}
                            <Button className="w-full" onClick={handleAddExisting} disabled={!selectedUserId}>Add Selected Member</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                            <input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            <select className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={role} onChange={e => setRole(e.target.value as any)}>
                                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                            <Button className="w-full" onClick={handleInviteNew}>Send Invitation</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Member Profile Modal ---
const MemberProfileModal: React.FC<{ user: User | null; onClose: () => void }> = ({ user, onClose }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <button onClick={onClose} className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 pb-6">
                    <div className="relative -mt-12 mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-500 overflow-hidden">
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-4">{user.role.replace('_', ' ')}</p>
                    
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{user.mobile || 'No mobile number'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span>{user.designation || 'No designation'}</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t dark:border-slate-800 flex gap-3">
                        <Button className="flex-1">Message</Button>
                        <Button variant="secondary" className="flex-1">View Activity</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Widget ---
const DashboardWidget: React.FC<{ title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }> = ({ title, children, className, actions }) => (
    <div className={`bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-white/10 backdrop-blur-lg rounded-2xl p-6 flex flex-col shadow-2xl ${className}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">{title}</h3>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
        <div className="flex-1 min-h-0">{children}</div>
    </div>
);

// --- Stat Box ---
const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; change?: number; trend?: 'up' | 'down' }> = ({ label, value, icon, color, change, trend }) => (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl">
        <div>
            <p className="text-slate-400 text-xs uppercase font-semibold tracking-wide mb-2">{label}</p>
            <p className="text-3xl font-black text-white mb-1">{value}</p>
            {change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                    {trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>{change}% from last month</span>
                </div>
            )}
        </div>
        <div className={`p-4 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>{icon}</div>
    </div>
);

// --- Team Member Card ---
const TeamMemberCard: React.FC<{ 
    user: User; 
    activities: any[]; 
    onViewProfile: (user: User) => void;
    onMessage: (user: User) => void;
}> = ({ user, activities, onViewProfile, onMessage }) => {
    const userActivities = activities.filter(a => a.user.id === user.id);
    const recentActivity = userActivities[0];

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer" onClick={() => onViewProfile(user)}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${user.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors" onClick={() => onViewProfile(user)}>{user.name}</h4>
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
                        <Button size="sm" variant="ghost" className="flex-1" onClick={() => onMessage(user)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1" onClick={() => onViewProfile(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Activity Feed Item ---
const ActivityFeedItem: React.FC<{ activity: any }> = ({ activity }) => {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {activity.user?.name?.charAt(0) || '?'}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{activity.user?.name || 'Unknown User'}</span>
                    <Badge color="blue" size="sm">{activity.type}</Badge>
                </div>
                <p className="text-white font-medium mb-1">{activity.title}</p>
                <p className="text-slate-400 text-sm mb-2">{activity.description}</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack }) => {
  const { 
    reportList, 
    ptwList, 
    inspectionList, 
    ramsList, 
  } = useDataContext();
  
  const { usersList } = useAppContext();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [teamView, setTeamView] = useState<'grid' | 'list'>('grid');
  
  // Modal States
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Filter Data for this Project
  const projectReports = useMemo(() => reportList.filter(r => r.project_id === project.id), [reportList, project.id]);
  const projectPtws = useMemo(() => ptwList.filter(p => p.project_id === project.id), [ptwList, project.id]);
  const projectInspections = useMemo(() => inspectionList.filter(i => i.project_id === project.id), [inspectionList, project.id]);
  const projectRams = useMemo(() => ramsList.filter(r => r.project_id === project.id), [ramsList, project.id]);

  // Get project team members
  const projectTeam = useMemo(() => {
    return usersList.filter(u => 
      u.org_id === project.org_id && 
      // @ts-ignore
      (u.project_ids?.includes(project.id) || 
       u.role === 'ADMIN' || 
       u.role === 'ORG_ADMIN' ||
       u.role === 'HSE_MANAGER' ||
       u.role === 'SUPERVISOR' ||
       u.role === 'INSPECTOR')
    );
  }, [usersList, project.org_id, project.id]);

  // Create comprehensive activity feed
  const activityFeed = useMemo(() => {
    const activities: any[] = [];
    projectReports.forEach(report => {
      const user = usersList.find(u => u.id === report.reporter_id);
      if (user) activities.push({ id: report.id, type: 'report', title: `${report.type} Report`, description: report.description, user, timestamp: report.created_at || new Date().toISOString() });
    });
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [projectReports, usersList]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activityFeed;
    return activityFeed.filter(activity => activity.type === activityFilter);
  }, [activityFeed, activityFilter]);

  const stats = {
      openReports: projectReports.filter(r => r.status !== 'closed').length,
      activePtws: projectPtws.filter(p => p.status === 'ACTIVE').length,
      pendingInspections: projectInspections.filter(i => i.status !== 'Closed').length,
      safetyScore: 92,
      totalActivities: activityFeed.length,
      teamSize: projectTeam.length,
      activityByType: {
        reports: projectReports.length,
        inspections: projectInspections.length,
        ptws: projectPtws.length,
        rams: projectRams.length,
      }
  };

  const handleMessageUser = (user: User) => {
      toast.info(`Messaging ${user.name} is coming soon!`);
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
                <DashboardWidget title="Recent Team Activities">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {activityFeed.slice(0, 5).map((activity, index) => (
                            <ActivityFeedItem key={activity.id || index} activity={activity} />
                        ))}
                        {activityFeed.length === 0 && <p className="text-slate-500 text-center py-4">No recent activity.</p>}
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
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" onClick={() => setIsAddMemberOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Member
                    </Button>
                </div>
            </div>

            {teamView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectTeam.map((user, index) => (
                        <TeamMemberCard 
                            key={user.id || index} 
                            user={user} 
                            activities={activityFeed} 
                            onViewProfile={setViewingUser}
                            onMessage={handleMessageUser}
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
                                    <th className="pb-3 text-left text-slate-400 font-medium">Status</th>
                                    <th className="pb-3 text-left text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {projectTeam.map((user, index) => (
                                    <tr key={user.id || index} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <Badge color="blue" size="sm">{user.role.replace('_', ' ')}</Badge>
                                        </td>
                                        <td className="py-3 text-white">{activityFeed.filter(a => a.user.id === user.id).length}</td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-sm text-slate-300">Active</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleMessageUser(user)}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setViewingUser(user)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardWidget>
            )}

            <DashboardWidget title="Team Activity Summary">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <span className="text-sm text-slate-300">Reports</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.activityByType.reports}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm text-slate-300">Inspections</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.activityByType.inspections}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <FileCheck className="w-5 h-5 text-purple-400" />
                            <span className="text-sm text-slate-300">PTW</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.activityByType.ptws}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                            <span className="text-sm text-slate-300">RAMS</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.activityByType.rams}</p>
                    </div>
                </div>
            </DashboardWidget>
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
                    </select>
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
                            </div>
                        )}
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}

      {/* Modals */}
      <AddMemberModal 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)} 
        project={project}
        existingTeamIds={projectTeam.map(u => u.id)}
      />
      
      <MemberProfileModal 
        user={viewingUser} 
        onClose={() => setViewingUser(null)} 
      />
    </div>
  );
};