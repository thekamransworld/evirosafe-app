import React, { useMemo, useState } from 'react';
import type { Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';

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

    return (
        <Card>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name} <span className="font-normal text-base text-gray-500">({project.code})</span></h3>
                    <p className="text-sm text-gray-500">{project.location}</p>
                </div>
                <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
            </div>
            <div className="mt-4 border-t dark:border-dark-border pt-4">
                <h4 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Crew Overview</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 dark:text-gray-400">
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded"><strong>{crewCounts.managers}</strong> Managers</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded"><strong>{crewCounts.officers}</strong> HSE Officers</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded"><strong>{crewCounts.supervisors}</strong> Supervisors</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded"><strong>{crewCounts.inspectors}</strong> Inspectors</div>
                    <div className="bg-gray-100 dark:bg-white/5 p-1 rounded col-span-2"><strong>{crewCounts.workers}</strong> Workers</div>
                </div>
            </div>
             <div className="mt-4 border-t dark:border-dark-border pt-4 grid grid-cols-3 gap-2 text-center">
                 <div><p className="text-2xl font-bold text-gray-900 dark:text-white">82%</p><p className="text-xs text-gray-500">Training</p></div>
                 <div><p className="text-2xl font-bold text-gray-900 dark:text-white">17</p><p className="text-xs text-gray-500">PTW Today</p></div>
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
    return <div className="p-8 text-center">Loading Projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Projects Dashboard</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary">{activeOrg.name}</p>
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

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);