"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup,
  deleteUser, User as FbUser,
} from "firebase/auth";
import { getFirebaseAuth, firebaseConfigured } from "./firebase";
import { localRepository } from "./data";
import { firestoreRepository } from "./data/firestoreRepository";

export interface TsUser { uid: string; email: string | null; displayName: string | null; isGuest: boolean; }

interface AuthCtx {
  user: TsUser | null;
  loading: boolean;
  firebaseAvailable: boolean;
  signup(email: string, password: string, name: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  logout(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  continueAsGuest(): void;
  deleteAccount(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const GUEST_FLAG = "timesight:guest";
export const GUEST_UID = "guest";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TsUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // No Firebase config: guest mode only.
      if (typeof window !== "undefined" && window.localStorage.getItem(GUEST_FLAG)) {
        setUser({ uid: GUEST_UID, email: null, displayName: "Guest", isGuest: true });
      }
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (fb: FbUser | null) => {
      if (fb) {
        setUser({ uid: fb.uid, email: fb.email, displayName: fb.displayName, isGuest: false });
      } else if (typeof window !== "undefined" && window.localStorage.getItem(GUEST_FLAG)) {
        setUser({ uid: GUEST_UID, email: null, displayName: "Guest", isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  /* Migrate guest data into the new account after sign-up/sign-in. */
  async function migrateGuestData(uid: string) {
    try {
      const guest = await localRepository.load(GUEST_UID);
      const hasContent = guest.tasks.length || guest.sessions.length || guest.routines.length;
      if (!hasContent) return;
      const existing = await firestoreRepository.load(uid).catch(() => null);
      const empty = !existing || (!existing.tasks.length && !existing.sessions.length);
      if (empty) {
        await firestoreRepository.save(uid, guest);
        await localRepository.save(uid, guest);
        await localRepository.clear(GUEST_UID);
      }
    } catch { /* migration is best-effort */ }
  }

  const requireAuth = () => {
    const a = getFirebaseAuth();
    if (!a) throw new Error("Accounts need Firebase configuration. You can continue as a guest — data stays on this device.");
    return a;
  };

  const value: AuthCtx = {
    user, loading, firebaseAvailable: firebaseConfigured,
    async signup(email, password, name) {
      const auth = requireAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      window.localStorage.removeItem(GUEST_FLAG);
      await migrateGuestData(cred.user.uid);
    },
    async login(email, password) {
      const auth = requireAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      window.localStorage.removeItem(GUEST_FLAG);
      await migrateGuestData(cred.user.uid);
    },
    async loginWithGoogle() {
      const auth = requireAuth();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      window.localStorage.removeItem(GUEST_FLAG);
      await migrateGuestData(cred.user.uid);
    },
    async logout() {
      const auth = getFirebaseAuth();
      window.localStorage.removeItem(GUEST_FLAG);
      if (auth) await signOut(auth);
      setUser(null);
    },
    async resetPassword(email) {
      const auth = requireAuth();
      await sendPasswordResetEmail(auth, email);
    },
    continueAsGuest() {
      window.localStorage.setItem(GUEST_FLAG, "1");
      setUser({ uid: GUEST_UID, email: null, displayName: "Guest", isGuest: true });
    },
    async deleteAccount() {
      const auth = getFirebaseAuth();
      if (user?.isGuest || !auth?.currentUser) {
        await localRepository.clear(GUEST_UID);
        window.localStorage.removeItem(GUEST_FLAG);
        setUser(null);
        return;
      }
      const uid = auth.currentUser.uid;
      await firestoreRepository.clear(uid).catch(() => {});
      await localRepository.clear(uid);
      await deleteUser(auth.currentUser);
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
