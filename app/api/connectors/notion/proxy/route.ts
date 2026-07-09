import { NextResponse } from "next/server";

/* Notion API proxy. The Notion API blocks browser (CORS) requests, so the
   app calls this route with the user's access token, and the server relays.
   The token belongs to the user (stored in their own Firestore space); the
   client SECRET is only used during the OAuth exchange, never here. */
const NOTION = "https://api.notion.com/v1";
const HDR = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

export async function POST(req: Request) {
  const body = await req.json();
  const { token, op } = body;
  if (!token || !op) return NextResponse.json({ error: "missing token/op" }, { status: 400 });

  try {
    if (op === "databases") {
      const r = await fetch(`${NOTION}/search`, {
        method: "POST", headers: HDR(token),
        body: JSON.stringify({ filter: { value: "database", property: "object" }, page_size: 25 }),
      });
      const j = await r.json();
      if (!r.ok) return NextResponse.json({ error: j.message || r.status }, { status: r.status });
      const databases = (j.results || []).map((d: { id: string; title?: { plain_text: string }[] }) => ({
        id: d.id,
        name: (d.title || []).map((t) => t.plain_text).join("") || "(untitled database)",
      }));
      return NextResponse.json({ databases });
    }

    if (op === "query") {
      const { databaseId } = body;
      if (!databaseId) return NextResponse.json({ error: "missing databaseId" }, { status: 400 });
      const r = await fetch(`${NOTION}/databases/${databaseId}/query`, {
        method: "POST", headers: HDR(token), body: JSON.stringify({ page_size: 50 }),
      });
      const j = await r.json();
      if (!r.ok) return NextResponse.json({ error: j.message || r.status }, { status: r.status });
      // Map pages server-side: detect title / date / estimate properties by type+name.
      const pages = (j.results || []).map((p: { id: string; properties: Record<string, { type: string; title?: { plain_text: string }[]; date?: { start?: string } | null; number?: number | null; checkbox?: boolean; status?: { name?: string } | null; select?: { name?: string } | null }> }) => {
        let title = "(untitled)", due: string | null = null, estimate: number | null = null, done = false;
        for (const [name, prop] of Object.entries(p.properties || {})) {
          const n = name.toLowerCase();
          if (prop.type === "title") title = (prop.title || []).map((t) => t.plain_text).join("") || title;
          else if (prop.type === "date" && !due) due = prop.date?.start ?? null;
          else if (prop.type === "number" && (n.includes("estimate") || n.includes("minute") || n.includes("duration")) && prop.number != null) estimate = prop.number;
          else if (prop.type === "checkbox" && (n.includes("done") || n.includes("complete"))) done = !!prop.checkbox;
          else if (prop.type === "status") done = done || /done|complete/i.test(prop.status?.name || "");
        }
        return { id: p.id, title, due, estimate, done };
      });
      return NextResponse.json({ pages });
    }

    if (op === "writeback") {
      const { pageId, actualMinutes, note } = body;
      if (!pageId) return NextResponse.json({ error: "missing pageId" }, { status: 400 });
      let propertyUpdated = false;
      // If the page has a number property whose name mentions "actual", set it.
      const pr = await fetch(`${NOTION}/pages/${pageId}`, { headers: HDR(token) });
      if (pr.ok) {
        const page = await pr.json();
        const propName = Object.entries(page.properties || {}).find(
          ([name, prop]) => (prop as { type: string }).type === "number" && name.toLowerCase().includes("actual")
        )?.[0];
        if (propName && typeof actualMinutes === "number") {
          const ur = await fetch(`${NOTION}/pages/${pageId}`, {
            method: "PATCH", headers: HDR(token),
            body: JSON.stringify({ properties: { [propName]: { number: actualMinutes } } }),
          });
          propertyUpdated = ur.ok;
        }
      }
      // Always leave a comment with the timing result.
      const cr = await fetch(`${NOTION}/comments`, {
        method: "POST", headers: HDR(token),
        body: JSON.stringify({ parent: { page_id: pageId }, rich_text: [{ text: { content: note || `TimeSight: ${actualMinutes} min actual` } }] }),
      });
      return NextResponse.json({ ok: cr.ok, propertyUpdated });
    }

    return NextResponse.json({ error: "unknown op" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "notion_unreachable" }, { status: 502 });
  }
}
