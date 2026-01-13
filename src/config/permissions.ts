import type { RoleDefinition, PermissionCondition } from '../types/rbac';
import type { Ptw } from '../types';

// --- CONDITIONS ---
const isCreator: PermissionCondition = (user, data) => {
  if (!data) return true;
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  return false;
};

const isNotCreator: PermissionCondition = (user, data) => {
  return !isCreator(user, data);
};

const isHighRiskPtw: PermissionCondition = (_, data) => {
  if (!data) return false;
  const ptw = data as Ptw;
  return ['Hot Work', 'Confined Space Entry', 'Lifting', 'Electrical Work'].includes(ptw.type);
};

// --- ROLES ---
export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  'ADMIN': {
    key: 'ADMIN',
    label: 'Administrator',
    defaultScope: 'org',
    permissions: [
      { resource: 'organizations', actions: ['create', 'delete', 'read', 'update'] },
      { resource: 'roles', actions: ['create', 'update', 'delete'] }
    ]
  },
  'ORG_ADMIN': {
    key: 'ORG_ADMIN',
    label: 'Organization Admin',
    defaultScope: 'org',
    inheritsFrom: 'HSE_MANAGER',
    permissions: [
      { resource: 'organizations', actions: ['read', 'update'] },
      { resource: 'projects', actions: ['read', 'create', 'update'] },
      { resource: 'people', actions: ['read', 'create', 'update', 'delete', 'assign'] },
      { resource: 'roles', actions: ['read'] },
      { resource: 'settings', actions: ['read', 'update'] },
      { resource: 'signage', actions: ['create', 'update'] },
    ]
  },
  'HSE_MANAGER': {
    key: 'HSE_MANAGER',
    label: 'HSE Manager',
    defaultScope: 'project',
    inheritsFrom: 'HSE_OFFICER',
    permissions: [
      { resource: 'dashboard', actions: ['read', 'export'] },
      { resource: 'reports', actions: ['approve', 'close', 'export', 'assign'] },
      { resource: 'inspections', actions: ['approve', 'export'] },
      { resource: 'ptw', actions: ['approve', 'reject', 'close', 'export'], condition: isNotCreator },
      { resource: 'rams', actions: ['approve', 'export'], condition: isNotCreator },
      { resource: 'plans', actions: ['approve', 'export'] },
      { resource: 'hse-statistics', actions: ['read', 'export'] },
      { resource: 'ai-insights', actions: ['read'] },
      { resource: 'actions', actions: ['approve', 'close', 'export'] },
    ]
  },
  'SUPERVISOR': {
    key: 'SUPERVISOR',
    label: 'Supervisor',
    defaultScope: 'team',
    inheritsFrom: 'INSPECTOR',
    permissions: [
      { resource: 'reports', actions: ['update', 'assign'] },
      { resource: 'inspections', actions: ['assign'] },
      { resource: 'ptw', actions: ['update'] },
      { resource: 'tbt', actions: ['read', 'create', 'update', 'assign'] },
      { resource: 'training', actions: ['assign'] },
      { resource: 'actions', actions: ['read', 'update', 'assign'] },
    ]
  },
  'HSE_OFFICER': {
    key: 'HSE_OFFICER',
    label: 'HSE Officer',
    defaultScope: 'project',
    inheritsFrom: 'SUPERVISOR',
    permissions: [
      { resource: 'dashboard', actions: ['read'] },
      { resource: 'reports', actions: ['read', 'create', 'update', 'assign'] },
      { resource: 'plans', actions: ['read', 'create', 'update'] },
      { resource: 'rams', actions: ['read', 'create', 'update'] },
      { resource: 'ptw', actions: ['approve'], condition: (u, d) => !isHighRiskPtw(u, d) && isNotCreator(u, d) },
    ]
  },
  'INSPECTOR': {
    key: 'INSPECTOR',
    label: 'Inspector',
    defaultScope: 'project',
    inheritsFrom: 'WORKER',
    permissions: [
      { resource: 'inspections', actions: ['create', 'read', 'update'], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create'], scope: 'project' },
      { resource: 'reports', actions: ['read', 'create'], scope: 'project' },
      { resource: 'housekeeping', actions: ['read', 'create'], scope: 'project' },
      { resource: 'site-map', actions: ['read'], scope: 'project' },
    ]
  },
  'WORKER': {
    key: 'WORKER',
    label: 'Worker',
    defaultScope: 'own',
    permissions: [
      { resource: 'dashboard', actions: ['read'], scope: 'own' },
      { resource: 'reports', actions: ['create', 'read'], scope: 'own' },
      { resource: 'reports', actions: ['update'], scope: 'own', condition: isCreator },
      { resource: 'training', actions: ['read'], scope: 'own' },
      { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
      { resource: 'tbt', actions: ['read'], scope: 'project' },
    ]
  },
  'CLIENT_VIEWER': {
    key: 'CLIENT_VIEWER',
    label: 'Client Viewer',
    defaultScope: 'project',
    permissions: [
      { resource: 'dashboard', actions: ['read'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'inspections', actions: ['read', 'export'] },
      { resource: 'plans', actions: ['read'] },
      { resource: 'rams', actions: ['read'] },
      { resource: 'hse-statistics', actions: ['read'] },
    ]
  },
  'CUSTOM_SITE_LEAD': {
    key: 'CUSTOM_SITE_LEAD',
    label: 'Custom Site Lead',
    defaultScope: 'project',
    permissions: [
        { resource: 'reports', actions: ['read', 'create', 'update', 'assign'] },
        { resource: 'inspections', actions: ['read', 'create', 'update', 'assign'] },
        { resource: 'ptw', actions: ['read', 'create', 'update', 'assign'] },
        { resource: 'actions', actions: ['read', 'create', 'update', 'assign'] },
        { resource: 'dashboard', actions: ['read'] }
    ]
  }
};