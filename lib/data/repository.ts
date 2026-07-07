import { AppData } from "../types";

/* Repository layer: the app talks to this interface only, so persistence can
   be local (guest mode), Firestore (signed in), or native (Capacitor
   Preferences) without touching product code. */
export interface Repository {
  load(uid: string): Promise<AppData>;
  save(uid: string, data: AppData): Promise<void>;
  clear(uid: string): Promise<void>;
}
