import { ConnectorProvider } from "./types";
import { ExternalItem } from "../types";
import { uid } from "../time";

/* ---- Mock provider: fully functional; used for development + demo ---- */
export const mockProvider: ConnectorProvider = {
  id: "mock",
  name: "Sample Calendar",
  description: "A working demo connector. Imports sample events you can convert into TimeSight tasks.",
  availability: "ready",
  async connect() { return { ok: true, message: "Sample Calendar connected." }; },
  async disconnect() { /* stateless */ },
  async sync(): Promise<ExternalItem[]> {
    const base = new Date(); base.setHours(base.getHours() + 1, 0, 0, 0);
    const mk = (title: string, offsetH: number, mins: number): ExternalItem => ({
      id: uid(), provider: "mock", externalId: `${title}-${offsetH}`, type: "event",
      title, startTime: base.getTime() + offsetH * 3600000,
      endTime: base.getTime() + offsetH * 3600000 + mins * 60000,
      durationMinutes: mins, importedTaskId: null,
    });
    return [mk("Team standup", 0, 30), mk("Get ready to leave", 3, 30), mk("Grocery run", 5, 45)];
  },
};

/* ---- Google Calendar: foundation. OAuth token exchange must happen
   server-side (Cloud Function / API route) — never in the browser.
   This provider reports honest status until that route is configured.
   See docs/CONNECTORS.md for the exact setup steps. ---- */
export const googleCalendarProvider: ConnectorProvider = {
  id: "google-calendar",
  name: "Google Calendar",
  description: "Two-way: import your events with realistic-buffer warnings, and push your TimeSight day plan into your calendar.",
  availability: "ready",
  async connect() {
    // Real OAuth: server route redirects to Google's consent screen.
    window.location.href = "/api/connectors/google";
    return { ok: true, message: "Redirecting to Google…" };
  },
  async disconnect() {},
  // Google sync needs tokens and is handled by the Connectors screen via lib/connectors/google.ts.
  async sync() { return []; },
};

/* ---- Notion: foundation, same honest-status pattern. ---- */
export const notionProvider: ConnectorProvider = {
  id: "notion",
  name: "Notion",
  description: "Two-way: import tasks from a Notion database, and when you finish timing one, TimeSight writes the actual duration back to the Notion page.",
  availability: "ready",
  async connect() {
    window.location.href = "/api/connectors/notion";
    return { ok: true, message: "Redirecting to Notion…" };
  },
  async disconnect() {},
  // Notion sync needs a token + database and is handled by the Connectors screen.
  async sync() { return []; },
};

/* ---- Apple Calendar: V1 is the .ics export/import fallback. ---- */
export const appleCalendarProvider: ConnectorProvider = {
  id: "apple-calendar",
  name: "Apple Calendar",
  description: "Export your realistic day plan or routines as .ics files that open directly in Apple Calendar. Native two-way sync arrives with the iOS wrapper.",
  availability: "fallback",
  async connect() { return { ok: true, message: "Use the export buttons — no account link needed for .ics." }; },
  async disconnect() {},
  async sync() { return []; },
};

export const comingSoon = [
  { id: "todoist", name: "Todoist", description: "Two-way task sync." },
  { id: "apple-health", name: "Apple Health", description: "Energy-aware planning from sleep and activity." },
  { id: "google-fit", name: "Google Fit", description: "Energy-aware planning from activity data." },
];

export const providers: ConnectorProvider[] = [mockProvider, googleCalendarProvider, notionProvider, appleCalendarProvider];
