import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Reads from VITE_FIREBASE_* env vars so different environments (local dev,
// Vercel Preview, Vercel Production) can point at different Firebase
// projects - previously this was hardcoded, meaning local dev and every
// PR preview deploy all wrote to the same live production Firestore.
//
// Falls back to the real production project's values if a var isn't set,
// so nothing breaks today: this only takes effect once a dev/staging
// Firebase project's config is actually placed in .env.local (git-ignored)
// for local work, or in Vercel's Preview-scoped environment variables.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || "AIzaSyBsG6olIcDkJpNNVcK3RPoH0jScmocZanM",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || "evirosafe-auth.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || "evirosafe-auth",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || "evirosafe-auth.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "549739145640",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || "1:549739145640:web:aa0d67ab931bfc7cdcd59d",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      || "G-NLZV3LWNEM"
};

// Visible in every environment's console on load, so it's always obvious
// which Firebase project a given tab is actually talking to - the kind of
// thing that's easy to forget once dev/prod are separate projects with
// similar-looking data.
console.info(`[Firebase] Connected to project: ${firebaseConfig.projectId}`);

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

// --- ENABLE OFFLINE PERSISTENCE ---
// This allows the app to work without internet
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Offline persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
        console.warn("Offline persistence not supported by browser.");
    }
});

export { app, db, auth };