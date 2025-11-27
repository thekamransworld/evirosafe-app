import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <--- NEW IMPORT

const firebaseConfig = {
  apiKey: "AIzaSyBsG6olIcDkJpNNVcK3RPoH0jScmocZanM",
  authDomain: "evirosafe-auth.firebaseapp.com",
  projectId: "evirosafe-auth",
  storageBucket: "evirosafe-auth.firebasestorage.app",
  messagingSenderId: "549739145640",
  appId: "1:549739145640:web:aa0d67ab931bfc7cdcd59d",
  measurementId: "G-NLZV3LWNEM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // <--- NEW EXPORT
export default app;