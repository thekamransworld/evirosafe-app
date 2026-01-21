import React, { useState, useMemo } from 'react';
import type { Rams as RamsType, RamsStatus } from '../types';
import { Button } from './ui/Button';
import { useDataContext, useAppContext } from '../contexts';
import { 
  Plus, Search, FileText, 
  ShieldAlert, CheckCircle, Clock, 
  Calendar, User as UserIcon,
  ArrowUpRight, Layers
} from 'lucide-react';

// === GEN 4 STYLES ===
const glassStyles = {
  card: "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/30 group relative cursor-pointer",
  badge: "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
  filterBtn: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300"
};

const getStatusConfig = (status: RamsStatus) => {
    switch (status) {
      case 'published': return { label: 'PUBLISHED', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle };
      case 'approved': return { label: 'APPROVED', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle };
      case 'under_review': return { label: 'IN REVIEW', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock };
      case 'archived': return { label: 'ARCHIVED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: FileText };
      default: return { label: 'DRAFT', color: 'text-slate-400', bg: 'bg-slate-500/5', border: 'border-slate-500/10', icon: FileText };
    }
};

const getRiskColor = (riskScore: number) => {
    if (riskScore >= 15) return { label: 'CRITICAL', color: 'text-rose-500', bg: 'bg-rose-500/20', border: 'border-rose-500/30' };
    if (riskScore >= 9) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/30' };
    if (riskScore >= 4) return { label: 'MEDIUM', color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    return { label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
};

const RamsCard: React.FC<{ rams: RamsType; onSelect: (rams: RamsType) => void }> = ({ rams, onSelect }) => {
  const status = getStatusConfig(rams.status);
  const risk = getRiskColor(rams.overall_risk_after);

  return (
    <div onClick={() => onSelect(rams)} className={glassStyles.card}>
      {/* Risk Indicator Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${risk.bg.replace('/20', '')}`} />

      <div className="p-5 pl-7">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                 <Layers className="w-5 h-5" />
             </div>
             <div>
                 <h3 className="font-bold text-slate-100 text-sm line-clamp-1">{rams.activity}</h3>
                 <span className="text-[10px] text-slate-500 font-mono">v{rams.version}</span>
             </div>
          </div>
          <div className={`${glassStyles.badge} ${status.bg} ${status.color} ${status.border}`}>
             <status.icon className="w-3 h-3" />
             {status.label}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
             <div className="flex-1 p-2 rounded-lg bg-black/20 border border-white/5 flex flex-col items-center">
                 <span className="text-[10px] text-slate-500 uppercase">Initial Risk</span>
                 <span className="text-lg font-bold text-slate-300">{rams.overall_risk_before}</span>
             </div>
             <div className={`flex-1 p-2 rounded-lg border flex flex-col items-center ${risk.bg} ${risk.border}`}>
                 <span className={`text-[10px] uppercase font-bold ${risk.color}`}>Residual Risk</span>
                 <span className={`text-lg font-bold ${risk.color}`}>{rams.overall_risk_after}</span>
             </div>
        </div>

        <div className="space-y-2 text-xs text-slate-500 mb-4">
            <div className="flex items-center gap-2">
                <MapPinIcon className="w-3.5 h-3.5" />
                <span className="truncate">{rams.location}</span>
            </div>
             <div className="flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5" />
                <span>{rams.prepared_by?.name || 'Unknown'}</span>
            </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
             <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Calendar className="w-3 h-3" />
                Valid: {new Date(rams.times.valid_until).toLocaleDateString()}
             </div>
             <button className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 transition-colors">
                 <ArrowUpRight className="w-4 h-4" />
             </button>
        </div>
      </div>
    </div>
  );
};

const FilterChip: React.FC<{label: string, active: boolean, onClick: () => void}> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`${glassStyles.filterBtn} ${
            active 
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
        }`}
    >
        {label}
    </button>
)

export const Rams: React.FC<{ onSelectRams: (r: RamsType) => void, onNewRams: () => void }> = ({ onSelectRams, onNewRams }) => {
  const { ramsList } = useDataContext();
  const { can } = useAppContext();
  const [statusFilter, setStatusFilter] = useState<RamsStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  const filteredRams = useMemo(() => {
    return ramsList.filter(r => {
      const statusMatch = statusFilter === 'All' || r.status === statusFilter;
      const searchMatch = !search || r.activity.toLowerCase().includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [ramsList, statusFilter, search]);

  const handleNewClick = () => {
      console.log("New RAMS button clicked");
      onNewRams();
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-indigo-400" />
                Risk Assessments (RAMS)
            </h1>
            <p className="text-slate-400 mt-1">Method statements and hazard controls.</p>
        </div>
        
        {can('create', 'rams') && (
            <Button onClick={handleNewClick} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/20 border-0">
                <Plus className="w-5 h-5 mr-2" />
                New RAMS
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <FilterChip label="All" active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
                  {['draft', 'under_review', 'approved', 'published'].map(s => (
                      <FilterChip key={s} label={s.replace('_', ' ')} active={statusFilter === s} onClick={() => setStatusFilter(s as any)} />
                  ))}
              </div>
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search RAMS by activity or location..." 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRams.map((ram) => (
          <RamsCard key={ram.id} rams={ram} onSelect={onSelectRams} />
        ))}
         {filteredRams.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">No RAMS Found</h3>
                <p className="text-slate-600">Create a new assessment to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
};

const MapPinIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;