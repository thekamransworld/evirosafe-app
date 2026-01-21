import React, { useState, useMemo } from 'react';
import type { Report, ReportStatus, ReportType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useModalContext, useAppContext } from '../contexts';
import { getRiskLevel } from '../utils/riskUtils';
import { Trash2 } from 'lucide-react'; // Import Trash Icon

const ReportCard: React.FC<{report: Report, onSelect: (report: Report) => void, onDelete: (id: string) => void, canDelete: boolean}> = ({ report, onSelect, onDelete, canDelete }) => {
    const risk = getRiskLevel(report.risk_pre_control);
    
    return (
        <Card onClick={() => onSelect(report)} className="hover:shadow-md hover:border-primary-300 transition-all cursor-pointer relative group">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-md text-text-primary pr-2 truncate">{report.type}</h3>
                <Badge color={risk.color}>{risk.level} Risk</Badge>
            </div>
            <p className="text-sm text-text-secondary mt-2 line-clamp-2">{report.description || (report.details as any).key_observations}</p>
            <div className="text-xs text-gray-500 mt-4 space-y-1">
                <div className="flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span>{report.location.text}</span>
                </div>
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>{new Date(report.occurred_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            {/* Delete Button - Only visible on hover if permitted */}
            {canDelete && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
                    className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    title="Delete Report"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </Card>
    )
}

// ... (FilterButton component remains same) ...
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
  const { reportList, handleDeleteReport } = useDataContext();
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
              <PlusIcon className="w-5 h-5 mr-2" />
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
            <ReportCard 
                key={report.id} 
                report={report} 
                onSelect={setSelectedReport} 
                onDelete={handleDeleteReport}
                canDelete={can('delete', 'reports')}
            />
        ))}
        {filteredReports.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
                <p>No reports match the current filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Icons
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h27" />
    </svg>
);