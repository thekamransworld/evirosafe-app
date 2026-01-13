import type { User } from '../types';

export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'ptw' | 'rams' 
  | 'training' | 'people' | 'settings' | 'organizations' | 'projects' 
  | 'checklists' | 'signage' | 'tbt' | 'housekeeping' | 'actions' 
  | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights'
  | 'plans' | 'roles';

// Added 'export' and 'assign' based on your requirements
export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'close' | 'export' | 'assign';

// Added 'team'
export type Scope = 'org' | 'project' | 'team' | 'own';

export type PermissionCondition = (user: User, data?: any) => boolean;

export interface PermissionRule {
  resource: Resource;
  actions: Action[];
  scope?: Scope; // Optional override, otherwise uses Role default
  condition?: PermissionCondition;
}

export interface RoleDefinition {
  key: string;
  label: string;
  defaultScope: Scope; // New: The baseline scope for this role
  inheritsFrom?: string;
  permissions: PermissionRule[];
}