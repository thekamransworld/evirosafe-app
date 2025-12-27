import React, { useState } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import type { User } from '../types';
import { roles } from '../config';

export const OrganizationSettings: React.FC = () => {
  const { activeOrg, usersList, handleUpdateUser, activeUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users belonging to this organization
  const orgUsers = usersList.filter(u => u.org_id === activeOrg.id);
  
  const filteredUsers = orgUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = (userId: string, newRole: User['role']) => {
    const user = usersList.find(u => u.id === userId);
    if (user) {
      handleUpdateUser({ ...user, role: newRole });
    }
  };

  const handleStatusChange = (userId: string, newStatus: User['status']) => {
    const user = usersList.find(u => u.id === userId);
    if (user) {
      handleUpdateUser({ ...user, status: newStatus });
    }
  };

  // Only ADMIN or ORG_ADMIN can see this
  if (activeUser?.role !== 'ADMIN' && activeUser?.role !== 'ORG_ADMIN') {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have permission to manage organization settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeOrg.name} Team</h2>
            <p className="text-sm text-gray-500">Manage access and roles for your organization members.</p>
          </div>
          <div className="flex gap-2">
             <input 
                type="text" 
                placeholder="Search users..." 
                className="p-2 border rounded-md text-sm bg-transparent dark:border-gray-700 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <Button>Invite New User</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-10 w-10 rounded-full" src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}`} alt="" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-black/20 dark:border-gray-700 dark:text-white"
                        disabled={user.id === activeUser.id} // Can't change own role
                    >
                        {roles.map(r => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={user.status === 'active' ? 'green' : 'red'}>
                        {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.id !== activeUser.id && (
                        <button 
                            onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'suspended' : 'active')}
                            className={`text-xs font-semibold ${user.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};