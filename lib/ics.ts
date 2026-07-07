import { Task, Routine, TimeSession } from "./types";
import { predictFor } from "./predictions";

/* Apple Calendar fallback: export TimeSight plans as a standard .ics file the
   user can open in Apple Calendar / Google Calendar. Full EventKit sync comes
   with the native wrapper (see docs/MOBILE_DEPLOYMENT.md). */
const dt = (ms: number) => {
  const d = new Date(ms);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function vevent(uidStr: string, title: string, start: number, minutes: number, desc: string) {
  return [
    "BEGIN:VEVENT",
    `UID:${uidStr}@timesight.app`,
    `DTSTAMP:${dt(Date.now())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(start + minutes * 60000)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(desc)}`,
    "END:VEVENT",
  ].join("\r\n");
}

export function buildDayPlanIcs(tasks: Task[], sessions: TimeSession[]): string {
  const pending = tasks.filter((t) => t.status === "pending" && t.scheduledFor !== "later");
  let cursor = Date.now() + 5 * 60000;
  const events = pending.map((t) => {
    const mins = predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes;
    const ev = vevent(t.id, t.title, cursor, mins, `TimeSight realistic estimate: ${mins} min (you planned ${t.estimatedMinutes}).`);
    cursor += (mins + 5) * 60000;
    return ev;
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TimeSight//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function buildRoutineIcs(routine: Routine, sessions: TimeSession[], startAt: number): string {
  let cursor = startAt;
  const events = routine.tasks.map((t) => {
    const mins = predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes;
    const ev = vevent(t.id, `${routine.name}: ${t.title}`, cursor, mins, `TimeSight realistic estimate: ${mins} min.`);
    cursor += mins * 60000;
    return ev;
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TimeSight//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
