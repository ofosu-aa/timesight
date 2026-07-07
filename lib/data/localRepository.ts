import { AppData, EMPTY_DATA, DEFAULT_SETTINGS } from "../types";
import { Repository } from "./repository";

const key = (uid: string) => `timesight:data:${uid}`;

function hydrate(raw: string | null): AppData {
  if (!raw) return structuredClone(EMPTY_DATA);
  try {
    const d = JSON.parse(raw);
    return { ...structuredClone(EMPTY_DATA), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
  } catch { return structuredClone(EMPTY_DATA); }
}

export const localRepository: Repository = {
  async load(uid) {
    if (typeof window === "undefined") return structuredClone(EMPTY_DATA);
    return hydrate(window.localStorage.getItem(key(uid)));
  },
  async save(uid, data) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key(uid), JSON.stringify(data));
  },
  async clear(uid) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key(uid));
  },
};
