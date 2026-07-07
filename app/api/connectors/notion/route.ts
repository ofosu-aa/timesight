import { NextResponse } from "next/server";

/* Notion OAuth token exchange — SERVER-SIDE ONLY.
   Full setup steps: docs/CONNECTORS.md
   TODO:
   1. GET  -> redirect to Notion's authorize URL (NOTION_CLIENT_ID)
   2. Handle callback: exchange code using basic auth (client_id:client_secret)
   3. Store the access token server-side, let the user pick a database
   4. Add a /sync handler mapping database rows -> ExternalItem[]
      (Title, Due date, Status, Estimate, Priority) */
export async function GET() {
  const configured = !!(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
  return NextResponse.json(
    { configured, message: configured ? "OAuth flow not yet implemented — see TODOs in this route." : "Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET, then implement the flow. See docs/CONNECTORS.md." },
    { status: 501 },
  );
}
