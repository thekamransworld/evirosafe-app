import React, { useMemo, useState } from 'react';
import type { Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { ProjectDetails } from './ProjectDetails';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';

// --- Project Creation Modal ---
interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Project, 'id' | 'org_id' | 'status'>) => void;
  users: User[];
}

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onSubmit, users }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: '',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager_id: users.find(u => u.role === 'SUPERVISOR' || u.role === 'HSE_MANAGER')?.id || '',
        type: 'Construction'
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.code.trim() || !formData.manager_id) {
            setError('Project Name, Code, and Manager are required.');
            return;
        }
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border"><h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Code</label>
                            <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                            <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Type</label>
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option>Construction</option>
                                <option>Shutdown</option>
                                <option>Operations</option>
                                <option>Office</option>
                                <option>Maintenance</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Finish Date</label>
                            <input type="date" value={formData.finish_date} onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
                        <select value={formData.manager_id} onChange={e => setFormData(p => ({...p, manager_id: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                            {users.filter(u => u.role === 'SUPERVISOR' || u.role === 'HSE_MANAGER' || u.role === 'ADMIN').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
const ProjectCard: React.FC<{ project: Project; users: User[]; onView: (p: Project) => void }> = ({ project, users, onView }) => {
    const getStatusColor = (status: Project['status']): 'green' | 'yellow' | 'gray' => {
        switch (status) { case 'active': return 'green'; case 'pending': return 'yellow'; case 'archived': return 'gray'; }
    };

    const crew = useMemo(() => users.filter(u => u.org_id === project.org_id), [users, project.org_id]);
    const manager = users.find(u => u.id === project.manager_id);

    return (
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary-500">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{project.code}</p>
                </div>
                <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
            </div>
            
            <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {project.location}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    {manager?.name || 'Unassigned'} (Manager)
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(project.start_date).toLocaleDateString()} - {new Date(project.finish_date).toLocaleDateString()}
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex -space-x-2">
                    {crew.slice(0, 4).map((u, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white dark:border-dark-card flex items-center justify-center text-xs font-bold text-gray-600" title={u.name}>
                            {u.name.charAt(0)}
                        </div>
                    ))}
                    {crew.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white dark:border-dark-card flex items-center justify-center text-xs font-bold text-gray-500">
                            +{crew.length - 4}
                        </div>
                    )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => onView(project)}>
                    View Dashboard
                </Button>
            </div>
        </Card>
    );
}

export const Projects: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { projects, handleCreateProject, isLoading } = useDataContext();
  const { selectedProject, setSelectedProject } = useModalContext(); // Use global state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const orgProjects = useMemo(() => projects.filter(p => p.org_id === activeOrg.id), [projects, activeOrg]);
  const canCreate = can('create', 'projects');

  const handleSubmit = (data: Omit<Project, 'id' | 'org_id' | 'status'>) => {
    handleCreateProject(data);
    setIsModalOpen(false);
  }

  // --- CONDITIONAL RENDERING ---
  if (selectedProject) {
      return <ProjectDetails project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Projects Dashboard</h1>
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
                onView={setSelectedProject} 
              />
          ))}
      </div>
      
       {orgProjects.length === 0 && (
            <Card>
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No projects yet for {activeOrg.name}.</h3>
                    <p className="text-gray-500 mt-1">Create a project to start managing your HSE operations.</p>
                    {canCreate && <Button className="mt-4" onClick={() => setIsModalOpen(true)}>Create First Project</Button>}
                </div>
            </Card>
        )}

      <ProjectCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        users={usersList.filter(u => u.org_id === activeOrg.id)}
      />
    </div>
  );
};