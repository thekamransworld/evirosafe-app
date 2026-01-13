import type { RoleDefinition, PermissionCondition } from '../types/rbac';
import type { Ptw, Report } from '../types';

// --- 1. ABAC CONDITIONS (The "Rules") ---

const isCreator: PermissionCondition = (user, data) => {
  if (!data) return true; // If no data passed, assume generic access
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  return false;
};

const isNotCreator: PermissionCondition = (user, data) => {
  return !isCreator(user, data); // Segregation of Duties
};

const isHighRiskPtw: PermissionCondition = (_, data) => {
  if (!data) return false;
  const ptw = data as Ptw;
  return ['Hot Work', 'Confined Space Entry', 'Lifting', 'Electrical Work'].includes(ptw.type);
};

// --- 2. ROLE DEFINITIONS (The "Matrix") ---

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  // 4.7 Worker
  'WORKER': {
    key: 'WORKER',
    label: 'Worker',
    defaultScope: 'own',
    permissions: [
      { resource: 'reports', actions: ['read', 'create', 'update'] }, // Update only draft (handled in engine)
      { resource: 'ptw', actions: ['read', 'create'] }, // Request PTW
      { resource: 'checklists', actions: ['read', 'create'] },
      { resource: 'training', actions: ['read'] },
      { resource: 'certification', actions: ['read', 'update'] },
    ]
  },

  // 4.6 Inspector
  'INSPECTOR': {
    key: 'INSPECTOR',
    label: 'Safety Inspector',
    defaultScope: 'project',
    inheritsFrom: 'WORKER',
    permissions: [
      { resource: 'inspections', actions: ['read', 'create', 'update'] },
      { resource: 'checklists', actions: ['read', 'create', 'update'] },
      { resource: 'reports', actions: ['read', 'create'] }, // Can raise observations
      { resource: 'housekeeping', actions: ['read', 'create'] },
      { resource: 'site-map', actions: ['read'] },
    ]
  },

  // 4.5 Supervisor
  'SUPERVISOR': {
    key: 'SUPERVISOR',
    label: 'Site Supervisor',
    defaultScope: 'team', // Or Project
    inheritsFrom: 'INSPECTOR',
    permissions: [
      { resource: 'reports', actions: ['update', 'assign'] },
      { resource: 'inspections', actions: ['assign'] },
      { resource: 'ptw', actions: ['update'] }, // Cannot approve
      { resource: 'tbt', actions: ['read', 'create', 'update', 'assign'] },
      { resource: 'training', actions: ['assign'] },
      { resource: 'actions', actions: ['read', 'update', 'assign'] },
    ]
  },

  // 4.4 HSE Officer
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
      // Can approve Low Risk PTW (Optional rule)
      { resource: 'ptw', actions: ['approve'], condition: (u, d) => !isHighRiskPtw(u, d) && isNotCreator(u, d) },
    ]
  },

  // 4.3 HSE Manager
  'HSE_MANAGER': {
    key: 'HSE_MANAGER',
    label: 'HSE Manager',
    defaultScope: 'project', // Or Org
    inheritsFrom: 'HSE_OFFICER',
    permissions: [
      { resource: 'dashboard', actions: ['read', 'export'] },
      { resource: 'reports', actions: ['approve', 'close', 'export', 'assign'] },
      { resource: 'inspections', actions: ['approve', 'export'] },
      // Can approve ALL PTWs, but NOT if they created it
      { resource: 'ptw', actions: ['approve', 'reject', 'close', 'export'], condition: isNotCreator },
      { resource: 'rams', actions: ['approve', 'export'], condition: isNotCreator },
      { resource: 'plans', actions: ['approve', 'export'] },
      { resource: 'hse-statistics', actions: ['read', 'export'] },
      { resource: 'ai-insights', actions: ['read'] },
      { resource: 'actions', actions: ['approve', 'close', 'export'] },
    ]
  },

  // 4.2 Organization Admin
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

  // 4.1 Super Admin
  'ADMIN': {
    key: 'ADMIN',
    label: 'Super Admin',
    defaultScope: 'org',
    permissions: [
      { resource: 'organizations', actions: ['create', 'delete', 'read', 'update'] },
      { resource: 'roles', actions: ['create', 'update', 'delete'] }
    ]
  },

  // 4.8 Client Viewer
  'CLIENT_VIEWER': {
    key: 'CLIENT_VIEWER',
    label: 'Client Viewer',
    defaultScope: 'project',
    permissions: [
      { resource: 'dashboard', actions: ['read'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'inspections', actions: ['read', 'export'] },
      { resource: 'plans', actions: ['read'] }, // Approved only logic handled in engine
      { resource: 'rams', actions: ['read'] },
      { resource: 'hse-statistics', actions: ['read'] },
    ]
  },
  
  // 4.9 Custom Site Lead
  'CUSTOM_SITE_LEAD': {
    key: 'CUSTOM_SITE_LEAD',
    label: 'Site Lead',
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