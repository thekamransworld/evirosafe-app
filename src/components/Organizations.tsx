import React, { useState } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { 
  Building2, Shield, TrendingUp, TrendingDown, 
  Search, Grid, List, Download, Plus, MapPin, Calendar,
  Briefcase, Users2, Truck, ArrowRight, Globe, MoreVertical
} from 'lucide-react';
import { OrganizationDetails } from './OrganizationDetails';

// --- Organization Creation Modal ---
interface OrganizationCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const OrganizationCreationModal: React.FC<OrganizationCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        industry: 'Construction',
        country: 'United Arab Emirates',
        primaryColor: '#3B82F6'
    });

    const handleSubmit = () => {
        if (!formData.name) return;
        onSubmit({
            ...formData,
            domain: `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.safetypro.com`,
            timezone: 'GMT+4',
            branding: {
                logoUrl: `https://ui-avatars.com/api/?name=${formData.name}&background=${formData.primaryColor.replace('#', '')}&color=fff`,
                primaryColor: formData.primaryColor
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Create Organization
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                        <select value={formData.industry} onChange={e => setFormData(p => ({...p, industry: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                            <option>Construction</option><option>Oil & Gas</option><option>Manufacturing</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                        <select value={formData.country} onChange={e => setFormData(p => ({...p, country: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                            <option>United Arab Emirates</option><option>Saudi Arabia</option><option>Qatar</option>
                        </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-4 flex justify-end gap-3 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create</Button>
                </div>
            </div>
        </div>
    );
};

// --- Quick Stats Component ---
const QuickStats: React.FC<{ title: string; value: number | string; icon: React.ReactNode; change?: number; color?: string; }> = ({ title, value, icon, change, color = 'blue' }) => {
    const colorClasses: any = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-600',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-600',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-600',
    };

    return (
        <Card className={`p-4 border ${colorClasses[color].split(' ')[2]}`}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    {change !== undefined && (
                        <div className="flex items-center mt-1">
                            {change >= 0 ? <TrendingUp className="w-3 h-3 text-green-500 mr-1" /> : <TrendingDown className="w-3 h-3 text-red-500 mr-1" />}
                            <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(change)}%</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[4]}`}>
                    {icon}
                </div>
            </div>
        </Card>
    );
};

export const Organizations: React.FC = () => {
  const { organizations, usersList, activeUser, handleCreateOrganization, setActiveOrg } = useAppContext();
  const { projects, reportList } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overallStats = {
    totalOrgs: organizations.length,
    totalProjects: projects.length,
    totalUsers: usersList.length,
    activeIncidents: reportList.filter(r => r.status !== 'closed').length,
  };

  const handleOpenDetails = (org: Organization) => {
      setActiveOrg(org);
      setSelectedOrgDetails(org);
  };

  // --- CONDITIONAL RENDER: Show Details if selected ---
  if (selectedOrgDetails) {
      return <OrganizationDetails org={selectedOrgDetails} onBack={() => setSelectedOrgDetails(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">Manage your enterprise hierarchy</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
          {activeUser?.role === 'ADMIN' && (
            <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="w-5 h-5 mr-2" /> New Organization
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStats title="Total Organizations" value={overallStats.totalOrgs} icon={<Building2 className="w-6 h-6" />} change={8} color="blue" />
        <QuickStats title="Active Projects" value={overallStats.totalProjects} icon={<Briefcase className="w-6 h-6" />} change={12} color="green" />
        <QuickStats title="Total Users" value={overallStats.totalUsers} icon={<Users2 className="w-6 h-6" />} change={5} color="purple" />
        <QuickStats title="Active Incidents" value={overallStats.activeIncidents} icon={<Shield className="w-6 h-6" />} change={-2} color="amber" />
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white"
            />
          </div>
          <div className="flex border rounded-lg dark:border-dark-border">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-white/10' : ''}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-white/10' : ''}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </Card>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrgs.map(org => {
            const pCount = projects.filter(p => p.org_id === org.id).length;
            const uCount = usersList.filter(u => u.org_id === org.id).length;
            return (
              <Card 
                key={org.id} 
                className="flex flex-col hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1"
                onClick={() => handleOpenDetails(org)} // Added onClick to Card
              >
                <div className="flex-1 p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                        {org.branding?.logoUrl && org.branding.logoUrl.length > 50 ? <img src={org.branding.logoUrl} className="h-full w-full object-cover rounded-xl"/> : org.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-text-primary dark:text-white group-hover:text-blue-600 transition-colors">{org.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400 mt-1">
                          <Globe className="w-3 h-3" /> {org.domain}
                        </div>
                      </div>
                    </div>
                    <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-3 border-y dark:border-gray-700">
                    <div className="text-center"><div className="text-lg font-bold dark:text-white">{pCount}</div><div className="text-xs text-gray-500">Projects</div></div>
                    <div className="text-center"><div className="text-lg font-bold dark:text-white">{uCount}</div><div className="text-xs text-gray-500">Users</div></div>
                    <div className="text-center"><div className="text-lg font-bold dark:text-white">98%</div><div className="text-xs text-gray-500">Safety</div></div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4">
                    <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {org.country}</div>
                    <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date().getFullYear()}</div>
                  </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                  <span className="text-xs text-gray-500">ID: {org.id}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent double firing
                        handleOpenDetails(org);
                    }}
                  >
                    Manage <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card noPadding>
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-500">
                    <tr><th className="p-4 text-left">Organization</th><th className="p-4 text-left">Industry</th><th className="p-4 text-left">Projects</th><th className="p-4 text-left">Users</th><th className="p-4 text-left">Status</th><th className="p-4 text-left">Actions</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                    {filteredOrgs.map(org => (
                        <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => handleOpenDetails(org)}>
                            <td className="p-4 font-medium dark:text-white">{org.name}</td>
                            <td className="p-4"><Badge color="blue">{org.industry}</Badge></td>
                            <td className="p-4">{projects.filter(p => p.org_id === org.id).length}</td>
                            <td className="p-4">{usersList.filter(u => u.org_id === org.id).length}</td>
                            <td className="p-4"><Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge></td>
                            <td className="p-4">
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDetails(org);
                                    }}
                                >
                                    View
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
      )}

      <OrganizationCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={(data) => { handleCreateOrganization(data); setIsModalOpen(false); }} />
    </div>
  );
};