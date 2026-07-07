# TimeSight

**See where your time actually goes.** TimeSight learns how long your tasks, routines, and days actually take, then helps you plan around reality. Built for people with ADHD and time blindness — non-shaming by design.

## Run locally
```
npm install
npm run dev        # http://localhost:3000 — works immediately in guest mode
```

## Checks
```
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Configure (optional, in this order)
1. **Accounts + cloud sync** → docs/FIREBASE_SETUP.md
2. **Connectors (Google Calendar, Notion)** → docs/CONNECTORS.md
3. **Deploy + iPhone install + native iOS** → docs/MOBILE_DEPLOYMENT.md

## Architecture in 30 seconds
- `lib/app-data.tsx` — the state engine: core timer loop, routines, persistence (debounced)
- `lib/predictions.ts` — prediction engine + confidence scores (median-based, variance-penalized)
- `lib/insights.ts` / `lib/coach.ts` — deterministic intelligence; optional LLM layer falls back to rules
- `lib/data/` — repository layer: localStorage (guest) / Firestore (accounts) / offline write-behind
- `lib/connectors/` — provider interface; mock provider fully functional, Google/Notion foundations with server-side OAuth stubs
- `app/` — Next.js App Router pages; `components/AppShell.tsx` owns protected routing + global modals

Privacy: user-scoped Firestore rules (`firestore.rules`), no secrets in the client, export/clear/delete controls in Settings.
