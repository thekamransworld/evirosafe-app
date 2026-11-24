// The ONE shape of a notification document. Every writer (permits, actions, the old helpers) builds it here,
// so the screen that shows notifications (NotificationCenter) and the Firestore rules agree on it.
//
// Why this exists: the old writers produced documents with no org_id (refused by the rules for everyone but
// the platform ADMIN) and with fields the notification screen does not read (it filters on org_id and sorts on
// created_at, and reads `read`, `title` and `severity`). Nobody was ever told anything.

export const NOTIFICATION_TYPES = [
  'ptw_approved', 'ptw_rejected', 'ptw_expiring',
  'incident_submitted', 'incident_assigned',
  'action_overdue', 'action_assigned',
  'certification_expiry', 'inspection_due', 'inspection_assigned', 'capa_assigned',
  'document_review_due', 'drill_scheduled', 'bbs_follow_up', 'env_breach', 'fatigue_alert',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotifSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface NotificationInput {
  org_id: string;
  /** The recipient's users-collection document id (the same id the pointer document calls docId). */
  user_id: string;
  type: NotificationType;
  severity: NotifSeverity;
  title: string;
  message: string;
  /** App view to open, e.g. 'ptw' or 'actions'. */
  link_page?: string;
  link_id?: string;
}

/** Every top-level field a notification may carry (the generated rules refuse anything else). */
export const NOTIFICATION_KEYS = [
  'org_id', 'user_id', 'type', 'severity', 'title', 'message', 'link_page', 'link_id', 'link',
  'read', 'read_at', 'is_read', 'created_at', 'timestamp', 'server_timestamp', 'report_id',
] as const;
/** Fields a notification must have when it is created. */
export const NOTIFICATION_REQUIRED = ['org_id', 'user_id', 'message', 'read'] as const;
/** The only fields the recipient may change afterwards. */
export const NOTIFICATION_RECIPIENT_EDITS = ['read', 'read_at', 'is_read'] as const;

export const MAX_NOTIFICATION_TITLE = 200;
export const MAX_NOTIFICATION_MESSAGE = 600;

const clip = (s: string, n: number) => String(s ?? '').slice(0, n);

/** Maps the old four-value tone ('error') onto the screen's severity ('critical'). */
export const severityFromTone = (tone: 'info' | 'success' | 'warning' | 'error'): NotifSeverity =>
  tone === 'error' ? 'critical' : tone;

/** The document to write. Carries both field families (read / is_read, created_at / timestamp) so every screen works. */
export function buildNotification(n: NotificationInput, now: number): Record<string, unknown> {
  const iso = new Date(now).toISOString();
  const doc: Record<string, unknown> = {
    org_id: n.org_id,
    user_id: n.user_id,
    type: n.type,
    severity: n.severity,
    title: clip(n.title, MAX_NOTIFICATION_TITLE),
    message: clip(n.message, MAX_NOTIFICATION_MESSAGE),
    read: false,
    is_read: false,
    created_at: iso,
    timestamp: iso,
  };
  if (n.link_page) doc.link_page = n.link_page;
  if (n.link_id) doc.link_id = n.link_id;
  return doc;
}
