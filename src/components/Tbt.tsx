import React, { useState, useMemo } from 'react';
import type { TbtSession } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { 
  Plus, Search, Calendar, MapPin, 
  Users, CheckCircle, Clock, FileText, 
  Megaphone, PenTool, Hash
} from 'lucide-react';

// === GEN 4 STYLES ===
const glassStyles = {
  card: "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 group relative",
  header: "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border-b border-white/10 p-6 sticky top-0 z-30",
  badge: "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
  filterBtn: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300"
};

const getStatusConfig = (status: TbtSession['status']) => {
    switch (status) {
        case 'delivered':
        case 'closed': return { label: 'DELIVERED', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle };
        case 'scheduled': return { label: 'SCHEDULED', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Calendar };
        case 'draft': return { label: 'DRAFT', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: PenTool };
        case 'archived': return { label: 'ARCHIVED', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: FileText };
        default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: FileText };
    }
};

const TbtCard: React.FC<{ session: TbtSession; onSelect: (s: TbtSession) => void }> = ({ session, onSelect }) => {
    const status = getStatusConfig(session.status);
    const StatusIcon = status.icon;

    return (
        <div onClick={() => onSelect(session)} className={glassStyles.card}>
            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.bg.replace('/10', '/50')}`} />
            
            <div className="p-5 pl-7">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100 text-sm line-clamp-1">{session.title}</h3>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {session.id.slice(-6)}</span>
                        </div>
                    </div>
                    <div className={`${glassStyles.badge} ${status.bg} ${status.color} ${status.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Date</p>
                            <p className="text-xs font-medium text-slate-300">{new Date(session.date).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Attendees</p>
                            <p className="text-xs font-medium text-slate-300">{session.attendees.length} Signed</p>
                        </div>
                     </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 mb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{session.location}</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        {session.topic_category}
                    </div>
                    <button className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                        VIEW DETAILS →
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className={`${glassStyles.card} p-4 flex items-center justify-between`}>
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-white/5 opacity-80 ${color}`}>
            {icon}
        </div>
    </div>
);

const FilterChip: React.FC<{label: string, active: boolean, onClick: () => void}> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`${glassStyles.filterBtn} ${
            active 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
        }`}
    >
        {label}
    </button>
)

export const Tbt: React.FC = () => {
  const { tbtList } = useDataContext();
  const { setIsTbtCreationModalOpen, setSelectedTbt } = useModalContext();
  const { can } = useAppContext();
  
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Delivered'>('All');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
      total: tbtList.length,
      upcoming: tbtList.filter(s => s.status === 'scheduled' || s.status === 'draft').length,
      delivered: tbtList.filter(s => s.status === 'delivered').length,
      attendees: tbtList.reduce((acc, curr) => acc + curr.attendees.length, 0)
  }), [tbtList]);

  const filteredList = useMemo(() => {
      return tbtList.filter(s => {
          const searchMatch = !search || s.title.toLowerCase().includes(search.toLowerCase());
          if (filter === 'All') return searchMatch;
          if (filter === 'Upcoming') return searchMatch && (s.status === 'scheduled' || s.status === 'draft');
          if (filter === 'Delivered') return searchMatch && s.status === 'delivered';
          return searchMatch;
      });
  }, [tbtList, filter, search]);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-emerald-400" />
                Toolbox Talks
            </h1>
            <p className="text-slate-400 mt-1">Briefings, attendance logs, and safety communication.</p>
        </div>
        
        {can('create', 'tbt') && (
            <Button onClick={() => setIsTbtCreationModalOpen(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/20 border-0">
                <Plus className="w-5 h-5 mr-2" />
                New TBT Session
            </Button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Sessions" value={stats.total} color="text-blue-400" icon={<Hash className="w-6 h-6"/>} />
          <StatCard title="Upcoming" value={stats.upcoming} color="text-amber-400" icon={<Clock className="w-6 h-6"/>} />
          <StatCard title="Delivered" value={stats.delivered} color="text-emerald-400" icon={<CheckCircle className="w-6 h-6"/>} />
          <StatCard title="Total Attendees" value={stats.attendees} color="text-purple-400" icon={<Users className="w-6 h-6"/>} />
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <FilterChip label="All" active={filter === 'All'} onClick={() => setFilter('All')} />
                  <FilterChip label="Upcoming" active={filter === 'Upcoming'} onClick={() => setFilter('Upcoming')} />
                  <FilterChip label="Delivered" active={filter === 'Delivered'} onClick={() => setFilter('Delivered')} />
              </div>
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search talks by title or location..." 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
              </div>
          </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredList.map(session => (
              <TbtCard key={session.id} session={session} onSelect={setSelectedTbt} />
          ))}

          {filteredList.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <Megaphone className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">No Talks Found</h3>
                <p className="text-slate-600">Schedule a new Toolbox Talk to get started.</p>
            </div>
        )}
      </div>

    </div>
  );
};