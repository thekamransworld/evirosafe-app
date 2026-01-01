import React, { useState } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Organizations</h1>
        {activeUser?.role === 'ADMIN' && (
            <Button onClick={() => setIsModalOpen(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                New Organization
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map(org => {
          const projectCount = projects.filter(p => p.org_id === org.id).length;
          const userCount = usersList.filter(u => u.org_id === org.id).length;

          return (
            <Card key={org.id} className="flex flex-col">
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <img src={org.branding?.logoUrl || 'https://via.placeholder.com/50'} alt={org.name} className="h-12 w-12 rounded-lg" />
                        <div>
                          <h3 className="text-lg font-bold text-text-primary dark:text-white">{org.name}</h3>
                          <p className="text-sm text-text-secondary dark:text-gray-400 font-mono">{org.domain}</p>
                        </div>
                      </div>
                      <Badge color={getStatusColor(org.status)}>
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                      </Badge>
                  </div>
                  <div className="mt-4 flex space-x-6 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{projectCount}</div>
                      <div>Projects</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{userCount}</div>
                      <div>Users</div>
                    </div>
                  </div>
              </div>
              <div className="mt-6 border-t dark:border-dark-border pt-4 flex justify-end space-x-2">
                  <Button variant="secondary" size="sm">Settings</Button>
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

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);