import { ROLE_DEFINITIONS } from '../config/permissions';
import type { User } from '../types';
import type { Action, Resource, PermissionRule, Scope } from '../types/rbac';

const getEffectivePermissions = (roleKey: string): PermissionRule[] => {
  const roleDef = ROLE_DEFINITIONS[roleKey];
  if (!roleDef) return [];
  let permissions = [...roleDef.permissions];
  if (roleDef.inheritsFrom) {
    permissions = [...permissions, ...getEffectivePermissions(roleDef.inheritsFrom)];
  }
  return permissions;
};

export const checkPermission = (
  user: User | null,
  action: Action,
  resource: Resource,
  data?: any
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Super Admin bypass

  const permissions = getEffectivePermissions(user.role);
  const matchingRules = permissions.filter(p => 
    p.resource === resource && p.actions.includes(action)
  );

  if (matchingRules.length === 0) return false;

  return matchingRules.some(rule => {
    if (rule.scope === 'own') {
      if (data && !isOwner(user, data)) return false;
    }
    // Project scope check would go here in a real app (checking user.project_ids)
    
    if (rule.condition) {
      return rule.condition(user, data);
    }
    return true;
  });
};

// NEW: Helper to get the scope for a specific action
export const getPermissionScope = (user: User | null, resource: Resource, action: Action): Scope | null => {
    if (!user) return null;
    if (user.role === 'ADMIN') return 'org'; // Admin sees everything

    const permissions = getEffectivePermissions(user.role);
    const rule = permissions.find(p => p.resource === resource && p.actions.includes(action));
    
    return rule ? rule.scope : null;
};

const isOwner = (user: User, data: any) => {
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  if ('user_id' in data) return data.user_id === user.id;
  return false;
};