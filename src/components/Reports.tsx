import React, { useState, useMemo } from 'react';
import type { Report, ReportStatus, ReportType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useModalContext, useAppContext } from '../contexts';
import { getRiskLevel } from '../utils/riskUtils';
import { EmptyState } from './ui/EmptyState';
import { FileText, Plus, MapPin, Calendar } from 'lucide-react';

const ReportCard: React.FC<{report: Report, onSelect: (report: Report) => void}> = ({ report, onSelect }) => {
    const risk = getRiskLevel(report.risk_pre_control);
    
    return (
        <Card onClick={() => onSelect(report)} className="hover:shadow-md hover:border-primary-300 transition-all cursor-pointer">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-md text-text-primary pr-2 truncate">{report.type}</h3>
                <Badge color={risk.color}>{risk.level} Risk</Badge>
            </div>
            <p className="text-sm text-text-secondary mt-2 line-clamp-2">{report.description || (report.details as any).key_observations}</p>
            <div className="text-xs text-gray-500 mt-4 space-y-1">
                <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{report.location.text}</span>
                </div>
                <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(report.occurred_at).toLocaleDateString()}</span>
                </div>
                {report.classification_codes && report.classification_codes.length > 0 && (
                    <div className="flex gap-1 mt-2">
                        {report.classification_codes.map(code => <span key={code} className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-mono">{code}</span>)}
                    </div>
                )}
            </div>
        </Card>
    )
}

const FilterButton: React.FC<{label: string, value: string, currentFilter: string, setFilter: (val: string) => void}> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
        }`}
    >
        {label}
    </button>
)

const REPORT_CATEGORIES: ReportType[] = [
    'Incident', 'Accident', 'Near Miss', 'Unsafe Act', 'Unsafe Condition',
    'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)',
    'Restricted Work Case (RWC)', 'Property / Asset Damage', 'Environmental Incident',
    'Fire Event', 'Leadership Event', 'Positive Observation'
];

export const Reports: React.FC = () => {
  const { reportList } = useDataContext();
  const { setSelectedReport, setIsReportCreationModalOpen } = useModalContext();
  const { can } = useAppContext();

  const [typeFilter, setTypeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');

  const filteredReports = useMemo(() => {
    return reportList.filter(report => {
        const typeMatch = typeFilter === 'All' || report.type === typeFilter;
        const riskMatch = riskFilter === 'All' || getRiskLevel(report.risk_pre_control).level === riskFilter;
        const statusMatch = statusFilter === 'All' || report.status === statusFilter;
        return typeMatch && riskMatch && statusMatch;
    });
  }, [reportList, typeFilter, riskFilter, statusFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Incident Reporting</h1>
        {can('create', 'reports') && (
            <Button onClick={() => setIsReportCreationModalOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              New Report
            </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="space-y-4">
            <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Report Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <FilterButton label="All" value="All" currentFilter={typeFilter} setFilter={setTypeFilter} />
                    {REPORT_CATEGORIES.map(t => <FilterButton key={t} label={t} value={t} currentFilter={typeFilter} setFilter={setTypeFilter} />)}
                </div>
            </div>
             <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Risk Level</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <FilterButton label="All" value="All" currentFilter={riskFilter} setFilter={setRiskFilter} />
                    {['Low', 'Medium', 'High', 'Critical'].map(c => <FilterButton key={c} label={c} value={c} currentFilter={riskFilter} setFilter={setRiskFilter} />)}
                </div>
            </div>
            <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter as (val: string) => void} />
                    {['under_review', 'submitted', 'closed', 'active'].map(s => <FilterButton key={s} label={s.replace('_', ' ')} value={s} currentFilter={statusFilter} setFilter={setStatusFilter as (val: string) => void} />)}
                </div>
            </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} onSelect={setSelectedReport} />
        ))}
        {filteredReports.length === 0 && (
            <div className="col-span-full">
                <EmptyState 
                    title="No Reports Found"
                    description="There are no incident reports matching your current filters."
                    actionLabel={can('create', 'reports') ? "Create New Report" : undefined}
                    onAction={() => setIsReportCreationModalOpen(true)}
                    icon={<FileText className="w-10 h-10 text-gray-400" />}
                />
            </div>
        )}
      </div>
    </div>
  );
};