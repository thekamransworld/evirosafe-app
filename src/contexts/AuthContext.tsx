import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Identity/role resolution (docId vs auth UID, email fallback, etc.) lives
  // in AuthSync.tsx, which calls AppContext.login() to build the real
  // activeUser. This listener only tracks the raw Firebase Auth user —
  // it used to also attempt its own (wrong-docId) Firestore lookup here,
  // which threw a permission-denied error on every load and populated
  // userRole/userStatus, neither of which anything in the app read.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- MODIFIED SIGNUP LOGIC ---
  async function signup(rawEmail: string, pass: string, name: string) {
    // Normalize casing: Firebase Auth always lowercases the token email
    // internally, and invited-user records are now stored lowercase too, so
    // comparisons only work reliably if this side matches.
    const email = rawEmail.trim().toLowerCase();

    // 1. Create the Authentication account FIRST. Firestore's security rules
    // require an authenticated request to read the `users` collection (correctly —
    // we don't want unauthenticated clients able to query/enumerate user records),
    // so the invite lookup below can only succeed once this exists.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);

    try {
      // 2. Check if this email was actually invited. Firestore can approve this
      // query because it filters on the same email as the caller's own auth
      // token — see the `resource.data.email == request.auth.token.email`
      // clause in firestore.rules.
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          throw new Error("This email has not been invited to EviroSafe.");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.status === 'active') {
          throw new Error("This account is already active. Please log in.");
      }

      // 3. Update Display Name
      await updateProfile(userCredential.user, { displayName: name });

      // 4. Activate the user in Firestore
      // We keep the original Document ID to preserve relationships (projects, reports, etc.)
      await updateDoc(doc(db, "users", userDoc.id), {
          status: 'active',
          auth_uid: userCredential.user.uid, // Link Auth UID for future reference
          name: name // Ensure name matches what they typed
      });

      // 5. Write a small pointer doc keyed by the real Auth UID. Firestore security rules
      // can only look up a document by its exact known path, not by querying a field like
      // auth_uid — so without this, rules have no reliable way to find a user's org_id/role.
      // This is what security rules will actually read; keep it in sync with anything that
      // changes a user's role or org_id after this point.
      await setDoc(doc(db, "users_by_uid", userCredential.user.uid), {
          docId: userDoc.id,
          org_id: userData.org_id,
          role: userData.role,
          project_ids: userData.project_ids || [],
      });
    } catch (err) {
      // Something after account creation failed (not invited, already active,
      // or a rules/network error) — delete the orphaned Auth account so a
      // corrected retry isn't blocked by "email already in use".
      await userCredential.user.delete().catch(() => {});
      throw err;
    }
  }

  async function login(email: string, pass: string) {
    await signInWithEmailAndPassword(auth, email, pass);
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}