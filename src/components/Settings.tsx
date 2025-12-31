import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';

interface SettingsProps {}

type Tab =
  | 'Profile'
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
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
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
  <div className="flex items-center justify-between py-4 border-b border-border-color dark:border-dark-border last:border-b-0">
    <div>
      <p className="font-medium text-text-primary dark:text-white">{title}</p>
      {children && (
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{children}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0 ml-4">{action}</div>}
  </div>
);

// --- LEGAL MODAL ---
const LegalModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string }> = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {content}
                </div>
                <div className="p-6 border-t dark:border-white/10 flex justify-end">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const PRIVACY_POLICY_TEXT = `
**Privacy Policy**

1. **Data Collection**: We collect personal information (name, email, role) and operational data (incidents, permits) to provide HSE management services.
2. **Data Usage**: Data is used for safety reporting, compliance tracking, and audit purposes.
3. **Data Sharing**: We do not share data with third parties unless required by law or for essential service provision (e.g., cloud hosting).
4. **Security**: We implement industry-standard security measures to protect your data.
5. **User Rights**: You have the right to access, correct, or delete your personal data. Contact your organization admin for assistance.

Last Updated: December 2025
`;

const TERMS_OF_USE_TEXT = `
**Terms of Use**

1. **Acceptance**: By using EviroSafe, you agree to these terms.
2. **Authorized Use**: You must use this platform only for legitimate HSE management activities authorized by your organization.
3. **Account Responsibility**: You are responsible for maintaining the confidentiality of your login credentials.
4. **Prohibited Conduct**: You may not misuse the platform, attempt to breach security, or upload malicious content.
5. **Liability**: EviroSafe is a tool to assist in safety management but does not replace professional judgment or legal compliance obligations.

Last Updated: December 2025
`;

export const Settings: React.FC<SettingsProps> = () => {
  const { activeUser, handleUpdateUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [editedUser, setEditedUser] = useState<User>(activeUser);
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Legal Modal State
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; title: string; content: string }>({ isOpen: false, title: '', content: '' });

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
  
  const openLegalModal = (title: string, content: string) => {
      setLegalModal({ isOpen: true, title, content });
  };

  const userRole = roles.find((r) => r.key === editedUser.role);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">Settings</h1>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Manage your profile, preferences, and system settings.
      </p>

      <div className="flex space-x-2 border-b dark:border-dark-border mb-6 overflow-x-auto pb-px">
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
        {activeTab === 'Profile' && (
          <Section
            title="Profile & Identity"
            description="This information will be displayed publicly so be careful what you share."
          >
            <div className="grid grid-cols-3 gap-6">
              <label className="block text-sm font-medium text-text-primary dark:text-white col-span-1 pt-2">
                Profile Picture
              </label>
              <div className="col-span-2">
                <div className="flex items-center space-x-4">
                  <img
                    src={newAvatarPreviewUrl || editedUser.avatar_url}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
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
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, email: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white"
              />
            </FormField>

            <FormField label="Mobile Number">
              <input
                type="tel"
                value={editedUser.mobile || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, mobile: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white"
              />
            </FormField>

            <FormField label="Designation">
              <input
                type="text"
                value={editedUser.designation || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, designation: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white"
              />
            </FormField>

            <FormField label="Company / Contractor">
              <input
                type="text"
                value={editedUser.company || ''}
                onChange={(e) =>
                  setEditedUser({ ...editedUser, company: e.target.value })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white"
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
                      language: e.target.value as 'en' | 'ar',
                    },
                  })
                }
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white dark:bg-dark-background"
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
                className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white dark:bg-dark-background"
              >
                <option value="dashboard">Dashboard</option>
                <option value="reports">Reporting</option>
                <option value="ptw">Permit to Work</option>
                <option value="inspections">Inspections</option>
                <option value="tbt">Toolbox Talks</option>
                <option value="trainings">Trainings</option>
              </select>
            </FormField>

            <div className="pt-4 border-t dark:border-dark-border">
              <Button variant="ghost" size="sm">
                ✨ AI: Optimize My Settings
              </Button>
            </div>
          </Section>
        )}

        {activeTab === 'Security' && (
          <Section
            title="Access & Security"
            description="Manage your login credentials and view your permissions."
          >
            <FormField label="Current Role">
              <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={userRole?.label || editedUser.role}
                    className="w-full p-2 border bg-gray-100 dark:bg-white/5 rounded-md dark:border-dark-border dark:text-white"
                  />
                  <Badge color="blue">{editedUser.role}</Badge>
              </div>
            </FormField>

            <FormField label="Permissions">
              <div className="p-4 border rounded-md max-h-60 overflow-y-auto dark:border-dark-border dark:bg-black/20">
                <ul className="space-y-2 text-sm">
                  {userRole?.permissions.map((p) => (
                    <li key={p.resource}>
                      <span className="font-semibold capitalize text-gray-700 dark:text-gray-300">
                        {p.resource}:{' '}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {p.actions.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </FormField>

            <div className="flex items-center justify-between pt-4 border-t dark:border-dark-border">
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-white">
                  Reset password
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  For security reasons this will redirect you to your
                  organization’s login portal.
                </p>
              </div>
              <Button variant="secondary" type="button">
                Manage Password
              </Button>
            </div>
          </Section>
        )}

        {activeTab === 'Notifications' && (
          <Section
            title="Notifications"
            description="Configure how EviroSafe keeps you informed about safety activity."
          >
            <FormField label="Email notifications">
              <div className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span>Incident reports assigned to me</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span>Permit to Work approvals & expiries</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span>Upcoming trainings & toolbox talks</span>
                </label>
              </div>
            </FormField>

            <FormField label="In-app alerts">
              <p className="text-sm text-text-secondary dark:text-gray-400">
                In-app alerts are always enabled for critical safety items
                (Life Saving Rules, emergency incidents, and evacuations).
              </p>
            </FormField>
          </Section>
        )}

        {activeTab === 'Legal & Compliance' && (
          <Section
            title="Legal & Compliance"
            description="Manage your consents and review key compliance information."
          >
            <ComplianceItem
              title="Data Processing & Privacy"
              action={<Button variant="ghost" onClick={() => openLegalModal('Privacy Policy', PRIVACY_POLICY_TEXT)}>View Policy</Button>}
            >
              EviroSafe processes data in line with your organization’s
              contractual requirements and local regulations.
            </ComplianceItem>

            <ComplianceItem
              title="Terms of Use"
              action={<Button variant="ghost" onClick={() => openLegalModal('Terms of Use', TERMS_OF_USE_TEXT)}>View Terms</Button>}
            >
              Updated terms apply to all users accessing EviroSafe systems.
            </ComplianceItem>

            <ComplianceItem title="Audit Trail">
              All key safety actions (PTW approvals, RAMS updates, incident
              closures) are logged for auditing and regulatory review.
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
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  Incident Reporting
                </span>
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  Inspections
                </span>
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  Permit to Work
                </span>
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  RAMS
                </span>
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  Trainings
                </span>
              </div>
            </FormField>

            <FormField label="AI Assistance">
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                Control whether AI suggestions are available to your users for
                RAMS drafting, incident analysis, and inspection optimization.
              </p>
              <Button variant="secondary" type="button">
                Manage AI Settings
              </Button>
            </FormField>
          </Section>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <Button type="button" onClick={handleSave}>
          Save Changes
        </Button>
      </div>

      <LegalModal 
        isOpen={legalModal.isOpen} 
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })} 
        title={legalModal.title} 
        content={legalModal.content} 
      />
    </div>
  );
};