import React, { useState, useMemo } from 'react';
import type { Report, ReportStatus, ReportType } from '../types';
import { Button } from './ui/Button';
import { useDataContext, useModalContext, useAppContext } from '../contexts';
import { 
  Plus, Search, Filter, MapPin, Calendar, 
  AlertTriangle, Flame, AlertOctagon, Activity, 
  FileText, ArrowUpRight, BrainCircuit,
  Eye, Download, Share2
} from 'lucide-react';

// === GEN 4 STYLES ===
const glassStyles = {
  card: "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-cyan-500/30 group",
  header: "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border-b border-white/10 p-6 sticky top-0 z-30",
  badge: "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
  filterBtn: "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300"
};

const REPORT_CATEGORIES: ReportType[] = [
    'Incident', 'Accident', 'Near Miss', 'Unsafe Act', 'Unsafe Condition',
    'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)',
    'Property / Asset Damage', 'Environmental Incident', 'Fire Event', 'Leadership Event'
];

// === HELPER: Risk Visuals ===
export const getRiskConfig = (severity: number, likelihood: number) => {
    const score = severity * likelihood;
    if (score >= 15) return { label: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', gradient: 'from-rose-500 to-red-600' };
    if (score >= 9) return { label: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', gradient: 'from-orange-500 to-amber-600' };
    if (score >= 4) return { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', gradient: 'from-yellow-400 to-orange-500' };
    return { label: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-400 to-green-500' };
};

// === HELPER: Legacy Support (Prevents crashes in other files) ===
export const getRiskLevel = (matrix: { severity: number; likelihood: number }) => {
    const score = matrix.severity * matrix.likelihood;
    if (score >= 15) return { level: 'Critical', color: 'red' };
    if (score >= 9) return { level: 'High', color: 'red' };
    if (score >= 4) return { level: 'Medium', color: 'yellow' };
    return { level: 'Low', color: 'green' };
};

const ReportCard: React.FC<{report: Report, onSelect: (report: Report) => void}> = ({ report, onSelect }) => {
    const risk = getRiskConfig(report.risk_pre_control.severity, report.risk_pre_control.likelihood);
    const isClosed = report.status === 'closed';

    return (
        <div onClick={() => onSelect(report)} className={glassStyles.card}>
            {/* Status Line */}
            <div className={`h-1 w-full bg-gradient-to-r ${risk.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
            
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${risk.bg} ${risk.border} border`}>
                            {report.type.includes('Fire') ? <Flame className={`w-5 h-5 ${risk.color}`} /> : 
                             report.type.includes('Incident') ? <AlertOctagon className={`w-5 h-5 ${risk.color}`} /> :
                             <AlertTriangle className={`w-5 h-5 ${risk.color}`} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm">{report.type}</h3>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {report.id.slice(-6)}</span>
                        </div>
                    </div>
                    <div className={`${glassStyles.badge} ${risk.bg} ${risk.color} ${risk.border}`}>
                        {risk.label} RISK
                    </div>
                </div>

                <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {report.description || "No description provided."}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-500" />
                        <span className="truncate max-w-[100px]">{report.location.text}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cyan-500" />
                        <span>{new Date(report.occurred_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                     <div className={`text-[10px] font-bold px-2 py-1 rounded ${isClosed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                         {report.status.toUpperCase().replace('_', ' ')}
                     </div>
                     <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                     </button>
                </div>
            </div>
        </div>
    )
}

const FilterChip: React.FC<{label: string, active: boolean, onClick: () => void}> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`${glassStyles.filterBtn} ${
            active 
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
        }`}
    >
        {label}
    </button>
)

export const Reports: React.FC = () => {
  const { reportList } = useDataContext();
  const { setSelectedReport, setIsReportCreationModalOpen } = useModalContext();
  const { can } = useAppContext();

  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredReports = useMemo(() => {
    return reportList.filter(report => {
        const typeMatch = typeFilter === 'All' || report.type === typeFilter;
        const statusMatch = statusFilter === 'All' || report.status === statusFilter;
        const searchMatch = !search || 
            report.description.toLowerCase().includes(search.toLowerCase()) || 
            report.id.toLowerCase().includes(search.toLowerCase());
        return typeMatch && statusMatch && searchMatch;
    });
  }, [reportList, typeFilter, statusFilter, search]);

  const stats = useMemo(() => ({
      total: reportList.length,
      open: reportList.filter(r => r.status !== 'closed').length,
      critical: reportList.filter(r => (r.risk_pre_control.severity * r.risk_pre_control.likelihood) >= 15).length
  }), [reportList]);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 p-6">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-cyan-400" />
                Incident Reports
            </h1>
            <p className="text-slate-400 mt-1">Manage, analyze, and resolve safety incidents.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-4 mr-4">
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Open Cases</p>
                    <p className="text-2xl font-bold text-white">{stats.open}</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Critical</p>
                    <p className="text-2xl font-bold text-rose-500">{stats.critical}</p>
                </div>
            </div>
            {can('create', 'reports') && (
                <Button onClick={() => setIsReportCreationModalOpen(true)} className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-900/20 border-0">
                    <Plus className="w-5 h-5 mr-2" />
                    New Report
                </Button>
            )}
        </div>
      </div>

      {/* AI INSIGHTS BAR */}
      <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 p-[1px]">
          <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                      <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-white">AI Safety Analysis</h4>
                      <p className="text-xs text-slate-400">3 new patterns detected in recent near-miss reports.</p>
                  </div>
              </div>
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">View Insights <ArrowUpRight className="w-4 h-4 ml-1"/></Button>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <FilterChip label="All" active={typeFilter === 'All'} onClick={() => setTypeFilter('All')} />
                  {REPORT_CATEGORIES.slice(0, 5).map(cat => (
                      <FilterChip key={cat} label={cat} active={typeFilter === cat} onClick={() => setTypeFilter(cat)} />
                  ))}
              </div>
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search reports by ID, description, or location..." 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
              </div>
          </div>
          
          <div className="flex flex-col justify-end">
              <div className="flex gap-2">
                  <button className="flex-1 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                      <Filter className="w-4 h-4" /> Filter
                  </button>
                  <button className="flex-1 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Export
                  </button>
              </div>
          </div>
      </div>
      
      {/* REPORTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} onSelect={setSelectedReport} />
        ))}
        
        {filteredReports.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Reports Found</h3>
                <p className="text-slate-500">Try adjusting your filters or create a new report.</p>
            </div>
        )}
      </div>
    </div>
  );
};