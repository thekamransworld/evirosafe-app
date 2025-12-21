import React, { useState, useMemo } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { roles as rolesData } from '../config';
import { FormField } from './ui/FormField';
import { Building, Users, Briefcase, Plus, Settings, ArrowRight } from 'lucide-react';

// --- SUB-COMPONENT: PROJECT CREATION MODAL ---
interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Project, 'id' | 'org_id' | 'status'>) => void;
  orgId: string;
  availableManagers: User[];
}

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({ isOpen, onClose, onSubmit, orgId, availableManagers }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: '',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager_id: '',
        type: 'Construction'
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
                        <FormField label="Project Name">
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. Tower A" />
                        </FormField>
                        <FormField label="Project Code">
                            <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. PRJ-001" />
                        </FormField>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField label="Location">
                            <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                        <FormField label="Type">
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option>Construction</option>
                                <option>Shutdown</option>
                                <option>Operations</option>
                                <option>Maintenance</option>
                            </select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date">
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                        <FormField label="Finish Date">
                            <input type="date" value={formData.finish_date} onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                    </div>
                    <FormField label="Project Manager">
                        <select 
                            value={formData.manager_id} 
                            onChange={e => setFormData(p => ({...p, manager_id: e.target.value}))} 
                            className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                        >
                            <option value="">Select Manager...</option>
                            {availableManagers.length > 0 ? (
                                availableManagers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)
                            ) : (
                                <option disabled>No eligible managers found in this Org</option>
                            )}
                        </select>
                    </FormField>
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

// --- SUB-COMPONENT: INVITE USER MODAL ---
const InviteUserModal: React.FC<{ isOpen: boolean, onClose: () => void, orgId: string }> = ({ isOpen, onClose, orgId }) => {
    const { handleInviteUser } = useAppContext();
    const [formData, setFormData] = useState({ name: '', email: '', role: 'WORKER' as User['role'] });

    const handleSubmit = () => {
        handleInviteUser({ ...formData, org_id: orgId });
        onClose();
        setFormData({ name: '', email: '', role: 'WORKER' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite Team Member</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name"><input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                    <FormField label="Email"><input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                    <FormField label="Role">
                        <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value as User['role']}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                            {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </FormField>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invite</Button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: ORGANIZATION DETAIL VIEW ---
const OrganizationDetail: React.FC<{ org: Organization, onBack: () => void }> = ({ org, onBack }) => {
    const { usersList, activeUser } = useAppContext();
    const { projects, handleCreateProject } = useDataContext();
    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'team'>('overview');
    
    // Modals
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const orgProjects = projects.filter(p => p.org_id === org.id);
    const orgUsers = usersList.filter(u => u.org_id === org.id);
    
    // Filter users who can be managers (Supervisors, Managers, Admins)
    const eligibleManagers = orgUsers.filter(u => ['HSE_MANAGER', 'SUPERVISOR', 'ORG_ADMIN', 'ADMIN'].includes(u.role));

    const handleProjectSubmit = (data: any) => {
        handleCreateProject({ ...data, org_id: org.id });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {activeUser.role === 'ADMIN' && (
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                            <ArrowRight className="w-5 h-5 rotate-180 text-gray-500" />
                        </button>
                    )}
                    <img src={org.branding.logoUrl} alt={org.name} className="w-12 h-12 rounded-lg bg-white object-contain p-1" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                        <p className="text-sm text-gray-500">{org.industry} • {org.country}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status.toUpperCase()}</Badge>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-dark-border">
                <nav className="-mb-px flex space-x-8">
                    {['overview', 'projects', 'team'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                                activeTab === tab
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600"><Briefcase /></div>
                            <div>
                                <p className="text-sm text-gray-500">Total Projects</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{orgProjects.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600"><Users /></div>
                            <div>
                                <p className="text-sm text-gray-500">Team Members</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{orgUsers.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'projects' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Projects</h3>
                        <Button onClick={() => setIsProjectModalOpen(true)} leftIcon={<Plus className="w-4 h-4"/>}>Add Project</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orgProjects.map(project => (
                            <Card key={project.id} className="hover:border-emerald-500 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{project.name}</h4>
                                        <p className="text-xs text-gray-500 font-mono">{project.code}</p>
                                    </div>
                                    <Badge color={project.status === 'active' ? 'green' : 'gray'}>{project.status}</Badge>
                                </div>
                                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                    <p>Manager: {usersList.find(u => u.id === project.manager_id)?.name || 'Unassigned'}</p>
                                    <p>Location: {project.location}</p>
                                </div>
                            </Card>
                        ))}
                        {orgProjects.length === 0 && <p className="text-gray-500 italic">No projects yet.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Team Members</h3>
                        <Button onClick={() => setIsInviteModalOpen(true)} leftIcon={<Plus className="w-4 h-4"/>}>Invite Member</Button>
                    </div>
                    <Card noPadding>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                {orgUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <img className="h-8 w-8 rounded-full mr-3" src={user.avatar_url} alt="" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.role.replace('_', ' ')}</td>
                                        <td className="px-6 py-4"><Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            <ProjectCreationModal 
                isOpen={isProjectModalOpen} 
                onClose={() => setIsProjectModalOpen(false)} 
                onSubmit={handleProjectSubmit}
                orgId={org.id}
                availableManagers={eligibleManagers}
            />
            <InviteUserModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                orgId={org.id} 
            />
        </div>
    );
};

// --- MAIN COMPONENT ---
export const Organizations: React.FC = () => {
  const { organizations, activeUser, activeOrg, handleCreateOrganization } = useAppContext();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // If user is ORG_ADMIN, they should only see their own org detail view
  const isOrgAdmin = activeUser.role === 'ORG_ADMIN';
  
  if (isOrgAdmin) {
      return <OrganizationDetail org={activeOrg} onBack={() => {}} />;
  }

  // If user is SUPER ADMIN, they see the list first
  if (selectedOrg) {
      return <OrganizationDetail org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
            New Organization
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map(org => (
            <Card key={org.id} className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setSelectedOrg(org)}>
                <div className="flex items-center gap-4 mb-4">
                    <img src={org.branding.logoUrl} alt={org.name} className="w-16 h-16 rounded-xl bg-gray-50 object-contain p-2 border dark:border-gray-700" />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">{org.name}</h3>
                        <p className="text-sm text-gray-500">{org.industry}</p>
                    </div>
                </div>
                <div className="flex justify-between items-center border-t dark:border-dark-border pt-4">
                    <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
                    <span className="text-sm text-emerald-600 font-medium flex items-center">Manage <ArrowRight className="w-4 h-4 ml-1"/></span>
                </div>
            </Card>
        ))}
      </div>

      {/* Org Creation Modal (Simplified for brevity) */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
              <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Organization</h3>
                  <p className="text-gray-500 mb-4">Contact system administrator to provision new tenants.</p>
                  <div className="flex justify-end">
                      <Button onClick={() => setIsCreateModalOpen(false)}>Close</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};