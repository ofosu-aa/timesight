# Mobile Deployment

## Tier 1 — iPhone Home Screen (PWA) — works now
Requirements already implemented: manifest, icons + apple-touch-icon, theme color, service worker with offline fallback, safe-area insets, standalone display, bottom nav, persistent timer across refresh (active session is stored, elapsed time derives from `startedAt`).

Steps for users: deploy (below) → open in **Safari** → Share → **Add to Home Screen**. The in-app `/install` page walks users through it.

iOS PWA notes: Web Push requires iOS 16.4+ and the app must be installed to the Home Screen; local `Notification` calls are best-effort. Timer correctness never depends on notifications.

## Tier 2 — Deploy the web app
**Vercel (recommended, supports the API stub routes):**
```
npm i -g vercel
vercel        # from the project root; set env vars in the dashboard
```
**Firebase Hosting (static):** the API routes under `app/api/` are server routes. Either deploy with a Node server (Cloud Run / `firebase deploy` with web frameworks support), or remove `app/api/` and uncomment `output: 'export'` in `next.config.mjs` for a fully static build — the app is designed to work without those routes.

## Tier 3 — Native iOS via Capacitor
`capacitor.config.ts` is already in the repo (appId `com.timesight.app`). On a Mac with Xcode:
```
# 1. Static export (Capacitor serves files from disk)
#    - remove app/api/ (or keep and host it separately)
#    - uncomment output: 'export' in next.config.mjs
npm run build            # produces ./out

# 2. Add Capacitor
npm i @capacitor/core @capacitor/ios @capacitor/preferences @capacitor/local-notifications
npx cap add ios
npx cap sync

# 3. Open and run
npx cap open ios         # set signing team, run on device
```
Native swap points (already isolated):
- `lib/platform.ts` → `isNative()` detects the Capacitor runtime
- `lib/notifications.ts` → replace Web Notification calls with `@capacitor/local-notifications`
- `lib/data/localRepository.ts` → optionally back with `@capacitor/preferences`
- Apple Calendar → EventKit plugin replaces `.ics` export

Icon/splash sources: `public/icons/icon-512.png` feeds `@capacitor/assets` generation.
