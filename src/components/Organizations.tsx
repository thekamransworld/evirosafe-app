import React, { useState } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { OrganizationDetails } from './OrganizationDetails';
import { 
  Plus, Building, Shield, Users, 
  Briefcase, MapPin, Globe, MoreVertical 
} from 'lucide-react';

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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
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
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const getStatusColor = (status: Organization['status']): 'green' | 'gray' => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'gray';
      default: return 'gray';
    }
  };

  const handleSubmit = (data: { name: string, industry: string, country: string }) => {
    handleCreateOrganization(data);
    setIsModalOpen(false);
  }

  if (selectedOrg) {
      return <OrganizationDetails org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
            <p className="text-text-secondary dark:text-gray-400">Manage your company entities and subsidiaries.</p>
        </div>
        {activeUser?.role === 'ADMIN' && (
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                New Organization
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map(org => {
          const projectCount = projects.filter(p => p.org_id === org.id).length;
          const userCount = usersList.filter(u => u.org_id === org.id).length;
          const safetyScore = org.safety_metrics?.safety_score || 0;

          return (
            <Card 
                key={org.id} 
                className="flex flex-col cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg group"
                onClick={() => setSelectedOrg(org)}
            >
              <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                            {org.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text-primary dark:text-white group-hover:text-blue-500 transition-colors">{org.name}</h3>
                          <p className="text-sm text-text-secondary dark:text-gray-400 font-mono">{org.domain}</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-white">
                          <MoreVertical className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
                          <span className="block text-lg font-bold text-gray-900 dark:text-white">{projectCount}</span>
                          <span className="text-[10px] text-gray-500 uppercase">Projects</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
                          <span className="block text-lg font-bold text-gray-900 dark:text-white">{userCount}</span>
                          <span className="text-[10px] text-gray-500 uppercase">Users</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
                          <span className={`block text-lg font-bold ${safetyScore >= 90 ? 'text-green-500' : safetyScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>{safetyScore}%</span>
                          <span className="text-[10px] text-gray-500 uppercase">Safety</span>
                      </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span>{org.industry}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{org.country}</span>
                      </div>
                  </div>
              </div>
              
              <div className="mt-5 border-t dark:border-dark-border pt-4 flex justify-between items-center">
                  <Badge color={getStatusColor(org.status)}>
                      {org.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-blue-500 font-medium group-hover:underline">Manage Organization →</span>
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