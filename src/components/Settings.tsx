import React, { useState, useRef, useEffect } from 'react';
import type { User, Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { roles } from '../config';
import { useAppContext } from '../contexts';
import { FormField } from './ui/FormField';
import { Building, Users, Shield, Globe, Bell, Lock, FileText, Upload } from 'lucide-react';

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
  label: string;
  value: Tab;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
  icon?: React.ReactNode;
}> = ({ label, value, activeTab, onClick, icon }) => (
  <button
    onClick={() => onClick(value)}
    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
      activeTab === value
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
    }`}
  >
    {icon && <span className="mr-2">{icon}</span>}
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
  const { activeUser, handleUpdateUser, activeOrg, setActiveOrg, usersList, handleInviteUser } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [editedUser, setEditedUser] = useState<User>(activeUser);
  const [editedOrg, setEditedOrg] = useState<Organization>(activeOrg);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<User['role']>('WORKER');
  const [inviteName, setInviteName] = useState('');

  const [newAvatarPreviewUrl, setNewAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (newAvatarPreviewUrl) {
        URL.revokeObjectURL(newAvatarPreviewUrl);
      }
    };
  }, [newAvatarPreviewUrl]);

  const handleSaveUser = () => {
    const userToUpdate: User = {
      ...editedUser,
      avatar_url: newAvatarPreviewUrl || editedUser.avatar_url,
    };
    handleUpdateUser(userToUpdate);
  };

  const handleSaveOrg = () => {
      setActiveOrg(editedOrg);
  };

  const handleQuickInvite = () => {
      if(!inviteEmail || !inviteName) return;
      handleInviteUser({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          org_id: activeOrg.id
      });
      setInviteEmail('');
      setInviteName('');
      setInviteRole('WORKER');
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

  const userRole = roles.find((r) => r.key === editedUser.role);
  
  // FORCE SHOW ORGANIZATION TAB FOR DEMO (Remove check if strict security needed)
  const isOrgAdmin = true; // ['ADMIN', 'ORG_ADMIN'].includes(activeUser.role);

  // Calculate Role Distribution
  const orgUsers = usersList.filter(u => u.org_id === activeOrg.id);
  const roleCounts = {
      managers: orgUsers.filter(u => u.role === 'HSE_MANAGER').length,
      supervisors: orgUsers.filter(u => u.role === 'SUPERVISOR').length,
      officers: orgUsers.filter(u => u.role === 'HSE_OFFICER').length,
      workers: orgUsers.filter(u => u.role === 'WORKER').length,
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your profile, organization preferences, and system configuration.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10 mb-8 pb-1 overflow-x-auto">
        <TabButton label="Profile" value="Profile" activeTab={activeTab} onClick={setActiveTab} icon={<Users size={16}/>} />
        {isOrgAdmin && (
            <TabButton label="Organization" value="Organization" activeTab={activeTab} onClick={setActiveTab} icon={<Building size={16}/>} />
        )}
        <TabButton label="Preferences" value="Preferences" activeTab={activeTab} onClick={setActiveTab} icon={<Globe size={16}/>} />
        <TabButton label="Security" value="Security" activeTab={activeTab} onClick={setActiveTab} icon={<Lock size={16}/>} />
        <TabButton label="Notifications" value="Notifications" activeTab={activeTab} onClick={setActiveTab} icon={<Bell size={16}/>} />
        <TabButton label="Legal & Compliance" value="Legal & Compliance" activeTab={activeTab} onClick={setActiveTab} icon={<Shield size={16}/>} />
        {activeUser.role === 'ADMIN' && (
          <TabButton label="Platform" value="Platform" activeTab={activeTab} onClick={setActiveTab} icon={<FileText size={16}/>} />
        )}
      </div>

      <div className="space-y-8">
        {/* --- PROFILE TAB --- */}
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
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
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
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload size={16}/>}
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
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={editedUser.email}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 rounded-md text-gray-500 cursor-not-allowed"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
                <FormField label="Mobile Number">
                <input
                    type="tel"
                    value={editedUser.mobile || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, mobile: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                />
                </FormField>

                <FormField label="Designation">
                <input
                    type="text"
                    value={editedUser.designation || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, designation: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                />
                </FormField>
            </div>
            
            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveUser}>Save Profile</Button>
            </div>
          </Section>
        )}

        {/* --- ORGANIZATION TAB (NEW) --- */}
        {activeTab === 'Organization' && isOrgAdmin && (
            <>
            <Section
                title="Organization Profile"
                description="Manage your company details and branding."
            >
                <div className="flex items-center gap-4 mb-4">
                    <img src={editedOrg.branding.logoUrl} alt="Org Logo" className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white object-contain p-2" />
                    <Button variant="secondary" size="sm">Update Logo</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Organization Name">
                        <input 
                            type="text" 
                            value={editedOrg.name} 
                            onChange={e => setEditedOrg({...editedOrg, name: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                        />
                    </FormField>
                    <FormField label="Domain">
                        <input 
                            type="text" 
                            value={editedOrg.domain} 
                            onChange={e => setEditedOrg({...editedOrg, domain: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                        />
                    </FormField>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Industry">
                        <input 
                            type="text" 
                            value={editedOrg.industry} 
                            onChange={e => setEditedOrg({...editedOrg, industry: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                        />
                    </FormField>
                    <FormField label="Primary Language">
                        <select 
                            value={editedOrg.primaryLanguage} 
                            onChange={e => setEditedOrg({...editedOrg, primaryLanguage: e.target.value})}
                            className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
                        >
                            <option value="en">English</option>
                            <option value="ar">Arabic</option>
                            <option value="ur">Urdu</option>
                        </select>
                    </FormField>
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveOrg}>Update Organization</Button>
                </div>
            </Section>

            <Section
                title="Access Control & Team"
                description="Grant access to Managers, Supervisors, and Officers."
            >
                {/* Role Distribution Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-center">
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{roleCounts.managers}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">HSE Managers</div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 text-center">
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{roleCounts.supervisors}</div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Supervisors</div>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 text-center">
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{roleCounts.officers}</div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">HSE Officers</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{roleCounts.workers}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Workers</div>
                    </div>
                </div>

                {/* Quick Invite Form */}
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Quick Invite</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={inviteName}
                            onChange={e => setInviteName(e.target.value)}
                            className="p-2 text-sm border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                        />
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="p-2 text-sm border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                            <select 
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as User['role'])}
                                className="flex-1 p-2 text-sm border border-gray-300 dark:border-white/10 rounded-md bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                            >
                                <option value="HSE_MANAGER">HSE Manager</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="HSE_OFFICER">HSE Officer</option>
                                <option value="INSPECTOR">Inspector</option>
                                <option value="WORKER">Worker</option>
                            </select>
                            <Button size="sm" onClick={handleQuickInvite}>Invite</Button>
                        </div>
                    </div>
                </div>
            </Section>
            </>
        )}

        {/* --- PREFERENCES TAB --- */}
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
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
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
                className="w-full p-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 rounded-md text-gray-900 dark:text-white"
              >
                <option value="dashboard">Dashboard</option>
                <option value="reports">Reporting</option>
                <option value="ptw">Permit to Work</option>
                <option value="inspections">Inspections</option>
                <option value="tbt">Toolbox Talks</option>
                <option value="training">Trainings</option>
              </select>
            </FormField>
            
            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveUser}>Save Preferences</Button>
            </div>
          </Section>
        )}

        {/* --- SECURITY TAB --- */}
        {activeTab === 'Security' && (
          <Section
            title="Access & Security"
            description="Manage your login credentials and view your permissions."
          >
            <FormField label="Current Role">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md">
                  <span className="font-medium text-gray-900 dark:text-white">{userRole?.label || editedUser.role}</span>
                  <Badge color="purple">Active</Badge>
              </div>
            </FormField>

            <FormField label="Permissions">
              <div className="p-4 border border-gray-200 dark:border-white/10 rounded-md max-h-60 overflow-y-auto bg-gray-50 dark:bg-white/5">
                <ul className="space-y-2 text-sm">
                  {userRole?.permissions.map((p) => (
                    <li key={p.resource} className="flex justify-between">
                      <span className="font-semibold capitalize text-gray-700 dark:text-gray-300">
                        {p.resource.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {p.actions.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </FormField>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Reset password
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Securely reset your password via email.
                </p>
              </div>
              <Button variant="secondary" type="button">
                Send Reset Link
              </Button>
            </div>
          </Section>
        )}

        {/* --- NOTIFICATIONS TAB --- */}
        {activeTab === 'Notifications' && (
          <Section
            title="Notifications"
            description="Configure how EviroSafe keeps you informed about safety activity."
          >
            <FormField label="Email notifications">
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" defaultChecked />
                  <span>Incident reports assigned to me</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" defaultChecked />
                  <span>Permit to Work approvals & expiries</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" defaultChecked />
                  <span>Upcoming trainings & toolbox talks</span>
                </label>
              </div>
            </FormField>

            <FormField label="In-app alerts">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                In-app alerts are always enabled for critical safety items
                (Life Saving Rules, emergency incidents, and evacuations).
              </p>
            </FormField>
          </Section>
        )}

        {/* --- LEGAL TAB --- */}
        {activeTab === 'Legal & Compliance' && (
          <Section
            title="Legal & Compliance"
            description="Manage your consents and review key compliance information."
          >
            <ComplianceItem
              title="Data Processing & Privacy"
              action={<Button variant="ghost" size="sm">View Policy</Button>}
            >
              EviroSafe processes data in line with your organization’s
              contractual requirements and local regulations.
            </ComplianceItem>

            <ComplianceItem
              title="Terms of Use"
              action={<Button variant="ghost" size="sm">View Terms</Button>}
            >
              Updated terms apply to all users accessing EviroSafe systems.
            </ComplianceItem>

            <ComplianceItem title="Audit Trail">
              All key safety actions (PTW approvals, RAMS updates, incident
              closures) are logged for auditing and regulatory review.
            </ComplianceItem>
          </Section>
        )}

        {/* --- PLATFORM TAB --- */}
        {activeTab === 'Platform' && activeUser.role === 'ADMIN' && (
          <Section
            title="Platform Administration"
            description="High-level controls for EviroSafe modules and tenant configuration."
          >
            <FormField label="Enabled modules">
              <div className="flex flex-wrap gap-2 text-sm">
                {['Incident Reporting', 'Inspections', 'Permit to Work', 'RAMS', 'Trainings', 'AI Insights'].map(mod => (
                    <span key={mod} className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                    {mod}
                    </span>
                ))}
              </div>
            </FormField>

            <FormField label="AI Assistance">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
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
    </div>
  );
};