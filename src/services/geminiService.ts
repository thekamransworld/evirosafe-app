import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// --- CONFIGURATION ---
// These values are public and safe to be in the code for Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBsG6olIcDkJpNNVcK3RPoH0jScmocZanM",
  authDomain: "evirosafe-auth.firebaseapp.com",
  projectId: "evirosafe-auth",
  storageBucket: "evirosafe-auth.firebasestorage.app",
  messagingSenderId: "549739145640",
  appId: "1:549739145640:web:aa0d67ab931bfc7cdcd59d",
  measurementId: "G-NLZV3LWNEM"
};

// --- INITIALIZATION ---
// Prevent double-initialization in development
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- OFFLINE PERSISTENCE ---
// This allows the app to work when the internet cuts out
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
} catch(e) {
  // Ignore errors in environments that don't support it (like server-side rendering)
}

export { app, db, auth, storage };