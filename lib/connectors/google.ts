/* Google Calendar client — real read/write.
   Runs in the browser with the user's access token (Google's Calendar REST
   API supports CORS). Token refresh goes through our server route because it
   requires the client secret. */
import { ExternalItem, ConnectorState, Task, TimeSession } from "../types";
import { uid } from "../time";
import { predictFor } from "../predictions";

export type GTokens = NonNullable<ConnectorState["tokens"]>;

export function parseCallbackHash(hash: string): { tokens: GTokens; email: string | null } | { error: string } | null {
  if (hash.includes("gcal_error=")) {
    return { error: decodeURIComponent(hash.split("gcal_error=")[1] || "unknown") };
  }
  if (!hash.includes("gcal=")) return null;
  try {
    const raw = hash.split("gcal=")[1];
    const j = JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
    return {
      tokens: {
        accessToken: j.access_token,
        refreshToken: j.refresh_token ?? null,
        expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
      },
      email: j.email ?? null,
    };
  } catch { return { error: "bad_callback_payload" }; }
}

async function refresh(tokens: GTokens): Promise<GTokens | null> {
  if (!tokens.refreshToken) return null;
  const res = await fetch("/api/connectors/google/refresh", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refreshToken }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return { ...tokens, accessToken: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
}

/** Runs fn with a valid access token, refreshing once if needed.
    Returns the (possibly updated) tokens so the caller can persist them. */
async function withAuth<T>(tokens: GTokens, fn: (accessToken: string) => Promise<Response>): Promise<{ res: Response | null; tokens: GTokens }> {
  let t = tokens;
  if (Date.now() > t.expiresAt - 60_000) {
    const fresh = await refresh(t);
    if (fresh) t = fresh;
  }
  let res = await fn(t.accessToken);
  if (res.status === 401) {
    const fresh = await refresh(t);
    if (!fresh) return { res: null, tokens: t };
    t = fresh;
    res = await fn(t.accessToken);
  }
  return { res, tokens: t };
}

/** Import events from the user's primary calendar (now → +7 days). */
export async function syncGoogleEvents(tokens: GTokens): Promise<{ items: ExternalItem[]; tokens: GTokens } | { error: string }> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 7 * 86400000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;
  const { res, tokens: t } = await withAuth(tokens, (at) => fetch(url, { headers: { Authorization: `Bearer ${at}` } }));
  if (!res) return { error: "auth_expired" };
  if (!res.ok) return { error: `google_${res.status}` };
  const j = await res.json();
  const items: ExternalItem[] = (j.items || [])
    .filter((e: { status?: string }) => e.status !== "cancelled")
    .map((e: { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => {
      const start = e.start?.dateTime ? Date.parse(e.start.dateTime) : e.start?.date ? Date.parse(e.start.date) : null;
      const end = e.end?.dateTime ? Date.parse(e.end.dateTime) : e.end?.date ? Date.parse(e.end.date) : null;
      return {
        id: uid(), provider: "google-calendar", externalId: e.id, type: "event" as const,
        title: e.summary || "(untitled event)",
        startTime: start, endTime: end,
        durationMinutes: start != null && end != null ? Math.round((end - start) / 60000) : null,
        importedTaskId: null,
      };
    });
  return { items, tokens: t };
}

/** Write-back: push today's pending tasks into Google Calendar as events,
    scheduled sequentially from now using PREDICTED durations. */
export async function pushDayPlanToGoogle(tokens: GTokens, tasks: Task[], sessions: TimeSession[]): Promise<{ created: number; tokens: GTokens } | { error: string }> {
  const pending = tasks.filter((t) => t.status === "pending" && t.scheduledFor !== "later");
  if (!pending.length) return { created: 0, tokens };
  let cursor = Date.now() + 5 * 60000;
  let t = tokens;
  let created = 0;
  for (const task of pending) {
    const mins = predictFor(task.title, sessions)?.predictedMinutes ?? task.estimatedMinutes;
    const body = {
      summary: task.title,
      description: `Planned in TimeSight — realistic estimate ${mins} min (you planned ${task.estimatedMinutes}).`,
      start: { dateTime: new Date(cursor).toISOString() },
      end: { dateTime: new Date(cursor + mins * 60000).toISOString() },
    };
    const { res, tokens: t2 } = await withAuth(t, (at) =>
      fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
    t = t2;
    if (!res) return { error: "auth_expired" };
    if (res.ok) created++;
    cursor += (mins + 5) * 60000;
  }
  return { created, tokens: t };
}
