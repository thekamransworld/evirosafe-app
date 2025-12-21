import React, { useState, useMemo } from 'react';
import type { Plan, PlanStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { planTypes } from '../config';
import { useDataContext, useAppContext } from '../contexts';
import { 
  Plus, Filter, ArrowUpAZ, 
  Search, Copy, Archive,
  BarChart3, Users, Calendar, ShieldCheck,
  TrendingUp, LayoutTemplate, Sparkles
} from 'lucide-react';

interface PlansProps {
  onSelectPlan: (plan: Plan) => void;
  onNewPlan: () => void;
  onClonePlan: (plan: Plan) => void;
  onArchivePlan: (planId: string) => void;
}

// --- HELPER FUNCTIONS MOVED TO TOP LEVEL ---
const getStatusColor = (status: PlanStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' => {
  switch (status) {
    case 'published': return 'green';
    case 'approved': return 'blue';
    case 'under_review': return 'yellow';
    case 'overdue_review': return 'red';
    case 'archived': return 'gray';
    case 'draft':
    default: return 'gray';
  }
};

const getStatusText = (status: PlanStatus) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const PlanCard: React.FC<{ plan: Plan; onSelect: (plan: Plan) => void; onClone: (plan: Plan) => void; onArchive: (planId: string) => void }> = ({ 
  plan, onSelect, onClone, onArchive 
}) => {
  const { can } = useAppContext();
  const { projects } = useDataContext();

  const project = projects.find(p => p.id === plan.project_id);
  const isOverdue = plan.status === 'overdue_review' || 
    (plan.status !== 'archived' && new Date(plan.dates.next_review_at) < new Date());

  const completionPercentage = useMemo(() => {
    const totalSections = plan.content.body_json.length;
    const completedSections = plan.content.body_json.filter(s => s.is_complete).length;
    return totalSections ? Math.round((completedSections / totalSections) * 100) : 0;
  }, [plan]);

  const daysUntilReview = useMemo(() => {
    const today = new Date();
    const reviewDate = new Date(plan.dates.next_review_at);
    const diffTime = reviewDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [plan]);

  return (
    <Card className={`flex flex-col hover:shadow-xl transition-all duration-300 border-l-4 ${
      plan.status === 'published' ? 'border-l-green-500' :
      plan.status === 'approved' ? 'border-l-blue-500' :
      plan.status === 'under_review' ? 'border-l-yellow-500' :
      plan.status === 'overdue_review' ? 'border-l-red-500' :
      'border-l-gray-400'
    }`}>
      <div className="flex-grow">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <Badge color={getStatusColor(plan.status)}>
              {getStatusText(plan.status)}
            </Badge>
            {isOverdue && (
              <Badge color="red" className="animate-pulse">
                ⚠️ Overdue
              </Badge>
            )}
            {plan.meta.priority === 'high' && (
              <Badge color="red">High Priority</Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {can('clone', 'plans') && (
              <button 
                onClick={(e) => { e.stopPropagation(); onClone(plan); }}
                className="p-1 hover:bg-gray-100 rounded"
                title="Clone Plan"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {can('archive', 'plans') && plan.status !== 'archived' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onArchive(plan.id); }}
                className="p-1 hover:bg-gray-100 rounded"
                title="Archive Plan"
              >
                <Archive className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Title and Project */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {plan.title}
        </h3>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs">
            {plan.type}
          </span>
          {project && (
            <>
              <span className="mx-2">•</span>
              <span>{project.name}</span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Completion</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                completionPercentage >= 80 ? 'bg-green-500' :
                completionPercentage >= 50 ? 'bg-blue-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Calendar className="w-3 h-3 mr-1" />
            <span>v{plan.version}</span>
          </div>
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Users className="w-3 h-3 mr-1" />
            <span>{plan.people.prepared_by.name.split(' ')[0]}</span>
          </div>
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <ShieldCheck className="w-3 h-3 mr-1" />
            <span>{plan.content.body_json.length} sections</span>
          </div>
          <div className={`flex items-center ${daysUntilReview <= 7 ? 'text-red-600' : 'text-gray-600'}`}>
            <Calendar className="w-3 h-3 mr-1" />
            <span>Review in {daysUntilReview}d</span>
          </div>
        </div>

        {/* Tags */}
        {plan.meta.tags && plan.meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {plan.meta.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                {tag}
              </span>
            ))}
            {plan.meta.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs rounded">
                +{plan.meta.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500">
          Updated {new Date(plan.dates.updated_at).toLocaleDateString()}
        </span>
        <Button 
          variant={plan.status === 'draft' ? 'primary' : 'outline'} 
          size="sm" 
          onClick={() => onSelect(plan)}
        >
          {plan.status === 'draft' ? 'Continue Editing' : 'View Details'}
        </Button>
      </div>
    </Card>
  );
};

const FilterChip: React.FC<{ 
  label: string; 
  value: string; 
  currentFilter: string; 
  setFilter: (val: string) => void;
  icon?: React.ReactNode;
}> = ({ label, value, currentFilter, setFilter, icon }) => (
  <button
    onClick={() => setFilter(value)}
    className={`px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center space-x-2 ${
      currentFilter === value 
      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`}
  >
    {icon && <span>{icon}</span>}
    <span>{label}</span>
  </button>
);

export const Plans: React.FC<PlansProps> = ({ onSelectPlan, onNewPlan, onClonePlan, onArchivePlan }) => {
  const { planList, projects } = useDataContext();
  const { can } = useAppContext();
  
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'review' | 'priority'>('date');

  // Statistics
  const stats = useMemo(() => {
    const totalPlans = planList.length;
    const publishedPlans = planList.filter(p => p.status === 'published').length;
    const overduePlans = planList.filter(p => 
      p.status !== 'archived' && new Date(p.dates.next_review_at) < new Date()
    ).length;
    const draftPlans = planList.filter(p => p.status === 'draft').length;
    
    return { totalPlans, publishedPlans, overduePlans, draftPlans };
  }, [planList]);

  const filteredPlans = useMemo(() => {
    let filtered = planList.filter(plan => {
      const typeMatch = typeFilter === 'All' || plan.type === typeFilter;
      const statusMatch = statusFilter === 'All' || plan.status === statusFilter;
      const projectMatch = projectFilter === 'All' || plan.project_id === projectFilter;
      const searchMatch = searchTerm === '' || 
        plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.meta.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        plan.people.prepared_by.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return typeMatch && statusMatch && projectMatch && searchMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'review':
          return new Date(a.dates.next_review_at).getTime() - new Date(b.dates.next_review_at).getTime();
        case 'priority':
          const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
          return (priorityOrder[a.meta.priority] || 3) - (priorityOrder[b.meta.priority] || 3);
        case 'date':
        default:
          return new Date(b.dates.updated_at).getTime() - new Date(a.dates.updated_at).getTime();
      }
    });

    return filtered;
  }, [planList, typeFilter, statusFilter, projectFilter, searchTerm, sortBy]);

  const statusOptions: Array<{ value: PlanStatus | 'All', label: string, color: string }> = [
    { value: 'All', label: 'All Status', color: 'gray' },
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'under_review', label: 'Under Review', color: 'yellow' },
    { value: 'approved', label: 'Approved', color: 'blue' },
    { value: 'published', label: 'Published', color: 'green' },
    { value: 'overdue_review', label: 'Overdue', color: 'red' },
    { value: 'archived', label: 'Archived', color: 'gray' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HSE Plans Library</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage safety plans, procedures, and compliance documents</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="hidden md:flex"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          {can('create', 'plans') && (
            <Button onClick={onNewPlan} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-5 h-5 mr-2" />
              New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Plans</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalPlans}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Published</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.publishedPlans}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-green-500 dark:text-green-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">In Draft</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.draftPlans}</p>
            </div>
            <Copy className="w-8 h-8 text-amber-500 dark:text-amber-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Overdue Review</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.overduePlans}</p>
            </div>
            <Calendar className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            {/* Replaced custom Input with standard html input */}
            <input
              type="search"
              placeholder="Search plans by title, tags, or author..."
              className="pl-10 w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterChip 
                  label="All Projects" 
                  value="All" 
                  currentFilter={projectFilter} 
                  setFilter={setProjectFilter}
                />
                {projects.slice(0, 3).map(p => (
                  <FilterChip 
                    key={p.id} 
                    label={p.name} 
                    value={p.id} 
                    currentFilter={projectFilter} 
                    setFilter={setProjectFilter}
                  />
                ))}
                {projects.length > 3 && (
                  <select 
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full border-0 focus:ring-2 focus:ring-blue-500"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  >
                    <option value="All">More projects...</option>
                    {projects.slice(3).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Plan Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Type
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterChip 
                  label="All Types" 
                  value="All" 
                  currentFilter={typeFilter} 
                  setFilter={setTypeFilter}
                />
                {planTypes.slice(0, 4).map(t => (
                  <FilterChip 
                    key={t} 
                    label={t} 
                    value={t} 
                    currentFilter={typeFilter} 
                    setFilter={setTypeFilter}
                  />
                ))}
                {planTypes.length > 4 && (
                  <select 
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full border-0 focus:ring-2 focus:ring-blue-500"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="All">More types...</option>
                    {planTypes.slice(4).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Status & Sort */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status & Sort
                </label>
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    onClick={() => setSortBy(sortBy === 'date' ? 'review' : 'date')}
                  >
                    <ArrowUpAZ className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {sortBy === 'date' ? 'Newest' : 
                     sortBy === 'review' ? 'Review Date' : 
                     sortBy === 'name' ? 'A-Z' : 'Priority'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.slice(0, 4).map(({ value, label, color }) => (
                  <FilterChip 
                    key={value}
                    label={label} 
                    value={value} 
                    currentFilter={statusFilter} 
                    setFilter={setStatusFilter as any}
                  />
                ))}
                {statusOptions.length > 4 && (
                  <select 
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full border-0 focus:ring-2 focus:ring-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    {statusOptions.slice(4).map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Plans Grid/List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {filteredPlans.length} Plan{filteredPlans.length !== 1 ? 's' : ''} Found
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>View:</span>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
            >
              List
            </button>
          </div>
        </div>

        {filteredPlans.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onSelect={onSelectPlan}
                  onClone={onClonePlan}
                  onArchive={onArchivePlan}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge color={getStatusColor(plan.status)}>
                          {getStatusText(plan.status)}
                        </Badge>
                        <h3 className="font-bold text-gray-900 dark:text-white">{plan.title}</h3>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{plan.type}</span>
                        <span>•</span>
                        <span>v{plan.version}</span>
                        <span>•</span>
                        <span>By {plan.people.prepared_by.name}</span>
                        <span>•</span>
                        <span>Next review: {new Date(plan.dates.next_review_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={() => onSelectPlan(plan)}>
                        {plan.status === 'draft' ? 'Edit' : 'View'}
                      </Button>
                      {can('clone', 'plans') && (
                        <Button variant="ghost" size="sm" onClick={() => onClonePlan(plan)}>
                          Clone
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <Card className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Copy className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No plans found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your filters or create a new plan
            </p>
            {can('create', 'plans') && (
              <Button onClick={onNewPlan}>
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Plan
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};