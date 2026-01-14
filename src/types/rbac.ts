import type { User } from '../types';

export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'ptw' | 'rams' 
  | 'training' | 'people' | 'settings' | 'organizations' | 'projects' 
  | 'checklists' | 'signage' | 'tbt' | 'housekeeping' | 'actions' 
  | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights'
  | 'plans' | 'roles' | 'files' | 'analytics'; // <--- Added 'files' and 'analytics'

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