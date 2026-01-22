import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Sends a notification to a specific user.
 */
export const sendNotification = async (
  userId: string,
  message: string,
  type: NotificationType = 'info',
  link?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      message,
      type,
      link,
      is_read: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

/**
 * Sends a notification to all users with a specific role within an organization.
 */
export const notifyRole = async (
  orgId: string,
  role: string,
  message: string,
  type: NotificationType = 'info',
  link?: string
) => {
  try {
    // Find all users with this role in the org
    const q = query(
      collection(db, 'users'), 
      where('org_id', '==', orgId),
      where('role', '==', role)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const promises = snapshot.docs.map(doc => 
      addDoc(collection(db, 'notifications'), {
        user_id: doc.id,
        message,
        type,
        link,
        is_read: false,
        timestamp: new Date().toISOString()
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error(`Failed to notify role ${role}:`, error);
  }
};