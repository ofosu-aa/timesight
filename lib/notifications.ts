/* Notification foundation.

   Delivery strategy (in order):
   1. Service worker registration.showNotification() — the only path iOS
      supports (16.4+, installed to Home Screen), also the most reliable on
      desktop Chrome/Edge.
   2. new Notification() constructor — desktop fallback when no SW is active
      (e.g. local dev).

   Honest limitation: these are LOCAL notifications — they fire while the app
   is open (foreground, or backgrounded with the timer still ticking). Waking
   a fully closed app requires real Web Push (server + FCM/APNs); the
   architecture hook for that lives in the service worker's push handler.
   On native (Capacitor), swap this module for @capacitor/local-notifications
   behind the same function signatures. */

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

async function show(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const opts: NotificationOptions = {
    body,
    tag,                      // replaces rather than stacks repeats
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  // Path 1: service worker (required on iOS, best on desktop)
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, { ...opts, vibrate: [80, 40, 80] } as NotificationOptions);
        return;
      }
    }
  } catch { /* fall through */ }
  // Path 2: constructor (desktop without SW, e.g. npm run dev)
  try { new Notification(title, opts); } catch { /* iOS lands here without SW — nothing more we can do */ }
}

export function notifyEstimateExpired(taskTitle: string, enabled: boolean) {
  if (!enabled) return;
  void show("Time's up — are you finished?", `Your estimate for "${taskTitle}" is up. Need more time? No pressure — this is how TimeSight learns.`, "timesight-checkin");
}

export function notifyGentle(title: string, body: string, enabled: boolean) {
  if (!enabled) return;
  void show(title, body, "timesight-gentle");
}
