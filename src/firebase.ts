import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBsG6olIcDkJpNNVcK3RPoH0jScmocZanM",
  authDomain: "evirosafe-auth.firebaseapp.com",
  projectId: "evirosafe-auth",
  storageBucket: "evirosafe-auth.firebasestorage.app",
  messagingSenderId: "549739145640",
  appId: "1:549739145640:web:aa0d67ab931bfc7cdcd59d",
  measurementId: "G-NLZV3LWNEM"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- ENABLE OFFLINE PERSISTENCE ---
// This allows the app to work without internet
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Offline persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
        console.warn("Offline persistence not supported by browser.");
    }
});

export { app, db, auth, storage };