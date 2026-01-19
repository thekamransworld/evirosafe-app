import React, { useState, useMemo } from 'react';
import type { Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';
import { ProjectAnalytics } from './ProjectAnalytics';
import { 
  Plus, Search, Filter, LayoutGrid, List as ListIcon,
  MapPin, Calendar, Users, ArrowRight, Briefcase
} from 'lucide-react';

export const Projects: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { projects, handleCreateProject, isLoading } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter projects for the active organization
  const orgProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesOrg = p.org_id === activeOrg.id;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      
      return matchesOrg && matchesSearch && matchesStatus;
    });
  }, [projects, activeOrg.id, searchQuery, statusFilter]);

  const handleCreateSubmit = (data: any) => {
    handleCreateProject(data);
    setIsModalOpen(false);
  };

  // If a project is selected, show the detailed dashboard
  if (selectedProject) {
      return (
          <ProjectDetails 
            project={selectedProject} 
            onBack={() => setSelectedProject(null)}
            onEdit={() => {
                // In a real app, this would open an edit modal
                // For now, we just log it or could re-open creation modal with data
                console.log("Edit project", selectedProject.id);
            }}
          />
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Projects</h1>
            <p className="text-text-secondary dark:text-gray-400">Manage construction sites, timelines, and budgets.</p>
        </div>
        {can('create', 'projects') && (
            <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-blue-500/20">
                <Plus className="w-5 h-5 mr-2" />
                New Project
            </Button>
        )}
      </div>

      {/* Analytics Dashboard */}
      <ProjectAnalytics projects={orgProjects} users={usersList} />

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Search projects..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
            />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <option value="All">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
            </select>
            <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                >
                    <ListIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgProjects.map(project => {
                const manager = usersList.find(u => u.id === project.manager_id);
                const progress = project.progress || 0;

                return (
                    <Card 
                        key={project.id} 
                        className="flex flex-col cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg group"
                        onClick={() => setSelectedProject(project)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                    {project.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{project.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{project.code}</p>
                                </div>
                            </div>
                            <Badge color={project.status === 'active' ? 'green' : 'gray'}>
                                {project.status.toUpperCase()}
                            </Badge>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="truncate">{project.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{new Date(project.finish_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Users className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{manager?.name || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Progress</span>
                                <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </Card>
                );
            })}
          </div>
      ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-3">Project</th>
                          <th className="px-6 py-3">Location</th>
                          <th className="px-6 py-3">Manager</th>
                          <th className="px-6 py-3">Timeline</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {orgProjects.map(project => (
                          <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setSelectedProject(project)}>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                          {project.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div>{project.name}</div>
                                          <div className="text-xs text-gray-500">{project.code}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{project.location}</td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                  {usersList.find(u => u.id === project.manager_id)?.name || '-'}
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                  {new Date(project.finish_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                  <Badge color={project.status === 'active' ? 'green' : 'gray'}>{project.status}</Badge>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}>
                                      View <ArrowRight className="w-4 h-4 ml-1" />
                                  </Button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
      
      {orgProjects.length === 0 && !isLoading && (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-white/5">
            <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Projects Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Get started by creating your first project to track safety, permits, and inspections.
            </p>
            {can('create', 'projects') && (
                <Button onClick={() => setIsModalOpen(true)}>
                    Create First Project
                </Button>
            )}
        </div>
      )}

      <ProjectCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        users={usersList.filter(u => u.org_id === activeOrg.id)}
      />
    </div>
  );
};