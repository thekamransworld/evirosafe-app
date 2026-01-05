import React, { useState, useMemo } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { OrganizationDetails } from './OrganizationDetails';
import { Search, Plus } from 'lucide-react';

// --- Organization Creation Modal ---
interface OrganizationCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; industry: string; country: string }) => void;
}

const OrganizationCreationModal: React.FC<OrganizationCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        industry: 'Construction',
        country: 'United Arab Emirates',
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.industry.trim() || !formData.country.trim()) {
            setError('All fields are required.');
            return;
        }
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

export const Organizations: React.FC = () => {
  const { organizations, usersList, activeUser, handleCreateOrganization } = useAppContext();
  const { projects } = useDataContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const getStatusColor = (status: Organization['status']): 'green' | 'gray' => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'gray';
      default: return 'gray';
    }
  };

  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [organizations, searchQuery]);

  const handleSubmit = (data: { name: string, industry: string, country: string }) => {
    handleCreateOrganization(data);
    setIsModalOpen(false);
  }

  // --- RENDER DETAILS VIEW IF ORG SELECTED ---
  if (selectedOrg) {
      return <OrganizationDetails org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage companies and their projects</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search organizations..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm w-full md:w-64 focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                />
            </div>
            {activeUser?.role === 'ADMIN' && (
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    New Org
                </Button>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrgs.map(org => {
          const projectCount = projects.filter(p => p.org_id === org.id).length;
          const userCount = usersList.filter(u => u.org_id === org.id).length;

          return (
            <Card 
                key={org.id} 
                className="flex flex-col hover:border-primary-500 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setSelectedOrg(org)}
            >
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center p-2">
                             <img src={org.branding?.logoUrl || '/logo.svg'} alt={org.name} className="max-h-full max-w-full" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text-primary dark:text-white">{org.name}</h3>
                          <p className="text-sm text-text-secondary dark:text-gray-400 font-mono">{org.domain}</p>
                        </div>
                      </div>
                      <Badge color={getStatusColor(org.status)}>
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                      </Badge>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{projectCount}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold">Projects</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{userCount}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold">Users</div>
                    </div>
                  </div>
              </div>
              <div className="mt-6 border-t dark:border-dark-border pt-4 flex justify-center">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">View Details & Projects â†’</span>
              </div>
            </Card>
          )
        })}
      </div>

      <OrganizationCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};