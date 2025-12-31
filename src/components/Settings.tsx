import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';

// --- IMPORTS FOR SEEDING ---
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { 
  projects, reports, inspections, checklistTemplates, 
  users as initialUsers, organizations 
} from '../data';
import { useToast } from './ui/Toast';

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

export const Settings: React.FC<SettingsProps> = () => {
  const { activeUser, handleUpdateUser } = useAppContext();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  
  // Default user structure to prevent crashes
  const defaultUser: User = {
      id: '', org_id: '', email: '', name: '', avatar_url: '', role: 'WORKER', status: 'active',
      preferences: {
          language: 'en',
          default_view: 'dashboard',
          units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' }
      }
  };

  const [editedUser, setEditedUser] = useState<User>(activeUser || defaultUser);
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when activeUser loads/changes, ensuring preferences exist
  useEffect(() => {
    if (activeUser) {
        const safeUser = {
            ...activeUser,
            preferences: activeUser.preferences || defaultUser.preferences
        };
        setEditedUser(safeUser);
    }
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

  // --- DATABASE SEEDING FUNCTION ---
  const handleSeedDatabase = async () => {
    if (!window.confirm("⚠️ WARNING: This will upload initial data to your database. Continue?")) return;
    
    setIsSeeding(true);
    try {
        const batch = writeBatch(db);

        // 1. Organizations
        organizations.forEach(org => {
            const ref = doc(db, 'organizations', org.id);
            batch.set(ref, org);
        });

        // 2. Users
        initialUsers.forEach(u => {
            const ref = doc(db, 'users', u.id);
            batch.set(ref, u);
        });

        // 3. Projects
        projects.forEach(p => {
            const ref = doc(db, 'projects', p.id);
            batch.set(ref, p);
        });

        // 4. Reports
        reports.forEach(r => {
            const ref = doc(db, 'reports', r.id);
            batch.set(ref, r);
        });

        // 5. Checklist Templates
        checklistTemplates.forEach(t => {
            const ref = doc(db, 'checklist_templates', t.id);
            batch.set(ref, t);
        });

        // 6. Inspections (if any in mock data)
        inspections.forEach(i => {
            const ref = doc(db, 'inspections', i.id);
            batch.set(ref, i);
        });

        await batch.commit();
        toast.success("Database populated successfully! Refreshing...");
        setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
        console.error("Seeding failed:", error);
        toast.error(`Seeding failed: ${error.message}`);
    } finally {
        setIsSeeding(false);
    }
  };

  if (!activeUser) return <div className="p-8 text-center">Loading settings...</div>;

  const userRole = roles.find((r) => r.key === editedUser.role);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">Settings</h1>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Manage your profile, preferences, and system settings.
      </p>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-dark-border mb-6 overflow-x-auto pb-px">
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
              <label className="block text-sm font-medium text-text-primary dark:text-gray-300 col-span-1 pt-2">
                Profile Picture
              </label>
              <div className="col-span-2">
                <div className="flex items-center space-x-4">
                  <img
                    src={newAvatarPreviewUrl || editedUser.avatar_url}
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
                value={editedUser.preferences?.language || 'en'}
                onChange={(e) =>
                  setEditedUser({
                    ...editedUser,
                    preferences: {
                      ...(editedUser.preferences || defaultUser.preferences),
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
                value={editedUser.preferences?.default_view || 'dashboard'}
                onChange={(e) =>
                  setEditedUser({
                    ...editedUser,
                    preferences: {
                      ...(editedUser.preferences || defaultUser.preferences),
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
                <option value="training">Trainings</option>
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
                className="w-full p-2 border bg-gray-100 rounded-md dark:bg-white/5 dark:border-dark-border dark:text-gray-300"
              />
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
          </Section>
        )}

        {activeTab === 'Legal & Compliance' && (
          <Section
            title="Legal & Compliance"
            description="Manage your consents and review key compliance information."
          >
            <ComplianceItem
              title="Data Processing & Privacy"
              action={<Button variant="ghost">View Policy</Button>}
            >
              EviroSafe processes data in line with your organization’s
              contractual requirements and local regulations.
            </ComplianceItem>

            <ComplianceItem
              title="Terms of Use"
              action={<Button variant="ghost">View Terms</Button>}
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
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Database Management</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                    Your database is currently live. If you see empty screens, you can seed the database with initial demo data.
                </p>
                <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                    {isSeeding ? 'Uploading Data...' : '🚀 Seed Database with Demo Data'}
                </Button>
            </div>

            <FormField label="Enabled modules">
              <div className="flex flex-wrap gap-2 text-sm">
                {['Incident Reporting', 'Inspections', 'Permit to Work', 'RAMS', 'Trainings'].map(m => (
                    <span key={m} className="px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    {m}
                    </span>
                ))}
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
    </div>
  );
};