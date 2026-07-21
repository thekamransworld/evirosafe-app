import React, { useState } from 'react';
import { useAppContext } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import {
  User, Bell, Shield, Globe, Moon, Sun,
  Save, ChevronRight, Lock, Smartphone, Database
} from 'lucide-react';

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="giq-card overflow-hidden">
    <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>{children}</div>
  </div>
);

const Row: React.FC<{ label: string; sub?: string; children: React.ReactNode }> = ({ label, sub, children }) => (
  <div className="flex items-center justify-between px-6 py-4">
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
    <div className="flex-shrink-0 ml-4">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button onClick={onChange}
    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
    style={{ background: checked ? '#10b981' : 'var(--border-strong)' }}>
    <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
      style={{ transform: checked ? 'translateX(16px)' : 'translateX(2px)' }} />
  </button>
);

export const Settings: React.FC = () => {
  const { activeUser, usersList } = useAppContext();
  const { theme, toggle } = useTheme();

  const [profile, setProfile] = useState({
    name:       activeUser?.name || '',
    email:      activeUser?.email || '',
    phone:      (activeUser as any)?.phone || '',
    department: (activeUser as any)?.department || '',
  });

  const [notifs, setNotifs] = useState({
    incidents:    true,
    permits:      true,
    inspections:  true,
    training:     false,
    digest:       true,
  });

  const [privacy, setPrivacy] = useState({
    twoFactor:     false,
    sessionAlerts: true,
    dataExport:    true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: '#ef4444', ORG_ADMIN: '#f59e0b', HSE_MANAGER: '#10b981', SUPERVISOR: '#3b82f6', WORKER: '#8b5cf6',
  };
  const roleColor = ROLE_COLORS[activeUser?.role || ''] || '#10b981';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="giq-page-title">Settings</h1>
        <p className="giq-page-subtitle mt-1">Manage your account preferences and platform settings</p>
      </div>

      {/* Profile card */}
      <div className="giq-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: roleColor }}>
            {activeUser?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{activeUser?.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{activeUser?.email}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: `${roleColor}15`, color: roleColor }}>
              {activeUser?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full Name',   key: 'name',       type: 'text' },
            { label: 'Email',       key: 'email',      type: 'email' },
            { label: 'Phone',       key: 'phone',      type: 'tel' },
            { label: 'Department',  key: 'department', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
              <input type={f.type} value={(profile as any)[f.key]}
                onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: saved ? 'rgba(16,185,129,0.1)' : '#10b981', color: saved ? '#10b981' : 'white' }}>
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <Section title="Appearance" subtitle="Customise how GuardIQ looks for you">
        <Row label="Theme" sub="Choose between light and dark mode">
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <button onClick={() => theme !== 'light' && toggle()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={theme === 'light' ? { background: '#10b981', color: 'white' } : { color: 'var(--text-muted)' }}>
              <Sun className="w-3.5 h-3.5" />Light
            </button>
            <button onClick={() => theme !== 'dark' && toggle()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={theme === 'dark' ? { background: '#10b981', color: 'white' } : { color: 'var(--text-muted)' }}>
              <Moon className="w-3.5 h-3.5" />Dark
            </button>
          </div>
        </Row>
        <Row label="Language" sub="Interface language">
          <select className="text-xs py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
            <option>English</option>
            <option>العربية</option>
            <option>اردو</option>
          </select>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" subtitle="Choose what you want to be notified about">
        <Row label="Incident Reports" sub="New reports and status changes">
          <Toggle checked={notifs.incidents} onChange={() => setNotifs(p => ({ ...p, incidents: !p.incidents }))} />
        </Row>
        <Row label="Permit to Work" sub="PTW approvals and expirations">
          <Toggle checked={notifs.permits} onChange={() => setNotifs(p => ({ ...p, permits: !p.permits }))} />
        </Row>
        <Row label="Inspections" sub="Scheduled and overdue inspections">
          <Toggle checked={notifs.inspections} onChange={() => setNotifs(p => ({ ...p, inspections: !p.inspections }))} />
        </Row>
        <Row label="Training Expiry" sub="Certificates expiring within 30 days">
          <Toggle checked={notifs.training} onChange={() => setNotifs(p => ({ ...p, training: !p.training }))} />
        </Row>
        <Row label="Daily Digest" sub="Morning summary of open items">
          <Toggle checked={notifs.digest} onChange={() => setNotifs(p => ({ ...p, digest: !p.digest }))} />
        </Row>
      </Section>

      {/* Security */}
      <Section title="Security" subtitle="Protect your account">
        <Row label="Two-Factor Authentication" sub="Add an extra layer of security">
          <Toggle checked={privacy.twoFactor} onChange={() => setPrivacy(p => ({ ...p, twoFactor: !p.twoFactor }))} />
        </Row>
        <Row label="Session Alerts" sub="Notify on new login from unknown device">
          <Toggle checked={privacy.sessionAlerts} onChange={() => setPrivacy(p => ({ ...p, sessionAlerts: !p.sessionAlerts }))} />
        </Row>
        <Row label="Change Password">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            Update
          </button>
        </Row>
      </Section>

      {/* Platform info */}
      <Section title="Platform" subtitle="GuardIQ system information">
        <Row label="Version"><span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>v2.0.0</span></Row>
        <Row label="Organisation"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeUser?.org_id || 'N/A'}</span></Row>
        <Row label="Total Users"><span className="text-xs font-semibold" style={{ color: '#10b981' }}>{usersList.length}</span></Row>
        <Row label="Data Export">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            Export All Data
          </button>
        </Row>
      </Section>
    </div>
  );
};