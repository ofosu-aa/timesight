import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { AppData, EMPTY_DATA, DEFAULT_SETTINGS } from "../types";
import { Repository } from "./repository";
import { getDb } from "../firebase";

/* V1 Firestore schema (pragmatic): the full app state lives in one document
   per user at /users/{uid}/app/state. Real-time cross-device sync comes from
   onSnapshot on that document. Each browser tab gets a SESSION_ID; every
   write is stamped with it (_rev), so a tab can ignore the echo of its own
   writes and only apply changes made elsewhere. Migration path to
   per-entity subcollections: docs/FIREBASE_SETUP.md. */
const SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

function clean(raw: Record<string, unknown>): AppData {
  const d = { ...raw };
  delete d._rev;
  return { ...structuredClone(EMPTY_DATA), ...d, settings: { ...DEFAULT_SETTINGS, ...((d.settings as object) || {}) } } as AppData;
}

export const firestoreRepository: Repository = {
  async load(uid) {
    const db = getDb();
    if (!db) return structuredClone(EMPTY_DATA);
    const snap = await getDoc(doc(db, "users", uid, "app", "state"));
    if (!snap.exists()) return structuredClone(EMPTY_DATA);
    return clean(snap.data());
  },
  async save(uid, data) {
    const db = getDb();
    if (!db) throw new Error("firestore_unavailable");
    const payload = { ...JSON.parse(JSON.stringify(data)), _rev: { sid: SESSION_ID, at: Date.now() } };
    await setDoc(doc(db, "users", uid, "app", "state"), payload);
  },
  async clear(uid) {
    const db = getDb();
    if (!db) return;
    await deleteDoc(doc(db, "users", uid, "app", "state"));
  },
  subscribe(uid, cb) {
    const db = getDb();
    if (!db) return () => {};
    return onSnapshot(doc(db, "users", uid, "app", "state"), (snap) => {
      if (!snap.exists()) return;
      if (snap.metadata.hasPendingWrites) return;          // our own local echo
      const raw = snap.data();
      const rev = raw._rev as { sid?: string } | undefined;
      if (rev?.sid === SESSION_ID) return;                 // our own confirmed write
      cb(clean(raw));
    }, () => { /* permission/network errors: load/save paths already surface these */ });
  },
};
