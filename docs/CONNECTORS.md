# Connector Setup

Architecture: every provider implements `ConnectorProvider` (`lib/connectors/types.ts`) — `connect / disconnect / sync` returning standardized `ExternalItem[]`. The Connectors screen and the Today-dashboard import flow are provider-agnostic.

**Working today:** the mock provider ("Sample Calendar") fully connects and syncs sample events, and Apple Calendar `.ics` export works with real data. **Google Calendar and Notion are foundations**: honest status chips, provider interfaces, and stubbed secure server routes — they do not sync until you complete OAuth setup below. The app never fakes a sync.

## Google Calendar
1. https://console.cloud.google.com → create project → enable **Google Calendar API**.
2. OAuth consent screen → External → add scope `https://www.googleapis.com/auth/calendar.readonly`.
3. Credentials → **OAuth Client ID (Web)** → authorized redirect URI: `https://YOURAPP/api/connectors/google`.
4. `.env.local`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (server-side only — no `NEXT_PUBLIC_`).
5. Implement the TODOs in `app/api/connectors/google/route.ts`:
   - GET → redirect to Google's consent URL
   - callback → exchange code for tokens (uses the secret, hence server-side)
   - store encrypted tokens keyed by uid (Firestore)
   - sync handler → list events for the next 7 days → map to `ExternalItem[]`
6. Point `googleCalendarProvider.connect()` at the route and flip `availability` to `"ready"`.

## Notion
1. https://www.notion.so/my-integrations → New integration (public, OAuth).
2. Redirect URI: `https://YOURAPP/api/connectors/notion`.
3. `.env.local`: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`.
4. Implement the TODOs in `app/api/connectors/notion/route.ts` (token exchange uses basic auth `client_id:client_secret`).
5. Database mapping targets: Title, Due date, Status, Estimate, Priority → `ExternalItem`.
6. Write-back (later): completion status + actual duration to a Notion number property.

## Apple Calendar
V1 = `.ics` export (implemented): day plans from Settings/Connectors, per-routine export from the Routines screen. Events use *predicted* durations, not optimistic estimates. Native two-way EventKit sync arrives with the Capacitor wrapper (docs/MOBILE_DEPLOYMENT.md).

## Security rules of the road
- OAuth secrets live server-side only. Never prefix them `NEXT_PUBLIC_`.
- Access/refresh tokens are stored server-side (encrypted at rest), never in localStorage.
- The client only ever sees `connected / needs_setup / disconnected` status plus synced items.
