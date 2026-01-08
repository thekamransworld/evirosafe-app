import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';
import { useToast } from './ui/Toast';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import { writeBatch, doc, setDoc } from 'firebase/firestore';
import { 
  projects, reports, inspections, checklistTemplates, 
  users as initialUsers, organizations, plans, rams, signs 
} from '../data';

// --- EMAIL SERVICE IMPORT ---
import { sendInviteEmail } from '../services/emailService';

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
  const { activeUser, handleUpdateUser, usersList, activeOrg, handleInviteUser } = useAppContext();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [editedUser, setEditedUser] = useState<User>(activeUser || {} as User);
  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<User['role']>('WORKER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if(activeUser) setEditedUser(activeUser);
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
    toast.success("Profile updated successfully");
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

  // --- INVITE MEMBER LOGIC ---
  const handleSendInvite = async () => {
      if(!inviteEmail || !inviteName) {
          toast.error("Please fill in name and email");
          return;
      }
      
      setIsSendingInvite(true);

      // Create new user object
      const newUser: User = {
          id: `user_${Date.now()}`,
          org_id: activeOrg.id,
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
          status: 'invited',
          avatar_url: `https://ui-avatars.com/api/?name=${inviteName}&background=random`,
          preferences: {
              language: 'en',
              default_view: 'dashboard',
              units: { temperature: 'C', wind_speed: 'km/h', height: 'm', weight: 'kg' }
          }
      };

      try {
          // 1. Save to Firestore (So they can log in later)
          await setDoc(doc(db, 'users', newUser.id), newUser);
          
          // 2. Update Local State
          handleInviteUser(newUser);
          
          // 3. Send Real Email via EmailJS
          await sendInviteEmail(
              inviteEmail, 
              inviteName, 
              inviteRole, 
              activeOrg.name, 
              activeUser?.name || 'Admin'
          );
          
          setInviteEmail('');
          setInviteName('');
          toast.success(`Invitation sent to ${inviteEmail}`);
      } catch (e: any) {
          console.error(e);
          toast.error("Failed to send invite. Check console.");
      } finally {
          setIsSendingInvite(false);
      }
  };

  // --- DATABASE SEEDING LOGIC ---
  const handleSeedDatabase = async () => {
    if (!window.confirm("⚠️ WARNING: This will upload initial data to your database. Continue?")) return;
    
    setIsSeeding(true);
    try {
        const batch = writeBatch(db);

        organizations.forEach(org => {
            const ref = doc(db, 'organizations', org.id);
            batch.set(ref, org);
        });

        initialUsers.forEach(u => {
            const ref = doc(db, 'users', u.id);
            batch.set(ref, u);
        });

        projects.forEach(p => {
            const ref = doc(db, 'projects', p.id);
            batch.set(ref, p);
        });

        reports.forEach(r => {
            const ref = doc(db, 'reports', r.id);
            batch.set(ref, r);
        });

        checklistTemplates.forEach(t => {
            const ref = doc(db, 'checklist_templates', t.id);
            batch.set(ref, t);
        });

        inspections.forEach(i => {
            const ref = doc(db, 'inspections', i.id);
            batch.set(ref, i);
        });
        
        plans.forEach(p => {
            const ref = doc(db, 'plans', p.id);
            batch.set(ref, p);
        });

        rams.forEach(r => {
            const ref = doc(db, 'rams', r.id);
            batch.set(ref, r);
        });

        signs.forEach(s => {
            const ref = doc(db, 'signs', s.id);
            batch.set(ref, s);
        });

        await batch.commit();
        toast.success("Database populated successfully! Refresh the page.");
        setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
        console.error("Seeding failed:", error);
        toast.error(`Seeding failed: ${error.message}`);
    } finally {
        setIsSeeding(false);
    }
  };

  if (!activeUser) return null;

  const userRole = roles.find((r) => r.key === editedUser.role);
  const isAdmin = activeUser.role === 'ADMIN' || activeUser.role === 'ORG_ADMIN';

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-2">Settings</h1>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Manage your profile, preferences, and system settings.
      </p>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-dark-border mb-6 overflow-x-auto pb-px">
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
            
            <div className="flex justify-end mt-4">
                <Button type="button" onClick={handleSave}>Save Profile</Button>
            </div>
          </Section>
        )}

        {/* --- ORGANIZATION TAB --- */}
        {activeTab === 'Organization' && isAdmin && (
            <>
            <Section title="Organization Details" description="Manage your company branding and details.">
                <div className="flex items-center gap-4 mb-4">
                    <img src={activeOrg.branding.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg border dark:border-gray-700" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeOrg.name}</h3>
                        <p className="text-sm text-gray-500">{activeOrg.industry} • {activeOrg.country}</p>
                    </div>
                </div>
                <FormField label="Company Name">
                    <input type="text" defaultValue={activeOrg.name} className="w-full p-2 border bg-transparent rounded-md dark:border-dark-border dark:text-white" />
                </FormField>
                <FormField label="Domain">
                    <input type="text" defaultValue={activeOrg.domain} disabled className="w-full p-2 border bg-gray-100 rounded-md dark:bg-white/5 dark:border-dark-border dark:text-gray-400 cursor-not-allowed" />
                </FormField>
            </Section>

            <Section title="Team Management" description="Invite new members and manage access roles.">
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border dark:border-dark-border mb-6">
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Invite New Member</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={inviteName}
                            onChange={e => setInviteName(e.target.value)}
                            className="p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white text-sm"
                        />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white text-sm"
                        />
                        <div className="flex gap-2">
                            <select 
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as User['role'])}
                                className="p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white text-sm flex-1"
                            >
                                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                            <Button onClick={handleSendInvite} disabled={isSendingInvite}>
                                {isSendingInvite ? 'Sending...' : 'Invite'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden border rounded-lg dark:border-dark-border">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                            {usersList.filter(u => u.org_id === activeOrg.id).map(user => (
                                <tr key={user.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{roles.find(r => r.key === user.role)?.label || user.role}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <Badge color={user.status === 'active' ? 'green' : 'yellow'}>{user.status}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-3">Edit</button>
                                        <button className="text-red-600 hover:text-red-800 dark:text-red-400">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
            </>
        )}

        {activeTab === 'Preferences' && (
          <Section
            title="Preferences & Display"
            description="Customize how EviroSafe looks and feels for you."
          >
            <FormField label="Language">
              <select
                value={editedUser.preferences?.language || 'en'} // FIX: Safe access
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
                value={editedUser.preferences?.default_view || 'dashboard'} // FIX: Safe access
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
                <option value="training">Trainings</option>
              </select>
            </FormField>
            
            <div className="flex justify-end mt-4">
                <Button type="button" onClick={handleSave}>Save Preferences</Button>
            </div>
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