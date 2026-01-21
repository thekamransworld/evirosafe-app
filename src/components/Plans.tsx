import React, { useState, useMemo } from 'react';
import type { Plan, PlanStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { planTypes } from '../config';
import { useDataContext, useAppContext } from '../contexts';
import { Plus, CheckCircle } from 'lucide-react';

// --- PROPS INTERFACE (This was missing/incorrect) ---
interface PlansProps {
  onSelectPlan: (plan: Plan) => void;
  onNewPlan: () => void;
}

const getStatusColor = (status: PlanStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
  switch (status) {
    case 'published': return 'green';
    case 'approved': return 'blue';
    case 'under_review': return 'yellow';
    case 'archived': return 'gray';
    case 'draft':
    default: return 'gray';
  }
};

const PlanCard: React.FC<{ plan: Plan; onSelect: (plan: Plan) => void }> = ({ plan, onSelect }) => {
  const safeStatus = plan.status || 'draft';
  
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-1 rounded-full">{plan.type}</span>
          <Badge color={getStatusColor(safeStatus)}>{safeStatus.replace('_', ' ')}</Badge>
        </div>
        <h3 className="text-lg font-bold text-text-primary dark:text-white mt-3">{plan.title}</h3>
        <p className="text-sm text-text-secondary dark:text-gray-400">{plan.version}</p>
        {plan.people?.approved_by_client?.signed_at && (
            <div className="mt-3 flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-semibold">Client Approved</span>
            </div>
        )}
      </div>
      <div className="border-t dark:border-dark-border mt-4 pt-4 text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <p><strong>Prepared By:</strong> {plan.people?.prepared_by?.name || 'Unknown'}</p>
        <p><strong>Next Review:</strong> {plan.dates?.next_review_at ? new Date(plan.dates.next_review_at).toLocaleDateString() : 'N/A'}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={() => onSelect(plan)}>
          {safeStatus === 'draft' ? 'Edit Plan' : 'View Details'}
        </Button>
      </div>
    </Card>
  );
};

const FilterButton: React.FC<{ label: string, value: string, currentFilter: string, setFilter: (val: string) => void }> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
        }`}
    >
        {label}
    </button>
)

export const Plans: React.FC<PlansProps> = ({ onSelectPlan, onNewPlan }) => {
  const { planList, projects } = useDataContext();
  const { can } = useAppContext();
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const filteredPlans = useMemo(() => {
    return planList.filter(plan => {
      const typeMatch = typeFilter === 'All' || plan.type === typeFilter;
      const statusMatch = statusFilter === 'All' || plan.status === statusFilter;
      const projectMatch = projectFilter === 'All' || plan.project_id === projectFilter;
      return typeMatch && statusMatch && projectMatch;
    });
  }, [planList, typeFilter, statusFilter, projectFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">HSE Plans Library</h1>
        {can('create', 'plans') && (
            <Button onClick={onNewPlan}>
              <Plus className="w-5 h-5 mr-2" />
              New Plan
            </Button>
        )}
      </div>
      
      <Card className="mb-6">
          <div className="space-y-4">
              <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Project</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All Projects" value="All" currentFilter={projectFilter} setFilter={setProjectFilter} />
                      {projects.map(p => <FilterButton key={p.id} label={p.name} value={p.id} currentFilter={projectFilter} setFilter={setProjectFilter} />)}
                  </div>
              </div>
              <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Plan Type</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All" value="All" currentFilter={typeFilter} setFilter={setTypeFilter} />
                      {planTypes.map(t => <FilterButton key={t} label={t} value={t} currentFilter={typeFilter} setFilter={setTypeFilter} />)}
                  </div>
              </div>
              <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                      <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter as any} />
                      {['draft', 'under_review', 'approved', 'published', 'archived'].map(s => <FilterButton key={s} label={s.replace('_', ' ')} value={s} currentFilter={statusFilter} setFilter={setStatusFilter as any} />)}
                  </div>
              </div>
          </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSelect={onSelectPlan} />
        ))}
        {filteredPlans.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
                <p>No plans match the current filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};