import React, { useState } from 'react';
import type { User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { roles as rolesData } from '../config';
import { FormField } from './ui/FormField';
import { Plus, UserPlus, RefreshCw } from 'lucide-react';

// --- Invite User Modal (Updated with Project Selection) ---
const InviteUserModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { activeOrg, handleInviteUser } = useAppContext();
    const { projects } = useDataContext();
    const orgProjects = projects.filter(p => p.org_id === activeOrg.id);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'WORKER' as User['role'],
        project_id: '', // New field
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
            project_id: formData.project_id // Pass project ID
        });
        
        onClose();
        setFormData({ name: '', email: '', role: 'WORKER', project_id: '' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite New User</h3>
                    <p className="text-sm text-gray-500">to {activeOrg.name}</p>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name"><input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                    <FormField label="Email Address"><input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Role">
                            <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value as User['role']}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Assign Project">
                            <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option value="">No Project (Org Level)</option>
                                {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </FormField>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Send Invitation</Button>
                </div>
            </div>
        </div>
    );
};

// --- Reassign Project Modal ---
const ReassignModal: React.FC<{ isOpen: boolean, onClose: () => void, user: User | null }> = ({ isOpen, onClose, user }) => {
    const { activeOrg, handleUpdateUser } = useAppContext();
    const { projects } = useDataContext();
    const orgProjects = projects.filter(p => p.org_id === activeOrg.id);
    const [selectedProject, setSelectedProject] = useState('');

    const handleReassign = () => {
        if (user) {
            // In a real app, you might have a 'project_ids' array. Here we assume single project assignment for simplicity or update a custom field.
            // For this demo, we'll assume we are updating a 'project_id' field on the user object (even if not strictly in type, we simulate it).
            const updatedUser = { ...user, project_id: selectedProject }; 
            handleUpdateUser(updatedUser);
        }
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reassign Project</h3>
                    <p className="text-sm text-gray-500">Move {user.name} to a new project.</p>
                </div>
                <div className="p-6">
                    <FormField label="Select New Project">
                        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                            <option value="">Unassigned</option>
                            {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </FormField>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleReassign}>Confirm Reassignment</Button>
                </div>
            </div>
        </div>
    );
};

export const People: React.FC = () => {
  const { usersList, activeOrg, can, activeUser, impersonateUser, handleApproveUser, invitedEmails } = useAppContext();
  const { projects } = useDataContext();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [reassignUser, setReassignUser] = useState<User | null>(null);

  const getProjectName = (projectId?: string) => {
      if (!projectId) return 'Unassigned';
      return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  // Combine active users and invited users for display
  const allPersonnel = [
    ...usersList.filter(u => u.org_id === activeOrg.id),
    ...invitedEmails.filter(i => i.org_id === activeOrg.id).map(i => ({
        id: i.email, name: i.name, email: i.email, role: i.role, status: 'invited' as const, org_id: i.org_id, avatar_url: '', project_id: (i as any).project_id
    }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">People & Access</h1>
            {can('create', 'people') && (
                <Button onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Invite User
                </Button>
            )}
        </div>
      
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {allPersonnel.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                        {user.avatar_url ? <img src={user.avatar_url} className="h-10 w-10 rounded-full"/> : user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <Badge color="blue">{user.role.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getProjectName(user.project_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    {can('update', 'people') && user.status !== 'invited' && (
                        <button onClick={() => setReassignUser(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Reassign Project">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                    {activeUser?.role === 'ADMIN' && user.status !== 'invited' && (
                        <Button variant="ghost" size="sm" onClick={() => impersonateUser(user.id)}>View As</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <ReassignModal isOpen={!!reassignUser} onClose={() => setReassignUser(null)} user={reassignUser} />
    </div>
  );
};