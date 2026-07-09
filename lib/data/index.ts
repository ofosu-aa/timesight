import { Repository, SyncStatus } from "./repository";
import { localRepository } from "./localRepository";
import { firestoreRepository } from "./firestoreRepository";
import { firebaseConfigured } from "../firebase";

/* Guests persist locally (with cross-tab live sync). Signed-in users persist
   to Firestore with a local write-behind copy for offline, plus real-time
   cross-device sync via subscribe(). onStatus reports whether the last save
   reached the cloud — surfaced in Settings so sync failures are never silent. */
export function repositoryFor(isGuest: boolean, onStatus?: (s: SyncStatus) => void): Repository {
  if (isGuest || !firebaseConfigured) {
    return {
      ...localRepository,
      async save(uid, data) {
        await localRepository.save(uid, data);
        onStatus?.("local");
      },
    };
  }
  return {
    async load(uid) {
      try {
        const remote = await firestoreRepository.load(uid);
        await localRepository.save(uid, remote);
        onStatus?.("synced");
        return remote;
      } catch {
        onStatus?.("error");
        return localRepository.load(uid);
      }
    },
    async save(uid, data) {
      await localRepository.save(uid, data);
      try {
        await firestoreRepository.save(uid, data);
        onStatus?.("synced");
      } catch {
        onStatus?.("error");   // offline or rules blocking — local copy holds
      }
    },
    async clear(uid) {
      await localRepository.clear(uid);
      try { await firestoreRepository.clear(uid); } catch { /* offline */ }
    },
    subscribe(uid, cb) {
      const un = firestoreRepository.subscribe!(uid, (remote) => {
        void localRepository.save(uid, remote);  // keep offline copy fresh
        cb(remote);
      });
      return un;
    },
  };
}
export { localRepository };
export type { SyncStatus };
