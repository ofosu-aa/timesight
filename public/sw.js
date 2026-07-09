/* TimeSight service worker: app-shell cache + offline fallback.
   Network-first for navigation (fresh app), cache fallback when offline. */
const CACHE = "timesight-v1";
const SHELL = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (req.url.includes("/_next/static/") || req.url.includes("/icons/"))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});

/* Focus (or open) the app when a notification is tapped. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const timerUrl = new URL("/timer", self.location.origin).href;
      for (const c of list) {
        if ("focus" in c) { c.navigate(timerUrl); return c.focus(); }
      }
      return self.clients.openWindow("/timer");
    })
  );
});

/* Web Push hook — fires only once a push backend (FCM) is configured.
   Local timer notifications do not depend on this. */
self.addEventListener("push", (e) => {
  if (!e.data) return;
  try {
    const { title, body } = e.data.json();
    e.waitUntil(self.registration.showNotification(title || "TimeSight", { body: body || "", icon: "/icons/icon-192.png", tag: "timesight-push" }));
  } catch { /* ignore malformed pushes */ }
});
