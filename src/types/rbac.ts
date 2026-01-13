// src/types/rbac.ts
import type { User, Project, Report, Ptw, Inspection } from '../types';

export type Resource = 
  | 'dashboard' | 'reports' | 'inspections' | 'ptw' | 'rams' 
  | 'training' | 'people' | 'settings' | 'organizations' | 'projects' 
  | 'checklists' | 'signage' | 'tbt' | 'housekeeping' | 'actions' 
  | 'site-map' | 'certification' | 'hse-statistics' | 'ai-insights';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'close' | 'export' | 'assign';

export type Scope = 'org' | 'project' | 'own';

// A condition function returns true if the specific data meets the rule
export type PermissionCondition = (user: User, data?: any) => boolean;

export interface PermissionRule {
  resource: Resource;
  actions: Action[];
  scope: Scope;
  condition?: PermissionCondition; // Optional dynamic rule (e.g., risk level)
}

export interface RoleDefinition {
  key: string;
  label: string;
  inheritsFrom?: string; // The role key this role inherits from
  permissions: PermissionRule[];
}