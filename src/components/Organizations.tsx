import React, { useState, useMemo } from 'react';
import type { Organization } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { OrganizationDetails } from './OrganizationDetails';
import {
  Plus, Search, Building2, X, Globe, Users, Briefcase, MapPin,
} from 'lucide-react';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  active:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Active' },
  suspended: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Suspended' },
};

const PLAN_CFG: Record<string, { color: string; bg: string }> = {
  Free:         { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  Basic:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  Professional: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Enterprise:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
};

// ─── Add Organization Modal ────────────────────────────────────────────────────

const AddOrgModal: React.FC<{ onClose: () => void; onCreate: (data: any) => void }> = ({ onClose, onCreate }) => {
  const [name, setName]         = useState('');
  const [domain, setDomain]     = useState('');
  const [industry, setIndustry] = useState('Construction');
  const [country, setCountry]   = useState('Saudi Arabia');
  const [error, setError]       = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Organization name is required.'); return; }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onCreate({
      name: name.trim(),
      slug,
      domain: domain.trim(),
      status: 'active',
      timezone: 'Asia/Riyadh',
      primaryLanguage: 'en',
      secondaryLanguages: [],
      branding: { logoUrl: '' },
      industry,
      country,
      created_at: new Date().toISOString(),
      subscription: { plan: 'Free', seats: 10, renewal_date: '', features: [] },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="giq-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Organization</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Organization Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Construction Co."
              className="giq-input w-full" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="acme.com"
              className="giq-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="giq-input w-full">
                {['Construction', 'Oil & Gas', 'Manufacturing', 'Logistics', 'Healthcare', 'Utilities', 'Other'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Country</label>
              <input value={country} onChange={e => setCountry(e.target.value)} className="giq-input w-full" />
            </div>
          </div>

          {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="giq-btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit}  className="giq-btn-primary flex-1">
            Create Organization
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Org card ───────────────────────────────────────────────────────────────────

const OrgCard: React.FC<{ org: Organization; userCount: number; onClick: () => void }> = ({ org, userCount, onClick }) => {
  const statusCfg = STATUS_CFG[org.status] || STATUS_CFG.active;
  const plan = org.subscription?.plan || 'Free';
  const planCfg = PLAN_CFG[plan] || PLAN_CFG.Free;

  return (
    <div onClick={onClick} className="giq-card p-4 cursor-pointer transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: org.branding?.logoUrl ? 'transparent' : 'rgba(16,185,129,0.1)' }}>
          {org.branding?.logoUrl ? (
            <img src={org.branding.logoUrl} alt={org.name} className="w-11 h-11 rounded-xl object-cover" />
          ) : (
            <Building2 className="w-5 h-5" style={{ color: '#10b981' }} />
          )}
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color }}>
          {statusCfg.label}
        </span>
      </div>
      <h3 className="text-sm font-semibold mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{org.name}</h3>
      <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-muted)' }}>{org.domain || 'No domain set'}</p>

      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{org.industry}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{org.country}</span>
      </div>

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Users className="w-3.5 h-3.5" />{userCount} {userCount === 1 ? 'user' : 'users'}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: planCfg.bg, color: planCfg.color }}>
          {plan}
        </span>
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────────

export const Organizations: React.FC = () => {
  const { organizations, usersList, activeUser, handleCreateOrganization } = useAppContext();
  const [search, setSearch]           = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const filtered = useMemo(() => organizations.filter(o =>
    !search || (o.name ?? '').toLowerCase().includes(search.toLowerCase()) || (o.domain ?? '').toLowerCase().includes(search.toLowerCase())
  ), [organizations, search]);

  const userCountFor = (orgId: string) => usersList.filter(u => u.org_id === orgId).length;

  const stats = useMemo(() => ({
    total:  organizations.length,
    active: organizations.filter(o => o.status === 'active').length,
    users:  usersList.length,
  }), [organizations, usersList]);

  const canManage = activeUser?.role === 'ADMIN' || activeUser?.role === 'ORG_ADMIN';

  if (selectedOrg) {
    return <OrganizationDetails org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">Organizations</h1>
          <p className="giq-page-subtitle mt-1">Manage client organizations and their team access</p>
        </div>
        {canManage && (
          <button className="giq-btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />Add Organization
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Organizations', value: stats.total,  color: '#10b981', icon: Building2 },
          { label: 'Active',              value: stats.active, color: '#3b82f6', icon: Globe },
          { label: 'Total Users',         value: stats.users,  color: '#8b5cf6', icon: Users },
        ].map(s => (
          <div key={s.label} className="giq-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..."
          className="giq-input w-full pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="giq-card py-16 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {organizations.length === 0 ? 'No organizations yet' : 'No organizations match your search'}
          </p>
          {organizations.length === 0 && canManage && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Click "Add Organization" to onboard your first client
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(org => (
            <OrgCard key={org.id} org={org} userCount={userCountFor(org.id)} onClick={() => setSelectedOrg(org)} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddOrgModal onClose={() => setShowAddModal(false)} onCreate={handleCreateOrganization} />
      )}
    </div>
  );
};