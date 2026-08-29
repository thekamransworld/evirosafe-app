/**
 * FILE: src/components/auth/RbacGuard.tsx
 * PASTE AT: src/components/auth/RbacGuard.tsx  (create auth/ folder)
 *
 * Granular Role-Based Access Control Guard
 *
 * USAGE — wrap any UI element or page section:
 * ──────────────────────────────────────────────────────────────────
 *   import { CanDo } from './components/auth/RbacGuard';
 *
 *   // Hide a button if user can't approve permits:
 *   <CanDo permission="ptw:approve">
 *     <button>Approve Permit</button>
 *   </CanDo>
 *
 *   // Show fallback if no access:
 *   <CanDo permission="report:delete" fallback={<p>No access</p>}>
 *     <DeleteButton />
 *   </CanDo>
 *
 *   // Programmatic check in a handler:
 *   import { usePermission } from './components/auth/RbacGuard';
 *   const canApprove = usePermission('ptw:approve');
 *   if (!canApprove) return toast.error('Permission denied');
 *
 * PERMISSION FORMAT:  '<resource>:<action>'
 *   resource = report | ptw | inspection | action | training |
 *              compliance | user | project | audit | bbs |
 *              environment | contractor | ppe | document |
 *              fatigue | meeting | settings
 *   action   = view | create | update | delete | approve |
 *              reject | sign | export | assign | admin
 */

import React from 'react';
import { useAppContext } from '../../contexts';
import type { User } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Permission matrix
// Format: role → Set of permitted '<resource>:<action>' strings
// ─────────────────────────────────────────────────────────────────────────────

type Role = 'ADMIN' | 'ORG_ADMIN' | 'HSE_MANAGER' | 'HSE_OFFICER' | 'SUPERVISOR' | 'INSPECTOR' | 'WORKER' | 'CLIENT_VIEWER' | 'CUSTOM_SITE_LEAD';

const PERMISSIONS: Record<Role, string[]> = {

  // ── ADMIN: everything, platform-wide ──────────────────────────────────────
  ADMIN: ['*'],

  // ── ORG_ADMIN: everything within their org ────────────────────────────────
  ORG_ADMIN: [
    'report:view',    'report:create',  'report:update',  'report:delete',   'report:export',
    'ptw:view',       'ptw:create',     'ptw:update',     'ptw:approve',     'ptw:sign',    'ptw:delete',
    'inspection:view','inspection:create','inspection:update','inspection:delete','inspection:approve',
    'action:view',    'action:create',  'action:update',  'action:delete',   'action:assign',
    'training:view',  'training:create','training:update','training:delete', 'training:export',
    'compliance:view','compliance:create','compliance:update','compliance:delete',
    'user:view',      'user:create',    'user:update',    'user:delete',     'user:admin',
    'project:view',   'project:create', 'project:update', 'project:delete',
    'audit:view',     'audit:export',
    'bbs:view',       'bbs:create',     'bbs:update',     'bbs:delete',
    'environment:view','environment:create','environment:update','environment:delete',
    'legal:view','legal:create','legal:update','legal:delete',
    'waste:view','waste:create','waste:update','waste:delete',
    'contractor:view','contractor:create','contractor:update','contractor:delete','contractor:approve',
    'ppe:view',       'ppe:create',     'ppe:update',     'ppe:delete',
    'document:view',  'document:create','document:update','document:delete', 'document:approve',
    'fatigue:view',   'fatigue:create', 'fatigue:update', 'fatigue:approve',
    'meeting:view',   'meeting:create', 'meeting:update', 'meeting:delete',
    'emergency:view', 'emergency:create','emergency:update','emergency:delete',
    'settings:view',  'settings:update','settings:admin',
    'kpi:view',       'rca:view',       'rca:create',
  ],

  // ── HSE_MANAGER: broad access, no user admin ───────────────────────────────
  HSE_MANAGER: [
    'report:view',    'report:create',  'report:update',  'report:delete',   'report:export',
    'ptw:view',       'ptw:create',     'ptw:update',     'ptw:approve',     'ptw:sign',
    'inspection:view','inspection:create','inspection:update','inspection:approve',
    'action:view',    'action:create',  'action:update',  'action:assign',
    'training:view',  'training:create','training:update','training:export',
    'compliance:view','compliance:update',
    'user:view',
    'project:view',   'project:create', 'project:update',
    'audit:view',     'audit:export',
    'bbs:view',       'bbs:create',     'bbs:update',
    'environment:view','environment:create','environment:update',
    'legal:view','legal:create','legal:update',
    'waste:view','waste:create','waste:update',
    'contractor:view','contractor:create','contractor:update','contractor:approve',
    'ppe:view',       'ppe:create',     'ppe:update',
    'document:view',  'document:create','document:update','document:approve',
    'fatigue:view',   'fatigue:create', 'fatigue:update', 'fatigue:approve',
    'meeting:view',   'meeting:create', 'meeting:update',
    'emergency:view', 'emergency:create','emergency:update',
    'settings:view',
    'kpi:view',       'rca:view',       'rca:create',
  ],

  // ── HSE_OFFICER: operational HSE duties, no settings/user admin ────────────
  HSE_OFFICER: [
    'report:view',    'report:create',  'report:update',  'report:export',
    'ptw:view',       'ptw:create',     'ptw:update',     'ptw:approve',     'ptw:sign',
    'inspection:view','inspection:create','inspection:update','inspection:approve',
    'action:view',    'action:create',  'action:update',  'action:assign',
    'training:view',  'training:create','training:update',
    'compliance:view','compliance:update',
    'project:view',
    'audit:view',
    'bbs:view',       'bbs:create',     'bbs:update',
    'environment:view','environment:create','environment:update',
    'legal:view','legal:create','legal:update',
    'waste:view','waste:create','waste:update',
    'contractor:view','contractor:create','contractor:update','contractor:approve',
    'ppe:view',       'ppe:create',     'ppe:update',
    'document:view',  'document:create','document:update',
    'fatigue:view',   'fatigue:create', 'fatigue:update', 'fatigue:approve',
    'meeting:view',   'meeting:create', 'meeting:update',
    'emergency:view', 'emergency:create','emergency:update',
    'kpi:view',       'rca:view',       'rca:create',
  ],

  // ── SUPERVISOR: operational access ──────────────────────────────────────
  SUPERVISOR: [
    'report:view',    'report:create',  'report:update',  'report:export',
    'ptw:view',       'ptw:create',     'ptw:update',     'ptw:sign',
    'inspection:view','inspection:create','inspection:update',
    'action:view',    'action:create',  'action:update',  'action:assign',
    'training:view',  'training:create','training:update',
    'compliance:view',
    'user:view',
    'project:view',
    'bbs:view',       'bbs:create',     'bbs:update',
    'environment:view','environment:create',
    'legal:view','legal:create',
    'waste:view','waste:create',
    'contractor:view','contractor:create','contractor:update',
    'ppe:view',       'ppe:update',
    'document:view',
    'fatigue:view',   'fatigue:create', 'fatigue:update',
    'meeting:view',   'meeting:create', 'meeting:update',
    'emergency:view',
    'kpi:view',       'rca:view',       'rca:create',
  ],

  // ── WORKER: report, observe, read ─────────────────────────────────────────
  WORKER: [
    'report:view',    'report:create',
    'ptw:view',
    'inspection:view',
    'action:view',    'action:update',  // can update own assigned actions
    'training:view',
    'bbs:view',       'bbs:create',
    'environment:view',
    'legal:view',
    'waste:view',
    'contractor:view',
    'ppe:view',
    'document:view',
    'fatigue:view',
    'meeting:view',
    'emergency:view',
    'kpi:view',
  ],

  // ── CLIENT_VIEWER: read-only ────────────────────────────────────────────
  CLIENT_VIEWER: [
    'report:view',    'ptw:view',       'inspection:view',
    'action:view',    'training:view',  'compliance:view',
    'bbs:view',       'environment:view','contractor:view',
    'legal:view',      'waste:view',
    'ppe:view',       'document:view',  'fatigue:view',
    'meeting:view',   'emergency:view', 'kpi:view',
    'audit:view',
  ],

  // ── INSPECTOR: focused on inspections and audits, read elsewhere ──────────
  INSPECTOR: [
    'report:view',    'report:create',
    'ptw:view',
    'inspection:view','inspection:create','inspection:update','inspection:approve',
    'action:view',    'action:create',  'action:update',
    'training:view',
    'compliance:view',
    'audit:view',
    'bbs:view',       'bbs:create',
    'environment:view',
    'legal:view',
    'waste:view',
    'contractor:view',
    'ppe:view',
    'document:view',
    'meeting:view',
    'emergency:view',
    'kpi:view',        'rca:view',
  ],

  // ── CUSTOM_SITE_LEAD: site-level operational lead, mirrors supervisor ─────
  CUSTOM_SITE_LEAD: [
    'report:view',    'report:create',  'report:update',  'report:export',
    'ptw:view',       'ptw:create',     'ptw:update',     'ptw:sign',
    'inspection:view','inspection:create','inspection:update',
    'action:view',    'action:create',  'action:update',  'action:assign',
    'training:view',  'training:create','training:update',
    'compliance:view',
    'project:view',
    'bbs:view',       'bbs:create',     'bbs:update',
    'environment:view','environment:create',
    'legal:view','legal:create',
    'waste:view','waste:create',
    'contractor:view','contractor:create','contractor:update',
    'ppe:view',       'ppe:update',
    'document:view',
    'fatigue:view',   'fatigue:create', 'fatigue:update',
    'meeting:view',   'meeting:create', 'meeting:update',
    'emergency:view',
    'kpi:view',       'rca:view',       'rca:create',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Permission checker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user role has a specific permission.
 * Super admin gets everything (*).
 */
export function hasPermission(role: Role | string, permission: string): boolean {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

/**
 * Check multiple permissions — returns true if user has ALL of them.
 */
export function hasAllPermissions(role: Role | string, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check multiple permissions — returns true if user has ANY of them.
 */
export function hasAnyPermission(role: Role | string, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: Role | string): string[] {
  return PERMISSIONS[role as Role] ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook: check a single permission for the currently signed-in user.
 *
 * @example
 *   const canApprove = usePermission('ptw:approve');
 *   const canDelete  = usePermission('report:delete');
 */
export function usePermission(permission: string): boolean {
  const { activeUser } = useAppContext();
  if (!activeUser?.role) return false;
  return hasPermission(activeUser.role as Role, permission);
}

/**
 * Hook: check multiple permissions at once.
 * Returns object with per-permission results + convenience booleans.
 *
 * @example
 *   const { canCreate, canDelete, canApprove } = usePermissions({
 *     canCreate:  'report:create',
 *     canDelete:  'report:delete',
 *     canApprove: 'ptw:approve',
 *   });
 */
export function usePermissions<T extends Record<string, string>>(
  permissionMap: T,
): Record<keyof T, boolean> {
  const { activeUser } = useAppContext();
  const role = activeUser?.role ?? '';

  const result = {} as Record<keyof T, boolean>;
  for (const [key, permission] of Object.entries(permissionMap)) {
    result[key as keyof T] = hasPermission(role, permission);
  }
  return result;
}

/**
 * Hook: get the full active user role.
 */
export function useRole(): Role | null {
  const { activeUser } = useAppContext();
  return (activeUser?.role as Role) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CanDo component
// ─────────────────────────────────────────────────────────────────────────────

interface CanDoProps {
  /** Permission string, e.g. 'ptw:approve' */
  permission: string;
  /** What to render if the user lacks permission. Defaults to null (renders nothing). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only if the current user has the required permission.
 *
 * @example
 *   <CanDo permission="report:delete">
 *     <DeleteButton />
 *   </CanDo>
 *
 *   <CanDo permission="ptw:approve" fallback={<span>View only</span>}>
 *     <ApproveButton />
 *   </CanDo>
 */
export const CanDo: React.FC<CanDoProps> = ({ permission, fallback = null, children }) => {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// CanDoAny / CanDoAll
// ─────────────────────────────────────────────────────────────────────────────

interface MultiPermissionProps {
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Renders children if user has ANY of the listed permissions. */
export const CanDoAny: React.FC<MultiPermissionProps> = ({ permissions, fallback = null, children }) => {
  const { activeUser } = useAppContext();
  const role = activeUser?.role ?? '';
  return <>{hasAnyPermission(role, permissions) ? children : fallback}</>;
};

/** Renders children only if user has ALL of the listed permissions. */
export const CanDoAll: React.FC<MultiPermissionProps> = ({ permissions, fallback = null, children }) => {
  const { activeUser } = useAppContext();
  const role = activeUser?.role ?? '';
  return <>{hasAllPermissions(role, permissions) ? children : fallback}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PageGuard — full page protection with redirect / error display
// ─────────────────────────────────────────────────────────────────────────────

interface PageGuardProps {
  permission: string;
  /** Called if permission denied — typically navigate to '/dashboard' */
  onDenied?: () => void;
  children: React.ReactNode;
}

/**
 * Wraps an entire page. If the user lacks permission, shows an access-denied
 * screen instead of the page content.
 *
 * @example
 *   <PageGuard permission="audit:view" onDenied={() => setActivePage('dashboard')}>
 *     <AuditLog />
 *   </PageGuard>
 */
export const PageGuard: React.FC<PageGuardProps> = ({ permission, onDenied, children }) => {
  const allowed = usePermission(permission);

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-5">
          You don't have permission to view this page. Contact your HSE Manager or Administrator to request access.
        </p>
        <p className="text-xs font-mono text-slate-400 mb-4">
          Required permission: {permission}
        </p>
        {onDenied && (
          <button
            onClick={onDenied}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default CanDo;