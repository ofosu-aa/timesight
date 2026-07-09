/* Notion client helpers. All Notion API traffic goes through
   /api/connectors/notion/proxy because Notion blocks browser CORS calls. */
import { ExternalItem } from "../types";
import { uid } from "../time";

export function parseNotionCallbackHash(hash: string): { accessToken: string; workspaceName: string | null } | { error: string } | null {
  if (hash.includes("notion_error=")) return { error: decodeURIComponent(hash.split("notion_error=")[1] || "unknown") };
  if (!hash.includes("notion=")) return null;
  try {
    const raw = hash.split("notion=")[1];
    const j = JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
    return { accessToken: j.access_token, workspaceName: j.workspace_name ?? null };
  } catch { return { error: "bad_callback_payload" }; }
}

async function proxy(body: Record<string, unknown>) {
  const res = await fetch("/api/connectors/notion/proxy", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || `notion_${res.status}`);
  return j;
}

export async function listNotionDatabases(token: string): Promise<{ id: string; name: string }[]> {
  const j = await proxy({ token, op: "databases" });
  return j.databases || [];
}

export async function syncNotionTasks(token: string, databaseId: string): Promise<ExternalItem[]> {
  const j = await proxy({ token, op: "query", databaseId });
  return (j.pages || [])
    .filter((p: { done: boolean }) => !p.done)
    .map((p: { id: string; title: string; due: string | null; estimate: number | null }): ExternalItem => ({
      id: uid(), provider: "notion", externalId: p.id, type: "task",
      title: p.title,
      startTime: p.due ? Date.parse(p.due) : null,
      endTime: null,
      durationMinutes: p.estimate ?? null,
      importedTaskId: null,
    }));
}

export async function writeBackToNotion(token: string, pageId: string, actualMinutes: number, estimatedMinutes: number): Promise<void> {
  const note = `TimeSight: took ${actualMinutes} min (estimated ${estimatedMinutes}).`;
  await proxy({ token, op: "writeback", pageId, actualMinutes, note });
}
