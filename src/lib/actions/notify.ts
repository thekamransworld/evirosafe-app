// Who should hear about a step, and what to tell them. Pure. Every document carries org_id and the fields the
// notification screen reads (see src/lib/shared/notifications.ts).

import { NOTIFY, REVIEWERS, STAGE_LABEL, type Audience, type NotifyStep, type Stage } from './model';
import type { NotificationInput, NotificationType, NotifSeverity } from '../shared/notifications';

export interface NotifyUser {
  id: string;
  org_id: string;
  role: string;
  name?: string;
  project_ids?: string[];
  /** 'active' users only; invited / suspended people are skipped. */
  status?: string;
}

export interface NotifyAction {
  id?: string;
  org_id: string;
  project_id?: string;
  number?: string;
  title?: string;
  owner_id: string;
  creator_id: string;
  source?: { type?: string };
}

const MAX_RECIPIENTS = 25;

const active = (u: NotifyUser, a: NotifyAction) => u.org_id === a.org_id && (!u.status || u.status === 'active');
const onProject = (u: NotifyUser, a: NotifyAction) =>
  active(u, a) && (u.role === 'ADMIN' || u.role === 'ORG_ADMIN' || !a.project_id || (u.project_ids ?? []).includes(a.project_id));

export type { NotifyStep };

const VERB: Record<NotifyStep, string> = {
  create: 'was assigned to you',
  start: 'was started',
  complete: 'was marked completed and needs verification',
  verify: 'was verified and closed',
  send_back: 'was sent back: it is not done yet',
  add_note: 'has a new progress note',
  reschedule: 'was changed (owner, due date or priority)',
  withdraw: 'was withdrawn',
  cancel: 'was cancelled',
  reopen: 'was reopened',
};

const SEVERITY: Record<NotifyStep, NotifSeverity> = {
  create: 'info', start: 'info', complete: 'info', verify: 'success', send_back: 'warning',
  add_note: 'info', reschedule: 'info', withdraw: 'warning', cancel: 'warning', reopen: 'warning',
};

const WITH_REASON: readonly NotifyStep[] = ['send_back', 'withdraw', 'cancel', 'reopen', 'reschedule'];

/**
 * @param step    what just happened
 * @param to      the stage the action is now in
 * @param actorId the person who did it (never notified about their own step)
 * @param prevOwnerId for "reschedule": the owner before the change, who should hear that it moved away
 */
export function planNotifications(args: {
  action: NotifyAction;
  step: NotifyStep;
  to: Stage;
  actorId: string;
  users: NotifyUser[];
  note?: string;
  prevOwnerId?: string;
}): NotificationInput[] {
  const { action, step, actorId, users, note } = args;
  const person = (id?: string) => users.filter(u => !!id && u.id === id && active(u, action));
  const owner = person(action.owner_id);
  const creator = person(action.creator_id);
  const previous = args.prevOwnerId && args.prevOwnerId !== action.owner_id ? person(args.prevOwnerId) : [];
  const verifiers = users.filter(u => onProject(u, action) && (REVIEWERS as readonly string[]).includes(u.role) && u.id !== action.owner_id);

  // Who hears about it comes from the table in model.ts (NOTIFY).
  const groups: Record<Audience, NotifyUser[]> = { owner, creator, verifiers, previous_owner: previous };
  const to_: NotifyUser[] = (NOTIFY[step] ?? []).flatMap(a => groups[a]);

  const ref = action.number ?? 'An action';
  const type: NotificationType = step === 'create' || step === 'reschedule'
    ? (action.source?.type === 'incident' ? 'capa_assigned' : 'action_assigned')
    : 'action_assigned';
  const tail = note && WITH_REASON.includes(step) ? ` Reason: ${note.trim().slice(0, 140)}` : '';
  const what = step === 'reschedule' && previous.length ? `${VERB[step]}` : VERB[step];
  const title = [action.number, action.title].filter(Boolean).join(' · ').slice(0, 200) || 'Action';
  const message = `${ref}${action.title ? ` (${action.title.slice(0, 60)})` : ''} ${what}.${tail}`;

  const seen = new Set<string>();
  const out: NotificationInput[] = [];
  for (const u of to_) {
    if (u.id === actorId || seen.has(u.id)) continue;
    seen.add(u.id);
    const gone = previous.some(p => p.id === u.id);
    out.push({
      org_id: action.org_id, user_id: u.id, type, severity: SEVERITY[step],
      title,
      message: gone ? `${ref}${action.title ? ` (${action.title.slice(0, 60)})` : ''} was reassigned to someone else.${tail}` : message,
      link_page: 'actions',
      ...(action.id ? { link_id: action.id } : {}),
    });
    if (out.length >= MAX_RECIPIENTS) break;
  }
  return out;
}

export { STAGE_LABEL };
