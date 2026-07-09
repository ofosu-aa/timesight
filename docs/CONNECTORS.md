# Connector Setup

Architecture: every provider implements `ConnectorProvider` (`lib/connectors/types.ts`) — `connect / disconnect / sync` returning standardized `ExternalItem[]`. The Connectors screen and the Today-dashboard import flow are provider-agnostic.

**Working today:** the mock provider ("Sample Calendar") fully connects and syncs sample events, and Apple Calendar `.ics` export works with real data. **Google Calendar and Notion are foundations**: honest status chips, provider interfaces, and stubbed secure server routes — they do not sync until you complete OAuth setup below. The app never fakes a sync.

## Google Calendar (IMPLEMENTED — two-way)
The flow is live: Connect redirects to Google's consent screen, the server
exchanges the code for tokens (`app/api/connectors/google/callback`), and the
app stores tokens in the signed-in user's own Firestore space. Sync imports
the next 7 days of events; "Push day plan" writes today's pending tasks into
the primary calendar using predicted durations. Access-token refresh happens
via `app/api/connectors/google/refresh` (server-side, uses the secret).

Setup:
1. https://console.cloud.google.com → project → enable **Google Calendar API**.
2. OAuth consent screen → External → add yourself as a test user.
   **Publish the app** when ready: in Testing mode, Google expires refresh
   tokens after 7 days, forcing weekly reconnects.
3. Credentials → OAuth Client ID (Web application):
   - Authorized JavaScript origins: `https://YOURAPP.vercel.app` (+ `http://localhost:3000` for dev)
   - Authorized redirect URIs: `https://YOURAPP.vercel.app/api/connectors/google/callback` (+ `http://localhost:3000/api/connectors/google/callback`)
4. Environment variables (Vercel → Project → Settings → Environment Variables, and `.env.local` for dev):
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`  ← server-side only, never in code or GitHub
5. Redeploy. Connectors → Google Calendar → Connect.

Token storage model: access+refresh tokens live in the user's own protected
Firestore document (rules-scoped to their uid). The client secret never leaves
the server. Tradeoff vs. server-side token storage is documented here
deliberately: this keeps V1 serverless-simple; migrate tokens behind a server
store if the app becomes multi-tenant SaaS.

## Notion (IMPLEMENTED — two-way)
Live flow: Connect redirects to Notion's authorize screen (you pick which
pages/databases to share), the server exchanges the code
(`app/api/connectors/notion/callback`), and you pick a database to sync in
the Connectors screen. Sync imports open tasks (title, due date, estimate
auto-detected from number properties named estimate/minutes/duration).
Write-back: finishing a timed task that came from Notion posts the actual
duration as a comment on the page, and fills any number property whose name
contains "actual" (e.g. add an "Actual minutes" column to your database to
collect real durations). Notion blocks browser CORS, so all API calls relay
through `app/api/connectors/notion/proxy` — the user's token, never the secret.

Setup:
1. https://www.notion.so/my-integrations → New integration → type: Public.
2. Redirect URI: `https://YOURAPP.vercel.app/api/connectors/notion/callback`
   (+ `http://localhost:3000/api/connectors/notion/callback` for dev).
3. Environment variables: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` (Vercel
   → Settings → Environment Variables; secret is server-side only).
4. Redeploy → Connectors → Notion → Connect → choose the database on
   Notion's grant screen → pick it again in TimeSight's dropdown.

Notion access tokens do not expire; there is no refresh flow.

## Apple Calendar
V1 = `.ics` export (implemented): day plans from Settings/Connectors, per-routine export from the Routines screen. Events use *predicted* durations, not optimistic estimates. Native two-way EventKit sync arrives with the Capacitor wrapper (docs/MOBILE_DEPLOYMENT.md).

## Security rules of the road
- OAuth secrets live server-side only. Never prefix them `NEXT_PUBLIC_`.
- Access/refresh tokens are stored server-side (encrypted at rest), never in localStorage.
- The client only ever sees `connected / needs_setup / disconnected` status plus synced items.
