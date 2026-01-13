import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { roles } from '../config';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from './ui/Toast';
import type { User } from '../types';

export const OrganizationSettings: React.FC = () => {
  const { activeOrg, activeUser } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Only ADMIN or ORG_ADMIN can see this page
  const canManageAccess = activeUser?.role === 'ADMIN' || activeUser?.role === 'ORG_ADMIN';

  // Fetch users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      if (!activeOrg?.id) return;
      try {
        const q = query(collection(db, 'users'), where('org_id', '==', activeOrg.id));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [activeOrg]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent changing own role to avoid locking yourself out
    if (userId === activeUser?.id) {
        toast.error("You cannot change your own role.");
        return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as User['role'] } : u));
      toast.success("User access level updated.");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role.");
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (userId === activeUser?.id) return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`User marked as ${newStatus}.`);
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  if (!canManageAccess) {
      return (
          <div className="p-8 text-center border-2 border-dashed border-red-200 rounded-xl bg-red-50 dark:bg-red-900/10">
              <h3 className="text-lg font-bold text-red-600">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">Only Administrators can manage user permissions.</p>
          </div>
      )
  }

  if (loading) return <div className="p-8 text-center">Loading users...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Control</h2>
            <p className="text-sm text-gray-500">Manage user roles and permissions for {activeOrg.name}.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase">Total Users</p>
            <p className="text-2xl font-bold text-primary-600">{users.length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Access Level (Role)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      disabled={user.id === activeUser?.id}
                    >
                      {roles.map(r => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={user.status === 'active' ? 'green' : 'red'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== activeUser?.id && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleStatusChange(user.id, user.status === 'active' ? 'suspended' : 'active')}
                        className={user.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
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