import React, { useState, useRef } from 'react';
import type { User, Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { roles } from '../config';
import { FormField } from './ui/FormField';

// --- ICONS ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;

// --- CUSTOM SWITCH COMPONENT ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

type Tab = 'Profile' | 'Organization' | 'Preferences' | 'Security' | 'Notifications' | 'Legal';

export const Settings: React.FC = () => {
  const { activeUser, handleUpdateUser, activeOrg, usersList, setUsersList, toggleTheme, theme } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  
  // Profile State
  const [editedUser, setEditedUser] = useState<User>(activeUser);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Org State
  const [editedOrg, setEditedOrg] = useState<Organization>(activeOrg);

  const isAdmin = activeUser.role === 'ADMIN' || activeUser.role === 'ORG_ADMIN';

  const handleSaveProfile = () => {
    handleUpdateUser({ ...editedUser, avatar_url: avatarPreview || editedUser.avatar_url });
    alert("Profile updated successfully!");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleUserRoleChange = (userId: string, newRole: User['role']) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleUserStatusChange = (userId: string, newStatus: User['status']) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'Profile', label: 'My Profile', icon: <UserIcon /> },
    { id: 'Organization', label: 'Organization', icon: <BuildingIcon /> },
    { id: 'Preferences', label: 'Preferences', icon: <GlobeIcon /> },
    { id: 'Security', label: 'Security', icon: <ShieldIcon /> },
    { id: 'Notifications', label: 'Notifications', icon: <BellIcon /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account, organization, and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* --- PROFILE TAB --- */}
          {activeTab === 'Profile' && (
            <Card title="Public Profile">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <img 
                      src={avatarPreview || editedUser.avatar_url} 
                      alt="Avatar" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                    />
                    <label className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full text-white cursor-pointer hover:bg-emerald-700 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Allowed: JPG, PNG. Max 2MB.</p>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Full Name">
                      <input type="text" value={editedUser.name} onChange={e => setEditedUser({...editedUser, name: e.target.value})} className="w-full p-2.5 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <FormField label="Email">
                      <input type="email" value={editedUser.email} disabled className="w-full p-2.5 border rounded-lg bg-gray-100 dark:bg-white/5 dark:border-dark-border dark:text-gray-400 cursor-not-allowed" />
                    </FormField>
                    <FormField label="Job Title">
                      <input type="text" value={editedUser.designation || ''} onChange={e => setEditedUser({...editedUser, designation: e.target.value})} className="w-full p-2.5 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                    <FormField label="Mobile">
                      <input type="tel" value={editedUser.mobile || ''} onChange={e => setEditedUser({...editedUser, mobile: e.target.value})} className="w-full p-2.5 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                    </FormField>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleSaveProfile}>Save Changes</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* --- ORGANIZATION TAB --- */}
          {activeTab === 'Organization' && (
            <div className="space-y-6">
              <Card title="Organization Profile">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Company Name">
                    <input type="text" value={editedOrg.name} onChange={e => setEditedOrg({...editedOrg, name: e.target.value})} disabled={!isAdmin} className="w-full p-2.5 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                  </FormField>
                  <FormField label="Industry">
                    <input type="text" value={editedOrg.industry} onChange={e => setEditedOrg({...editedOrg, industry: e.target.value})} disabled={!isAdmin} className="w-full p-2.5 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white" />
                  </FormField>
                </div>
              </Card>

              <Card title="User Management & Access Control">
                {isAdmin ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {usersList.filter(u => u.org_id === activeOrg.id).map(user => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <select 
                                value={user.role} 
                                onChange={(e) => handleUserRoleChange(user.id, e.target.value as any)}
                                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs"
                              >
                                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <Badge color={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {user.status === 'active' ? (
                                <button onClick={() => handleUserStatusChange(user.id, 'suspended' as any)} className="text-red-600 hover:underline text-xs">Suspend</button>
                              ) : (
                                <button onClick={() => handleUserStatusChange(user.id, 'active')} className="text-green-600 hover:underline text-xs">Activate</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>You do not have permission to manage users.</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* --- PREFERENCES TAB --- */}
          {activeTab === 'Preferences' && (
            <Card title="App Preferences">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                    <p className="text-sm text-gray-500">Toggle between light and dark themes.</p>
                  </div>
                  <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Language</h4>
                    <p className="text-sm text-gray-500">Select your preferred interface language.</p>
                  </div>
                  <select className="p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white">
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="ur">Urdu</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* --- SECURITY TAB --- */}
          {activeTab === 'Security' && (
            <Card title="Security Settings">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account.</p>
                  </div>
                  <Button variant="outline" size="sm">Enable 2FA</Button>
                </div>
                <div className="border-t dark:border-dark-border pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Change Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Current Password"><input type="password" className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border" /></FormField>
                    <FormField label="New Password"><input type="password" className="w-full p-2 border rounded-lg dark:bg-dark-background dark:border-dark-border" /></FormField>
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary">Update Password</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* --- NOTIFICATIONS TAB --- */}
          {activeTab === 'Notifications' && (
            <Card title="Notification Preferences">
              <div className="space-y-4">
                {['Email Alerts for Critical Incidents', 'Weekly Safety Summary Report', 'Permit Expiry Reminders', 'New Inspection Assignments'].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b dark:border-dark-border last:border-0">
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    <ToggleSwitch checked={true} onChange={() => {}} />
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};