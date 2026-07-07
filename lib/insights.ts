import { TimeSession, Insight } from "./types";
import { allStats, confidenceFrom } from "./predictions";
import { fmtMin, isThisWeek } from "./time";

/* Rule-based insight generation. No LLM required. */
export function buildInsights(sessions: TimeSession[]): Insight[] {
  const out: Insight[] = [];
  const stats = allStats(sessions);
  const repeated = stats.filter((e) => e.count >= 2);
  const under = [...repeated].filter((e) => e.avgErr > 1).sort((a, b) => b.avgErr - a.avgErr);
  const over = [...repeated].filter((e) => e.avgErr < -1).sort((a, b) => a.avgErr - b.avgErr);
  const accurate = [...repeated].filter((e) => e.count >= 3).sort((a, b) => a.avgAbsErr - b.avgAbsErr);

  if (under[0]) out.push({ type: "under", severity: "warn", title: "Most underestimated",
    body: `You underestimate "${under[0].displayTitle}" by ${fmtMin(under[0].avgErr)} on average (${under[0].count} completions).`,
    suggestedAction: `Try estimating ${fmtMin(under[0].mean)} next time.` });
  if (over[0]) out.push({ type: "over", severity: "info", title: "Most overestimated",
    body: `You overestimate "${over[0].displayTitle}" by ${fmtMin(Math.abs(over[0].avgErr))} on average — you finish earlier than you think.` });
  if (accurate[0]) out.push({ type: "accurate", severity: "good", title: "Most accurate task",
    body: `Your best estimate is "${accurate[0].displayTitle}" — off by only ${fmtMin(accurate[0].avgAbsErr)} on average.` });

  const week = sessions.filter((s) => isThisWeek(s.endedAt));
  if (week.length) {
    const focus = week.reduce((a, s) => a + s.actualMinutes, 0);
    out.push({ type: "focus", severity: "good", title: "This week",
      body: `${week.length} timed ${week.length === 1 ? "task" : "tasks"} and ${fmtMin(focus)} of real, tracked focus time.` });
  }
  if (sessions.length >= 3) {
    const acc = Math.round((sessions.filter((s) => s.wasFinishedOnEstimate).length / sessions.length) * 100);
    out.push({ type: "accuracy", severity: acc >= 60 ? "good" : "warn", title: "Estimate accuracy",
      body: `${acc}% of your estimates land close to reality. ${acc >= 60 ? "Your time sense is sharpening." : "Normal early on — every timed task improves the picture."}` });
  }

  const short = repeated.filter((e) => e.mean <= 15), long = repeated.filter((e) => e.mean > 15);
  if (short.length >= 2 && long.length >= 2) {
    const sAcc = short.reduce((a, e) => a + e.avgAbsErr / Math.max(1, e.mean), 0) / short.length;
    const lAcc = long.reduce((a, e) => a + e.avgAbsErr / Math.max(1, e.mean), 0) / long.length;
    if (sAcc < lAcc * 0.7) out.push({ type: "short", severity: "info", title: "Pattern",
      body: "You're noticeably more accurate with tasks under 15 minutes. Longer tasks may benefit from splitting." });
  }

  const withConf = stats.map((e) => ({ ...e, conf: confidenceFrom(e.count, e.mean, e.stdev) }));
  const high = withConf.filter((e) => e.conf >= 70).sort((a, b) => b.conf - a.conf);
  if (high.length) out.push({ type: "conf", severity: "good", title: "High-confidence predictions",
    body: `TimeSight can now predict ${high.slice(0, 3).map((e) => `"${e.displayTitle}"`).join(", ")}${high.length > 3 ? ` and ${high.length - 3} more` : ""} with high confidence.` });
  const low = withConf.filter((e) => e.conf < 40 && e.count >= 2);
  if (low[0]) out.push({ type: "lowconf", severity: "info", title: "Variable task",
    body: `"${low[0].displayTitle}" varies a lot (${fmtMin(low[0].min)}–${fmtMin(low[0].max)}). Add a buffer when planning it.` });
  return out;
}

export function weeklyReview(sessions: TimeSession[]) {
  const week = sessions.filter((s) => isThisWeek(s.endedAt));
  const prev = sessions.filter((s) => !isThisWeek(s.endedAt) && s.endedAt > Date.now() - 14 * 86400000);
  const acc = (list: TimeSession[]) => list.length ? Math.round((list.filter((s) => s.wasFinishedOnEstimate).length / list.length) * 100) : null;
  const focus = week.reduce((a, s) => a + s.actualMinutes, 0);
  const stats = allStats(week).filter((e) => e.count >= 2).sort((a, b) => b.avgErr - a.avgErr);
  return { count: week.length, focus, accuracy: acc(week), prevAccuracy: acc(prev), biggestMiss: stats[0] || null };
}
