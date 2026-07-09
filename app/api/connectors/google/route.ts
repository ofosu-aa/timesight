import { NextResponse } from "next/server";

/* Step 1 of Google Calendar OAuth: redirect the user to Google's consent
   screen. Only the public client ID is used here. */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID is not set. Add it in Vercel → Settings → Environment Variables." }, { status: 501 });
  }
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/connectors/google/callback`,
    response_type: "code",
    access_type: "offline",          // ask for a refresh token
    prompt: "consent",               // guarantees refresh token on repeat connects
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    state: "timesight",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
