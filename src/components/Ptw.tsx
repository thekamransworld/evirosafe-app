import React, { useState, useMemo } from 'react';
import type { Project, User } from '../types';
import type { Ptw as PtwDoc } from '../types';
import { Button } from './ui/Button';
import { ptwTypeDetails } from '../config';
import { useAppContext } from '../contexts';
import { 
  Plus, Search, FileText, 
  AlertTriangle, Clock, Calendar, 
  MapPin, User as UserIcon, CheckCircle
} from 'lucide-react';

// === GEN 4 STYLES ===
const glassStyles = {
  card: "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/30 group relative",
  badge: "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
  filterBtn: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300"
};

const getStatusConfig = (status: PtwDoc['status']) => {
    switch (status) {
      case 'ACTIVE': return { label: 'ACTIVE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle };
      case 'APPROVAL': return { label: 'PENDING APPROVAL', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Clock };
      case 'PRE_SCREEN':
      case 'SITE_INSPECTION':
      case 'SUBMITTED': return { label: 'IN REVIEW', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: FileText };
      case 'HOLD': return { label: 'ON HOLD', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle };
      case 'COMPLETED':
      case 'CLOSED': return { label: 'CLOSED', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: CheckCircle };
      default: return { label: 'DRAFT', color: 'text-slate-500', bg: 'bg-slate-500/5', border: 'border-slate-500/10', icon: FileText };
    }
};

interface PtwProps {
  ptws: PtwDoc[];
  users: User[];
  projects: Project[];
  onCreatePtw: () => void;
  onAddExistingPtw: () => void;
  onSelectPtw: (ptw: PtwDoc) => void;
}

const StatCard: React.FC<{ label: string, value: number, color: string, icon: React.ReactNode }> = ({ label, value, color, icon }) => (
    <div className={`${glassStyles.card} p-4 flex items-center justify-between`}>
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-black ${color} mt-1`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-white/5 ${color} opacity-80`}>
            {icon}
        </div>
    </div>
);

export const Ptw: React.FC<PtwProps> = ({ ptws, users, projects, onCreatePtw, onAddExistingPtw, onSelectPtw }) => {
  const { can } = useAppContext();
  const [filter, setFilter] = useState<'All' | 'Active' | 'Draft' | 'Closed'>('All');
  const [search, setSearch] = useState('');

  const filteredPtws = useMemo(() => {
    return ptws.filter(p => {
        const matchesSearch = !search || 
            p.title.toLowerCase().includes(search.toLowerCase()) || 
            p.payload.permit_no?.toLowerCase().includes(search.toLowerCase());
        
        if (filter === 'All') return matchesSearch;
        if (filter === 'Active') return matchesSearch && p.status === 'ACTIVE';
        if (filter === 'Draft') return matchesSearch && p.status === 'DRAFT';
        if (filter === 'Closed') return matchesSearch && (p.status === 'CLOSED' || p.status === 'COMPLETED');
        return matchesSearch;
    });
  }, [ptws, filter, search]);

  const stats = useMemo(() => ({
      total: ptws.length,
      active: ptws.filter(p => p.status === 'ACTIVE').length,
      pending: ptws.filter(p => p.status === 'APPROVAL' || p.status === 'SUBMITTED').length,
      highRisk: ptws.filter(p => p.type === 'Hot Work' || p.type === 'Confined Space Entry' || p.type === 'Lifting').length
  }), [ptws]);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown Project';

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                Permit to Work
            </h1>
            <p className="text-slate-400 mt-1">Manage authorization for high-risk activities.</p>
        </div>
        
        {can('create', 'ptw') && (
            <div className="flex gap-3">
                 <Button variant="secondary" onClick={onAddExistingPtw}>Add Existing</Button>
                 <Button onClick={onCreatePtw} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg shadow-blue-900/20">
                    <Plus className="w-5 h-5 mr-2" />
                    New Permit
                </Button>
            </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Permits" value={stats.active} color="text-emerald-400" icon={<CheckCircle className="w-6 h-6"/>} />
          <StatCard label="Pending Approval" value={stats.pending} color="text-amber-400" icon={<Clock className="w-6 h-6"/>} />
          <StatCard label="High Risk" value={stats.highRisk} color="text-rose-400" icon={<AlertTriangle className="w-6 h-6"/>} />
          <StatCard label="Total Permits" value={stats.total} color="text-blue-400" icon={<FileText className="w-6 h-6"/>} />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10">
              {['All', 'Active', 'Draft', 'Closed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                        filter === f 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                      {f}
                  </button>
              ))}
          </div>
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Permit # or Title..." 
                  className="w-full h-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none placeholder:text-slate-600"
              />
          </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPtws.map((ptw) => {
            const statusConfig = getStatusConfig(ptw.status);
            // SAFE CHECK: Ensure type exists in config
            const typeDetails = ptwTypeDetails[ptw.type] || { icon: '?', hex: '#64748b' };
            const StatusIcon = statusConfig.icon;
            
            return (
                <div key={ptw.id} onClick={() => onSelectPtw(ptw)} className={glassStyles.card}>
                    {/* Color Strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: typeDetails.hex }} />
                    
                    <div className="p-5 pl-7">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                    {ptw.payload.permit_no || 'DRAFT PERMIT'}
                                </span>
                                <h3 className="font-bold text-slate-100 text-lg line-clamp-1">{ptw.title}</h3>
                            </div>
                            <div className={`${glassStyles.badge} ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                             <span className="text-2xl">{typeDetails.icon}</span>
                             <span className="text-sm font-medium text-slate-300">{ptw.type}</span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-400 mb-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate">{ptw.payload.work.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span>{ptw.payload.requester.name}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-slate-500" />
                                <span>{getProjectName(ptw.project_id)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                             <div className="flex items-center gap-1.5 text-slate-500">
                                 <Calendar className="w-3.5 h-3.5" />
                                 <span>{new Date(ptw.payload.work.coverage.start_date).toLocaleDateString()}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-slate-500">
                                 <Clock className="w-3.5 h-3.5" />
                                 <span>{ptw.payload.work.coverage.start_time} - {ptw.payload.work.coverage.end_time}</span>
                             </div>
                        </div>
                    </div>
                </div>
            )
        })}

        {filteredPtws.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-400">No Permits Found</h3>
                <p className="text-slate-600 text-sm">Adjust your filters or create a new permit.</p>
            </div>
        )}
      </div>
    </div>
  );
};