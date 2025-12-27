import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';
import { OrganizationSettings } from './OrganizationSettings'; // <--- IMPORTED

interface SettingsProps {}

type Tab =
  | 'Profile'
  | 'Organization' // <--- NEW TAB
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
    className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
      activeTab === label
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
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
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
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
  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-white/10 last:border-b-0">
    <div>
      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
      {children && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{children}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

export const Settings: React.FC<SettingsProps> = () => {
  const { activeUser, handleUpdateUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [editedUser, setEditedUser] = useState<User>(activeUser);
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const isAdmin = activeUser.role === 'ADMIN' || activeUser.role === 'ORG_ADMIN';

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Manage your profile, preferences, and system settings.
      </p>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-white/10 mb-6 overflow-x-auto pb-px">
        <TabButton label="Profile" activeTab={activeTab} onClick={setActiveTab} />
        {isAdmin && <TabButton label="Organization" activeTab={activeTab} onClick={setActiveTab} />}
        <TabButton label="Preferences" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Security" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Notifications" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Legal & Compliance" activeTab={activeTab} onClick={setActiveTab} />
        {activeUser.role === 'ADMIN' && (
          <TabButton label="Platform" activeTab={activeTab} onClick={setActiveTab} />
        )}
      </div>

      <div className="space-y-8">
        {activeTab === 'Profile' && (
          <Section
            title="Profile & Identity"
            description="This information will be displayed publicly so be careful what you share."
          >
            <div className="grid grid-cols-3 gap-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 col-span-1 pt-2">
                Profile Picture
              </label>
              <div className="col-span-2">
                <div className="flex items-center space-x-4">
                  <img
                    src={newAvatarPreviewUrl || editedUser.avatar_url}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-white/10"
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
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md dark:text-white"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, email: e.target.value })
                }
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md dark:text-white"
              />
            </FormField>

            <FormField label="Mobile Number">
              <input
                type="tel"
                value={editedUser.mobile || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, mobile: e.target.value })
                }
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md dark:text-white"
              />
            </FormField>

            <FormField label="Designation">
              <input
                type="text"
                value={editedUser.designation || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, designation: e.target.value })
                }
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md dark:text-white"
              />
            </FormField>

            <FormField label="Company / Contractor">
              <input
                type="text"
                value={editedUser.company || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, company: e.target.value })
                }
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md dark:text-white"
              />
            </FormField>
            
            <div className="flex justify-end mt-4">
                <Button type="button" onClick={handleSave}>
                Save Profile
                </Button>
            </div>
          </Section>
        )}

        {/* NEW ORGANIZATION TAB */}
        {activeTab === 'Organization' && isAdmin && (
            <OrganizationSettings />
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
                      language: e.target.value as 'en' | 'ar',
                    },
                  })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-white/10 dark:text-white"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
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
                      default_view:
                        e.target.value as User['preferences']['default_view'],
                    },
                  })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-white/10 dark:text-white"
              >
                <option value="dashboard">Dashboard</option>
                <option value="reports">Reporting</option>
                <option value="ptw">Permit to Work</option>
                <option value="inspections">Inspections</option>
                <option value="tbt">Toolbox Talks</option>
                <option value="trainings">Trainings</option>
              </select>
            </FormField>
            
            <div className="flex justify-end mt-4">
                <Button type="button" onClick={handleSave}>
                Save Preferences
                </Button>
            </div>
          </Section>
        )}

        {/* ... (Other tabs remain similar) ... */}
      </div>
    </div>
  );
};