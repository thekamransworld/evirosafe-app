import React, { useMemo, useState } from 'react';
import type { Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { 
    Briefcase, Calendar, MapPin, Users, Activity, 
    AlertTriangle, FileText, CheckSquare, ArrowLeft, 
    Plus, Settings, MoreVertical 
} from 'lucide-react';
import { roles } from '../config';
import { EmptyState } from './ui/EmptyState';

// --- Project Creation/Edit Modal ---
interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Project, 'id' | 'org_id' | 'status'>) => void;
  users: User[];
  initialData?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, users, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        code: initialData?.code || '',
        location: initialData?.location || '',
        start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
        finish_date: initialData?.finish_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager_id: initialData?.manager_id || '',
        type: initialData?.type || 'Construction'
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            setError('Project Name and Code are required.');
            return;
        }
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" placeholder="e.g. Tower A" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Code</label>
                            <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" placeholder="e.g. PRJ-001" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                            <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white">
                                <option>Construction</option>
                                <option>Shutdown</option>
                                <option>Operations</option>
                                <option>Maintenance</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Finish Date</label>
                            <input type="date" value={formData.finish_date} onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
                        <select value={formData.manager_id} onChange={e => setFormData(p => ({...p, manager_id: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white">
                            <option value="">Select Manager</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Project</Button>
                </div>
            </div>
        </div>
    );
};

// --- Project Card Component ---
const ProjectCard: React.FC<{ 
    project: Project; 
    users: User[]; 
    onView: () => void; 
}> = ({ project, users, onView }) => {
    const getStatusColor = (status: Project['status']): 'green' | 'yellow' | 'gray' => {
        switch (status) { case 'active': return 'green'; case 'pending': return 'yellow'; case 'archived': return 'gray'; }
    };

    const crew = useMemo(() => users.filter(u => u.org_id === project.org_id), [users, project.org_id]);
    const crewCounts = useMemo(() => ({
        managers: crew.filter(c => c.role === 'HSE_MANAGER').length,
        supervisors: crew.filter(c => c.role === 'SUPERVISOR').length,
        officers: crew.filter(c => c.role === 'HSE_OFFICER').length,
        inspectors: crew.filter(c => c.role === 'INSPECTOR').length,
        workers: crew.filter(c => c.role === 'WORKER').length,
    }), [crew]);

    return (
        <Card className="hover:shadow-lg transition-all cursor-pointer flex flex-col" onClick={onView}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name} <span className="font-normal text-base text-gray-500">({project.code})</span></h3>
                    <p className="text-sm text-gray-500">{project.location}</p>
                </div>
                <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
            </div>
            <div className="mt-4 border-t border-gray-100 dark:border-dark-border pt-4">
                <h4 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Crew Overview</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded text-gray-700 dark:text-gray-300"><strong>{crewCounts.managers}</strong> Managers</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded text-gray-700 dark:text-gray-300"><strong>{crewCounts.officers}</strong> HSE Officers</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded text-gray-700 dark:text-gray-300"><strong>{crewCounts.supervisors}</strong> Supervisors</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded text-gray-700 dark:text-gray-300"><strong>{crewCounts.inspectors}</strong> Inspectors</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded col-span-2 text-gray-700 dark:text-gray-300"><strong>{crewCounts.workers}</strong> Workers</div>
                </div>
            </div>
             <div className="mt-4 border-t border-gray-100 dark:border-dark-border pt-4 grid grid-cols-3 gap-2 text-center">
                 <div><p className="text-2xl font-bold text-gray-900 dark:text-white">82%</p><p className="text-xs text-gray-500">Training</p></div>
                 <div><p className="text-2xl font-bold text-gray-900 dark:text-white">17</p><p className="text-xs text-gray-500">PTW Today</p></div>
                 <div><p className="text-2xl font-bold text-green-600">0</p><p className="text-xs text-gray-500">Incidents</p></div>
            </div>
            <div className="mt-auto pt-4 flex justify-end">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        onView();
                    }}
                >
                    View Dashboard
                </Button>
            </div>
        </Card>
    );
}

// --- Main Projects List ---
export const Projects: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { projects, handleCreateProject, isLoading } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const orgProjects = useMemo(() => projects.filter(p => p.org_id === activeOrg.id), [projects, activeOrg]);
  const canCreate = can('create', 'projects');

  const handleCreateSubmit = (data: any) => {
    handleCreateProject(data);
    setIsModalOpen(false);
  };

  if (selectedProject) {
      // In a real app, you would navigate to a route. Here we just render the detail view.
      // We need to import ProjectDetails but it's not imported in this file to avoid circular dependency in this snippet.
      // Assuming ProjectDetails is handled by parent or router.
      return <div>Project Details View Placeholder</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Projects</h1>
            <p className="text-text-secondary dark:text-gray-400">{activeOrg.name}</p>
        </div>
        {canCreate && (
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                New Project
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                users={usersList} 
                onView={() => setSelectedProject(project)} 
              />
          ))}
      </div>
      
       {orgProjects.length === 0 && !isLoading && (
            <div className="col-span-full">
                <EmptyState 
                    title="No Projects Found"
                    description="Create a project to start managing your HSE operations, permits, and inspections."
                    actionLabel={canCreate ? "Create First Project" : undefined}
                    onAction={() => setIsModalOpen(true)}
                    icon={<Briefcase className="w-10 h-10 text-gray-400" />}
                />
            </div>
        )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        users={usersList.filter(u => u.org_id === activeOrg.id)}
      />
    </div>
  );
};