/* Social layer — friends, shared stats, posts, kudos.
   Privacy model (deliberate):
   - Everything is OFF by default. Enabling sharing creates /profiles/{uid}.
   - The profile contains ONLY aggregate weekly stats + a display name.
     Task titles are never published automatically.
   - Individual tasks are shared one at a time via an explicit "Share" action,
     with the title editable at share time.
   - Friend codes are bearer invites: anyone you give yours to can follow
     your shared stats. Regenerate anytime to cut off future adds.
   - Framing celebrates consistency and improvement, never volume. */
import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { AppData, TimeSession } from "./types";
import { uid as makeId, isThisWeek } from "./time";

export interface WeeklyStats {
  tasksTimed: number;
  focusMinutes: number;
  accuracy: number | null;
  streakDays: number;
  activeDays: number;
}
export interface FriendProfile {
  uid: string;
  name: string;
  friendCode: string;
  sharingEnabled: boolean;
  stats: WeeklyStats;
  updatedAt: number;
}
export interface SharedPost {
  id: string;
  ownerUid: string;
  ownerName: string;
  title: string;
  minutes: number;
  estimatedMinutes: number;
  onEstimate: boolean;
  at: number;
  kudos: string[]; // uids
}

export function computeWeeklyStats(sessions: TimeSession[]): WeeklyStats {
  const week = sessions.filter((s) => isThisWeek(s.endedAt));
  const accuracy = week.length ? Math.round((week.filter((s) => s.wasFinishedOnEstimate).length / week.length) * 100) : null;
  const dayKey = (ts: number) => new Date(ts).toDateString();
  const activeDays = new Set(week.map((s) => dayKey(s.endedAt))).size;
  // Streak: consecutive days (ending today or yesterday) with >=1 timed task.
  const allDays = new Set(sessions.map((s) => dayKey(s.endedAt)));
  let streak = 0;
  const cursor = new Date();
  if (!allDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1); // today not over yet
  while (allDays.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return {
    tasksTimed: week.length,
    focusMinutes: Math.round(week.reduce((a, s) => a + s.actualMinutes, 0)),
    accuracy, streakDays: streak, activeDays,
  };
}

export const newFriendCode = () => "TS-" + makeId().slice(0, 5).toUpperCase();

/** Create/refresh the public profile with current weekly stats. */
export async function publishProfile(uid: string, name: string, friendCode: string, data: AppData): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  await setDoc(doc(db, "profiles", uid), {
    name: name || "TimeSight user",
    friendCode,
    sharingEnabled: true,
    stats: computeWeeklyStats(data.sessions),
    updatedAt: Date.now(),
  });
  await setDoc(doc(db, "friendCodes", friendCode), { uid });
}

export async function unpublishProfile(uid: string, friendCode: string | null): Promise<void> {
  const db = getDb();
  if (!db) return;
  // Delete shared posts, then the code, then the profile.
  try {
    const posts = await getDocs(collection(db, "profiles", uid, "posts"));
    await Promise.all(posts.docs.map((d) => deleteDoc(d.ref)));
  } catch { /* best effort */ }
  if (friendCode) { try { await deleteDoc(doc(db, "friendCodes", friendCode)); } catch { /* ok */ } }
  await deleteDoc(doc(db, "profiles", uid));
}

export async function rotateFriendCode(uid: string, oldCode: string | null): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  const code = newFriendCode();
  await setDoc(doc(db, "friendCodes", code), { uid });
  if (oldCode) { try { await deleteDoc(doc(db, "friendCodes", oldCode)); } catch { /* ok */ } }
  await setDoc(doc(db, "profiles", uid), { friendCode: code }, { merge: true });
  return code;
}

export async function lookupByFriendCode(code: string): Promise<FriendProfile | null> {
  const db = getDb();
  if (!db) return null;
  const c = await getDoc(doc(db, "friendCodes", code.trim().toUpperCase()));
  if (!c.exists()) return null;
  const uid = (c.data() as { uid: string }).uid;
  const p = await getDoc(doc(db, "profiles", uid));
  if (!p.exists()) return null;
  const d = p.data() as Omit<FriendProfile, "uid">;
  return { uid, ...d };
}

export async function fetchFriendProfiles(uids: string[]): Promise<FriendProfile[]> {
  const db = getDb();
  if (!db || !uids.length) return [];
  const snaps = await Promise.all(uids.map((u) => getDoc(doc(db, "profiles", u)).catch(() => null)));
  const out: FriendProfile[] = [];
  snaps.forEach((s, i) => {
    if (s?.exists()) out.push({ uid: uids[i], ...(s.data() as Omit<FriendProfile, "uid">) });
  });
  return out.filter((p) => p.sharingEnabled);
}

export async function sharePost(uid: string, ownerName: string, post: { title: string; minutes: number; estimatedMinutes: number; onEstimate: boolean }): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("no_db");
  const id = makeId();
  await setDoc(doc(db, "profiles", uid, "posts", id), {
    ownerName, ...post, at: Date.now(), kudos: [],
  });
}

export async function fetchFeed(friendUids: string[], selfUid: string): Promise<SharedPost[]> {
  const db = getDb();
  if (!db) return [];
  const all = [...new Set([...friendUids, selfUid])];
  const results = await Promise.all(all.map(async (u) => {
    try {
      const snap = await getDocs(query(collection(db, "profiles", u, "posts"), orderBy("at", "desc"), limit(5)));
      return snap.docs.map((d) => ({ id: d.id, ownerUid: u, ...(d.data() as Omit<SharedPost, "id" | "ownerUid">) }));
    } catch { return []; }
  }));
  return results.flat().sort((a, b) => b.at - a.at).slice(0, 25);
}

export async function toggleKudos(ownerUid: string, postId: string, myUid: string, current: string[]): Promise<string[]> {
  const db = getDb();
  if (!db) return current;
  const next = current.includes(myUid) ? current.filter((u) => u !== myUid) : [...current, myUid];
  await setDoc(doc(db, "profiles", ownerUid, "posts", postId), { kudos: next }, { merge: true });
  return next;
}

export async function deletePost(uid: string, postId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, "profiles", uid, "posts", postId));
}
