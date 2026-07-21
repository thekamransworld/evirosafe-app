import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { useAppContext } from '../contexts';
import { AddUserModal } from './AddUserModal';
import { Search, Users, Shield, UserCheck, User as UserIcon, Mail, Phone, Plus, MoreHorizontal } from 'lucide-react';

const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:       { label: 'Admin',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ORG_ADMIN:   { label: 'Org Admin',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  HSE_MANAGER: { label: 'HSE Manager', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  SUPERVISOR:  { label: 'Supervisor',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  WORKER:      { label: 'Worker',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
};
const getRole = (r: string) => ROLE_CFG[r] || { label: r, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };

const ROLE_COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4'];
const avatarColor = (name: string) => ROLE_COLORS[name.charCodeAt(0) % ROLE_COLORS.length];

const UserCard: React.FC<{ user: User }> = ({ user }) => {
  const roleCfg = getRole(user.role);
  const color   = avatarColor(user.name || 'U');

  return (
    <div className="giq-card p-4 flex items-center gap-4">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: color }}>
          {user.name?.charAt(0) || 'U'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: roleCfg.bg, color: roleCfg.color }}>{roleCfg.label}</span>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
        {(user as any).department && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{(user as any).department}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ background: user.status === 'active' ? '#10b981' : '#9ca3af' }} />
      </div>
    </div>
  );
};

export const People: React.FC = () => {
  const { usersList, activeUser } = useAppContext();
  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => usersList.filter(u => {
    const rm = roleFilter === 'All' || u.role === roleFilter;
    const se = !search || (u.name ?? '').toLowerCase().includes(search.toLowerCase()) || (u.email ?? '').toLowerCase().includes(search.toLowerCase());
    return rm && se;
  }), [usersList, roleFilter, search]);

  const stats = useMemo(() => ({
    total:    usersList.length,
    active:   usersList.filter(u => u.status === 'active').length,
    managers: usersList.filter(u => u.role === 'HSE_MANAGER').length,
    admins:   usersList.filter(u => ['ADMIN','ORG_ADMIN'].includes(u.role)).length,
  }), [usersList]);

  const roles = ['All', 'ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'SUPERVISOR', 'WORKER'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">People</h1>
          <p className="giq-page-subtitle mt-1">User directory and role management</p>
        </div>
        {(activeUser?.role === 'ADMIN' || activeUser?.role === 'ORG_ADMIN') && (
          <button className="giq-btn-primary" onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" />Add User</button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: stats.total,    color: '#3b82f6', icon: Users },
          { label: 'Active',        value: stats.active,   color: '#10b981', icon: UserCheck },
          { label: 'HSE Managers',  value: stats.managers, color: '#10b981', icon: Shield },
          { label: 'Admins',        value: stats.admins,   color: '#ef4444', icon: UserIcon },
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

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {roles.map(r => (
            <button key={r} onClick={() => setRole(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={roleFilter === r ? { background: '#10b981', color: 'white' } : { color: 'var(--text-secondary)' }}>
              {r === 'All' ? 'All' : getRole(r).label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(u => <UserCard key={u.id} user={u} />)}
        {filtered.length === 0 && (
          <div className="col-span-2 giq-card py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No users found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddUserModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};