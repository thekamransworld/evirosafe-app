// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace with your actual config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "evirosafe-auth.firebaseapp.com",
  projectId: "evirosafe-auth",
  storageBucket: "evirosafe-auth.firebasestorage.app",
  messagingSenderId: "549739145640",
  appId: "1:549739145640:web:..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});

export { auth, db, storage };