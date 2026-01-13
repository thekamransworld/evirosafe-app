import type { User } from '../types';

export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'ptw' | 'rams' 
  | 'training' | 'people' | 'settings' | 'organizations' | 'projects' 
  | 'checklists' | 'signage' | 'tbt' | 'housekeeping' | 'actions' 
  | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights'
  | 'plans' | 'roles'; // <--- Added these missing resources

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'close' | 'export' | 'assign';

export type Scope = 'org' | 'project' | 'own';

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
}