import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: string | null;
  userStatus: string | null;
  loading: boolean;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // 1. Try finding user by Auth UID (Standard way)
          let docRef = doc(db, "users", user.uid);
          let docSnap = await getDoc(docRef);

          // 2. If not found by UID, try finding by Email (Legacy/Invite way)
          if (!docSnap.exists() && user.email) {
             const q = query(collection(db, "users"), where("email", "==", user.email));
             const querySnapshot = await getDocs(q);
             if (!querySnapshot.empty) {
                 docSnap = querySnapshot.docs[0];
             }
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role);
            setUserStatus(data.status);
          } else {
            setUserRole(null);
            setUserStatus('unregistered');
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserStatus('error');
        }
      } else {
        setUserRole(null);
        setUserStatus(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- MODIFIED SIGNUP LOGIC ---
  async function signup(email: string, pass: string, name: string) {
    // 1. Check if email exists in Firestore and is 'invited'
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

    // 2. Create Authentication Account
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 3. Update Display Name
    await updateProfile(userCredential.user, { displayName: name });

    // 4. Activate the user in Firestore
    // We keep the original Document ID to preserve relationships (projects, reports, etc.)
    await updateDoc(doc(db, "users", userDoc.id), {
        status: 'active',
        auth_uid: userCredential.user.uid, // Link Auth UID for future reference
        name: name // Ensure name matches what they typed
    });
  }

  async function login(email: string, pass: string) {
    await signInWithEmailAndPassword(auth, email, pass);
  }

  async function logout() {
    await signOut(auth);
    setUserRole(null);
    setUserStatus(null);
  }

  const value: AuthContextType = {
    currentUser,
    userRole,
    userStatus,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}