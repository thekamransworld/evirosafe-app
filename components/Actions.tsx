import React, { useState, useMemo } from 'react';
import type { ActionItem, CapaAction, Project, User } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { useDataContext, useAppContext, useModalContext } from '../contexts';

const FilterButton: React.FC<{label: string, value: string, currentFilter: string, setFilter: (val: string) => void}> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
    >
        {label}
    </button>
);

const ALL_CAPA_STATUSES: CapaAction['status'][] = ['Open', 'In Progress', 'Closed'];

export const Actions: React.FC = () => {
    const { actionItems, projects, reportList, handleUpdateActionStatus } = useDataContext();
    const { usersList, activeUser } = useAppContext();
    const { setSelectedReport } = useModalContext();
    
    const [projectFilter, setProjectFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [ownerFilter, setOwnerFilter] = useState('All');

    const filteredActions = useMemo(() => {
        return actionItems.filter(item => {
            const projectMatch = projectFilter === 'All' || item.project_id === projectFilter;
            const statusMatch = statusFilter === 'All' || item.status === statusFilter;
            const ownerMatch = ownerFilter === 'All' || item.owner_id === ownerFilter;
            return projectMatch && statusMatch && ownerMatch;
        });
    }, [actionItems, projectFilter, statusFilter, ownerFilter]);

    const getStatusColor = (status: CapaAction['status']): 'yellow' | 'blue' | 'green' => {
        if (status === 'Open') return 'yellow';
        if (status === 'In Progress') return 'blue';
        return 'green';
    }
    
    const handleViewSource = (item: ActionItem) => {
        if (item.source.type === 'Report') {
            const report = reportList.find(r => r.id === item.source.id);
            if (report) {
                setSelectedReport(report);
            }
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Action Tracker</h1>
                <p className="text-text-secondary">A centralized list of all corrective and preventive actions.</p>
            </div>
            
            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Filter by Project</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <FilterButton label="All Projects" value="All" currentFilter={projectFilter} setFilter={setProjectFilter} />
                            {projects.map(p => <FilterButton key={p.id} label={p.name} value={p.id} currentFilter={projectFilter} setFilter={setProjectFilter} />)}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600">Filter by Status</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter} />
                            {ALL_CAPA_STATUSES.map(s => <FilterButton key={s} label={s} value={s} currentFilter={statusFilter} setFilter={setStatusFilter} />)}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-gray-600">Filter by Owner</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <FilterButton label="All Users" value="All" currentFilter={ownerFilter} setFilter={setOwnerFilter} />
                            <FilterButton label="Assigned to Me" value={activeUser?.id || ''} currentFilter={ownerFilter} setFilter={setOwnerFilter} />
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {filteredActions.map(item => {
                                const owner = usersList.find(u => u.id === item.owner_id);
                                const isOwner = activeUser?.id === item.owner_id;
                                const canUpdate = isOwner || activeUser?.role === 'ADMIN' || activeUser?.role === 'HSE_MANAGER';
                                
                                return (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 max-w-sm">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.action}</p>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button onClick={() => handleViewSource(item)} className="text-sm text-primary-600 hover:underline">{item.source.id}</button>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{owner?.name || 'Unassigned'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{new Date(item.due_date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {canUpdate ? (
                                                <select
                                                  value={item.status}
                                                  onChange={(e) => handleUpdateActionStatus(item.origin, e.target.value as CapaAction['status'])}
                                                  className={`text-xs font-semibold p-1 rounded-md border-transparent focus:ring-2 focus:ring-primary-500 ${
                                                    item.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                                                    item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'
                                                  }`}
                                                >
                                                  {ALL_CAPA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            ) : (
                                                <Badge color={getStatusColor(item.status)}>{item.status}</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                             <button onClick={() => handleViewSource(item)} className="text-sm font-medium text-primary-600 hover:text-primary-800">View Source</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {filteredActions.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="font-semibold">No actions found.</p>
                            <p className="text-sm">Try adjusting your filters or creating a new report with a corrective action.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
