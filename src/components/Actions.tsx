import React, { useMemo, useState } from 'react';
import type { ActionItem, CapaAction, Report } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { 
  Calendar, 
  Eye, 
  Search, 
  User as UserIcon, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Upload,
  History
} from 'lucide-react';
import { ActionCreationModal } from './ActionCreationModal';

// Enhanced Action Item Interface for History
interface EnhancedActionItem extends ActionItem {
  history?: {
    date: string;
    action: string;
    user: string;
    status: string;
  }[];
  noticePeriod?: number; // Days
}

type ActionPriority = 'Critical' | 'High' | 'Medium' | 'Low';
type ActionStatus = 'Open' | 'In Progress' | 'Pending Review' | 'On Hold' | 'Closed' | 'Verified';

function getPriority(action: ActionItem): ActionPriority {
  if (action.priority) return action.priority as ActionPriority;
  if (action.status === 'Closed') return 'Low';
  const due = new Date(action.due_date);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Critical';
  if (days <= 3) return 'High';
  if (days <= 7) return 'Medium';
  return 'Low';
}

function priorityPill(priority: ActionPriority) {
  switch (priority) {
    case 'Critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    case 'High': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
    case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
    default: return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  }
}

function StatusBadge({ status, overdue }: { status: ActionStatus; overdue: boolean }) {
  const baseClasses = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  if (overdue && status !== 'Closed') {
    return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`}>Overdue</span>;
  }

  const config: Record<string, string> = {
    'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Closed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Pending Review': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return <span className={`${baseClasses} ${config[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

const StatCard: React.FC<{ title: string, value: number, color?: string, icon?: React.ReactNode }> = ({ title, value, color, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col shadow-sm">
        <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</span>
            {icon && <span className={`p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 ${color?.replace('text-', 'text-')}`}>{icon}</span>}
        </div>
        <span className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
);

// History Modal Component
const HistoryModal = ({ action, onClose }: { action: EnhancedActionItem, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 dark:text-white">Action History</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">&times;</button>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Action: {action.action}</p>
        </div>
        <div className="space-y-4">
          {/* Mock History Data if none exists */}
          {(action.history || [
            { date: new Date(Date.now() - 86400000).toISOString(), action: 'Action Created', user: 'System', status: 'Open' },
            { date: new Date().toISOString(), action: 'Status Updated', user: 'Admin', status: action.status }
          ]).map((log, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-1 flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {i < (action.history?.length || 2) - 1 && <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1"></div>}
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{log.action}</p>
                <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString()} by {log.user}</p>
                <p className="text-xs text-gray-500">Status: {log.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const Actions: React.FC = () => {
  const { actionItems, projects, reportList, handleUpdateActionStatus, handleCreateStandaloneAction } = useDataContext();
  const { usersList, activeUser, can } = useAppContext();
  const { 
      setSelectedReport, 
      setIsReportCreationModalOpen, 
      setReportInitialData,
      isActionCreationModalOpen,
      setIsActionCreationModalOpen
  } = useModalContext();

  const [projectFilter, setProjectFilter] = useState<'All' | string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ActionStatus>('All');
  const [ownerFilter, setOwnerFilter] = useState<'All' | string>('All');
  const [search, setSearch] = useState('');
  const [selectedHistoryAction, setSelectedHistoryAction] = useState<EnhancedActionItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return actionItems.filter((a) => {
      const projectOk = projectFilter === 'All' || a.project_id === projectFilter;
      const statusOk = statusFilter === 'All' || a.status === statusFilter;
      const ownerOk = ownerFilter === 'All' || a.owner_id === ownerFilter;
      const searchOk =
        q.length === 0 ||
        a.action.toLowerCase().includes(q) ||
        a.source.description.toLowerCase().includes(q) ||
        a.source.id.toLowerCase().includes(q);

      return projectOk && statusOk && ownerOk && searchOk;
    });
  }, [actionItems, ownerFilter, projectFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((a) => a.status === 'Open').length;
    const inProgress = filtered.filter((a) => a.status === 'In Progress').length;
    const closed = filtered.filter((a) => a.status === 'Closed').length;
    const overdue = filtered.filter((a) => new Date(a.due_date) < new Date() && a.status !== 'Closed').length;
    const critical = filtered.filter(a => getPriority(a) === 'Critical' && a.status !== 'Closed').length;
    return { total, open, inProgress, closed, overdue, critical };
  }, [filtered]);

  const openSource = (action: ActionItem) => {
    if (action.source.type === 'Report') {
      const report = reportList.find((r: Report) => r.id === action.source.id);
      if (report) setSelectedReport(report);
    }
  };

  const handleStatusChange = (action: ActionItem, newStatus: ActionStatus) => {
    handleUpdateActionStatus(action.origin, newStatus as CapaAction['status']);
  };

  const quickCreateReportWithCapa = () => {
    if (!can('create', 'reports')) return;
    setReportInitialData({
      further_corrective_action_required: true,
      capa: [
        {
          type: 'Corrective',
          action: '',
          owner_id: activeUser?.id || usersList[0]?.id || '',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: 'Open',
        } as CapaAction,
      ],
    });
    setIsReportCreationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Action Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor corrective actions, deadlines, and completion history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="Total" value={stats.total} icon={<FileText size={16} />} />
        <StatCard title="Open" value={stats.open} color="text-yellow-600" icon={<Clock size={16} />} />
        <StatCard title="In Progress" value={stats.inProgress} color="text-blue-600" icon={<TrendingUp size={16} />} />
        <StatCard title="Closed" value={stats.closed} color="text-green-600" icon={<CheckCircle size={16} />} />
        <StatCard title="Overdue" value={stats.overdue} color="text-red-600" icon={<AlertTriangle size={16} />} />
        <StatCard title="Critical" value={stats.critical} color="text-red-700" icon={<AlertTriangle size={16} />} />
      </div>

      <div className="flex flex-wrap gap-3">
          {can('create', 'reports') && (
            <Button onClick={quickCreateReportWithCapa} leftIcon={<Plus className="w-5 h-5" />} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
              New Report - CAPA
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsActionCreationModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
              Create Standalone Action
          </Button>
          <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>Import</Button>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-900 dark:text-white"
            >
              <option value="All">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
             <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-900 dark:text-white"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
             <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Owner</label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-900 dark:text-white"
            >
              <option value="All">All Users</option>
              {activeUser?.id && <option value={activeUser.id}>Me ({activeUser.name})</option>}
              {usersList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
             <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Action / source..."
                className="w-full pl-9 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">History</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((action) => {
                const owner = usersList.find((u) => u.id === action.owner_id);
                const project = projects.find((p) => p.id === action.project_id);
                const overdue = new Date(action.due_date) < new Date() && action.status !== 'Closed';
                const priority = getPriority(action);
                const daysRemaining = Math.ceil((new Date(action.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={action.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityPill(priority)}`}>
                        {priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2" title={action.action}>{action.action}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {project?.name || 'No project'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                             {owner?.name.charAt(0) || '?'}
                         </div>
                         <div className="text-sm text-gray-700 dark:text-gray-300">{owner?.name || 'Unassigned'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm flex items-center gap-1 ${overdue ? 'text-red-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                        <Calendar size={14} />
                        {new Date(action.due_date).toLocaleDateString()}
                      </div>
                       <div className="text-xs text-gray-500 mt-1">
                           {action.status !== 'Closed' && (
                               daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`
                           )}
                       </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                         <select
                          value={action.status}
                          onChange={(e) => handleStatusChange(action, e.target.value as ActionStatus)}
                          className="text-xs font-medium border rounded px-2 py-1 bg-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!activeUser}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color="gray">{action.source.type}</Badge>
                        {action.source.type === 'Report' && (
                             <button
                                onClick={() => openSource(action)}
                                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium inline-flex items-center gap-1"
                            >
                                <Eye size={12} /> View
                            </button>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                         <button
                            onClick={() => setSelectedHistoryAction(action as EnhancedActionItem)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="View History"
                        >
                            <History size={18} />
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Modal for creating standalone actions */}
      <ActionCreationModal 
          isOpen={isActionCreationModalOpen}
          onClose={() => setIsActionCreationModalOpen(false)}
          onSubmit={handleCreateStandaloneAction}
          users={usersList}
          projects={projects}
      />

      {/* Modal for viewing history */}
      {selectedHistoryAction && (
          <HistoryModal action={selectedHistoryAction} onClose={() => setSelectedHistoryAction(null)} />
      )}
    </div>
  );
};