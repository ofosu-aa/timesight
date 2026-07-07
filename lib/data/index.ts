import { Repository } from "./repository";
import { localRepository } from "./localRepository";
import { firestoreRepository } from "./firestoreRepository";
import { firebaseConfigured } from "../firebase";

/* Guests always persist locally. Signed-in users persist to Firestore with a
   local write-behind copy so the app keeps working offline (offline queue:
   last write wins on reconnect via the debounced save). */
export function repositoryFor(isGuest: boolean): Repository {
  if (isGuest || !firebaseConfigured) return localRepository;
  return {
    async load(uid) {
      try {
        const remote = await firestoreRepository.load(uid);
        await localRepository.save(uid, remote);
        return remote;
      } catch { return localRepository.load(uid); }
    },
    async save(uid, data) {
      await localRepository.save(uid, data);
      try { await firestoreRepository.save(uid, data); } catch { /* offline — local copy holds */ }
    },
    async clear(uid) {
      await localRepository.clear(uid);
      try { await firestoreRepository.clear(uid); } catch { /* offline */ }
    },
  };
}
export { localRepository };
