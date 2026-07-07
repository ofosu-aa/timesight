# Privacy Model

Data classes:
1. **Behavioral time data** (tasks, durations, routines) — the sensitive core. User-scoped at `/users/{uid}/**`, protected by `firestore.rules` (only `request.auth.uid == userId` can read/write). Guest data never leaves the device.
2. **Account data** (email, display name) — held by Firebase Auth.
3. **Connector tokens** — server-side only, encrypted at rest when implemented; never shipped to the client. See docs/CONNECTORS.md.

User controls (implemented in Settings): export all data (JSON), export day plan (.ics), clear demo data, clear all data, delete account (removes Firestore doc + Auth user).

Commitments encoded in product copy: no data selling, no ads, no third-party analytics in V1 (any future analytics is opt-in), no medical claims — TimeSight is time-awareness software, not treatment.
