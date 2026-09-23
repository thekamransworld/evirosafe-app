/**
 * FILE: src/lib/auditLogger.ts
 * PASTE AT: src/lib/auditLogger.ts
 *
 * ── Global Audit Trail Engine ─────────────────────────────────────────────────
 *
 * Every data mutation in the app — create, update, delete, status change,
 * approval, rejection — should call writeAuditLog() so there is a permanent,
 * tamper-evident record of who did what and when.
 *
 * HOW TO USE IN DataContext (or any context/handler):
 * ────────────────────────────────────────────────────
 *   import { writeAuditLog } from '../lib/auditLogger';
 *
 *   // In handleCreateReport:
 *   await writeAuditLog({
 *     org_id:       activeOrg.id,
 *     user_id:      activeUser.id,
 *     action:       'CREATE',
 *     resource_type:'report',
 *     resource_id:  newReport.id,
 *     description:  `Incident report submitted: ${newReport.incident_type}`,
 *     new_value:    newReport,
 *   });
 *
 *   // In handleUpdatePtw:
 *   await writeAuditLog({
 *     org_id:       activeOrg.id,
 *     user_id:      activeUser.id,
 *     action:       'STATUS_CHANGE',
 *     resource_type:'ptw',
 *     resource_id:  ptw.id,
 *     description:  `PTW status changed: ${previousStatus} → ${ptw.status}`,
 *     old_value:    { status: previousStatus },
 *     new_value:    { status: ptw.status },
 *   });
 *
 * PASTE CALLS TO writeAuditLog() inside each handler in DataContext.tsx,
 * right after the Firestore write succeeds (inside the try block).
 *
 * The Firestore security rules (delivered in Phase 1) already block client-side
 * deletes and updates on audit_logs — entries are immutable once written.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'SIGN'
  | 'ACKNOWLEDGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'ASSIGN'
  | 'COMPLETE'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'PERMISSION_CHANGE';

export type AuditResourceType =
  | 'report'
  | 'ptw'
  | 'inspection'
  | 'action'
  | 'training_record'
  | 'training_session'
  | 'training_course'
  | 'tbt_session'
  | 'plan'
  | 'rams'
  | 'checklist_run'
  | 'user'
  | 'organization'
  | 'project'
  | 'compliance_item'
  | 'emergency_plan'
  | 'emergency_drill'
  | 'bbs_observation'
  | 'environmental_reading'
  | 'contractor_profile'
  | 'ppe_item'
  | 'document'
  | 'fatigue_assessment'
  | 'meeting'
  | 'notification';

export interface AuditLogEntry {
  id?: string;
  org_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  description: string;
  /** Snapshot of the value BEFORE the change (for updates/deletes) */
  old_value?: Record<string, any> | null;
  /** Snapshot of the value AFTER the change (for creates/updates) */
  new_value?: Record<string, any> | null;
  /** IP address or device identifier (populated if available) */
  ip_address?: string;
  /** User agent string */
  user_agent?: string;
  timestamp: string;
  /** Firestore server timestamp (set automatically) */
  server_timestamp?: Timestamp;
}

export interface AuditLogFilter {
  org_id: string;
  user_id?: string;
  resource_type?: AuditResourceType;
  resource_id?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write a single audit log entry to Firestore.
 *
 * This is a fire-and-forget call in most cases — we don't want audit logging
 * failures to block user-facing operations. Errors are caught and logged to
 * console only.
 *
 * For compliance-critical actions (user deletion, permission changes) you may
 * want to await this and surface errors to the user.
 */
export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'server_timestamp'>,
  options: { throwOnError?: boolean } = {},
): Promise<string | null> {
  try {
    // Sanitise: strip undefined values and functions
    const sanitised = sanitiseForFirestore({
      ...entry,
      // Trim large value snapshots to avoid hitting the 1MB document limit
      old_value: entry.old_value ? truncateSnapshot(entry.old_value) : null,
      new_value: entry.new_value ? truncateSnapshot(entry.new_value) : null,
      user_agent: entry.user_agent ?? navigator?.userAgent ?? null,
      server_timestamp: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, 'audit_logs'), sanitised);
    return docRef.id;
  } catch (error) {
    // Never let audit logging crash the app
    console.error('[auditLogger] Failed to write audit log:', error);
    if (options.throwOnError) throw error;
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch write (for bulk operations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write multiple audit log entries in parallel.
 * Used when a single user action affects multiple resources
 * (e.g. closing all overdue actions).
 */
export async function writeAuditLogs(
  entries: Omit<AuditLogEntry, 'id' | 'server_timestamp'>[],
): Promise<void> {
  await Promise.allSettled(entries.map((e) => writeAuditLog(e)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch audit log entries for a given filter.
 * Results are ordered by timestamp descending (newest first).
 */
export async function fetchAuditLogs(
  filter: AuditLogFilter,
): Promise<AuditLogEntry[]> {
  const constraints: any[] = [
    where('org_id', '==', filter.org_id),
  ];

  if (filter.user_id)       constraints.push(where('user_id', '==', filter.user_id));
  if (filter.resource_type) constraints.push(where('resource_type', '==', filter.resource_type));
  if (filter.resource_id)   constraints.push(where('resource_id', '==', filter.resource_id));
  if (filter.action)        constraints.push(where('action', '==', filter.action));

  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(filter.limit ?? 100));

  const q = query(collection(db, 'audit_logs'), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
}

/**
 * Fetch the audit trail for a single resource (e.g. one report, one PTW).
 * Returns all actions ever taken on that document, ordered oldest → newest.
 */
export async function fetchResourceAuditTrail(
  orgId: string,
  resourceType: AuditResourceType,
  resourceId: string,
): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, 'audit_logs'),
    where('org_id', '==', orgId),
    where('resource_type', '==', resourceType),
    where('resource_id', '==', resourceId),
    orderBy('timestamp', 'asc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
}

// ─────────────────────────────────────────────────────────────────────────────
// Live subscription (for the dashboard's real-time activity feed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live counterpart to fetchAuditLogs() — same org-scoped, newest-first query,
 * but pushed via onSnapshot instead of fetched once. Returns an unsubscribe
 * function; callers must invoke it on unmount to stop the listener.
 *
 * Read cost note: unlike fetchAuditLogs(), this keeps a connection open and
 * re-delivers the full result set on every matching write, not just new
 * documents. Fine for a small limit() on a dashboard widget; do not reuse
 * this pattern for a large, unbounded collection.
 */
export function subscribeToAuditLogs(
  orgId: string,
  onData: (entries: AuditLogEntry[]) => void,
  limitCount = 15,
): () => void {
  const q = query(
    collection(db, 'audit_logs'),
    where('org_id', '==', orgId),
    orderBy('timestamp', 'desc'),
    limit(limitCount),
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry)));
    },
    (error) => {
      // Never let a listener failure crash the dashboard — log and leave
      // the widget showing its last-known (or empty) state.
      console.error('[auditLogger] Live feed subscription failed:', error);
    },
  );

  return unsubscribe;
}

/**
 * "2 min ago" / "3 hrs ago" / "Yesterday" style formatting for a stored
 * ISO timestamp string. Falls back to a plain date once it's a week old.
 */
export function formatRelativeTime(timestamp: string): string {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return '';

  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return new Date(then).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate a value snapshot to avoid hitting Firestore's 1MB doc limit.
 * Keeps the snapshot readable but caps array lengths and string lengths.
 */
function truncateSnapshot(
  obj: Record<string, any>,
  maxStringLen = 500,
  maxArrayLen = 20,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || typeof value === 'function') continue;
    if (typeof value === 'string') {
      result[key] = value.length > maxStringLen
        ? value.slice(0, maxStringLen) + '…'
        : value;
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, maxArrayLen);
    } else if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
      result[key] = truncateSnapshot(value, maxStringLen, maxArrayLen);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Remove undefined values from an object so Firestore doesn't reject it.
 */
function sanitiseForFirestore(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value && typeof value === 'object' && !(value instanceof Timestamp) && !Array.isArray(value)) {
      result[key] = sanitiseForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action label helpers (for display in AuditLog.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE:           'Created',
  UPDATE:           'Updated',
  DELETE:           'Deleted',
  STATUS_CHANGE:    'Status Changed',
  APPROVE:          'Approved',
  REJECT:           'Rejected',
  SUBMIT:           'Submitted',
  SIGN:             'Signed',
  ACKNOWLEDGE:      'Acknowledged',
  LOGIN:            'Signed In',
  LOGOUT:           'Signed Out',
  EXPORT:           'Exported',
  IMPORT:           'Imported',
  ASSIGN:           'Assigned',
  COMPLETE:         'Completed',
  CANCEL:           'Cancelled',
  ARCHIVE:          'Archived',
  RESTORE:          'Restored',
  PERMISSION_CHANGE:'Permission Changed',
};

export const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE:           'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  UPDATE:           'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  DELETE:           'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  STATUS_CHANGE:    'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  APPROVE:          'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  REJECT:           'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  SUBMIT:           'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  SIGN:             'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
  ACKNOWLEDGE:      'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300',
  LOGIN:            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  LOGOUT:           'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  EXPORT:           'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  IMPORT:           'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  ASSIGN:           'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
  COMPLETE:         'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  CANCEL:           'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  ARCHIVE:          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  RESTORE:          'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  PERMISSION_CHANGE:'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
};

export const RESOURCE_LABELS: Record<AuditResourceType, string> = {
  report:                'Incident Report',
  ptw:                   'Permit to Work',
  inspection:            'Inspection',
  action:                'Action Item',
  training_record:       'Training Record',
  training_session:      'Training Session',
  training_course:       'Training Course',
  tbt_session:           'Toolbox Talk',
  plan:                  'Safety Plan',
  rams:                  'RAMS',
  checklist_run:         'Checklist',
  user:                  'User',
  organization:          'Organisation',
  project:               'Project',
  compliance_item:       'Compliance Item',
  emergency_plan:        'Emergency Plan',
  emergency_drill:       'Emergency Drill',
  bbs_observation:       'BBS Observation',
  environmental_reading: 'Environmental Reading',
  contractor_profile:    'Contractor Profile',
  ppe_item:              'PPE Item',
  document:              'Document',
  fatigue_assessment:    'Fatigue Assessment',
  meeting:               'Safety Meeting',
  notification:          'Notification',
};