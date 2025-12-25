import React, { useState, useMemo } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { 
  ArrowLeft, ArrowRight, Building2, Users, Briefcase, Settings, 
  Plus, Search, Globe, MapPin, Calendar, Shield, 
  BarChart3, MoreVertical, Edit, Trash2, Mail, UserPlus
} from 'lucide-react';
import { ProjectDetails } from './ProjectDetails';
import { FormField } from './ui/FormField';
import { roles as rolesData } from '../config';

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

// --- MODALS ---

const CreateProjectModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (data: any) => void, orgId: string }> = ({ isOpen, onClose, onSubmit, orgId }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        location: '',
        type: 'Construction',
        start_date: new Date().toISOString().split('T')[0],
        finish_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    const handleSubmit = () => {
        if (!formData.name || !formData.code) return;
        onSubmit({ ...formData, org_id: orgId, status: 'active' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Project Name">
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project Code">
                            <input type="text" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                        <FormField label="Type">
                            <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option>Construction</option><option>Maintenance</option><option>Shutdown</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Location">
                        <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date">
                            <input type="date" value={formData.start_date} onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                        <FormField label="Finish Date">
                            <input type="date" value={formData.finish_date} onChange={e => setFormData(p => ({...p, finish_date: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                        </FormField>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-4 flex justify-end gap-3 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Project</Button>
                </div>
            </div>
        </div>
    );
};

const InviteMemberModal: React.FC<{ isOpen: boolean, onClose: () => void, onInvite: (data: any) => void, orgId: string }> = ({ isOpen, onClose, onInvite, orgId }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'WORKER'
    });

    const handleSubmit = () => {
        if (!formData.email) return;
        onInvite({ ...formData, org_id: orgId });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite Member</h3>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name">
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <FormField label="Email Address">
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <FormField label="Role">
                        <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                            {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                    </FormField>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-4 flex justify-end gap-3 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invite</Button>
                </div>
            </div>
        </div>
    );
};

const EditOrgModal: React.FC<{ isOpen: boolean, onClose: () => void, org: Organization }> = ({ isOpen, onClose, org }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Organization</h3>
                <p className="text-gray-500 mb-6">Edit functionality would go here (name, domain, branding).</p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={onClose}>Save Changes</Button>
                </div>
            </div>
        </div>
    )
}

// --- MAIN COMPONENT ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 p-4 rounded-xl flex items-center justify-between shadow-sm">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
            {icon}
        </div>
    </div>
);

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org, onBack }) => {
  const { usersList, activeUser, handleInviteUser } = useAppContext();
  const { projects, reportList, handleCreateProject } = useDataContext();
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Projects' | 'Team' | 'Settings'>('Overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  const orgUsers = useMemo(() => usersList.filter(u => u.org_id === org.id), [usersList, org.id]);
  const orgIncidents = useMemo(() => reportList.filter(r => r.org_id === org.id), [reportList, org.id]);

  // Stats
  const stats = {
      totalProjects: orgProjects.length,
      activeProjects: orgProjects.filter(p => p.status === 'active' || p.status === 'Active').length,
      totalUsers: orgUsers.length,
      safetyScore: 94, // Mock aggregate score
      openIncidents: orgIncidents.filter(r => r.status !== 'closed').length
  };

  // If a project is selected, show the Project Dashboard instead
  if (selectedProject) {
      return <ProjectDetails project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                </Button>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {org.branding?.logoUrl && org.branding.logoUrl.length > 50 ? (
                            <img src={org.branding.logoUrl} alt={org.name} className="h-full w-full object-cover rounded-xl" />
                        ) : (
                            org.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {org.domain}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {org.country}</span>
                            <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(true)}><Edit className="w-4 h-4 mr-2" /> Edit Profile</Button>
                <Button variant="primary" onClick={() => setIsProjectModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Project</Button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-gray-200 dark:border-white/10">
            {['Overview', 'Projects', 'Team', 'Settings'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-3 text-sm font-medium transition-colors relative ${
                        activeTab === tab 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    {tab}
                    {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
            ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Total Projects" value={stats.totalProjects} icon={<Briefcase className="w-6 h-6 text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/20" />
                      <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-6 h-6 text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/20" />
                      <StatCard title="Safety Score" value={`${stats.safetyScore}%`} icon={<Shield className="w-6 h-6 text-emerald-600" />} color="bg-emerald-100 dark:bg-emerald-900/20" />
                      <StatCard title="Open Incidents" value={stats.openIncidents} icon={<BarChart3 className="w-6 h-6 text-amber-600" />} color="bg-amber-100 dark:bg-amber-900/20" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card title="Recent Projects">
                          <div className="space-y-3">
                              {orgProjects.slice(0, 3).map(project => (
                                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                      <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                              {project.name.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                                              <p className="text-xs text-gray-500">{project.location}</p>
                                          </div>
                                      </div>
                                      <Button size="sm" variant="ghost" onClick={() => setSelectedProject(project)}>View</Button>
                                  </div>
                              ))}
                              {orgProjects.length === 0 && (
                                  <div className="text-center py-8">
                                      <p className="text-sm text-gray-500">No projects yet for {org.name}.</p>
                                      <p className="text-xs text-gray-400 mt-1">Create a project to start managing your HSE operations.</p>
                                      <Button size="sm" className="mt-3" onClick={() => setIsProjectModalOpen(true)}>Create First Project</Button>
                                  </div>
                              )}
                          </div>
                      </Card>

                      <Card title="Organization Health">
                          <div className="space-y-4">
                              {[
                                  { label: 'Compliance Rate', value: 92, color: 'bg-green-500' },
                                  { label: 'Training Completion', value: 78, color: 'bg-blue-500' },
                                  { label: 'Equipment Status', value: 88, color: 'bg-purple-500' },
                              ].map((item, i) => (
                                  <div key={i}>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                                          <span className="font-bold text-gray-900 dark:text-white">{item.value}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                  </div>
              </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'Projects' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold dark:text-white">All Projects</h3>
                      <Button onClick={() => setIsProjectModalOpen(true)}><Plus className="w-4 h-4 mr-2"/> New Project</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {orgProjects.map(project => (
                          <Card key={project.id} className="hover:shadow-lg transition-shadow group">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                                      {project.name.charAt(0)}
                                  </div>
                                  <Badge color={project.status === 'active' || project.status === 'Active' ? 'green' : 'gray'}>
                                      {project.status.toUpperCase()}
                                  </Badge>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{project.name}</h3>
                              <p className="text-sm text-gray-500 mb-4">{project.location}</p>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                  <div className="bg-gray-50 dark:bg-white/5 p-2 rounded">
                                      <span className="block text-xs text-gray-400">Start Date</span>
                                      {new Date(project.start_date).toLocaleDateString()}
                                  </div>
                                  <div className="bg-gray-50 dark:bg-white/5 p-2 rounded">
                                      <span className="block text-xs text-gray-400">Progress</span>
                                      {project.progress || 0}%
                                  </div>
                              </div>

                              <div className="pt-4 border-t dark:border-gray-700 flex justify-end">
                                  <Button variant="secondary" size="sm" onClick={() => setSelectedProject(project)}>
                                      Open Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                                  </Button>
                              </div>
                          </Card>
                      ))}
                      {orgProjects.length === 0 && (
                          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-500">No projects found.</p>
                              <Button className="mt-4" onClick={() => setIsProjectModalOpen(true)}>Create Project</Button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'Team' && (
              <Card>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Organization Members</h3>
                      <Button onClick={() => setIsInviteModalOpen(true)}><UserPlus className="w-4 h-4 mr-2"/> Invite Member</Button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                              <tr>
                                  <th className="p-4">Name</th>
                                  <th className="p-4">Role</th>
                                  <th className="p-4">Email</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-800">
                              {orgUsers.map(user => (
                                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                      <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                                              {user.name.charAt(0)}
                                          </div>
                                          {user.name}
                                      </td>
                                      <td className="p-4"><Badge color="blue">{user.role.replace('_', ' ')}</Badge></td>
                                      <td className="p-4 text-gray-500">{user.email}</td>
                                      <td className="p-4"><Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge></td>
                                      <td className="p-4 text-right">
                                          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                              <MoreVertical className="w-4 h-4" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </Card>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'Settings' && (
              <div className="max-w-2xl">
                  <Card title="General Settings">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization Name</label>
                              <input type="text" defaultValue={org.name} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
                              <input type="text" defaultValue={org.domain} disabled className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-white/5 dark:border-dark-border dark:text-gray-400 cursor-not-allowed" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                                  <select defaultValue={org.industry} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                                      <option>Construction</option>
                                      <option>Oil & Gas</option>
                                      <option>Manufacturing</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                                  <select defaultValue={org.timezone} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                                      <option>GMT+4 (Dubai)</option>
                                      <option>GMT+3 (Riyadh)</option>
                                      <option>GMT+0 (London)</option>
                                  </select>
                              </div>
                          </div>
                          <div className="pt-4 flex justify-end">
                              <Button>Save Changes</Button>
                          </div>
                      </div>
                  </Card>
                  
                  <div className="mt-6">
                      <Card title="Danger Zone" className="border-red-200 dark:border-red-900/30">
                          <div className="flex items-center justify-between">
                              <div>
                                  <h4 className="font-medium text-red-600 dark:text-red-400">Suspend Organization</h4>
                                  <p className="text-sm text-gray-500">Temporarily disable access for all users.</p>
                              </div>
                              <Button variant="danger">Suspend</Button>
                          </div>
                      </Card>
                  </div>
              </div>
          )}
      </div>

      {/* MODALS */}
      <CreateProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onSubmit={handleCreateProject} orgId={org.id} />
      <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInvite={handleInviteUser} orgId={org.id} />
      <EditOrgModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} org={org} />
    </div>
  );
};