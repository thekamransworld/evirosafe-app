import React, { useState, useMemo } from 'react';
import type { Report, ReportStatus, ReportType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useModalContext, useAppContext } from '../contexts';
import { getRiskLevel } from '../utils/riskUtils';
import { 
  Plus, MapPin, Calendar, Filter, 
  AlertTriangle, CheckCircle, Clock, Search,
  FileText, TrendingUp
} from 'lucide-react';

const ReportCard: React.FC<{report: Report, onSelect: (report: Report) => void}> = ({ report, onSelect }) => {
    const risk = getRiskLevel(report.risk_pre_control);
    
    const getStatusColor = (status: ReportStatus) => {
        switch(status) {
            case 'draft': return 'gray';
            case 'submitted': return 'blue';
            case 'under_investigation': return 'purple';
            case 'capa_required': return 'amber';
            case 'capa_in_progress': return 'yellow';
            case 'pending_closure': return 'indigo';
            case 'closed': return 'green';
            case 'archived': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <Card onClick={() => onSelect(report)} className="hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer group relative overflow-hidden">
            {/* Status Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${risk.color === 'red' ? 'bg-red-500' : risk.color === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            
            <div className="pl-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{getReportIcon(report.type)}</span>
                        <div>
                            <h3 className="font-bold text-sm text-text-primary dark:text-white truncate max-w-[150px]">{report.type}</h3>
                            <p className="text-[10px] text-gray-500 font-mono">{report.id.slice(-6)}</p>
                        </div>
                    </div>
                    <Badge color={getStatusColor(report.status)} size="sm">
                        {report.status.replace(/_/g, ' ')}
                    </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 min-h-[40px]">
                    {report.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between pt-3 border-t dark:border-white/10">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{new Date(report.occurred_at).toLocaleDateString()}</span>
                    </div>
                    
                    {report.costs?.total_estimated ? (
                        <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            ${report.costs.total_estimated.toLocaleString()}
                        </div>
                    ) : (
                        <div className="flex items-center text-xs text-gray-400">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[80px]">{report.location.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}

const FilterButton: React.FC<{label: string, value: string, currentFilter: string, setFilter: (val: string) => void, count?: number}> = ({ label, value, currentFilter, setFilter, count }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
            currentFilter === value 
            ? 'bg-primary-600 text-white shadow-md' 
            : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10'
        }`}
    >
        {label}
        {count !== undefined && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${currentFilter === value ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{count}</span>}
    </button>
)

const getReportIcon = (type: string) => {
    if (type.includes('Fire')) return '🔥';
    if (type.includes('Injury') || type.includes('Accident')) return '🚑';
    if (type.includes('Environmental')) return '🛢️';
    if (type.includes('Vehicle')) return '🚜';
    if (type.includes('Near Miss')) return '⚠️';
    return '📋';
};

export const Reports: React.FC = () => {
  const { reportList } = useDataContext();
  const { setSelectedReport, setIsReportCreationModalOpen } = useModalContext();
  const { can } = useAppContext();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  const filteredReports = useMemo(() => {
    return reportList.filter(report => {
        const statusMatch = statusFilter === 'All' || report.status === statusFilter;
        const searchMatch = !search || 
            report.description.toLowerCase().includes(search.toLowerCase()) ||
            report.type.toLowerCase().includes(search.toLowerCase()) ||
            report.location.text.toLowerCase().includes(search.toLowerCase());
        return statusMatch && searchMatch;
    });
  }, [reportList, statusFilter, search]);

  const counts = useMemo(() => {
      return {
          all: reportList.length,
          submitted: reportList.filter(r => r.status === 'submitted').length,
          investigating: reportList.filter(r => r.status === 'under_investigation').length,
          capa: reportList.filter(r => r.status === 'capa_required' || r.status === 'capa_in_progress').length,
          closed: reportList.filter(r => r.status === 'closed').length
      }
  }, [reportList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Incident Reporting</h1>
            <p className="text-text-secondary dark:text-gray-400">Track incidents, investigations, and corrective actions.</p>
        </div>
        {can('create', 'reports') && (
            <Button onClick={() => setIsReportCreationModalOpen(true)} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-900/20">
              <Plus className="w-5 h-5 mr-2" />
              New Report
            </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-900/50 p-2 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search reports..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                />
            </div>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
            <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 custom-scrollbar">
                <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter as any} count={counts.all} />
                <FilterButton label="New" value="submitted" currentFilter={statusFilter} setFilter={setStatusFilter as any} count={counts.submitted} />
                <FilterButton label="Investigating" value="under_investigation" currentFilter={statusFilter} setFilter={setStatusFilter as any} count={counts.investigating} />
                <FilterButton label="CAPA" value="capa_required" currentFilter={statusFilter} setFilter={setStatusFilter as any} count={counts.capa} />
                <FilterButton label="Closed" value="closed" currentFilter={statusFilter} setFilter={setStatusFilter as any} count={counts.closed} />
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} onSelect={setSelectedReport} />
        ))}
        {filteredReports.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/30">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reports found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or create a new report.</p>
            </div>
        )}
      </div>
    </div>
  );
};