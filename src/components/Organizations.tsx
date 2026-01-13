import React, { useState, useMemo, useEffect } from 'react';
import type { Organization, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';
import { FormField } from './ui/FormField';
import { 
  ArrowLeft, Plus, Settings as SettingsIcon, 
  Users, Briefcase, Save, UserPlus, RefreshCw 
} from 'lucide-react';
import { roles } from '../config';
import { useToast } from './ui/Toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

type Tab = 'Overview' | 'Projects' | 'People' | 'Settings';

// --- Local Invite Modal ---
const OrgInviteModal: React.FC<{ isOpen: boolean; onClose: () => void; orgId: string }> = ({ isOpen, onClose, orgId }) => {
    const { handleInviteUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<User['role']>('WORKER');

    const handleSubmit = () => {
        if (!email || !name) return;
        handleInviteUser({
            email, name, role, org_id: orgId,
            project_id: '' // Org level invite
        });
        onClose();
        setEmail(''); setName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Invite Member</h3>
                <div className="space-y-4">
                    <FormField label="Full Name">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </FormField>
                    <FormField label="Email">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </FormField>
                    <FormField label="Role">
                        <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </FormField>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit}>Send Invite</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org: initialOrg, onBack }) => {
  const { usersList, organizations, setActiveOrg } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  const toast = useToast();

  // Get live org data from context to ensure updates show immediately
  const org = useMemo(() => organizations.find(o => o.id === initialOrg.id) || initialOrg, [organizations, initialOrg]);

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // Settings State
  const [editForm, setEditForm] = useState({ name: org.name, industry: org.industry, country: org.country });

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  const orgUsers = useMemo(() => usersList.filter(u => u.org_id === org.id), [usersList, org.id]);

  const stats = {
    activeProjects: orgProjects.filter(p => p.status === 'active').length,
    totalUsers: orgUsers.length,
    admins: orgUsers.filter(u => u.role === 'ORG_ADMIN').length,
  };

  const handleProjectSubmit = (data: any) => {
      // Ensure the new project is linked to THIS organization
      handleCreateProject({ ...data, org_id: org.id });
      setIsProjectModalOpen(false);
  };

  const handleUpdateOrg = async () => {
      try {
          const orgRef = doc(db, 'organizations', org.id);
          await updateDoc(orgRef, editForm);
          
          // Update local context manually if needed, though listener should catch it
          // For now, we rely on the listener in AppContext
          toast.success("Organization updated successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to update organization");
      }
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center p-2 border dark:border-white/10">
            <img src={org.branding?.logoUrl || 'https://via.placeholder.com/50'} alt={org.name} className="max-h-full max-w-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{org.industry}</span>
              <span>•</span>
              <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setActiveTab('Settings')} leftIcon={<SettingsIcon className="w-4 h-4"/>}>Settings</Button>
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
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                ${activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              {tab === 'Overview' && <Briefcase className="w-4 h-4"/>}
              {tab === 'Projects' && <Briefcase className="w-4 h-4"/>}
              {tab === 'People' && <Users className="w-4 h-4"/>}
              {tab === 'Settings' && <SettingsIcon className="w-4 h-4"/>}
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
                        <Plus className="w-5 h-5 mr-2" />
                        New Project
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orgProjects.map(p => (
                        <Card 
                            key={p.id} 
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
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                                <p>📍 {p.location}</p>
                                <p className="text-xs text-gray-500 mt-1">Manager: {usersList.find(u => u.id === p.manager_id)?.name || 'Unassigned'}</p>
                            </div>
                        </Card>
                    ))}
                    {orgProjects.length === 0 && (
                        <div className="col-span-2 text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-white/5">
                            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500">No projects found for this organization.</p>
                            <Button variant="ghost" className="mt-2" onClick={() => setIsProjectModalOpen(true)}>Create First Project</Button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'People' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Team Members</h3>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Invite Member
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orgUsers.map(u => (
                        <Card key={u.id} className="flex items-center gap-4">
                            <img 
                                src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                                alt={u.name} 
                                className="w-12 h-12 rounded-full bg-gray-200 object-cover" 
                            />
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                                <div className="mt-1">
                                    <Badge color="blue" size="sm">{u.role.replace('_', ' ')}</Badge>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {orgUsers.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No team members yet.</p>
                        </div>
                    )}
                </div>
             </div>
        )}

        {activeTab === 'Settings' && (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Organization Settings</h3>
                    <Button onClick={handleUpdateOrg} leftIcon={<Save className="w-4 h-4"/>}>Save Changes</Button>
                </div>
                
                <div className="space-y-4 max-w-xl">
                    <FormField label="Organization Name">
                        <input 
                            type="text" 
                            value={editForm.name} 
                            onChange={e => setEditForm(p => ({...p, name: e.target.value}))}
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </FormField>
                    <FormField label="Industry">
                        <input 
                            type="text" 
                            value={editForm.industry} 
                            onChange={e => setEditForm(p => ({...p, industry: e.target.value}))}
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </FormField>
                    <FormField label="Country">
                        <input 
                            type="text" 
                            value={editForm.country} 
                            onChange={e => setEditForm(p => ({...p, country: e.target.value}))}
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </FormField>
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

      <OrgInviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        orgId={org.id} 
      />
    </div>
  );
};