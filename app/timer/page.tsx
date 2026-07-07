"use client";
import { useRouter } from "next/navigation";
import { Play, Pause, Check, Timer as TimerIcon, SkipForward } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, EmptyState, Chip } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { predictFor } from "@/lib/predictions";
import { fmtClock, fmtMin } from "@/lib/time";

export default function TimerPage() { return <AppShell><Timer /></AppShell>; }

function Timer() {
  const app = useApp();
  const router = useRouter();
  if (!app.data) return null;
  const { active, tasks, sessions } = app.data;

  if (!active) {
    const pending = tasks.filter((t) => t.status === "pending" && t.scheduledFor !== "later");
    const suggested = [...pending].sort((a, b) =>
      (predictFor(a.title, sessions)?.predictedMinutes ?? a.estimatedMinutes) - (predictFor(b.title, sessions)?.predictedMinutes ?? b.estimatedMinutes))[0];
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6 text-ink">Timer</h1>
        <Card>
          <EmptyState icon={TimerIcon} title="No task running"
            body={suggested ? `Ready when you are. "${suggested.title}" is up next.` : "Start a task from Today or Tasks and the timer will live here."}
            action={suggested
              ? <Btn onClick={() => app.startTask(suggested)}><Play size={17} /> Start &quot;{suggested.title}&quot;</Btn>
              : <Btn variant="subtle" onClick={() => router.push("/tasks")}>Go to tasks</Btn>} />
        </Card>
      </div>
    );
  }

  const over = app.activeRemainingMs < 0;
  const pct = Math.min(1, app.activeElapsedMs / (app.activeTargetMin * 60000 || 1));
  const R = 118, C = 2 * Math.PI * R;
  const paused = !!active.pausedAt;
  const pred = predictFor(active.taskTitle, sessions);

  return (
    <div className="flex flex-col items-center pt-2">
      {active.routine && (
        <Chip tone="accent">{active.routine.routineName} · step {active.routine.index + 1} of {active.routine.total}</Chip>
      )}
      <h1 className="text-2xl font-bold mt-3 text-center px-4 text-ink">{active.taskTitle}</h1>
      <p className="text-sm mt-1 text-muted">
        Estimate {fmtMin(active.estimatedMinutes)}{active.extraMinutes ? ` +${active.extraMinutes}m added` : ""}
        {pred && pred.predictedMinutes !== active.estimatedMinutes ? ` · predicted ${fmtMin(pred.predictedMinutes)}` : ""}
      </p>

      <div className="relative my-7" style={{ width: 272, height: 272 }}>
        <svg width="272" height="272" viewBox="0 0 272 272" className="-rotate-90">
          <circle cx="136" cy="136" r={R} fill="none" stroke="#1A2133" strokeWidth="12" />
          <circle cx="136" cy="136" r={R} fill="none"
            stroke={over ? "#E8A855" : "url(#tsgrad)"} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.6s" }} />
          <defs>
            <linearGradient id="tsgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7DA2FF" /><stop offset="100%" stopColor="#9F8CFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold tabular-nums tracking-tight text-ink">{fmtClock(app.activeElapsedMs)}</p>
          <p className={`text-sm mt-1.5 tabular-nums font-medium ${over ? "text-amber" : "text-muted"}`}>
            {over ? `${fmtClock(-app.activeRemainingMs)} past estimate` : `${fmtClock(app.activeRemainingMs)} remaining`}
          </p>
          {paused && <Chip tone="warn">Paused</Chip>}
          {over && !paused && <p className="text-xs mt-1 text-faint">Still learning — this is useful data</p>}
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap justify-center">
        <Btn variant="subtle" onClick={app.pauseResume}>{paused ? <><Play size={17} /> Resume</> : <><Pause size={17} /> Pause</>}</Btn>
        <Btn variant="subtle" onClick={() => app.extend(5)}>+5 min</Btn>
        <Btn variant="subtle" onClick={() => app.extend(10)}>+10 min</Btn>
        {active.routine && <Btn variant="subtle" onClick={app.skipRoutineStep}><SkipForward size={16} /> Skip step</Btn>}
      </div>
      <Btn variant="good" className="w-full max-w-xs" onClick={app.finishTask}><Check size={18} /> Finish task</Btn>
      <button onClick={() => { app.cancelSession(); router.push("/today"); }} className="mt-4 text-sm font-medium text-faint">Cancel session</button>
    </div>
  );
}
