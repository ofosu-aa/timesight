import { NextResponse } from "next/server";

/* Step 1 of Notion OAuth: redirect to Notion's authorize screen. */
export async function GET(req: Request) {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "NOTION_CLIENT_ID is not set. Add it in Vercel → Settings → Environment Variables." }, { status: 501 });
  }
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: `${origin}/api/connectors/notion/callback`,
  });
  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
}
