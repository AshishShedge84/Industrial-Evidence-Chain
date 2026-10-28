import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAGR50D7O96gMrq4v4-qoDKW_3t7at7JRI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "electronics-gadget-review-sys.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "electronics-gadget-review-sys",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "electronics-gadget-review-sys.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "50069074898",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:50069074898:web:21532c81852ba39d188e0b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4DTEX7XFZV",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

