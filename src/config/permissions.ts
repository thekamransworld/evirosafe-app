// src/config/permissions.ts
import type { RoleDefinition, PermissionCondition } from '../types/rbac';
import type { Ptw } from '../types';

// --- CONDITIONS ---
const isCreator: PermissionCondition = (user, data) => {
  if (!data) return true;
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  return false;
};

const isHighRiskPtw: PermissionCondition = (_, data) => {
  if (!data) return false;
  const ptw = data as Ptw;
  return ['Hot Work', 'Confined Space Entry', 'Lifting', 'Electrical Work'].includes(ptw.type);
};

// --- ROLES CONFIGURATION ---
export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  'ADMIN': {
    key: 'ADMIN',
    label: 'Administrator',
    defaultScope: 'org',
    permissions: [
      // Admin has access to everything. We list base permissions here.
      { resource: 'organizations', actions: ['create', 'delete', 'read', 'update'], scope: 'org' }
    ]
  },
  'ORG_ADMIN': {
    key: 'ORG_ADMIN',
    label: 'Organization Admin',
    defaultScope: 'org',
    permissions: [
      { resource: 'organizations', actions: ['read', 'update'], scope: 'org' },
      { resource: 'projects', actions: ['read', 'create', 'update'], scope: 'org' },
      { resource: 'people', actions: ['read', 'create', 'update', 'assign'], scope: 'org' },
      { resource: 'roles', actions: ['read', 'create', 'update'], scope: 'org' },
      { resource: 'settings', actions: ['read', 'update'], scope: 'org' },
      { resource: 'reports', actions: ['read', 'export'], scope: 'org' },
      { resource: 'inspections', actions: ['read', 'export'], scope: 'org' },
    ]
  },
  'HSE_MANAGER': {
    key: 'HSE_MANAGER',
    label: 'HSE Manager',
    defaultScope: 'org',
    permissions: [
      { resource: 'dashboard', actions: ['read'], scope: 'org' },
      { resource: 'reports', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'inspections', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'ptw', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'checklists', actions: ['read', 'create', 'update', 'export', 'assign'], scope: 'org' },
      { resource: 'plans', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'rams', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'training', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'actions', actions: ['read', 'create', 'update', 'approve', 'export', 'assign'], scope: 'org' },
      { resource: 'people', actions: ['read', 'assign'], scope: 'org' },
    ]
  },
  'SUPERVISOR': {
    key: 'SUPERVISOR',
    label: 'Supervisor',
    defaultScope: 'project',
    permissions: [
      { resource: 'reports', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'inspections', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'ptw', actions: ['read', 'create', 'update'], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'tbt', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'training', actions: ['read', 'assign'], scope: 'project' },
      { resource: 'actions', actions: ['read', 'update', 'assign'], scope: 'project' },
    ]
  },
  'HSE_OFFICER': {
    key: 'HSE_OFFICER',
    label: 'HSE Officer',
    defaultScope: 'project',
    permissions: [
      { resource: 'dashboard', actions: ['read'], scope: 'project' },
      { resource: 'reports', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'inspections', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'ptw', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'tbt', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'actions', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
    ]
  },
  'INSPECTOR': {
    key: 'INSPECTOR',
    label: 'Inspector',
    defaultScope: 'project',
    permissions: [
      { resource: 'inspections', actions: ['read', 'create', 'update'], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create', 'update'], scope: 'project' },
      { resource: 'reports', actions: ['read', 'create'], scope: 'project' },
    ]
  },
  'WORKER': {
    key: 'WORKER',
    label: 'Worker',
    defaultScope: 'own',
    permissions: [
      { resource: 'reports', actions: ['read', 'create', 'update'], scope: 'own', condition: isCreator },
      { resource: 'ptw', actions: ['read', 'create', 'update'], scope: 'own', condition: isCreator },
      { resource: 'checklists', actions: ['read', 'create'], scope: 'own' },
      { resource: 'tbt', actions: ['read'], scope: 'own' },
      { resource: 'training', actions: ['read', 'update'], scope: 'own' },
      { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
    ]
  },
  'CLIENT_VIEWER': {
    key: 'CLIENT_VIEWER',
    label: 'Client Viewer',
    defaultScope: 'project',
    permissions: [
      { resource: 'dashboard', actions: ['read'], scope: 'project' },
      { resource: 'reports', actions: ['read', 'export'], scope: 'project' },
      { resource: 'inspections', actions: ['read', 'export'], scope: 'project' },
      { resource: 'plans', actions: ['read', 'export'], scope: 'project' },
      { resource: 'rams', actions: ['read', 'export'], scope: 'project' },
    ]
  },
  'CUSTOM_SITE_LEAD': {
    key: 'CUSTOM_SITE_LEAD',
    label: 'Custom Site Lead',
    defaultScope: 'project',
    permissions: [
      { resource: 'reports', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'inspections', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'ptw', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
      { resource: 'actions', actions: ['read', 'create', 'update', 'assign'], scope: 'project' },
    ]
  }
};