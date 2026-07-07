/* Notification foundation.
   - Web Notification API for local reminders while the app is open.
   - Push notifications require a backend (FCM) — architecture hook left in
     place; see docs/MOBILE_DEPLOYMENT.md. On native (Capacitor), swap this
     module for @capacitor/local-notifications behind the same functions. */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function show(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch { /* Some iOS contexts throw; reminders degrade gracefully. */ }
}

export function notifyEstimateExpired(taskTitle: string, enabled: boolean) {
  if (!enabled) return;
  show("Your estimate is up", `Need more time on "${taskTitle}"? No pressure — this is how TimeSight learns.`);
}

export function notifyGentle(title: string, body: string, enabled: boolean) {
  if (!enabled) return;
  show(title, body);
}
