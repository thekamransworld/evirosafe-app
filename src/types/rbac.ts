import type { User } from '../types';

// ⚠ This Resource type is a SEPARATE, hand-maintained duplicate of the one
// in src/types.ts - not the one contexts.tsx's can() function actually
// type-checks against. The two must be kept in sync manually. If you add a
// new resource, add it to BOTH this file and src/types.ts's Resource union,
// or a permission check can compile fine here while doing nothing at
// runtime. See src/config/permissions.ts for how this already caused a bug.
export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'ptw' | 'rams' 
  | 'training' | 'people' | 'settings' | 'organizations' | 'projects' 
  | 'checklists' | 'signage' | 'tbt' | 'housekeeping' | 'actions' 
  | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights'
  | 'plans' | 'roles' | 'files' | 'analytics' | 'chemicals';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'close' | 'export' | 'assign';

export type Scope = 'org' | 'project' | 'team' | 'own';

export type PermissionCondition = (user: User, data?: any) => boolean;

export interface PermissionRule {
  resource: Resource;
  actions: Action[];
  scope: Scope;
  condition?: PermissionCondition;
}

export interface RoleDefinition {
  key: string;
  label: string;
  inheritsFrom?: string;
  permissions: PermissionRule[];
  defaultScope?: Scope;
}