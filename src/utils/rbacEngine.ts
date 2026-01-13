// src/utils/rbacEngine.ts
import { ROLE_DEFINITIONS } from '../config/permissions';
import type { User } from '../types';
import type { Action, Resource, PermissionRule } from '../types/rbac';

// Helper to recursively get all permissions including inherited ones
const getEffectivePermissions = (roleKey: string): PermissionRule[] => {
  const roleDef = ROLE_DEFINITIONS[roleKey];
  if (!roleDef) return [];

  let permissions = [...roleDef.permissions];

  // Recursive inheritance
  if (roleDef.inheritsFrom) {
    permissions = [...permissions, ...getEffectivePermissions(roleDef.inheritsFrom)];
  }

  return permissions;
};

export const checkPermission = (
  user: User | null,
  action: Action,
  resource: Resource,
  data?: any // The specific record (Report, PTW, etc.)
): boolean => {
  if (!user) return false;
  
  // 1. Super Admin Bypass
  if (user.role === 'ADMIN') return true;

  // 2. Get all permissions for the user's role
  const permissions = getEffectivePermissions(user.role);

  // 3. Find matching permission rules
  const matchingRules = permissions.filter(p => 
    p.resource === resource && p.actions.includes(action)
  );

  if (matchingRules.length === 0) return false; // Default Deny

  // 4. Evaluate Scopes and Conditions
  // If ANY of the matching rules pass, we allow access (OR logic)
  return matchingRules.some(rule => {
    
    // A. Scope Check
    if (rule.scope === 'own') {
      // If data is provided, check ownership. If no data (e.g. viewing a list), we assume true for now 
      // but the UI should filter the list.
      if (data && !isOwner(user, data)) return false;
    }
    
    if (rule.scope === 'project') {
      // In a real app, check if user.project_ids includes data.project_id
      // For now, we assume if they have the role, they have access to the project context
    }

    // B. Condition Check
    if (rule.condition) {
      return rule.condition(user, data);
    }

    return true;
  });
};

// Helper to check ownership
const isOwner = (user: User, data: any) => {
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  return false;
};