/* Firebase configuration.
   These web config values are CLIENT-SAFE by design (they identify the
   project; security comes from Firestore rules + Auth, not secrecy).
   Env vars override the baked-in defaults if present — useful for pointing
   a staging deploy at a different Firebase project.
   OAuth client secrets are a different story and NEVER belong here. */
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAxMeaBrEkdYnt7pmhdAh7gtyAJEIyNjm8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xerras-timesight.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xerras-timesight",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "xerras-timesight.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1006644339958",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1006644339958:web:eaf27c9295b682507838d7",
};

export const firebaseConfigured = !!(cfg.apiKey && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = getApps()[0] || initializeApp(cfg);
  return app;
}
export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}
export function getDb(): Firestore | null {
  const a = getFirebaseApp();
  return a ? getFirestore(a) : null;
}
