import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { AppData, EMPTY_DATA, DEFAULT_SETTINGS } from "../types";
import { Repository } from "./repository";
import { getDb } from "../firebase";

/* V1 Firestore schema (pragmatic): the full app state lives in one document
   per user at /users/{uid}/app/state. This keeps sync atomic and rules simple.
   The repository interface means migrating to per-entity subcollections
   (/users/{uid}/tasks/{id}, etc.) later requires no product-code changes —
   see docs/FIREBASE_SETUP.md for the migration path. */
export const firestoreRepository: Repository = {
  async load(uid) {
    const db = getDb();
    if (!db) return structuredClone(EMPTY_DATA);
    const snap = await getDoc(doc(db, "users", uid, "app", "state"));
    if (!snap.exists()) return structuredClone(EMPTY_DATA);
    const d = snap.data() as Partial<AppData>;
    return { ...structuredClone(EMPTY_DATA), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
  },
  async save(uid, data) {
    const db = getDb();
    if (!db) return;
    await setDoc(doc(db, "users", uid, "app", "state"), JSON.parse(JSON.stringify(data)));
  },
  async clear(uid) {
    const db = getDb();
    if (!db) return;
    await deleteDoc(doc(db, "users", uid, "app", "state"));
  },
};
