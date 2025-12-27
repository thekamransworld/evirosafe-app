import React, { useState, useMemo } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { FormField } from './ui/FormField';
import { 
  Building, 
  MapPin, 
  Users, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowLeft, 
  MoreVertical,
  Plus,
  Search,
  Mail
} from 'lucide-react';

// --- TYPES ---
type ViewMode = 'list' | 'org-details' | 'project-details';
type ProjectTab = 'Overview' | 'Team' | 'Activities' | 'Safety' | 'Documents';

// --- MODALS ---

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  projectId?: string;
  projectName?: string;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, orgId, projectId, projectName }) => {
    const { handleInviteUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('WORKER');
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (!email || !name) return;
        handleInviteUser({
            email,
            name,
            role,
            org_id: orgId,
            project_ids: projectId ? [projectId] : []
        });
        onClose();
        setEmail('');
        setName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite to {projectName || 'Organization'}</h3>
                    <p className="text-sm text-gray-500 mt-1">Send an invitation to join the team.</p>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" placeholder="John Doe" />
                    </FormField>
                    <FormField label="Email Address">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" placeholder="john@company.com" />
                    </FormField>
                    <FormField label="Role">
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white">
                            <option value="WORKER">Worker</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="HSE_OFFICER">HSE Officer</option>
                            <option value="INSPECTOR">Inspector</option>
                        </select>
                    </FormField>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invitation</Button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; change?: string; icon: React.ReactNode; color?: string }> = ({ title, value, change, icon, color = "text-blue-500" }) => (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-start justify-between shadow-sm">
        <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
            <h4 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</h4>
            {change && <p className="text-xs text-emerald-500 font-medium mt-1">{change}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-gray-50 dark:bg-slate-800 ${color}`}>
            {icon}
        </div>
    </div>
);

const ProjectDetailView: React.FC<{ 
    project: Project; 
    org: Organization; 
    onBack: () => void; 
    users: User[];
}> = ({ project, org, onBack, users }) => {
    const [activeTab, setActiveTab] = useState<ProjectTab>('Overview');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Filter users for this project (mock logic: if they are in the org, we assume they can be assigned)
    const projectTeam = users.filter(u => u.org_id === org.id); 

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                            {project.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                                <Badge color="green">ACTIVE</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{project.code || 'PRJ-001'}</span>
                                <span className="flex items-center gap-1"><MapPin size={14}/> {project.location}</span>
                                <span className="flex items-center gap-1"><Users size={14}/> {projectTeam.length} members</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm">Edit Project</Button>
                        <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
                            <Plus size={16} className="mr-2" />
                            Invite Member
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 mt-8 border-b border-gray-200 dark:border-gray-800">
                    {['Overview', 'Team', 'Activities', 'Safety', 'Documents'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as ProjectTab)}
                            className={`pb-3 text-sm font-medium transition-all relative ${
                                activeTab === tab 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Team Members" value={projectTeam.length} change="+8% from last month" icon={<Users size={24} />} color="text-blue-500" />
                    <StatCard title="Total Activities" value="124" change="+15% from last month" icon={<Activity size={24} />} color="text-purple-500" />
                    <StatCard title="Open Issues" value="3" change="-2 from last week" icon={<AlertTriangle size={24} />} color="text-amber-500" />
                    <StatCard title="Safety Score" value="92%" change="+3% from last month" icon={<ShieldCheck size={24} />} color="text-emerald-500" />
                    
                    {/* Recent Activity Section */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Team Activities</h3>
                        <div className="space-y-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs">User</div>
                                    <div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200"><strong>John Doe</strong> submitted a new safety report.</p>
                                        <p className="text-xs text-gray-500">2 hours ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Team' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Team</h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input type="text" placeholder="Search members..." className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-transparent dark:border-gray-700" />
                            </div>
                            <Button onClick={() => setIsInviteModalOpen(true)}>
                                <Plus size={16} className="mr-2" />
                                Add Member
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {projectTeam.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}`} className="h-8 w-8 rounded-full" alt="" />
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3"><Badge color="blue">{user.role.replace('_', ' ')}</Badge></td>
                                        <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                        <td className="px-4 py-3"><Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge></td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><MoreVertical size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <InviteMemberModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                orgId={org.id}
                projectId={project.id}
                projectName={project.name}
            />
        </div>
    );
};

// --- MAIN COMPONENT ---

export const Organizations: React.FC = () => {
  const { organizations, usersList, activeUser, handleCreateOrganization } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  // Handlers
  const handleOrgClick = (org: Organization) => {
      setSelectedOrg(org);
      setViewMode('org-details');
  };

  const handleProjectClick = (project: Project) => {
      setSelectedProject(project);
      setViewMode('project-details');
  };

  const handleBackToOrgs = () => {
      setSelectedOrg(null);
      setViewMode('list');
  };

  const handleBackToOrgDetails = () => {
      setSelectedProject(null);
      setViewMode('org-details');
  };

  const handleCreateOrgSubmit = (data: any) => {
      handleCreateOrganization({ ...data, domain: 'example.com', timezone: 'GMT' });
      setIsOrgModalOpen(false);
  };

  // --- RENDER: LIST VIEW ---
  if (viewMode === 'list') {
      return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
                    <p className="text-text-secondary">Manage your organizations and workspaces.</p>
                </div>
                {activeUser.role === 'ADMIN' && (
                    <Button onClick={() => setIsOrgModalOpen(true)}>
                        <Plus className="w-5 h-5 mr-2" /> New Organization
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <Card key={org.id} className="hover:border-blue-500 transition-colors cursor-pointer" onClick={() => handleOrgClick(org)}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <Building className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{org.name}</h3>
                                <p className="text-xs text-gray-500">{org.industry} • {org.country}</p>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <span>{projects.filter(p => p.org_id === org.id).length} Projects</span>
                            <span>{usersList.filter(u => u.org_id === org.id).length} Members</span>
                        </div>
                    </Card>
                ))}
            </div>
            {/* Org Creation Modal Placeholder - Reuse existing logic if needed */}
        </div>
      );
  }

  // --- RENDER: ORG DETAILS (PROJECT LIST) ---
  if (viewMode === 'org-details' && selectedOrg) {
      const orgProjects = projects.filter(p => p.org_id === selectedOrg.id);
      return (
          <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                  <Button variant="secondary" size="sm" onClick={handleBackToOrgs} className="!p-2 rounded-full">
                      <ArrowLeft size={20} />
                  </Button>
                  <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedOrg.name}</h1>
                      <p className="text-gray-500">Organization Dashboard</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {orgProjects.map(proj => (
                      <Card key={proj.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleProjectClick(proj)}>
                          <div className="flex justify-between items-start mb-2">
                              <Badge color={proj.status === 'active' ? 'green' : 'gray'}>{proj.status}</Badge>
                              <MoreVertical size={16} className="text-gray-400" />
                          </div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{proj.name}</h3>
                          <p className="text-sm text-gray-500 mb-4">{proj.location}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Users size={14} />
                              <span>{usersList.filter(u => u.org_id === selectedOrg.id).length} Team Members</span>
                          </div>
                      </Card>
                  ))}
                  <button className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center p-6 text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors min-h-[160px]">
                      <Plus size={32} className="mb-2" />
                      <span className="font-medium">Create New Project</span>
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER: PROJECT DETAILS (THE SCREENSHOT VIEW) ---
  if (viewMode === 'project-details' && selectedProject && selectedOrg) {
      return (
          <ProjectDetailView 
            project={selectedProject} 
            org={selectedOrg} 
            onBack={handleBackToOrgDetails} 
            users={usersList}
          />
      );
  }

  return null;
};