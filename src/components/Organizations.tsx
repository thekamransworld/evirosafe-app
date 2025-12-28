import React, { useState, useMemo } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { FormField } from './ui/FormField';
import { 
  Building, MapPin, Users, Activity, AlertTriangle, ShieldCheck, 
  ArrowLeft, MoreVertical, Plus, Search, FileText, CheckSquare 
} from 'lucide-react';
import { SafetyPulseWidget } from './SafetyPulseWidget';

// --- TYPES ---
type ViewMode = 'list' | 'org-details' | 'project-details';
type ProjectTab = 'Overview' | 'Team' | 'Activities' | 'Safety' | 'Documents';

// --- MODALS ---

// 1. Create Organization Modal
const CreateOrgModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { handleCreateOrganization } = useAppContext();
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('Construction');
    const [country, setCountry] = useState('United Arab Emirates');

    const handleSubmit = () => {
        if (!name) return;
        handleCreateOrganization({ name, industry, country });
        onClose();
        setName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Organization</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Organization Name">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" placeholder="e.g. EviroSafe Corp" />
                    </FormField>
                    <FormField label="Industry">
                        <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white">
                            <option>Construction</option><option>Oil & Gas</option><option>Manufacturing</option><option>Facility Management</option>
                        </select>
                    </FormField>
                    <FormField label="Country">
                        <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" />
                    </FormField>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create</Button>
                </div>
            </div>
        </div>
    );
};

// 2. Create Project Modal
const CreateProjectModal: React.FC<{ isOpen: boolean, onClose: () => void, orgId: string }> = ({ isOpen, onClose, orgId }) => {
    const { handleCreateProject } = useDataContext();
    const { usersList } = useAppContext();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [location, setLocation] = useState('');
    const [managerId, setManagerId] = useState('');

    const handleSubmit = () => {
        if (!name || !code) return;
        handleCreateProject({ name, code, location, manager_id: managerId, org_id: orgId });
        onClose();
        setName(''); setCode(''); setLocation('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project Name"><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" /></FormField>
                        <FormField label="Project Code"><input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" placeholder="PRJ-001" /></FormField>
                    </div>
                    <FormField label="Location"><input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" /></FormField>
                    <FormField label="Project Manager">
                        <select value={managerId} onChange={e => setManagerId(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white">
                            <option value="">Select Manager</option>
                            {usersList.filter(u => u.org_id === orgId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </FormField>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Project</Button>
                </div>
            </div>
        </div>
    );
};

// 3. Invite Member Modal
const InviteMemberModal: React.FC<{ isOpen: boolean, onClose: () => void, orgId: string, projectId?: string, projectName?: string }> = ({ isOpen, onClose, orgId, projectId, projectName }) => {
    const { handleInviteUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('WORKER');
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (!email || !name) return;
        handleInviteUser({ email, name, role, org_id: orgId, project_ids: projectId ? [projectId] : [] });
        onClose();
        setEmail(''); setName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{projectId ? `Invite to ${projectName}` : 'Invite to Organization'}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name"><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" /></FormField>
                    <FormField label="Email Address"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white" /></FormField>
                    <FormField label="Role">
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white">
                            <option value="WORKER">Worker</option><option value="SUPERVISOR">Supervisor</option><option value="HSE_OFFICER">HSE Officer</option>
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
        <div className={`p-3 rounded-lg bg-gray-50 dark:bg-slate-800 ${color}`}>{icon}</div>
    </div>
);

const ProjectDetailView: React.FC<{ project: Project; org: Organization; onBack: () => void; users: User[]; }> = ({ project, org, onBack, users }) => {
    const [activeTab, setActiveTab] = useState<ProjectTab>('Overview');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const { reportList, ptwList, inspectionList, planList } = useDataContext();

    const projectTeam = users.filter(u => u.org_id === org.id); 
    const projectReports = reportList.filter(r => r.project_id === project.id);
    const projectPtws = ptwList.filter(p => p.project_id === project.id);
    const projectInspections = inspectionList.filter(i => i.project_id === project.id);
    const projectPlans = planList.filter(p => p.project_id === project.id);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 rounded-full"><ArrowLeft size={20} /></Button>
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">{project.name.charAt(0)}</div>
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
                        <Button size="sm" onClick={() => setIsInviteModalOpen(true)}><Plus size={16} className="mr-2" /> Add Member</Button>
                    </div>
                </div>
                <div className="flex gap-6 mt-8 border-b border-gray-200 dark:border-gray-800">
                    {['Overview', 'Team', 'Activities', 'Safety', 'Documents'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab as ProjectTab)} className={`pb-3 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                            {tab}
                            {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Team Members" value={projectTeam.length} change="+8% from last month" icon={<Users size={24} />} color="text-blue-500" />
                    <StatCard title="Active Permits" value={projectPtws.filter(p => p.status === 'ACTIVE').length} icon={<Activity size={24} />} color="text-purple-500" />
                    <StatCard title="Open Incidents" value={projectReports.filter(r => r.status !== 'closed').length} icon={<AlertTriangle size={24} />} color="text-amber-500" />
                    <StatCard title="Inspections Done" value={projectInspections.length} icon={<ShieldCheck size={24} />} color="text-emerald-500" />
                    
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 h-80">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Project Safety Pulse</h3>
                        <SafetyPulseWidget onExpand={() => {}} />
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 h-80 overflow-y-auto">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Activities</h3>
                        <div className="space-y-4">
                            {projectReports.slice(0, 5).map(r => (
                                <div key={r.id} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs text-red-600">Rep</div>
                                    <div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200"><strong>{r.type}</strong> reported.</p>
                                        <p className="text-xs text-gray-500">{new Date(r.reported_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                             {projectPtws.slice(0, 5).map(p => (
                                <div key={p.id} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs text-blue-600">PTW</div>
                                    <div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200">Permit <strong>{p.id}</strong> created.</p>
                                        <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
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
                        <Button onClick={() => setIsInviteModalOpen(true)}><Plus size={16} className="mr-2" /> Add Member</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 uppercase font-medium">
                                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {projectTeam.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-3"><img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}`} className="h-8 w-8 rounded-full" />{user.name}</td>
                                        <td className="px-4 py-3"><Badge color="blue">{user.role.replace('_', ' ')}</Badge></td>
                                        <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                        <td className="px-4 py-3"><Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'Activities' && (
                 <Card title="Project Activities">
                    <div className="space-y-4">
                        {projectPtws.map(ptw => (
                            <div key={ptw.id} className="p-4 border rounded-lg flex justify-between items-center dark:border-gray-700">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{ptw.type} Permit</h4>
                                    <p className="text-sm text-gray-500">{ptw.payload.work.description}</p>
                                </div>
                                <Badge color={ptw.status === 'ACTIVE' ? 'green' : 'gray'}>{ptw.status}</Badge>
                            </div>
                        ))}
                        {projectPtws.length === 0 && <p className="text-gray-500">No active permits.</p>}
                    </div>
                 </Card>
            )}

            {activeTab === 'Safety' && (
                 <Card title="Safety Incidents & Reports">
                    <div className="space-y-4">
                        {projectReports.map(rep => (
                            <div key={rep.id} className="p-4 border rounded-lg flex justify-between items-center dark:border-gray-700">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{rep.type}</h4>
                                    <p className="text-sm text-gray-500">{rep.description}</p>
                                </div>
                                <Badge color={rep.status === 'closed' ? 'green' : 'red'}>{rep.status}</Badge>
                            </div>
                        ))}
                         {projectReports.length === 0 && <p className="text-gray-500">No incidents reported.</p>}
                    </div>
                 </Card>
            )}

            {activeTab === 'Documents' && (
                 <Card title="Project Documents">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {projectPlans.map(plan => (
                            <div key={plan.id} className="p-4 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                                <FileText className="text-blue-500 mb-2" size={24} />
                                <h4 className="font-bold text-gray-900 dark:text-white">{plan.title}</h4>
                                <p className="text-xs text-gray-500">{plan.type} • {plan.version}</p>
                            </div>
                        ))}
                         {projectPlans.length === 0 && <p className="text-gray-500 col-span-3">No plans or documents uploaded.</p>}
                    </div>
                 </Card>
            )}

            <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} orgId={org.id} projectId={project.id} projectName={project.name} />
        </div>
    );
};

// --- MAIN COMPONENT ---
export const Organizations: React.FC = () => {
  const { organizations, usersList, activeUser } = useAppContext();
  const { projects } = useDataContext();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isOrgInviteModalOpen, setIsOrgInviteModalOpen] = useState(false);

  const handleOrgClick = (org: Organization) => { setSelectedOrg(org); setViewMode('org-details'); };
  const handleProjectClick = (project: Project) => { setSelectedProject(project); setViewMode('project-details'); };
  const handleBackToOrgs = () => { setSelectedOrg(null); setViewMode('list'); };
  const handleBackToOrgDetails = () => { setSelectedProject(null); setViewMode('org-details'); };

  if (viewMode === 'list') {
      return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1><p className="text-text-secondary">Manage your organizations and workspaces.</p></div>
                {activeUser.role === 'ADMIN' && <Button onClick={() => setIsOrgModalOpen(true)}><Plus className="w-5 h-5 mr-2" /> New Organization</Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <Card key={org.id} className="hover:border-blue-500 transition-colors cursor-pointer" onClick={() => handleOrgClick(org)}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center"><Building className="text-blue-600" size={24} /></div>
                            <div><h3 className="font-bold text-lg text-gray-900 dark:text-white">{org.name}</h3><p className="text-xs text-gray-500">{org.industry} • {org.country}</p></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <span>{projects.filter(p => p.org_id === org.id).length} Projects</span>
                            <span>{usersList.filter(u => u.org_id === org.id).length} Members</span>
                        </div>
                    </Card>
                ))}
            </div>
            <CreateOrgModal isOpen={isOrgModalOpen} onClose={() => setIsOrgModalOpen(false)} />
        </div>
      );
  }

  if (viewMode === 'org-details' && selectedOrg) {
      const orgProjects = projects.filter(p => p.org_id === selectedOrg.id);
      const orgMembers = usersList.filter(u => u.org_id === selectedOrg.id);
      return (
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                          <Button variant="secondary" size="sm" onClick={handleBackToOrgs} className="!p-2 rounded-full"><ArrowLeft size={20} /></Button>
                          <div className="h-16 w-16 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">{selectedOrg.name.substring(0, 2).toUpperCase()}</div>
                          <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedOrg.name}</h1><div className="flex items-center gap-3 text-sm text-gray-500 mt-1"><span>{selectedOrg.domain}</span><span>•</span><span>{selectedOrg.country}</span><Badge color="green">active</Badge></div></div>
                      </div>
                      <div className="flex gap-2"><Button variant="secondary">Edit Profile</Button><Button onClick={() => setIsProjectModalOpen(true)}><Plus size={16} className="mr-2" /> New Project</Button></div>
                  </div>
              </div>
              <div className="flex justify-end"><Button onClick={() => setIsOrgInviteModalOpen(true)}><Plus size={16} className="mr-2" /> Invite Member</Button></div>
              <Card title="Organization Members">
                  <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 uppercase font-medium"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-800">{orgMembers.map(user => (<tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{user.name}</td><td className="px-4 py-3"><Badge color="blue">{user.role}</Badge></td><td className="px-4 py-3 text-gray-500">{user.email}</td><td className="px-4 py-3"><Badge color="green">{user.status}</Badge></td><td className="px-4 py-3 text-right"><MoreVertical size={16} className="text-gray-400" /></td></tr>))}</tbody></table></div>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{orgProjects.map(proj => (<Card key={proj.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleProjectClick(proj)}><div className="flex justify-between items-start mb-2"><Badge color={proj.status === 'active' ? 'green' : 'gray'}>{proj.status}</Badge><MoreVertical size={16} className="text-gray-400" /></div><h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{proj.name}</h3><p className="text-sm text-gray-500 mb-4">{proj.location}</p><div className="flex items-center gap-2 text-xs text-gray-400"><Users size={14} /><span>{usersList.filter(u => u.org_id === selectedOrg.id).length} Team Members</span></div></Card>))}</div>
              <CreateProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} orgId={selectedOrg.id} />
              <InviteMemberModal isOpen={isOrgInviteModalOpen} onClose={() => setIsOrgInviteModalOpen(false)} orgId={selectedOrg.id} projectName={selectedOrg.name} />
          </div>
      );
  }

  if (viewMode === 'project-details' && selectedProject && selectedOrg) {
      return <ProjectDetailView project={selectedProject} org={selectedOrg} onBack={handleBackToOrgDetails} users={usersList} />;
  }

  return null;
};