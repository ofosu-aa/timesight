import { NextResponse } from "next/server";

/* Google Calendar OAuth token exchange — SERVER-SIDE ONLY.
   Secrets (GOOGLE_OAUTH_CLIENT_SECRET) must never reach the browser.
   Full setup steps: docs/CONNECTORS.md
   TODO:
   1. GET  -> redirect to Google's consent screen (client_id, scopes: calendar.readonly)
   2. Handle callback: exchange code for tokens using the client secret
   3. Store encrypted tokens server-side (Firestore, keyed by uid)
   4. Add a /sync handler that lists events and returns ExternalItem[] */
export async function GET() {
  const configured = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  return NextResponse.json(
    { configured, message: configured ? "OAuth flow not yet implemented — see TODOs in this route." : "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET, then implement the flow. See docs/CONNECTORS.md." },
    { status: 501 },
  );
}
