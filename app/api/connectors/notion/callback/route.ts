import { NextResponse } from "next/server";

/* Step 2: exchange the code for an access token using basic auth
   (client_id:client_secret) — server-side only. Notion tokens don't expire,
   so there's no refresh flow. Token is handed to the app via URL #fragment. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = url.origin;
  if (error || !code) {
    return NextResponse.redirect(`${origin}/connectors#notion_error=${encodeURIComponent(error || "no_code")}`);
  }
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/connectors#notion_error=server_not_configured`);
  }
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: `${origin}/api/connectors/notion/callback` }),
    });
    const tok = await res.json();
    if (!res.ok || !tok.access_token) {
      return NextResponse.redirect(`${origin}/connectors#notion_error=${encodeURIComponent(tok.error || "token_exchange_failed")}`);
    }
    const payload = Buffer.from(JSON.stringify({
      access_token: tok.access_token,
      workspace_name: tok.workspace_name ?? null,
    })).toString("base64url");
    return NextResponse.redirect(`${origin}/connectors#notion=${payload}`);
  } catch {
    return NextResponse.redirect(`${origin}/connectors#notion_error=network`);
  }
}
