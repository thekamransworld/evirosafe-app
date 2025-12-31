import React, { useState, useMemo, useEffect } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { roles as rolesData } from '../config';
import { useToast } from './ui/Toast';

// --- HELPER COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; trend?: string; color?: string }> = ({ title, value, trend, color = "text-white" }) => (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
        <div className="flex items-end justify-between mt-2">
            <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
            {trend && <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{trend}</span>}
        </div>
    </div>
);

// --- MODALS ---

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<Project>;
  orgId?: string;
  mode: 'create' | 'edit';
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSubmit, initialData, orgId, mode }) => {
    const [formData, setFormData] = useState({
        name: '', code: '', location: '', type: 'Construction',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: '',
        manager_id: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                code: initialData.code || '',
                location: initialData.location || '',
                type: initialData.type || 'Construction',
                start_date: initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                finish_date: initialData.finish_date ? new Date(initialData.finish_date).toISOString().split('T')[0] : '',
                manager_id: initialData.manager_id || ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = () => {
        if (!formData.name || !formData.code) return alert("Name and Code required");
        onSubmit({ ...formData, org_id: orgId, status: 'active' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card w-full max-w-lg rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-white/10">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{mode === 'create' ? 'Create New Project' : 'Edit Project'}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Project Code</label>
                            <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                        <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white">
                                <option>Construction</option><option>Maintenance</option><option>Shutdown</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t dark:border-white/10 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>{mode === 'create' ? 'Create Project' : 'Save Changes'}</Button>
                </div>
            </div>
        </div>
    );
};

interface OrganizationCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string, industry: string, country: string }) => void;
}

const OrganizationCreationModal: React.FC<OrganizationCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({ name: '', industry: 'Construction', country: 'United Arab Emirates' });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim()) { setError('Name is required.'); return; }
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Organization</h3>
                </div>
                <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="e.g. EGO Corporation" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Industry</label>
                        <input type="text" value={formData.industry} onChange={e => setFormData(p => ({...p, industry: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                        <input type="text" value={formData.country} onChange={e => setFormData(p => ({...p, country: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create</Button>
                </div>
            </div>
        </div>
    );
};

// --- PROJECT DETAIL VIEW ---

const ProjectDetail: React.FC<{ project: Project; onBack: () => void; onUpdate: (p: Project) => void }> = ({ project, onBack, onUpdate }) => {
    const { usersList, invitedEmails, handleInviteUser } = useAppContext();
    const { ptwList, reportList, inspectionList } = useDataContext();
    const { setIsReportCreationModalOpen, setReportInitialData } = useModalContext();
    const toast = useToast();
    
    const [activeTab, setActiveTab] = useState<'Overview' | 'Team' | 'Activities' | 'Info'>('Overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const projectPtws = ptwList.filter(p => p.project_id === project.id);
    const projectReports = reportList.filter(r => r.project_id === project.id);
    const projectInspections = inspectionList.filter(i => i.project_id === project.id);
    
    // Combine Active Users and Invited Users for this Org
    const activeTeam = usersList.filter(u => u.org_id === project.org_id);
    const invitedTeam = invitedEmails.filter(i => i.org_id === project.org_id);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('WORKER');

    const handleInvite = () => {
        if(!inviteEmail) {
            toast.error("Please enter an email address.");
            return;
        }
        
        // Call the context function to add to invitedEmails
        handleInviteUser({ 
            org_id: project.org_id, 
            email: inviteEmail, 
            role: inviteRole, 
            name: inviteEmail.split('@')[0] 
        });
        
        setInviteEmail('');
        toast.success(`Invitation sent to ${inviteEmail}`);
    };

    const handleGenerateReport = () => {
        setReportInitialData({ project_id: project.id });
        setIsReportCreationModalOpen(true);
    };

    const handleEditProject = (data: any) => {
        onUpdate({ ...project, ...data });
        setIsEditModalOpen(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{project.code}</span>
                            <span>•</span>
                            <span>{project.location}</span>
                            <Badge color={project.status === 'active' ? 'green' : 'gray'}>{project.status}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerateReport}>Generate Report</Button>
                    <Button onClick={() => setIsEditModalOpen(true)}>Edit Project</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b dark:border-white/10">
                <nav className="-mb-px flex space-x-6">
                    {['Overview', 'Team', 'Activities', 'Info'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab 
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'Overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Safe Man Hours" value="12,450" trend="+450 this week" color="text-emerald-500" />
                        <StatCard title="Active Permits" value={projectPtws.filter(p => p.status === 'ACTIVE').length} color="text-blue-500" />
                        <StatCard title="Open Incidents" value={projectReports.filter(r => r.status !== 'closed').length} color="text-red-500" />
                        <StatCard title="Inspections Done" value={projectInspections.length} color="text-purple-500" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Recent Incidents">
                            {projectReports.length === 0 ? <p className="text-gray-500 text-sm">No incidents recorded.</p> : (
                                <div className="space-y-3">
                                    {projectReports.slice(0, 3).map(r => (
                                        <div key={r.id} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-red-700 dark:text-red-400 text-sm">{r.type}</span>
                                                <span className="text-xs text-gray-500">{new Date(r.reported_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{r.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card title="Active Work Permits">
                             {projectPtws.filter(p => p.status === 'ACTIVE').length === 0 ? <p className="text-gray-500 text-sm">No active permits.</p> : (
                                <div className="space-y-3">
                                    {projectPtws.filter(p => p.status === 'ACTIVE').slice(0, 3).map(p => (
                                        <div key={p.id} className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">{p.type}</span>
                                                <Badge color="green" size="sm">Active</Badge>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{p.payload.work.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'Team' && (
                <div className="space-y-6">
                    <Card title="Invite Team Member">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="engineer@company.com" />
                            </div>
                            <div className="w-1/3">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white">
                                    {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                </select>
                            </div>
                            <Button onClick={handleInvite}>Invite</Button>
                        </div>
                    </Card>

                    <Card title="Project Team">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500">
                                <tr>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-white/10">
                                {activeTeam.map(u => (
                                    <tr key={u.id}>
                                        <td className="p-3 font-medium">{u.name} <div className="text-xs text-gray-500">{u.email}</div></td>
                                        <td className="p-3"><Badge color="blue">{u.role.replace('_', ' ')}</Badge></td>
                                        <td className="p-3"><Badge color="green">Active</Badge></td>
                                        <td className="p-3 text-right"><Button variant="ghost" size="sm">Manage</Button></td>
                                    </tr>
                                ))}
                                {invitedTeam.map((u, idx) => (
                                    <tr key={`invite-${idx}`}>
                                        <td className="p-3 font-medium text-gray-500">{u.name || u.email} <div className="text-xs text-gray-500">{u.email}</div></td>
                                        <td className="p-3"><Badge color="gray">{u.role.replace('_', ' ')}</Badge></td>
                                        <td className="p-3"><Badge color="yellow">Pending</Badge></td>
                                        <td className="p-3 text-right"><span className="text-xs text-gray-500">Invited</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {activeTab === 'Activities' && (
                <Card title="Project Activity Feed">
                    <div className="space-y-4">
                        {[...projectReports, ...projectPtws, ...projectInspections]
                            .sort((a, b) => new Date((b as any).created_at || (b as any).reported_at).getTime() - new Date((a as any).created_at || (a as any).reported_at).getTime())
                            .slice(0, 10)
                            .map((item: any) => (
                                <div key={item.id} className="flex items-start gap-3 pb-4 border-b dark:border-white/5 last:border-0">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.type || item.title} <span className="text-gray-500 font-normal">was created/updated</span>
                                        </p>
                                        <p className="text-xs text-gray-500">{new Date(item.created_at || item.reported_at || item.schedule_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        }
                        {projectReports.length + projectPtws.length === 0 && <p className="text-gray-500">No recent activity.</p>}
                    </div>
                </Card>
            )}

            {activeTab === 'Info' && (
                <Card title="Project Information">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Project Name</label>
                            <p className="mt-1 text-lg text-gray-900 dark:text-white">{project.name}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Project Code</label>
                            <p className="mt-1 text-lg font-mono text-gray-900 dark:text-white">{project.code}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Start Date</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{new Date(project.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Finish Date</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{new Date(project.finish_date).toLocaleDateString()}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Location</label>
                            <p className="mt-1 text-gray-900 dark:text-white">{project.location}</p>
                        </div>
                    </div>
                </Card>
            )}

            <ProjectModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onSubmit={handleEditProject} 
                initialData={project}
                mode="edit"
            />
        </div>
    );
};

// --- ORGANIZATION DETAIL VIEW ---

const OrganizationDetail: React.FC<{ org: Organization, onBack: () => void }> = ({ org, onBack }) => {
    const { usersList, handleInviteUser, handleUpdateUser, invitedEmails } = useAppContext();
    const { projects, handleCreateProject } = useDataContext();
    const [activeTab, setActiveTab] = useState<'Overview' | 'Projects' | 'Access' | 'Settings'>('Overview');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

    const orgProjects = projects.filter(p => p.org_id === org.id);
    const orgUsers = usersList.filter(u => u.org_id === org.id);
    const orgInvited = invitedEmails.filter(i => i.org_id === org.id);

    // Access Management State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<User['role']>('WORKER');

    const handleInvite = () => {
        if(!inviteEmail) return;
        handleInviteUser({ org_id: org.id, email: inviteEmail, role: inviteRole, name: inviteEmail.split('@')[0] });
        setInviteEmail('');
    };

    const handleRoleChange = (userId: string, newRole: User['role']) => {
        const user = usersList.find(u => u.id === userId);
        if(user) handleUpdateUser({ ...user, role: newRole });
    };

    // Handle project update (mock update in state)
    const handleProjectUpdate = (updatedProject: Project) => {
        // In a real app, this would call an API. Here we just update local state via context if available.
        console.log("Updated Project:", updatedProject);
        setSelectedProject(updatedProject); 
    };

    if (selectedProject) {
        return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} onUpdate={handleProjectUpdate} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
            </div>

            <div className="border-b dark:border-white/10 mb-6">
                <nav className="-mb-px flex space-x-6">
                    {['Overview', 'Projects', 'Access', 'Settings'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Projects" value={orgProjects.length} color="text-blue-500" />
                    <StatCard title="Team Members" value={orgUsers.length} color="text-purple-500" />
                    <StatCard title="Compliance Score" value="94%" color="text-green-500" />
                </div>
            )}

            {activeTab === 'Projects' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Projects</h3>
                        <Button onClick={() => setIsCreateProjectOpen(true)}>+ New Project</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orgProjects.map(p => (
                            <div key={p.id} onClick={() => setSelectedProject(p)} className="group bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 p-5 rounded-xl cursor-pointer hover:border-primary-500 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{p.name}</h4>
                                        <p className="text-sm text-gray-500">{p.location}</p>
                                    </div>
                                    <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                                    <span>Code: {p.code}</span>
                                    <span>•</span>
                                    <span>Start: {new Date(p.start_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        {orgProjects.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">No projects found. Create one to get started.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'Access' && (
                <div className="space-y-6">
                    <Card title="Invite New Member">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="colleague@company.com" />
                            </div>
                            <div className="w-48">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} className="mt-1 w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                    {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                </select>
                            </div>
                            <Button onClick={handleInvite}>Send Invite</Button>
                        </div>
                    </Card>

                    <Card title="Team Members">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-dark-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                {orgUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                                                className="p-1 border rounded bg-transparent text-sm dark:text-white dark:border-dark-border"
                                            >
                                                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                                {orgInvited.map((user, idx) => (
                                    <tr key={`invited-${idx}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{user.name || 'Pending...'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="p-1 text-sm">{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge color="yellow">Invited</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {activeTab === 'Settings' && (
                <div className="space-y-6">
                    <Card title="General Settings">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase">Org Name</label><input type="text" defaultValue={org.name} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase">Domain</label><input type="text" defaultValue={org.domain} className="w-full mt-1 p-2 rounded border dark:bg-black/20 dark:border-white/10 dark:text-white" /></div>
                        </div>
                        <div className="mt-4 flex justify-end"><Button>Save Changes</Button></div>
                    </Card>
                    <Card title="Danger Zone" className="border-red-200 dark:border-red-900">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Suspending the organization will disable access for all users.</p>
                        <Button variant="danger">Suspend Organization</Button>
                    </Card>
                </div>
            )}

            <ProjectModal 
                isOpen={isCreateProjectOpen} 
                onClose={() => setIsCreateProjectOpen(false)} 
                onSubmit={(data) => { handleCreateProject(data); setIsCreateProjectOpen(false); }} 
                orgId={org.id}
                mode="create"
            />
        </div>
    );
};

// --- MAIN COMPONENT ---

export const Organizations: React.FC = () => {
  const { organizations, activeUser, handleCreateOrganization } = useAppContext();
  const { projects } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const getStatusColor = (status: Organization['status']): 'green' | 'gray' => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'gray';
    }
  };

  const handleSubmit = (data: { name: string, industry: string, country: string }) => {
    handleCreateOrganization({ ...data, domain: `${data.name.split(' ')[0].toLowerCase()}.com`, timezone: 'GMT+4' });
    setIsModalOpen(false);
  }

  if (selectedOrg) {
      return <OrganizationDetail org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
        {activeUser.role === 'ADMIN' && (
            <Button onClick={() => setIsModalOpen(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                New Organization
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map(org => {
          const projectCount = projects.filter(p => p.org_id === org.id).length;
          return (
            <Card key={org.id} className="flex flex-col hover:border-primary-500 cursor-pointer transition-all hover:shadow-lg" onClick={() => setSelectedOrg(org)}>
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <img src={org.branding.logoUrl} alt={org.name} className="h-12 w-12 rounded-lg bg-white p-1" />
                    <div>
                      <h3 className="text-lg font-bold text-text-primary dark:text-white">{org.name}</h3>
                      <p className="text-sm text-text-secondary dark:text-gray-400 font-mono">{org.domain}</p>
                    </div>
                  </div>
                  <Badge color={getStatusColor(org.status)}>
                      {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                  </Badge>
              </div>
              <div className="mt-auto pt-4 border-t dark:border-white/10 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{projectCount} Projects</span>
                  <span className="text-sm font-bold text-primary-500">Manage →</span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
          <h4 className="font-bold text-blue-800 dark:text-blue-300">Enterprise Hierarchy</h4>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Organizations are the top-level entities. Inside an Organization, you can create multiple Projects. 
              Users are invited to an Organization and then assigned to specific Projects.
          </p>
      </div>

      <OrganizationCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);