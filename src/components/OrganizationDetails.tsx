import React, { useState, useMemo } from 'react';
import type { Organization, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';
import { FormField } from './ui/FormField';
import { roles as rolesData } from '../config';
import { 
  Plus, Search, UserPlus, ArrowLeft, 
  MoreVertical, Mail, Phone, MapPin, Globe, Users 
} from 'lucide-react';

// --- Invite User Modal (Local Definition) ---
interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, orgId }) => {
    const { handleInviteUser } = useAppContext();
    const { projects } = useDataContext();
    const orgProjects = projects.filter(p => p.org_id === orgId);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'WORKER' as User['role'],
        project_id: '',
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Full Name and Email are required.');
            return;
        }
        
        handleInviteUser({
            org_id: orgId,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            project_id: formData.project_id
        });
        
        onClose();
        setFormData({ name: '', email: '', role: 'WORKER', project_id: '' });
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite New User</h3>
                    <p className="text-sm text-gray-500">Add a member to this organization</p>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name">
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="John Doe" />
                    </FormField>
                    <FormField label="Email Address">
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="john@example.com" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Role">
                            <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value as User['role']}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Assign Project">
                            <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option value="">No Project (Org Level)</option>
                                {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </FormField>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border rounded-b-lg">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invitation</Button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

type Tab = 'Overview' | 'Projects' | 'People' | 'Settings';

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org, onBack }) => {
  const { usersList, invitedEmails } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  
  // Combine active users and invited users
  const orgUsers = useMemo(() => {
      const active = usersList.filter(u => u.org_id === org.id);
      const invited = invitedEmails.filter(i => i.org_id === org.id).map(i => ({
          id: i.email, 
          name: i.name, 
          email: i.email, 
          role: i.role, 
          status: 'invited' as const, 
          org_id: i.org_id, 
          avatar_url: '', 
          preferences: {} as any
      }));
      return [...active, ...invited];
  }, [usersList, invitedEmails, org.id]);

  const filteredUsers = useMemo(() => {
      return orgUsers.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [orgUsers, searchQuery]);

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

  // FIX: Safe access for logoUrl
  const logoUrl = org.branding?.logoUrl || 'https://via.placeholder.com/150';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />} className="mb-4 bg-white/10 hover:bg-white/20 text-white border-none">
            Back
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white p-1 shadow-md">
                    <img src={logoUrl} alt={org.name} className="h-full w-full object-contain rounded-lg" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{org.name}</h1>
                    <div className="flex items-center gap-4 text-blue-100 text-sm mt-1">
                        <span className="flex items-center gap-1"><BuildingIcon className="w-3 h-3" /> {org.industry}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {org.country}</span>
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {org.domain}</span>
                        <Badge color={org.status === 'active' ? 'green' : 'gray'} className="bg-white/20 text-white border-none">{org.status.toUpperCase()}</Badge>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">Edit Organization</Button>
                <Button onClick={() => setIsProjectModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg">
                    <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
            </div>
        </div>

        <div className="flex gap-6 mt-8 border-b border-white/20 pb-px">
            {['Overview', 'Projects', 'People', 'Settings'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)}
                    className={`pb-3 text-sm font-medium transition-all border-b-2 ${
                        activeTab === tab 
                        ? 'border-white text-white' 
                        : 'border-transparent text-blue-200 hover:text-white'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"><BuildingIcon className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</p>
                </div>
            </Card>
            <Card className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400"><Users className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
            </Card>
            <Card className="p-6 flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400"><ShieldIcon className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.admins}</p>
                </div>
            </Card>
            
            <Card className="md:col-span-3">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Organization Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div><p className="text-gray-500 mb-1">Industry</p><p className="font-medium text-gray-900 dark:text-white">{org.industry || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1">Country</p><p className="font-medium text-gray-900 dark:text-white">{org.country || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1">Timezone</p><p className="font-medium text-gray-900 dark:text-white">{org.timezone}</p></div>
                    <div><p className="text-gray-500 mb-1">Primary Language</p><p className="font-medium text-gray-900 dark:text-white uppercase">{org.primaryLanguage}</p></div>
                </div>
            </Card>
          </div>
        )}

        {activeTab === 'Projects' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Projects List</h3>
                    <Button onClick={() => setIsProjectModalOpen(true)}>
                        <Plus className="w-5 h-5 mr-2" /> New Project
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orgProjects.map(p => (
                        <Card 
                            key={p.id} 
                            className="hover:border-blue-500 transition-all cursor-pointer group"
                            onClick={() => setSelectedProject(p)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{p.name}</h4>
                                    <p className="text-sm text-gray-500">{p.code}</p>
                                </div>
                                <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                            </div>
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-4">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.location}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Manager: {usersList.find(u => u.id === p.manager_id)?.name || 'Unassigned'}</span>
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
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search people..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <Button onClick={() => setIsInviteModalOpen(true)} className="w-full md:w-auto">
                        <UserPlus className="w-4 h-4 mr-2" /> Invite User
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map(u => (
                        <Card key={u.id} className="flex items-start justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full" /> : (u.name || '?').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{u.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{u.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge color="blue" size="sm">{(u.role || 'User').replace('_', ' ')}</Badge>
                                        {u.status === 'invited' && <Badge color="yellow" size="sm">Invited</Badge>}
                                    </div>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </Card>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No users found matching your search.
                        </div>
                    )}
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

      {/* Modals */}
      <ProjectCreationModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleProjectSubmit}
        users={orgUsers}
      />
      
      <InviteUserModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        orgId={org.id}
      />
    </div>
  );
};

// Icons
const BuildingIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>;
const ShieldIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>;
const UsersIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;