import React, { useState } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { roles as rolesData } from '../config';
import { FormField } from './ui/FormField';
import { UserPlus, RefreshCw, MoreVertical, Mail, Phone, Briefcase, Search, Filter } from 'lucide-react';

// --- Invite User Modal ---
const InviteUserModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { activeOrg, handleInviteUser } = useAppContext();
    const { projects } = useDataContext();
    const orgProjects = projects.filter(p => p.org_id === activeOrg.id);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'WORKER' as User['role'],
        project_id: '',
        department: '',
        phone: ''
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
            project_id: formData.project_id,
            department: formData.department,
            phone: formData.phone
        });
        
        onClose();
        setFormData({ name: '', email: '', role: 'WORKER', project_id: '', department: '', phone: '' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-dark-border">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Invite New User</h3>
                    <p className="text-sm text-gray-500">to {activeOrg.name}</p>
                </div>
                <div className="p-6 space-y-4">
                    <FormField label="Full Name"><input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Email Address"><input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" /></FormField>
                        <FormField label="Phone Number"><input type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="+971..." /></FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Role">
                            <select value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value as User['role']}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Department">
                            <select value={formData.department} onChange={e => setFormData(p => ({...p, department: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                                <option value="">Select...</option>
                                <option value="HSE">HSE</option>
                                <option value="Operations">Operations</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Management">Management</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Assign Project">
                        <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white">
                            <option value="">No Project (Org Level)</option>
                            {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </FormField>
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
            const updatedUser = { ...user, project_id: selectedProject ? [selectedProject] : [] }; 
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
  const { usersList, activeOrg, can, activeUser, impersonateUser, invitedEmails } = useAppContext();
  const { projects } = useDataContext();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [reassignUser, setReassignUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const getProjectName = (projectIds?: string[]) => {
      if (!projectIds || projectIds.length === 0) return 'Unassigned';
      // Handle single ID string legacy data
      const pid = Array.isArray(projectIds) ? projectIds[0] : projectIds;
      return projects.find(p => p.id === pid)?.name || 'Unknown Project';
  };

  const allPersonnel = [
    ...usersList.filter(u => u.org_id === activeOrg.id),
    ...invitedEmails.filter(i => i.org_id === activeOrg.id).map(i => ({
        id: i.email, name: i.name, email: i.email, role: i.role, status: 'invited' as const, org_id: i.org_id, avatar_url: '', project_ids: [(i as any).project_id]
    }))
  ].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredPersonnel = allPersonnel.filter(user => {
      const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-white">People & Access</h1>
                <p className="text-text-secondary dark:text-gray-400">Manage users, roles, and project assignments.</p>
            </div>
            {can('create', 'people') && (
                <Button onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Invite User
                </Button>
            )}
        </div>

        <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                    >
                        <option value="All">All Roles</option>
                        {rolesData.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                </div>
            </div>
        </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonnel.map((user: any) => (
              <Card key={user.id} className="hover:border-blue-500 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-lg overflow-hidden">
                            {user.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover"/> : (user.name || '?').charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{user.name || 'Unknown'}</h4>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                          <span className="text-gray-500">Role</span>
                          <Badge color="blue">{(user.role || 'Unknown').replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500">Department</span>
                          <span className="text-gray-900 dark:text-white">{user.department || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500">Project</span>
                          <span className="text-gray-900 dark:text-white truncate max-w-[150px] text-right" title={getProjectName(user.project_ids)}>
                              {getProjectName(user.project_ids)}
                          </span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge>
                      </div>
                  </div>

                  <div className="pt-3 border-t dark:border-dark-border flex justify-end gap-2">
                      {user.phone && (
                          <a href={`tel:${user.phone}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Phone className="w-4 h-4" />
                          </a>
                      )}
                      <a href={`mailto:${user.email}`} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Mail className="w-4 h-4" />
                      </a>
                      {can('update', 'people') && user.status !== 'invited' && (
                        <button onClick={() => setReassignUser(user)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Reassign Project">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                  </div>
              </Card>
          ))}
      </div>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <ReassignModal isOpen={!!reassignUser} onClose={() => setReassignUser(null)} user={reassignUser} />
    </div>
  );
};