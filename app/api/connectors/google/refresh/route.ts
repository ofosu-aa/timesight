import { NextResponse } from "next/server";

/* Refresh an expired access token. Runs server-side because it needs the
   client secret. The refresh token itself stays in the user's own storage —
   we never persist it on the server. */
export async function POST(req: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "server_not_configured" }, { status: 501 });
  const { refresh_token } = await req.json();
  if (!refresh_token) return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" }),
  });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) return NextResponse.json({ error: tok.error || "refresh_failed" }, { status: 401 });
  return NextResponse.json({ access_token: tok.access_token, expires_in: tok.expires_in ?? 3600 });
}
