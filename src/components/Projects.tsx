
import React, { useMemo, useState } from 'react';
import type { Project, User, Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';

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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h3 className="text-xl font-bold">Create New Project</h3></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label>Project Name</label><input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md" /></div>
                        <div><label>Project Code</label><input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md" /></div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label>Location</label><input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md" /></div>
                        <div>
                            <label>Project Type</label>
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md">
                                <option>Construction</option>
                                <option>Shutdown</option>
                                <option>Operations</option>
                                <option>Office</option>
                                <option>Maintenance</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label>Start Date</label><input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md" /></div>
                        <div><label>Finish Date</label><input type="date" value={formData.finish_date} onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md" /></div>
                    </div>
                    <div>
                        <label>Project Manager</label>
                        <select value={formData.manager_id} onChange={e => setFormData(p => ({...p, manager_id: e.target.value}))} className="mt-1 w-full p-2 border bg-transparent rounded-md">
                            {users.filter(u => u.role === 'SUPERVISOR' || u.role === 'HSE_MANAGER' || u.role === 'ADMIN').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Project</Button>
                </div>
            </div>
        </div>
    );
};


// --- Project Card Component ---
const ProjectCard: React.FC<{ project: Project; users: User[] }> = ({ project, users }) => {
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

    const manager = users.find(u => u.id === project.manager_id);

    return (
        <Card>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold">{project.name} <span className="font-normal text-base text-gray-500">({project.code})</span></h3>
                    <p className="text-sm text-gray-500">{project.location}</p>
                </div>
                <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
            </div>
            <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-bold mb-2">Crew Overview</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-100 p-1 rounded"><strong>{crewCounts.managers}</strong> Managers</div>
                    <div className="bg-gray-100 p-1 rounded"><strong>{crewCounts.officers}</strong> HSE Officers</div>
                    <div className="bg-gray-100 p-1 rounded"><strong>{crewCounts.supervisors}</strong> Supervisors</div>
                    <div className="bg-gray-100 p-1 rounded"><strong>{crewCounts.inspectors}</strong> Inspectors</div>
                    <div className="bg-gray-100 p-1 rounded col-span-2"><strong>{crewCounts.workers}</strong> Workers</div>
                </div>
            </div>
             <div className="mt-4 border-t pt-4 grid grid-cols-3 gap-2 text-center">
                 <div><p className="text-2xl font-bold">82%</p><p className="text-xs text-gray-500">Training</p></div>
                 <div><p className="text-2xl font-bold">17</p><p className="text-xs text-gray-500">PTW Today</p></div>
                 <div><p className="text-2xl font-bold text-green-600">0</p><p className="text-xs text-gray-500">Incidents</p></div>
            </div>
            <div className="mt-auto pt-4 flex justify-end">
                <Button variant="secondary" size="sm">View Dashboard</Button>
            </div>
        </Card>
    );
}

export const Projects: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { projects, handleCreateProject, isLoading } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const orgProjects = useMemo(() => projects.filter(p => p.org_id === activeOrg.id), [projects, activeOrg]);

  const canCreate = can('create', 'projects');

  const handleSubmit = (data: Omit<Project, 'id' | 'org_id' | 'status'>) => {
    handleCreateProject(data);
    setIsModalOpen(false);
  }

  if (isLoading) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="h-9 w-64 bg-gray-200 rounded-md animate-pulse"></div>
                    <div className="h-5 w-48 bg-gray-200 rounded-md mt-2 animate-pulse"></div>
                </div>
                <div className="h-10 w-36 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
        </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Projects Dashboard</h1>
            <p className="text-text-secondary">{activeOrg.name}</p>
        </div>
        {canCreate && (
            <Button onClick={() => setIsModalOpen(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                New Project
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgProjects.map(project => (
              <ProjectCard key={project.id} project={project} users={usersList} />
          ))}
      </div>
      
       {orgProjects.length === 0 && (
            <Card>
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold">No projects yet for {activeOrg.name}.</h3>
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


// Icon
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);