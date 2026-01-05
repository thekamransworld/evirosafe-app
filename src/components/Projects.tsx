import React, { useState } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { useAppContext, useDataContext } from '../contexts';
import { 
    Briefcase, Plus
} from 'lucide-react';
import { roles } from '../config';
import { ProjectDetails } from './ProjectDetails';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

// --- Project Creation/Edit Modal ---
interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Project;
  users: User[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, initialData, users }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        code: initialData?.code || '',
        location: initialData?.location || '',
        start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
        finish_date: initialData?.finish_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager_id: initialData?.manager_id || '',
        type: initialData?.type || 'Construction',
        status: initialData?.status || 'active'
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {initialData ? 'Edit Project' : 'Create New Project'}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. Tower A" />
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
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-4 flex justify-end space-x-3 border-t dark:border-dark-border rounded-b-xl">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>{initialData ? 'Save Changes' : 'Create Project'}</Button>
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

    return (
        <Card className="hover:shadow-lg transition-all cursor-pointer flex flex-col" onClick={onView}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name} <span className="font-normal text-base text-gray-500">({project.code})</span></h3>
                    <p className="text-sm text-gray-500">{project.location}</p>
                </div>
                <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
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

  const orgProjects = React.useMemo(() => projects.filter(p => p.org_id === activeOrg.id), [projects, activeOrg]);
  const canCreate = can('create', 'projects');

  const handleCreateSubmit = (data: any) => {
    handleCreateProject(data);
    setIsModalOpen(false);
  };

  const handleEditSubmit = (data: any) => {
      console.log("Update project", data);
      setIsModalOpen(false);
  };

  if (selectedProject) {
      return (
          <>
            <ProjectDetails 
                project={selectedProject} 
                onBack={() => setSelectedProject(null)} 
            />
            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); }}
                onSubmit={handleEditSubmit}
                users={usersList}
                initialData={selectedProject}
            />
          </>
      );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Projects</h1>
            <p className="text-text-secondary dark:text-gray-400">{activeOrg.name}</p>
        </div>
        {canCreate && (
            <Button onClick={() => { setIsModalOpen(true); }}>
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
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No projects found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Create a project to start managing your HSE operations.</p>
                {canCreate && <Button className="mt-4" onClick={() => setIsModalOpen(true)}>Create First Project</Button>}
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