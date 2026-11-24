// Who should hear about a transition, and what to tell them. Pure.
//
// Old behaviour this replaces: nobody was ever notified (the notification
// documents had no org_id, so the rules refused them and the list never
// showed them), and the "who" was a hard-coded role.

import { APPROVERS, REVIEWERS, STAGE_LABEL, type ActionId, type Stage } from './model';
import { severityFromTone, type NotificationInput, type NotificationType } from '../shared/notifications';

export interface NotifyUser {
  id: string;
  org_id: string;
  role: string;
  name?: string;
  project_ids?: string[];
  /** 'active' users only; invited / suspended people are skipped. */
  status?: string;
}

export interface NotifyPermit {
  org_id: string;
  project_id: string;
  type?: string;
  title?: string;
  permit_no?: string;
  creator_id?: string;
  receiver_id?: string;
}

export interface PlannedNotification {
  user_id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const MAX_RECIPIENTS = 25;

function onProject(u: NotifyUser, p: NotifyPermit): boolean {
  if (u.org_id !== p.org_id) return false;
  if (u.status && u.status !== 'active') return false;
  return u.role === 'ADMIN' || u.role === 'ORG_ADMIN' || (u.project_ids ?? []).includes(p.project_id);
}

const VERB: Partial<Record<Stage, string>> = {
  SUBMITTED: 'was submitted and needs a pre-screen',
  SITE_INSPECTION: 'passed pre-screen and needs a site inspection',
  APPROVAL: 'passed site inspection and needs approval',
  SITE_HANDOVER: 'was approved and is ready for handover',
  ACTIVE: 'is active',
  HOLD: 'was put ON HOLD',
  EXPIRED: 'has EXPIRED',
  COMPLETION_PENDING: 'is waiting for its completion inspection and closure',
  CLOSED: 'was closed',
  CANCELLED: 'was cancelled',
  REJECTED: 'was REJECTED',
  DRAFT: 'was sent back for changes',
};

const TONE: Partial<Record<Stage, PlannedNotification['type']>> = {
  SITE_HANDOVER: 'success', CLOSED: 'success',
  HOLD: 'error', REJECTED: 'error', CANCELLED: 'warning', EXPIRED: 'warning', DRAFT: 'warning',
};

/**
 * @param action  what just happened
 * @param to      the stage the permit is now in
 * @param actorId the person who did it (never notified about their own action)
 */
export function planNotifications(
  permit: NotifyPermit,
  action: ActionId,
  to: Stage,
  actorId: string,
  users: NotifyUser[],
  note?: string,
): PlannedNotification[] {
  const requesters = [permit.creator_id, permit.receiver_id].filter((x): x is string => !!x);
  const inScope = users.filter(u => onProject(u, permit));
  const reviewers = inScope.filter(u => (REVIEWERS as readonly string[]).includes(u.role) && !requesters.includes(u.id));
  const approvers = inScope.filter(u => (APPROVERS as readonly string[]).includes(u.role) && !requesters.includes(u.id));
  const people = (ids: string[]) => inScope.filter(u => ids.includes(u.id));

  let to_: NotifyUser[];
  switch (to) {
    case 'SUBMITTED':
    case 'SITE_INSPECTION': to_ = reviewers; break;
    case 'APPROVAL': to_ = approvers; break;
    case 'SITE_HANDOVER':
    case 'CLOSED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'DRAFT': to_ = people(requesters); break;
    case 'ACTIVE': to_ = action === 'accept_handover' ? [] : people(requesters); break; // resume / revalidate
    case 'HOLD':
    case 'EXPIRED': to_ = [...people(requesters), ...reviewers]; break;
    case 'COMPLETION_PENDING': to_ = reviewers; break;
    default: to_ = [];
  }

  const ref = [permit.permit_no, permit.type].filter(Boolean).join(' · ') || 'A permit';
  const what = action === 'revalidate' ? 'was extended (revalidated)'
    : action === 'resume' ? 'was resumed'
    : (VERB[to] ?? `moved to ${STAGE_LABEL[to]}`);
  const tail = note && ['HOLD', 'REJECTED', 'CANCELLED', 'DRAFT', 'ACTIVE'].includes(to) ? ` Reason: ${note.trim().slice(0, 140)}` : '';
  const message = `${ref}${permit.title ? ` (${permit.title.slice(0, 60)})` : ''} ${what}.${tail}`;
  const type = action === 'revalidate' ? 'info' : (TONE[to] ?? 'info');

  const seen = new Set<string>();
  const out: PlannedNotification[] = [];
  for (const u of to_) {
    if (u.id === actorId || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push({ user_id: u.id, message, type });
    if (out.length >= MAX_RECIPIENTS) break;
  }
  return out;
}

/**
 * The notification document for one planned message. `type` picks the icon on the notification screen;
 * the permit number and type are the title; clicking opens the permit screen.
 */
export function toNotificationInput(permit: NotifyPermit & { id?: string }, to: Stage, n: PlannedNotification): NotificationInput {
  const type: NotificationType =
    to === 'REJECTED' || to === 'CANCELLED' || to === 'HOLD' ? 'ptw_rejected'
    : to === 'EXPIRED' ? 'ptw_expiring'
    : to === 'SITE_HANDOVER' || to === 'ACTIVE' || to === 'CLOSED' ? 'ptw_approved'
    : 'system';
  return {
    org_id: permit.org_id,
    user_id: n.user_id,
    type,
    severity: severityFromTone(n.type),
    title: [permit.permit_no, permit.type].filter(Boolean).join(' \u00b7 ') || 'Permit to work',
    message: n.message,
    link_page: 'ptw',
    ...(permit.id ? { link_id: permit.id } : {}),
  };
}
