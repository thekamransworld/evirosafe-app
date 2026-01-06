import React, { useState, useMemo } from 'react';
import type { Project } from '../types';
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
  Activity as ActivityIcon, ShieldAlert, 
  Download, Share2, Printer, Thermometer, Droplets, Wind, CloudLightning
} from 'lucide-react';
import { SiteMap } from './SiteMap';
import { SafetyPulseWidget } from './SafetyPulseWidget';
import { SafetyPulseModal } from './SafetyPulseModal';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const DashboardWidget: React.FC<{ title: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }> = ({ title, children, className, actions }) => (
    <div className={`bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-white/10 backdrop-blur-lg rounded-2xl p-6 flex flex-col shadow-2xl ${className}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">{title}</h3>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
        <div className="flex-1 min-h-0">{children}</div>
    </div>
);

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

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack }) => {
  const { reportList, ptwList, inspectionList, ramsList } = useDataContext();
  const { usersList } = useAppContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSafetyPulseModalOpen, setIsSafetyPulseModalOpen] = useState(false);

  // Filter Data for this Project
  const projectReports = useMemo(() => reportList.filter(r => r.project_id === project.id), [reportList, project.id]);
  const projectPtws = useMemo(() => ptwList.filter(p => p.project_id === project.id), [ptwList, project.id]);
  const projectInspections = useMemo(() => inspectionList.filter(i => i.project_id === project.id), [inspectionList, project.id]);
  const projectTeam = useMemo(() => usersList.filter(u => u.org_id === project.org_id), [usersList, project.org_id]);

  const stats = {
      openReports: projectReports.filter(r => r.status !== 'closed').length,
      activePtws: projectPtws.filter(p => p.status === 'ACTIVE').length,
      pendingInspections: projectInspections.filter(i => i.status !== 'Closed').length,
      safetyScore: 92,
      progress: 65,
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
                  <span className="flex items-center gap-2"><Users className="w-4 h-4"/> {projectTeam.length} members</span>
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
          {['Overview', 'Safety', 'Team', 'Documents'].map((tab) => (
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
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Temp</span><Thermometer className="w-5 h-5 text-blue-400"/></div><p className="text-2xl font-bold text-white">32°C</p></div>
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Humidity</span><Droplets className="w-5 h-5 text-cyan-400"/></div><p className="text-2xl font-bold text-white">65%</p></div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Air Quality</span><Wind className="w-5 h-5 text-emerald-400"/></div><p className="text-2xl font-bold text-white">Good</p></div>
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"><div className="flex justify-between mb-2"><span className="text-sm text-slate-300">Noise</span><CloudLightning className="w-5 h-5 text-amber-400"/></div><p className="text-2xl font-bold text-white">85 dB</p></div>
                    </div>
                </DashboardWidget>
            </div>
        </div>
      )}
    </div>
  );
};