import React, { useState, useMemo } from 'react';
import type { Organization, Project, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectDetails } from './ProjectDetails';
import { 
  ArrowLeft, MapPin, Mail, Phone, Globe, 
  Clock, Calendar, Shield, Users, Briefcase, 
  Plus, Search, Filter, MoreVertical, CheckCircle,
  AlertTriangle 
} from 'lucide-react';

interface OrganizationDetailsProps {
  org: Organization;
  onBack: () => void;
}

type Tab = 'Overview' | 'Projects' | 'People' | 'Settings';

// --- Helper Components ---

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      {icon}
    </div>
  </div>
);

const ContactItem: React.FC<{ icon: React.ReactNode; label: string; value?: string; href?: string }> = ({ icon, label, value, href }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">{value}</a>
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
        )}
      </div>
    </div>
  );
};

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({ org, onBack }) => {
  const { usersList, activeUser } = useAppContext();
  const { projects, handleCreateProject } = useDataContext();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data for this specific organization
  const orgProjects = useMemo(() => projects.filter(p => p.org_id === org.id), [projects, org.id]);
  const orgUsers = useMemo(() => usersList.filter(u => u.org_id === org.id), [usersList, org.id]);

  // Filtered lists based on search
  const filteredProjects = useMemo(() => {
    return orgProjects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [orgProjects, searchQuery]);

  const filteredUsers = useMemo(() => {
    return orgUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [orgUsers, searchQuery]);

  const stats = {
    activeProjects: orgProjects.filter(p => p.status === 'active').length,
    totalUsers: orgUsers.length,
    safetyScore: org.safety_metrics?.safety_score || 0,
    incidentRate: org.safety_metrics?.incident_rate || 0,
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={onBack} 
                className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
                Back
            </Button>
        </div>
        <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4 gap-4">
                <div className="h-24 w-24 rounded-xl bg-white dark:bg-gray-800 p-1 shadow-lg">
                    <img 
                        src={org.branding?.logoUrl || 'https://via.placeholder.com/150'} 
                        alt={org.name} 
                        className="h-full w-full object-contain rounded-lg bg-gray-50" 
                    />
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> {org.industry}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {org.country}</span>
                        <span className="flex items-center gap-1"><Globe className="w-4 h-4"/> {org.domain}</span>
                        <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status.toUpperCase()}</Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    {activeUser?.role === 'ADMIN' && <Button variant="outline">Edit Organization</Button>}
                    <Button onClick={() => setIsProjectModalOpen(true)} leftIcon={<Plus className="w-4 h-4"/>}>New Project</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                {['Overview', 'Projects', 'People', 'Settings'].map((tab) => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)}
                    className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                    `}
                    >
                    {tab}
                    </button>
                ))}
                </nav>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Column */}
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Active Projects" value={stats.activeProjects} icon={<Briefcase className="w-5 h-5 text-blue-600"/>} color="bg-blue-500" />
                    <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5 text-purple-600"/>} color="bg-purple-500" />
                    <StatCard label="Safety Score" value={`${stats.safetyScore}%`} icon={<Shield className="w-5 h-5 text-green-600"/>} color="bg-green-500" />
                    <StatCard label="Incident Rate" value={stats.incidentRate} icon={<AlertTriangle className="w-5 h-5 text-orange-600"/>} color="bg-orange-500" />
                </div>

                <Card title="Operational Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500"/> Working Hours
                            </h4>
                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-sm">
                                <p className="flex justify-between mb-1"><span className="text-gray-500">Timezone:</span> <span className="font-medium">{org.operational_details?.timezone}</span></p>
                                <p className="flex justify-between mb-1"><span className="text-gray-500">Hours:</span> <span className="font-medium">{org.operational_details?.working_hours}</span></p>
                                <p className="flex justify-between"><span className="text-gray-500">Weekend:</span> <span className="font-medium">{org.operational_details?.holidays?.join(', ')}</span></p>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-500"/> Emergency Contacts
                            </h4>
                            <div className="space-y-2">
                                {org.operational_details?.emergency_contacts?.map((contact, i) => (
                                    <div key={i} className="flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                        <div>
                                            <p className="text-xs font-bold text-red-800 dark:text-red-300">{contact.role}</p>
                                            <p className="text-xs text-red-600 dark:text-red-400">{contact.name}</p>
                                        </div>
                                        <a href={`tel:${contact.phone}`} className="text-sm font-bold text-red-600 hover:underline">{contact.phone}</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
                <Card title="Contact Information">
                    <div className="space-y-1">
                        <ContactItem icon={<Phone className="w-4 h-4"/>} label="Phone" value={org.contact_details?.phone} href={`tel:${org.contact_details?.phone}`} />
                        <ContactItem icon={<Mail className="w-4 h-4"/>} label="Email" value={org.contact_details?.email} href={`mailto:${org.contact_details?.email}`} />
                        <ContactItem icon={<Globe className="w-4 h-4"/>} label="Website" value={org.contact_details?.website} href={org.contact_details?.website} />
                        <ContactItem icon={<MapPin className="w-4 h-4"/>} label="Address" value={org.contact_details?.address} />
                        <ContactItem icon={<Users className="w-4 h-4"/>} label="Primary Contact" value={org.contact_details?.contact_person} />
                    </div>
                </Card>

                <Card title="Compliance Status">
                    <div className="text-center p-4">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
                            org.safety_metrics?.compliance_level === 'High' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                            <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{org.safety_metrics?.compliance_level}</h3>
                        <p className="text-sm text-gray-500">Compliance Level</p>
                        <div className="mt-4 text-xs text-gray-400">
                            Last Audit: {org.safety_metrics?.last_audit_date ? new Date(org.safety_metrics.last_audit_date).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                </Card>
            </div>
          </div>
        )}

        {activeTab === 'Projects' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-background text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" leftIcon={<Filter className="w-4 h-4"/>}>Filter</Button>
                        <Button onClick={() => setIsProjectModalOpen(true)} leftIcon={<Plus className="w-4 h-4"/>}>New Project</Button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map(p => (
                        <Card 
                            key={p.id} 
                            className="hover:border-blue-500 transition-all cursor-pointer group"
                            onClick={() => setSelectedProject(p)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{p.name}</h4>
                                        <p className="text-xs text-gray-500">{p.code}</p>
                                    </div>
                                </div>
                                <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400"/> {p.location}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400"/> {new Date(p.start_date).toLocaleDateString()}
                                </div>
                            </div>

                            {p.progress !== undefined && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{p.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t dark:border-dark-border flex justify-between items-center">
                                <div className="flex -space-x-2">
                                    {orgUsers.filter(u => p.team_members?.includes(u.id)).slice(0,3).map(u => (
                                        <img key={u.id} src={u.avatar_url} className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-card" alt={u.name} />
                                    ))}
                                </div>
                                <span className="text-xs text-blue-600 font-medium group-hover:underline">View Dashboard →</span>
                            </div>
                        </Card>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500">No projects found.</p>
                            <Button variant="ghost" className="mt-2" onClick={() => setIsProjectModalOpen(true)}>Create Project</Button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'People' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search people..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-background text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <Button leftIcon={<Plus className="w-4 h-4"/>}>Invite User</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map(u => (
                        <Card key={u.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar_url} alt={u.name} className="w-10 h-10 rounded-full bg-gray-200" />
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</p>
                                    <p className="text-xs text-gray-500">{u.role.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </Card>
                    ))}
                    {filteredUsers.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">No users found.</p>}
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