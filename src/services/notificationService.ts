import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import {
  buildNotification, severityFromTone,
  type NotificationInput, type NotificationType,
} from '../lib/shared/notifications';

/** The tone the older call sites use; it is mapped onto the notification screen's severity. */
export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationExtra {
  title?: string;
  type?: NotificationType;
  /** App view to open when the notification is clicked, e.g. 'reports'. */
  link_page?: string;
  link_id?: string;
}

const titleFrom = (message: string) => (message.length > 60 ? `${message.slice(0, 57)}...` : message);

/**
 * Writes notification documents. Best effort: a failed notification never fails the action that caused it.
 * Every document carries org_id (the database rules refuse it otherwise) and the fields the notification
 * screen reads (see src/lib/shared/notifications.ts).
 */
export async function writeNotifications(inputs: NotificationInput[], now: number = Date.now()): Promise<void> {
  const results = await Promise.allSettled(
    inputs.map(n => addDoc(collection(db, 'notifications'), buildNotification(n, now))),
  );
  for (const r of results) if (r.status === 'rejected') console.error('[notifications] write failed:', r.reason);
}

/**
 * Sends a notification to one person.
 * @param userId the recipient's users-document id
 */
export const sendNotification = async (
  orgId: string,
  userId: string,
  message: string,
  tone: NotificationTone = 'info',
  extra: NotificationExtra = {},
) => {
  if (!orgId || !userId) return;
  try {
    await writeNotifications([{
      org_id: orgId, user_id: userId, type: extra.type ?? 'system', severity: severityFromTone(tone),
      title: extra.title ?? titleFrom(message), message, link_page: extra.link_page, link_id: extra.link_id,
    }]);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

/**
 * Sends a notification to every active user with a given role in an organisation.
 */
export const notifyRole = async (
  orgId: string,
  role: string,
  message: string,
  tone: NotificationTone = 'info',
  extra: NotificationExtra = {},
) => {
  if (!orgId) return;
  try {
    const snapshot = await getDocs(query(
      collection(db, 'users'),
      where('org_id', '==', orgId),
      where('role', '==', role),
    ));
    if (snapshot.empty) return;
    const people = snapshot.docs.filter(d => {
      const status = (d.data() as { status?: string }).status;
      return !status || status === 'active';
    });
    await writeNotifications(people.map(d => ({
      org_id: orgId, user_id: d.id, type: extra.type ?? 'system', severity: severityFromTone(tone),
      title: extra.title ?? titleFrom(message), message, link_page: extra.link_page, link_id: extra.link_id,
    })));
  } catch (error) {
    console.error(`Failed to notify role ${role}:`, error);
  }
};
