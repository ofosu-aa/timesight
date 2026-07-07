import { AppData } from "./types";
import { predictFor } from "./predictions";
import { buildInsights, weeklyReview } from "./insights";
import { normalize, fmtMin, isThisWeek } from "./time";

/* ---------------------------------------------------------------
   Coach provider architecture.
   - ruleBasedCoachProvider: deterministic, always available (V1 default)
   - llmCoachProvider: optional; requires a server-side LLM key and a
     server route. Falls back to rules if unavailable.
---------------------------------------------------------------- */
export interface CoachProvider { answer(question: string, data: AppData): Promise<string>; }

const toneWrap = (tone: string, msg: string) => {
  if (tone === "minimal") return msg.split("\n")[0];
  if (tone === "direct") return msg;
  if (tone === "structured") return msg;
  return msg; // gentle default — copy is already written non-shaming
};

export const ruleBasedCoachProvider: CoachProvider = {
  async answer(q, data) {
    return toneWrap(data.settings.coachTone, ruleAnswer(q, data));
  },
};

/* Optional LLM layer. Never blocks core functionality. */
export const llmCoachProvider: CoachProvider = {
  async answer(q, data) {
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
      if (!res.ok) throw new Error("no llm");
      const j = await res.json();
      return j.answer || ruleAnswer(q, data);
    } catch { return ruleAnswer(q, data); }
  },
};

export function ruleAnswer(q: string, data: AppData): string {
  const { tasks, sessions, routines } = data;
  const question = normalize(q);
  const pending = tasks.filter((t) => t.status === "pending" && t.scheduledFor !== "later");
  const predOf = (t: { title: string; estimatedMinutes: number }) => predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes;

  if (question.includes("distract") || question.includes("recover")) {
    const smallest = [...pending].sort((a, b) => predOf(a) - predOf(b))[0];
    return smallest
      ? `Getting pulled away happens — it doesn't erase your progress. The fastest way back is the smallest step: start "${smallest.title}" (~${fmtMin(predOf(smallest))}). One timed task resets the day.`
      : "Getting pulled away happens — it doesn't erase your progress. Add one small task, under 10 minutes, and start it. Re-entry beats a perfect restart.";
  }
  if (question.includes("next") || question.includes("start with")) {
    if (!pending.length) return "Nothing is queued for today. Add one small task — starting is the hardest part, so pick something under 15 minutes.";
    const byPriority = [...pending].sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 } as const;
      return p[a.priority] - p[b.priority] || predOf(a) - predOf(b);
    })[0];
    return `Start with "${byPriority.title}" — ~${fmtMin(predOf(byPriority))} realistically${byPriority.priority === "high" ? " and it's high priority" : ", a quick win for momentum"}.`;
  }
  if (question.includes("late") || question.includes("behind")) {
    if (!pending.length) return "You're not behind — nothing is left planned for today.";
    const planned = pending.reduce((a, t) => a + t.estimatedMinutes, 0);
    const realistic = pending.reduce((a, t) => a + predOf(t), 0);
    if (realistic > planned + 10) return `You're not behind. Your plan was just too compressed: it says ${fmtMin(planned)} remaining, but your history says closer to ${fmtMin(realistic)}. Moving one task to tomorrow closes the gap.`;
    return `Your remaining plan (${fmtMin(planned)}) matches your history well. If it feels tight, the cost is probably transitions — try starting the next task right away.`;
  }
  if (question.includes("underestimat")) {
    const ins = buildInsights(sessions).find((i) => i.type === "under");
    return ins ? `${ins.body} ${ins.suggestedAction || ""}`.trim()
      : "No clear underestimation pattern yet. Time a few repeated tasks and I'll show exactly where the minutes go.";
  }
  if (question.includes("routine") || question.includes("morning")) {
    const r = routines.find((x) => normalize(x.name).includes("morning")) || routines[0];
    if (!r) return "You don't have a routine yet. Even 3 steps (shower, breakfast, get dressed) gives TimeSight something to learn from.";
    const listed = r.tasks.reduce((a, t) => a + t.estimatedMinutes, 0);
    const real = r.tasks.reduce((a, t) => a + (predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes), 0);
    return real > listed + 5
      ? `"${r.name}" is listed as ${fmtMin(listed)}, but usually takes about ${fmtMin(real)}. Plan backwards from your leave time using ${fmtMin(real)}, and start it from the Routines tab so each step gets timed.`
      : `"${r.name}" realistically takes about ${fmtMin(real)} across ${r.tasks.length} steps. Start it from the Routines tab and I'll keep refining that number.`;
  }
  if (question.includes("realistic") || question.includes("my day") || question.includes("plan my")) {
    if (!pending.length) return "Your day is open. Add what you're hoping to do and I'll check it against your real history.";
    const planned = pending.reduce((a, t) => a + t.estimatedMinutes, 0);
    const realistic = pending.reduce((a, t) => a + predOf(t), 0);
    const lines = pending.slice(0, 6).map((t) => `• ${t.title}: ~${fmtMin(predOf(t))}`).join("\n");
    return `Today, adjusted for how you actually work:\n${lines}\n\nPlanned ${fmtMin(planned)} · realistic ${fmtMin(realistic)}.${realistic > planned + 10 ? " Your day may need more breathing room — trimming one task now beats feeling behind later." : " Looks achievable."}`;
  }
  if (question.includes("learn") || question.includes("week")) {
    const r = weeklyReview(sessions);
    if (!r.count) return "No timed tasks yet this week. One timed task today is enough to start the picture.";
    let s = `This week: ${r.count} timed tasks, ${fmtMin(r.focus)} of tracked focus, ${r.accuracy}% estimate accuracy.`;
    if (r.prevAccuracy != null && r.accuracy != null && r.accuracy > r.prevAccuracy) s += ` That's up from ${r.prevAccuracy}% last week.`;
    if (r.biggestMiss && r.biggestMiss.avgErr > 2) s += ` Biggest mismatch: "${r.biggestMiss.displayTitle}" ran ${fmtMin(r.biggestMiss.avgErr)} over on average.`;
    return s;
  }
  return `Try starting with one small task — under 15 minutes. Momentum matters more than the perfect plan.\n\nYou can ask me: "What should I do next?", "Why am I running late?", "How realistic is my day?", or "Help me recover after getting distracted."`;
}
