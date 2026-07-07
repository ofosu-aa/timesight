import { TimeSession, Prediction } from "./types";
import { normalize, fmtMin } from "./time";

export interface TaskStat {
  key: string; displayTitle: string; count: number; mean: number; median: number;
  min: number; max: number; stdev: number; avgErr: number; avgAbsErr: number;
}

export function statsFor(title: string, sessions: TimeSession[]): TaskStat | null {
  const key = normalize(title);
  const list = sessions.filter((s) => s.normalizedTaskTitle === key && s.actualMinutes > 0);
  if (!list.length) return null;
  const durs = list.map((s) => s.actualMinutes).sort((a, b) => a - b);
  const n = durs.length;
  const mean = durs.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? durs[(n - 1) / 2] : (durs[n / 2 - 1] + durs[n / 2]) / 2;
  const variance = durs.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const avgErr = list.reduce((a, s) => a + s.estimateErrorMinutes, 0) / n;
  const avgAbsErr = list.reduce((a, s) => a + Math.abs(s.estimateErrorMinutes), 0) / n;
  return { key, displayTitle: list[0].taskTitle, count: n, mean, median, min: durs[0], max: durs[n - 1], stdev: Math.sqrt(variance), avgErr, avgAbsErr };
}

export function allStats(sessions: TimeSession[]): TaskStat[] {
  const keys = new Set(sessions.map((s) => s.normalizedTaskTitle));
  const out: TaskStat[] = [];
  keys.forEach((k) => { const st = statsFor(k, sessions); if (st) out.push(st); });
  return out;
}

export function confidenceFrom(count: number, mean: number, stdev: number): number {
  if (!count) return 5;
  let base = count <= 2 ? 35 : count <= 5 ? 60 : count <= 10 ? 78 : 90;
  const cv = mean > 0 ? stdev / mean : 0;
  if (cv > 0.5) base -= 15; else if (cv > 0.3) base -= 8;
  return Math.max(5, Math.min(95, Math.round(base)));
}
export const confLabel = (c: number) =>
  c < 15 ? "Very low confidence" : c < 30 ? "Low confidence" : c < 55 ? "Medium confidence" : c < 80 ? "High confidence" : "Very high confidence";

export function predictFor(title: string, sessions: TimeSession[]): Prediction | null {
  const st = statsFor(title, sessions);
  if (!st) return null;
  const predicted = Math.max(1, Math.round(st.count >= 3 ? st.median : st.mean));
  const confidence = confidenceFrom(st.count, st.mean, st.stdev);
  return {
    predictedMinutes: predicted, confidence, label: confLabel(confidence),
    sampleSize: st.count, avgActual: st.mean,
    explanation: `Based on ${st.count} previous ${st.count === 1 ? "completion" : "completions"}, this usually takes about ${fmtMin(predicted)}.`,
  };
}

/** Accuracy: within 20% or ±2 minutes counts as "on estimate". */
export const isAccurate = (err: number, est: number) => Math.abs(err) <= Math.max(2, est * 0.2);
