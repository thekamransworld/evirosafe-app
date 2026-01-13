import { ROLE_DEFINITIONS } from '../config/permissions';
import type { User } from '../types';
import type { Action, Resource, PermissionRule, Scope } from '../types/rbac';

// Helper: Flatten inheritance tree
const getEffectivePermissions = (roleKey: string): PermissionRule[] => {
  const roleDef = ROLE_DEFINITIONS[roleKey];
  if (!roleDef) return [];
  let permissions = [...roleDef.permissions];
  if (roleDef.inheritsFrom) {
    permissions = [...permissions, ...getEffectivePermissions(roleDef.inheritsFrom)];
  }
  return permissions;
};

// Helper: Check Ownership
const isOwner = (user: User, data: any) => {
  if (!data) return true; // If no data, we can't check ownership, assume list view (allow)
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  if ('owner_id' in data) return data.owner_id === user.id;
  return false;
};

// Helper: Check Project Scope
const isInProject = (user: User, data: any) => {
  if (!data || !data.project_id) return true; // No project data, assume global/allow
  // In a real app, user.project_ids would be an array. 
  // For this MVP, we assume if they have the role, they are in the project context.
  return true; 
};

export const checkPermission = (
  user: User | null,
  action: Action,
  resource: Resource,
  data?: any
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Super Admin Bypass

  const roleDef = ROLE_DEFINITIONS[user.role];
  if (!roleDef) return false;

  const permissions = getEffectivePermissions(user.role);
  
  // 1. Find matching rule
  const matchingRules = permissions.filter(p => 
    p.resource === resource && p.actions.includes(action)
  );

  if (matchingRules.length === 0) return false; // Default Deny

  // 2. Evaluate Rules (OR logic - if any rule passes, allow)
  return matchingRules.some(rule => {
    const effectiveScope = rule.scope || roleDef.defaultScope;

    // A. Scope Check
    if (effectiveScope === 'own' && data) {
      if (!isOwner(user, data)) return false;
    }
    if (effectiveScope === 'project' && data) {
      if (!isInProject(user, data)) return false;
    }

    // B. Segregation of Duties (Creator cannot Approve)
    if (action === 'approve' && data && isOwner(user, data)) {
        return false; // Hard block: You cannot approve your own work
    }

    // C. Status Gates (Update only allowed if Draft/Requested)
    if (action === 'update' && data && data.status) {
        const lockedStatuses = ['approved', 'closed', 'archived', 'published', 'active'];
        if (lockedStatuses.includes(data.status.toLowerCase())) {
            return false; // Cannot edit locked records
        }
    }

    // D. Custom Conditions (Risk, etc.)
    if (rule.condition) {
      return rule.condition(user, data);
    }

    return true;
  });
};