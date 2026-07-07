export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const normalize = (t: string) => (t || "").toLowerCase().trim().replace(/\s+/g, " ");
const pad = (n: number) => String(n).padStart(2, "0");

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
export function fmtMin(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return "—";
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
export const isToday = (ts: number) => {
  const d = new Date(ts), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
export const isThisWeek = (ts: number) => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
  return ts >= start;
};
export const daysAgo = (n: number) => Date.now() - n * 86400000;
