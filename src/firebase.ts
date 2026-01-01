import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // ... keep your existing config ...
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

// Initialize Firestore with Offline Persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };