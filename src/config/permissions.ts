// src/config/permissions.ts
//
// ⚠ NOT ACTUALLY USED AT RUNTIME. The can() function in contexts.tsx imports
// `roles` from '../config' (resolves to the top-level src/config.ts file,
// not this directory's index), which builds its permissions from that
// file's own `allPossiblePermissions` catalog - entirely independent of
// ROLE_DEFINITIONS below. Editing this file has zero effect on what any
// role can actually do. If you're changing a permission, edit src/config.ts.
// This file was discovered to be dead code the hard way - four roles
// (HSE_OFFICER, INSPECTOR, CLIENT_VIEWER, CUSTOM_SITE_LEAD) were fully and
// correctly defined here while being completely absent from src/config.ts,
// meaning every user with one of those roles failed every can() permission
// check app-wide until that was caught and fixed.
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
      { resource: 'organizations', actions: ['create', 'delete', 'read', 'update'], scope: 'org' },
      { resource: 'chemicals', actions: ['read', 'create', 'update', 'delete', 'export'], scope: 'org' }
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
      { resource: 'chemicals', actions: ['read', 'create', 'update', 'export'], scope: 'org' },
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
      { resource: 'chemicals', actions: ['read', 'create', 'update', 'delete', 'approve', 'export'], scope: 'org' },
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
      { resource: 'chemicals', actions: ['read', 'create', 'update'], scope: 'project' },
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
      { resource: 'chemicals', actions: ['read', 'create', 'update'], scope: 'project' },
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