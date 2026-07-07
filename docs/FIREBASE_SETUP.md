# Firebase Setup

TimeSight runs in guest mode (local storage) with zero configuration. To enable real accounts and cloud sync:

## 1. Create the project
1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `timesight`).
2. Add a **Web app** in Project settings → copy the config values.

## 2. Configure the app
Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
These are client-safe web config values (not secrets). Restart `npm run dev`.

## 3. Enable Authentication
Firebase Console → **Authentication → Sign-in method**:
- Enable **Email/Password**
- Enable **Google** (one click)
- (Optional) **Apple** requires an Apple Developer account + Services ID; add later.

Add your deployed domain under **Authorized domains**.

## 4. Create Firestore + deploy rules
1. Console → **Firestore Database → Create database** (production mode).
2. Deploy the rules in `firestore.rules`:
   ```
   npm i -g firebase-tools
   firebase login
   firebase init firestore   # point it at the existing firestore.rules
   firebase deploy --only firestore:rules
   ```

## 5. Data schema (V1) and migration path
V1 stores the full app state in **one document per user**: `/users/{uid}/app/state`.
Why: atomic saves, trivial offline fallback, and dead-simple rules. The write path is a debounced whole-state save (300ms).

When per-entity queries are needed (e.g. server-side insights, huge histories), migrate to subcollections:
```
/users/{uid}/tasks/{taskId}
/users/{uid}/timeSessions/{sessionId}
/users/{uid}/routines/{routineId}
/users/{uid}/routineRuns/{runId}
```
Because all persistence goes through `lib/data/repository.ts`, only `firestoreRepository.ts` changes — write a new repository that fans the state doc out into subcollections, keep `load()` assembling the same `AppData` shape, and product code is untouched. The existing rules already cover subcollections (`/users/{userId}/{document=**}`).

## 6. Guest → account migration
Already implemented: on first sign-in/sign-up, if the account has no cloud data and the device has guest data, the guest data is copied to Firestore and the local guest copy is cleared (`lib/auth-context.tsx → migrateGuestData`).
