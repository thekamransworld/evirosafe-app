import React, { useState, useMemo } from 'react';
import type { Organization, User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';
import { ArrowLeft, Plus, Users, Briefcase, Settings, UserPlus } from 'lucide-react';
import { roles } from '../config';

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

// --- Invite Modal (Internal) ---
const InviteModal: React.FC<{ isOpen: boolean, onClose: () => void, orgId: string }> = ({ isOpen, onClose, orgId }) => {
    const { handleInviteUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('WORKER');

    const handleSubmit = () => {
        // @ts-ignore
        handleInviteUser({ email, name, role, org_id: orgId });
        onClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-96" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 dark:text-white">Invite Member</h3>
                <div className="space-y-3">
                    <input className="w-full p-2 border rounded dark:bg-slate-800 dark:text-white" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
                    <input className="w-full p-2 border rounded dark:bg-slate-800 dark:text-white" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                    <select className="w-full p-2 border rounded dark:bg-slate-800 dark:text-white" value={role} onChange={e => setRole(e.target.value)}>
                        {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <Button className="w-full mt-2" onClick={handleSubmit}>Send Invite</Button>
                </div>
            </div>
        </div>
    );
};

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org, onBack }) => {
  const { usersList } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  const [activeTab, setActiveTab] = useState<'Projects' | 'People' | 'Settings'>('Projects');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // --- NEW STATE: Selected Project for Drill-down ---
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  const orgUsers = useMemo(() => usersList.filter(u => u.org_id === org.id), [usersList, org.id]);

  const handleProjectSubmit = (data: any) => {
      handleCreateProject({ ...data, org_id: org.id });
      setIsProjectModalOpen(false);
  };

  // --- RENDER PROJECT DETAILS IF SELECTED ---
  if (selectedProject) {
      return (
          <ProjectDetails 
              project={selectedProject} 
              onBack={() => setSelectedProject(null)} 
          />
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
            </Button>
            <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center p-2 border dark:border-gray-700">
                <img src={org.branding.logoUrl || '/logo.svg'} alt={org.name} className="max-h-full max-w-full" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>{org.domain}</span>
                <span>•</span>
                <span>{org.industry}</span>
                <span>•</span>
                <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
                </div>
            </div>
            </div>
            <div className="flex gap-3">
                {activeTab === 'Projects' && (
                    <Button onClick={() => setIsProjectModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> New Project
                    </Button>
                )}
                {activeTab === 'People' && (
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                    </Button>
                )}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="-mb-px flex space-x-8">
          {[
              { id: 'Projects', icon: Briefcase },
              { id: 'People', icon: Users },
              { id: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.id}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'Projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgProjects.map((p, index) => (
                    <Card 
                        key={p.id || index} // FIX: Fallback key to prevent crash
                        className="hover:border-primary-500 transition-colors cursor-pointer group"
                        onClick={() => setSelectedProject(p)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{p.name}</h4>
                                <p className="text-sm text-gray-500">{p.code}</p>
                            </div>
                            <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                        </div>
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <p className="flex items-center gap-2"><span className="text-gray-400">Location:</span> {p.location}</p>
                            <p className="flex items-center gap-2"><span className="text-gray-400">Manager:</span> {usersList.find(u => u.id === p.manager_id)?.name || 'Unassigned'}</p>
                        </div>
                    </Card>
                ))}
                {orgProjects.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">No projects found for this organization.</p>
                        <Button variant="ghost" className="mt-2" onClick={() => setIsProjectModalOpen(true)}>Create First Project</Button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'People' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgUsers.map((u, index) => (
                    <Card key={u.id || index} className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full" /> : u.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                            <div className="mt-1"><Badge color="blue" size="sm">{u.role.replace('_', ' ')}</Badge></div>
                        </div>
                    </Card>
                ))}
                {orgUsers.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">No users found.</p>}
            </div>
        )}

        {activeTab === 'Settings' && (
            <Card>
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Organization Settings</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Primary Language</label>
                        <p className="text-gray-900 dark:text-white font-medium uppercase">{org.primaryLanguage}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Timezone</label>
                        <p className="text-gray-900 dark:text-white font-medium">{org.timezone}</p>
                    </div>
                </div>
            </Card>
        )}
      </div>

      <ProjectCreationModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleProjectSubmit}
        users={orgUsers}
      />
      
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        orgId={org.id}
      />
    </div>
  );
};