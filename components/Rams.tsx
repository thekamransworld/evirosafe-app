
import React, { useState, useMemo } from 'react';
import type { Rams as RamsType, RamsStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext } from '../contexts';

interface RamsProps {
  onSelectRams: (rams: RamsType) => void;
  onNewRams: () => void;
}

const getRiskColor = (riskScore: number): 'green' | 'yellow' | 'red' => {
    if (riskScore >= 13) return 'red';
    if (riskScore >= 7) return 'yellow';
    return 'green';
};

const RamsCard: React.FC<{ rams: RamsType; onSelect: (rams: RamsType) => void }> = ({ rams, onSelect }) => {
  const getStatusColor = (status: RamsStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
    switch (status) {
      case 'published': return 'green';
      case 'approved': return 'blue';
      case 'under_review': return 'yellow';
      case 'archived': return 'gray';
      case 'draft':
      default: return 'gray';
    }
  };

  const riskColor = getRiskColor(rams.overall_risk_after);
  const riskLevel = riskColor === 'red' ? 'High' : riskColor === 'yellow' ? 'Medium' : 'Low';

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <Badge color={getStatusColor(rams.status)}>{rams.status.replace('_', ' ')}</Badge>
          <Badge color={riskColor}>{riskLevel} Risk</Badge>
        </div>
        <h3 className="text-lg font-bold text-text-primary mt-3">{rams.activity}</h3>
        <p className="text-sm text-text-secondary">{rams.version}</p>
        {rams.approved_by_client?.signed_at && (
            <div className="mt-3 flex items-center text-green-600">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">Client Approved</span>
            </div>
        )}
      </div>
      <div className="border-t mt-4 pt-4 text-xs text-gray-500 space-y-2">
        <p><strong>Prepared By:</strong> {rams.prepared_by.name}</p>
        <p><strong>Valid Until:</strong> {new Date(rams.times.valid_until).toLocaleDateString()}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={() => onSelect(rams)}>
          {rams.status === 'draft' ? 'Edit RAMS' : 'View Details'}
        </Button>
      </div>
    </Card>
  );
};

const FilterButton: React.FC<{ label: string, value: string, currentFilter: string, setFilter: (val: string) => void }> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
    >
        {label}
    </button>
)

export const Rams: React.FC<RamsProps> = ({ onSelectRams, onNewRams }) => {
  const { ramsList, projects } = useDataContext();
  const { can } = useAppContext();
  const [statusFilter, setStatusFilter] = useState<RamsStatus | 'All'>('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const filteredRams = useMemo(() => {
    return ramsList.filter(r => {
      const statusMatch = statusFilter === 'All' || r.status === statusFilter;
      const projectMatch = projectFilter === 'All' || r.project_id === projectFilter;
      const riskMatch = riskFilter === 'All' || 
        (riskFilter === 'Low' && r.overall_risk_after < 7) ||
        (riskFilter === 'Medium' && r.overall_risk_after >= 7 && r.overall_risk_after < 13) ||
        (riskFilter === 'High' && r.overall_risk_after >= 13);
      return statusMatch && projectMatch && riskMatch;
    });
  }, [ramsList, statusFilter, riskFilter, projectFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">RAMS Library</h1>
        {can('create', 'rams') && (
            <Button onClick={onNewRams}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New RAMS
            </Button>
        )}
      </div>

       <Card className="mb-6">
          <div className="space-y-4">
              <div>
                  <label className="text-sm font-semibold text-gray-600">Project</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All Projects" value="All" currentFilter={projectFilter} setFilter={setProjectFilter} />
                      {projects.map(p => <FilterButton key={p.id} label={p.name} value={p.id} currentFilter={projectFilter} setFilter={setProjectFilter} />)}
                  </div>
              </div>
               <div>
                  <label className="text-sm font-semibold text-gray-600">Residual Risk</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All" value="All" currentFilter={riskFilter} setFilter={setRiskFilter} />
                      {['Low', 'Medium', 'High'].map(t => <FilterButton key={t} label={t} value={t} currentFilter={riskFilter} setFilter={setRiskFilter} />)}
                  </div>
              </div>
              <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter as any} />
                      {['draft', 'under_review', 'approved', 'published', 'archived'].map(s => <FilterButton key={s} label={s.replace('_', ' ')} value={s} currentFilter={statusFilter} setFilter={setStatusFilter as any} />)}
                  </div>
              </div>
          </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRams.map((ram) => (
          <RamsCard key={ram.id} rams={ram} onSelect={onSelectRams} />
        ))}
        {filteredRams.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
                <p>No RAMS match the current filters.</p>
            </div>
        )}
      </div>

    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
