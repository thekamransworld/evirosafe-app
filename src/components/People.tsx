import React, { useState } from 'react';
import type { User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { roles as rolesData } from '../config';
import { FormField } from './ui/FormField';

const hseRoles: User['role'][] = ['HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR'];

// --- Invite User Modal ---
const InviteUserModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { activeOrg, handleInviteUser } = useAppContext();
    const { projects } = useDataContext();
    const orgProjects = projects.filter(p => p.org_id === activeOrg.id);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'WORKER' as User['role'],
        project_ids: [] as string[],
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Full Name and Email are required.');
            return;
        }
        
        handleInviteUser({
            org_id: activeOrg.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
        });
        
        onClose();
        setFormData({ name: '', email: '', role: 'WORKER', project_ids: [] });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">Invite New User</h3>
                    <p className="text-sm text-text-secondary">to {activeOrg.name}</p>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name"><input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border bg-transparent rounded-md" /></FormField>
                    <FormField label="Email Address"><input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border bg-transparent rounded-md" /></FormField>
                    <div>
                        <FormField label="Organization Role">
                            <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value as User['role']}))} className="w-full p-2 border bg-transparent rounded-md">
                                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                        </FormField>
                        {hseRoles.includes(formData.role) && <p className="text-xs text-amber-600 mt-1">Note: This role requires approval from an administrator after sign-up.</p>}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invitation</Button>
                </div>
            </div>
        </div>
    );
};


export const People: React.FC = () => {
  const { usersList, activeOrg, can, activeUser, impersonateUser, handleApproveUser, invitedEmails } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allPersonnel = [
    ...usersList.filter(u => u.org_id === activeOrg.id),
    ...invitedEmails
        .filter(i => i.org_id === activeOrg.id)
        .map(i => ({ // Map to a User-like structure for rendering
            id: i.email, // Use email as key since there's no id
            name: i.name,
            email: i.email,
            role: i.role,
            status: 'invited' as const,
            org_id: i.org_id,
            avatar_url: `https://ui-avatars.com/api/?name=${i.name.replace(/\s+/g, '+')}&background=E9D5FF&color=7C3AED`,
        }))
  ].sort((a, b) => a.name.localeCompare(b.name));


  const getStatusColor = (status: User['status']): 'green' | 'yellow' | 'gray' | 'purple' => {
    switch (status) {
      case 'active': return 'green';
      case 'invited': return 'yellow';
      case 'pending_approval': return 'purple';
      case 'inactive': return 'gray';
      default: return 'gray';
    }
  };

  const getRoleColor = (role: User['role']): 'blue' | 'purple' | 'gray' => {
      switch (role) {
          case 'ADMIN':
          case 'ORG_ADMIN': return 'purple';
          case 'HSE_MANAGER':
          case 'SUPERVISOR': return 'blue';
          default: return 'gray';
      }
  }
  
  const canImpersonate = activeUser?.role === 'ADMIN';
  const canApprove = can('update', 'people');

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-text-primary">People & Access</h1>
            {can('create', 'people') && (
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Invite User
                </Button>
            )}
        </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {allPersonnel.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow border border-border-color">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img className="h-12 w-12 rounded-full" src={user.avatar_url} alt={`${user.name}'s avatar`} />
                  <div className="ml-4">
                    <div className="text-base font-bold text-text-primary">{user.name}</div>
                    <div className="text-sm text-text-secondary">{user.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                    {canApprove && user.status === 'pending_approval' ? (
                        <Button size="sm" onClick={() => handleApproveUser(user.id)}>Approve</Button>
                    ) : user.status !== 'invited' ? (
                        <a href="#" className="text-primary-600 hover:text-primary-900 font-semibold text-sm">Edit</a>
                    ) : null}
                    {canImpersonate && user.id !== activeUser?.id && user.status !== 'invited' && (
                        <Button variant="ghost" size="sm" onClick={() => impersonateUser(user.id)}>View As</Button>
                    )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <Badge color={getRoleColor(user.role)}>{user.role.replace(/_/g, ' ')}</Badge>
                <Badge color={getStatusColor(user.status)}>{user.status.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allPersonnel.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <Badge color={getRoleColor(user.role)}>{user.role.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={getStatusColor(user.status)}>{user.status.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    {canImpersonate && user.id !== activeUser?.id && user.status !== 'invited' && (
                        <Button variant="ghost" size="sm" onClick={() => impersonateUser(user.id)}>View As</Button>
                    )}
                    {canApprove && user.status === 'pending_approval' ? (
                        <Button size="sm" onClick={() => handleApproveUser(user.id)}>Approve</Button>
                    ) : user.status !== 'invited' ? (
                        <a href="#" className="text-primary-600 hover:text-primary-900">Edit</a>
                    ) : (
                        <span className="text-sm text-gray-500 pr-4">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <InviteUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

// Icon
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);