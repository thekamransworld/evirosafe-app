import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * AuthSync — renders nothing, just keeps Firebase Auth in sync with AppContext.
 * When a Firebase user is present, resolves their Firestore user doc and calls
 * AppContext.login() so the rest of the app has a fully-resolved activeUser.
 */
const AuthSync: React.FC = () => {
  const { currentUser } = useAuth();
  const { login } = useAppContext();

  useEffect(() => {
    if (!currentUser) return;

    const resolve = async () => {
      try {
        // 1. Try matching by auth UID field
        let userId: string | null = null;

        const uidQuery = query(
          collection(db, 'users'),
          where('auth_uid', '==', currentUser.uid)
        );
        const uidSnap = await getDocs(uidQuery);

        if (!uidSnap.empty) {
          userId = uidSnap.docs[0].id;
        } else if (currentUser.email) {
          // 2. Fallback: match by email (invited users)
          const emailQuery = query(
            collection(db, 'users'),
            where('email', '==', currentUser.email)
          );
          const emailSnap = await getDocs(emailQuery);
          if (!emailSnap.empty) {
            userId = emailSnap.docs[0].id;
          }
        }

        // 3. Last resort: use the Firebase UID directly as the doc ID
        if (!userId) {
          userId = currentUser.uid;
        }

        login(userId);
      } catch (err) {
        console.error('AuthSync: failed to resolve user doc', err);
        // Still call login with the UID so the app stays functional
        login(currentUser.uid);
      }
    };

    resolve();
  }, [currentUser?.uid]);

  return null;
};

export default AuthSync;
