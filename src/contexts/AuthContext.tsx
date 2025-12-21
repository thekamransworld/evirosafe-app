import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: string | null;
  userStatus: string | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<void>;
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
  const [userStatus, setUserStatus] = useState<string | null>(null); // 'active', 'pending'
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Monitor Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is logged in, check their Firestore Profile
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role);
            setUserStatus(data.status);
          } else {
            // User exists in Auth but NOT in Database (Uninvited)
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

  async function signup(email: string, pass: string) {
    await createUserWithEmailAndPassword(auth, email, pass);
    // Note: In this strict security model, a cloud function or admin 
    // usually creates the Firestore document. If we want self-signup, 
    // we would create the doc here, but our Rules block that for safety.
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