// src/config/permissions.ts
import type { RoleDefinition, PermissionCondition } from '../types/rbac';
import type { Ptw, Report } from '../types';

// --- CONDITIONS ---

// Check if the user is the creator of the record
const isCreator: PermissionCondition = (user, data) => {
  if (!data) return true; // If checking general access, allow
  // Handle different data types
  if ('reporter_id' in data) return data.reporter_id === user.id; // Report
  if ('creator_id' in data) return data.creator_id === user.id; // PTW (inside payload usually, but simplified here)
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id; // PTW actual
  return false;
};

// Check if PTW is High Risk
const isHighRiskPtw: PermissionCondition = (_, data) => {
  if (!data) return false;
  const ptw = data as Ptw;
  // Example logic: Hot Work or Confined Space is High Risk
  return ['Hot Work', 'Confined Space Entry', 'Lifting', 'Electrical Work'].includes(ptw.type);
};

// --- ROLE DEFINITIONS ---

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  'WORKER': {
    key: 'WORKER',
    label: 'Worker',
    permissions: [
      { resource: 'dashboard', actions: ['read'], scope: 'own' },
      { resource: 'reports', actions: ['create', 'read'], scope: 'own' },
      { resource: 'reports', actions: ['update'], scope: 'own', condition: isCreator },
      { resource: 'training', actions: ['read'], scope: 'own' },
      { resource: 'certification', actions: ['read', 'update'], scope: 'own' },
      { resource: 'tbt', actions: ['read'], scope: 'project' },
    ]
  },
  'INSPECTOR': {
    key: 'INSPECTOR',
    label: 'Safety Inspector',
    inheritsFrom: 'WORKER', // Inherits Worker permissions
    permissions: [
      { resource: 'inspections', actions: ['create', 'read', 'update'], scope: 'project' },
      { resource: 'checklists', actions: ['read', 'create'], scope: 'project' },
      { resource: 'reports', actions: ['read'], scope: 'project' }, // Can read all project reports
      { resource: 'housekeeping', actions: ['read', 'create'], scope: 'project' },
      { resource: 'site-map', actions: ['read'], scope: 'project' },
    ]
  },
  'SUPERVISOR': {
    key: 'SUPERVISOR',
    label: 'Site Supervisor',
    inheritsFrom: 'INSPECTOR',
    permissions: [
      { resource: 'ptw', actions: ['create', 'read', 'update'], scope: 'project' },
      { resource: 'ptw', actions: ['approve'], scope: 'project', condition: (u, d) => !isHighRiskPtw(u, d) }, // Can only approve Low/Medium risk
      { resource: 'tbt', actions: ['create', 'update'], scope: 'project' },
      { resource: 'people', actions: ['read'], scope: 'project' },
      { resource: 'plans', actions: ['read'], scope: 'project' },
      { resource: 'rams', actions: ['read', 'create'], scope: 'project' },
      { resource: 'actions', actions: ['read', 'update', 'assign'], scope: 'project' },
    ]
  },
  'HSE_MANAGER': {
    key: 'HSE_MANAGER',
    label: 'HSE Manager',
    inheritsFrom: 'SUPERVISOR',
    permissions: [
      { resource: 'ptw', actions: ['approve', 'reject', 'close'], scope: 'project' }, // Can approve ALL risks
      { resource: 'reports', actions: ['approve', 'close', 'delete'], scope: 'project' },
      { resource: 'rams', actions: ['approve'], scope: 'project' },
      { resource: 'plans', actions: ['create', 'update', 'approve'], scope: 'project' },
      { resource: 'hse-statistics', actions: ['read'], scope: 'project' },
      { resource: 'ai-insights', actions: ['read'], scope: 'project' },
      { resource: 'training', actions: ['create', 'update'], scope: 'project' },
    ]
  },
  'ORG_ADMIN': {
    key: 'ORG_ADMIN',
    label: 'Organization Admin',
    inheritsFrom: 'HSE_MANAGER',
    permissions: [
      { resource: 'organizations', actions: ['read', 'update'], scope: 'org' },
      { resource: 'projects', actions: ['create', 'update', 'delete'], scope: 'org' },
      { resource: 'people', actions: ['create', 'update', 'delete', 'assign'], scope: 'org' },
      { resource: 'settings', actions: ['read', 'update'], scope: 'org' },
      { resource: 'signage', actions: ['create', 'update'], scope: 'org' },
    ]
  },
  'ADMIN': {
    key: 'ADMIN',
    label: 'Super Admin',
    permissions: [
      // Admin gets everything by default logic in the engine, but we define base here
      { resource: 'organizations', actions: ['create', 'delete'], scope: 'org' }
    ]
  }
};