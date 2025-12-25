import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';

interface SettingsProps {}

type Tab =
  | 'Profile'
  | 'Organization'
  | 'Preferences'
  | 'Security'
  | 'Notifications'
  | 'Legal & Compliance'
  | 'Platform';

const TabButton: React.FC<{
  label: Tab;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
}> = ({ label, activeTab, onClick }) => (
  <button
    onClick={() => onClick(label)}
    className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
      activeTab === label
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
    }`}
  >
    {label}
  </button>
);

const Section: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <Card>
    <div className="md:grid md:grid-cols-3 md:gap-6">
      <div className="md:col-span-1">
        <h3 className="text-lg font-medium leading-6 text-text-primary dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">{description}</p>
      </div>
      <div className="mt-5 md:mt-0 md:col-span-2">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  </Card>
);

const ComplianceItem: React.FC<{
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, children, action }) => (
  <div className="flex items-center justify-between py-4 border-b border-border-color dark:border-gray-700 last:border-b-0">
    <div>
      <p className="font-medium text-text-primary dark:text-white">{title}</p>
      {children && (
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{children}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

export const Settings: React.FC<SettingsProps> = () => {
  const { activeUser, handleUpdateUser, activeOrg, setCurrentView } = useAppContext();
  
  const isAdmin = activeUser?.role === 'ADMIN' || activeUser?.role === 'ORG_ADMIN';

  // Default to Organization tab if Admin, otherwise Profile
  const [activeTab, setActiveTab] = useState<Tab>(isAdmin ? 'Organization' : 'Profile');
  
  const [editedUser, setEditedUser] = useState<User>(activeUser || {} as User);
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeUser) setEditedUser(activeUser);
  }, [activeUser]);

  useEffect(() => {
    return () => {
      if (newAvatarPreviewUrl) {
        URL.revokeObjectURL(newAvatarPreviewUrl);
      }
    };
  }, [newAvatarPreviewUrl]);

  const handleSave = () => {
    const userToUpdate: User = {
      ...editedUser,
      avatar_url: newAvatarPreviewUrl || editedUser.avatar_url,
    };
    handleUpdateUser(userToUpdate);
    alert("Settings saved successfully!");
  };

  const handlePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (newAvatarPreviewUrl) {
      URL.revokeObjectURL(newAvatarPreviewUrl);
    }
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setNewAvatarPreviewUrl(previewUrl);
    }
  };

  const handleChoosePictureClick = () => {
    fileInputRef.current?.click();
  };

  const userRole = roles.find((r) => r.key === editedUser.role);

  if (!activeUser) return null;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">Settings</h1>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Manage your profile, preferences, and system settings.
      </p>

      <div className="flex space-x-2 border-b dark:border-gray-700 mb-6 overflow-x-auto pb-px">
        {isAdmin && <TabButton label="Organization" activeTab={activeTab} onClick={setActiveTab} />}
        <TabButton label="Profile" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Preferences" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Security" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Notifications" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Legal & Compliance" activeTab={activeTab} onClick={setActiveTab} />
        {activeUser.role === 'ADMIN' && (
          <TabButton label="Platform" activeTab={activeTab} onClick={setActiveTab} />
        )}
      </div>

      <div className="space-y-8">
        {activeTab === 'Organization' && isAdmin && (
            <Section 
                title="Organization Settings" 
                description="Manage your organization details and team access."
            >
                <div className="flex items-center space-x-4 mb-6">
                    <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-3xl font-bold text-gray-600 dark:text-gray-300">
                        {activeOrg.branding?.logoUrl && activeOrg.branding.logoUrl.length > 50 ? (
                            <img src={activeOrg.branding.logoUrl} alt="Logo" className="h-full w-full object-contain rounded-lg" />
                        ) : (
                            activeOrg.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeOrg.name}</h3>
                        <p className="text-sm text-gray-500">{activeOrg.domain}</p>
                        <Badge color={activeOrg.status === 'active' ? 'green' : 'gray'}>{activeOrg.status}</Badge>
                    </div>
                </div>

                <FormField label="Organization Name">
                    <input type="text" defaultValue={activeOrg.name} className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white" />
                </FormField>

                <FormField label="Industry">
                    <input type="text" defaultValue={activeOrg.industry} className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white" />
                </FormField>

                <div className="pt-4 border-t dark:border-gray-700">
                    <h4 className="text-md font-bold text-gray-900 dark:text-white mb-2">Team Access & Roles</h4>
                    <p className="text-sm text-gray-500 mb-4">Manage who can access your organization and their permissions.</p>
                    <Button onClick={() => setCurrentView('people')}>
                        Manage Team Members
                    </Button>
                </div>
            </Section>
        )}

        {activeTab === 'Profile' && (
          <Section
            title="Profile & Identity"
            description="This information will be displayed publicly so be careful what you share."
          >
            <div className="grid grid-cols-3 gap-6">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-300 col-span-1 pt-2">
                Profile Picture
              </label>
              <div className="col-span-2">
                <div className="flex items-center space-x-4">
                  <img
                    src={newAvatarPreviewUrl || editedUser.avatar_url || 'https://via.placeholder.com/150'}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border dark:border-gray-600"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePictureChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleChoosePictureClick}
                  >
                    Change Picture
                  </Button>
                </div>
              </div>
            </div>

            <FormField label="Full Name">
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, name: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={editedUser.email}
                readOnly
                className="w-full p-2 border bg-gray-100 dark:bg-white/5 rounded-md dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </FormField>

            <FormField label="Mobile Number">
              <input
                type="tel"
                value={editedUser.mobile || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, mobile: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white"
              />
            </FormField>

            <FormField label="Designation">
              <input
                type="text"
                value={editedUser.designation || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, designation: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white"
              />
            </FormField>
          </Section>
        )}

        {activeTab === 'Preferences' && (
          <Section
            title="Preferences & Display"
            description="Customize how EviroSafe looks and feels for you."
          >
            <FormField label="Language">
              <select
                value={editedUser.preferences.language}
                onChange={(e) =>
                  setEditedUser({
                    ...editedUser,
                    preferences: {
                      ...editedUser.preferences,
                      language: e.target.value,
                    },
                  })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white dark:bg-dark-background"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="ur">Urdu</option>
                <option value="hi">Hindi</option>
              </select>
            </FormField>

            <FormField label="Default Home Screen">
              <select
                value={editedUser.preferences.default_view}
                onChange={(e) =>
                  setEditedUser({
                    ...editedUser,
                    preferences: {
                      ...editedUser.preferences,
                      default_view: e.target.value as any,
                    },
                  })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-gray-600 dark:text-white dark:bg-dark-background"
              >
                <option value="dashboard">Dashboard</option>
                <option value="reports">Reporting</option>
                <option value="ptw">Permit to Work</option>
                <option value="inspections">Inspections</option>
              </select>
            </FormField>
          </Section>
        )}

        {activeTab === 'Security' && (
          <Section
            title="Access & Security"
            description="Manage your login credentials and view your permissions."
          >
            <FormField label="Current Role">
              <input
                type="text"
                readOnly
                value={userRole?.label || editedUser.role}
                className="w-full p-2 border bg-gray-100 rounded-md dark:bg-white/5 dark:border-gray-600 dark:text-gray-400"
              />
            </FormField>

            <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-white">
                  Password
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Last changed 3 months ago.
                </p>
              </div>
              <Button variant="secondary" type="button">
                Change Password
              </Button>
            </div>
          </Section>
        )}

        {activeTab === 'Notifications' && (
          <Section
            title="Notifications"
            description="Configure how EviroSafe keeps you informed about safety activity."
          >
            <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" defaultChecked />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email me when incidents are assigned to me</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" defaultChecked />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email me for Permit to Work approvals</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Weekly safety summary report</span>
                </label>
            </div>
          </Section>
        )}

        {activeTab === 'Legal & Compliance' && (
          <Section
            title="Legal & Compliance"
            description="Manage your consents and review key compliance information."
          >
            <ComplianceItem
              title="Data Processing & Privacy"
              action={<Button variant="ghost" size="sm">View Policy</Button>}
            >
              EviroSafe processes data in line with your organization’s contractual requirements.
            </ComplianceItem>

            <ComplianceItem
              title="Terms of Use"
              action={<Button variant="ghost" size="sm">View Terms</Button>}
            >
              Updated terms apply to all users accessing EviroSafe systems.
            </ComplianceItem>
          </Section>
        )}

        {activeTab === 'Platform' && activeUser.role === 'ADMIN' && (
          <Section
            title="Platform Administration"
            description="High-level controls for EviroSafe modules and tenant configuration."
          >
            <FormField label="Enabled modules">
              <div className="flex flex-wrap gap-2 text-sm">
                {['Incident Reporting', 'Inspections', 'Permit to Work', 'RAMS', 'Trainings', 'AI Insights'].map(mod => (
                    <span key={mod} className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    {mod}
                    </span>
                ))}
              </div>
            </FormField>
          </Section>
        )}
      </div>

      <div className="flex justify-end mt-8 pt-4 border-t dark:border-gray-700">
        <Button type="button" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};