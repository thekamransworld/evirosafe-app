import React, { useState, useMemo } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

type Tab = 'Overview' | 'Projects' | 'People' | 'Settings';

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org, onBack }) => {
  const { usersList } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  const orgUsers = useMemo(() => usersList.filter(u => u.org_id === org.id), [usersList, org.id]);

  const stats = {
    activeProjects: orgProjects.filter(p => p.status === 'active').length,
    totalUsers: orgUsers.length,
    admins: orgUsers.filter(u => u.role === 'ORG_ADMIN').length,
  };

  const handleProjectSubmit = (data: any) => {
      handleCreateProject({ ...data, org_id: org.id });
      setIsProjectModalOpen(false);
  };

  // If a project is selected, show its details
  if (selectedProject) {
      return (
          <ProjectDetails 
              project={selectedProject} 
              onBack={() => setSelectedProject(null)}
              onEdit={() => console.log("Edit project clicked")}
          />
      );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeftIcon />}>
            Back
          </Button>
          <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center p-2">
            {/* FIX: Safe access to logoUrl */}
            <img src={org.branding?.logoUrl || 'https://via.placeholder.com/50'} alt={org.name} className="max-h-full max-w-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{org.domain}</span>
              <span>•</span>
              <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">Edit Details</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="-mb-px flex space-x-8">
          {['Overview', 'Projects', 'People', 'Settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Projects</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeProjects}</p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Team Members</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalUsers}</p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Org Admins</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.admins}</p>
            </Card>
            
            <Card className="md:col-span-3">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Organization Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                        <p className="text-gray-500">Industry</p>
                        <p className="font-medium">{org.industry || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Country</p>
                        <p className="font-medium">{org.country || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Timezone</p>
                        <p className="font-medium">{org.timezone}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Primary Language</p>
                        <p className="font-medium uppercase">{org.primaryLanguage}</p>
                    </div>
                </div>
            </Card>
          </div>
        )}

        {activeTab === 'Projects' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Projects List</h3>
                    <Button onClick={() => setIsProjectModalOpen(true)}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        New Project
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orgProjects.map(p => (
                        <Card 
                            key={p.id} 
                            className="hover:border-primary-500 transition-colors cursor-pointer"
                            onClick={() => setSelectedProject(p)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{p.name}</h4>
                                    <p className="text-sm text-gray-500">{p.code}</p>
                                </div>
                                <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                            </div>
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                                <p>📍 {p.location}</p>
                                <p className="text-xs text-gray-500 mt-1">Manager: {usersList.find(u => u.id === p.manager_id)?.name || 'Unassigned'}</p>
                            </div>
                        </Card>
                    ))}
                    {orgProjects.length === 0 && (
                        <div className="col-span-2 text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                            <p className="text-gray-500">No projects found for this organization.</p>
                            <Button variant="ghost" className="mt-2" onClick={() => setIsProjectModalOpen(true)}>Create First Project</Button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'People' && (
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Team Members</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orgUsers.map(u => (
                        <Card key={u.id} className="flex items-center gap-4">
                            <img src={u.avatar_url} alt={u.name} className="w-10 h-10 rounded-full bg-gray-200" />
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.role}</p>
                            </div>
                        </Card>
                    ))}
                    {orgUsers.length === 0 && <p className="text-gray-500">No users found.</p>}
                </div>
             </div>
        )}

        {activeTab === 'Settings' && (
            <Card>
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Organization Settings</h3>
                <p className="text-gray-500">Global settings for {org.name} will go here.</p>
            </Card>
        )}
      </div>

      <ProjectCreationModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleProjectSubmit}
        users={orgUsers}
      />
    </div>
  );
};

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);