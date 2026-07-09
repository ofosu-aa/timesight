import { NextResponse } from "next/server";

/* Step 2: Google redirects back here with a code. We exchange it for tokens
   using the client SECRET — which is why this must run server-side and the
   secret lives only in environment variables. Tokens are handed to the app
   via a URL #fragment (never sent to servers or logs), and the app stores
   them in the signed-in user's own protected Firestore space. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = url.origin;
  if (error || !code) {
    return NextResponse.redirect(`${origin}/connectors#gcal_error=${encodeURIComponent(error || "no_code")}`);
  }
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/connectors#gcal_error=server_not_configured`);
  }
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/connectors/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tok = await res.json();
    if (!res.ok || !tok.access_token) {
      return NextResponse.redirect(`${origin}/connectors#gcal_error=${encodeURIComponent(tok.error || "token_exchange_failed")}`);
    }
    // Best-effort: get the account email for display.
    let email: string | null = null;
    try {
      const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (ui.ok) email = (await ui.json()).email ?? null;
    } catch { /* optional */ }

    const payload = Buffer.from(JSON.stringify({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? null,
      expires_in: tok.expires_in ?? 3600,
      email,
    })).toString("base64url");
    return NextResponse.redirect(`${origin}/connectors#gcal=${payload}`);
  } catch {
    return NextResponse.redirect(`${origin}/connectors#gcal_error=network`);
  }
}
