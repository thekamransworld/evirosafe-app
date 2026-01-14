import { ROLE_DEFINITIONS } from '../config/permissions';
import type { User } from '../types';
import type { Action, Resource, PermissionRule } from '../types/rbac';

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
    if (rule.condition) {
      return rule.condition(user, data);
    }
    return true;
  });
};

const isOwner = (user: User, data: any) => {
  if ('reporter_id' in data) return data.reporter_id === user.id;
  if ('creator_id' in data) return data.creator_id === user.id;
  if ('payload' in data && data.payload.creator_id) return data.payload.creator_id === user.id;
  return false;
};