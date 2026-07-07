"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, ChevronRight, Zap, Repeat, Sparkles, CalendarPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Stat, EmptyState, inputCls, Chip } from "@/components/ui";
import { PredictionBadge } from "@/components/PredictionBadge";
import { TaskForm } from "@/components/TaskBits";
import { useApp } from "@/lib/app-data";
import { predictFor } from "@/lib/predictions";
import { fmtMin, fmtClock, isToday } from "@/lib/time";

export default function TodayPage() {
  return <AppShell><Today /></AppShell>;
}

function Today() {
  const app = useApp();
  const router = useRouter();
  const [quick, setQuick] = useState("");
  const [quickMin, setQuickMin] = useState("");
  const [showForm, setShowForm] = useState(false);
  if (!app.data) return null;
  const { tasks, sessions, active, externalItems } = app.data;

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const pendingToday = tasks.filter((t) => t.status === "pending" && t.scheduledFor !== "later");
  const suggested = [...pendingToday].sort((a, b) =>
    (predictFor(a.title, sessions)?.predictedMinutes ?? a.estimatedMinutes) - (predictFor(b.title, sessions)?.predictedMinutes ?? b.estimatedMinutes))[0];
  const todaySessions = sessions.filter((s) => isToday(s.endedAt));
  const focusToday = todaySessions.reduce((a, s) => a + s.actualMinutes, 0);
  const completedToday = tasks.filter((t) => t.status === "completed" && t.completedAt && isToday(t.completedAt)).length;
  const plannedMin = pendingToday.reduce((a, t) => a + t.estimatedMinutes, 0);
  const realisticMin = pendingToday.reduce((a, t) => a + (predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes), 0);
  const accToday = todaySessions.length ? Math.round((todaySessions.filter((s) => s.wasFinishedOnEstimate).length / todaySessions.length) * 100) : null;
  const quickPred = quick.trim().length > 1 ? predictFor(quick, sessions) : null;
  const upcomingExternal = externalItems.filter((e) => !e.importedTaskId && e.startTime && e.startTime > Date.now() - 3600000).slice(0, 3);

  const submitQuick = () => {
    if (!quick.trim()) return;
    app.addTask({ title: quick, estimatedMinutes: +quickMin || quickPred?.predictedMinutes || 15 });
    setQuick(""); setQuickMin("");
  };

  return (
    <div>
      <p className="text-sm font-medium text-faint">{dateStr}</p>
      <h1 className="text-3xl font-bold mt-1 mb-6 text-ink">{greeting}.</h1>

      {active && (
        <Card className="p-5 mb-4 !border-accent/40 border-2" onClick={() => router.push("/timer")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-accent">{active.pausedAt ? "Paused" : "In progress"}</p>
              <p className="font-bold text-lg text-ink">{active.taskTitle}</p>
              <p className="text-sm tabular-nums text-muted">{fmtClock(app.activeElapsedMs)} elapsed · est {fmtMin(active.estimatedMinutes)}</p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-raised"><ChevronRight size={20} className="text-accent" /></div>
          </div>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="flex gap-2">
          <input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="Add a task…" className={inputCls} />
          <input value={quickMin} onChange={(e) => setQuickMin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="min" inputMode="numeric" className={`${inputCls} !w-20 text-center tabular-nums`} />
          <Btn onClick={submitQuick} className="!px-4"><Plus size={20} /></Btn>
        </div>
        <PredictionBadge pred={quickPred} onUse={() => quickPred && setQuickMin(String(quickPred.predictedMinutes))} />
        <button onClick={() => setShowForm(true)} className="mt-2.5 text-sm font-medium text-faint">More options →</button>
      </Card>

      {!active && suggested && (
        <Card className="p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-faint">Suggested next</p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-lg truncate text-ink">{suggested.title}</p>
              <p className="text-sm text-muted">~{fmtMin(predictFor(suggested.title, sessions)?.predictedMinutes ?? suggested.estimatedMinutes)}{predictFor(suggested.title, sessions) ? " based on your history" : " estimated"}</p>
            </div>
            <Btn onClick={() => { app.startTask(suggested); router.push("/timer"); }}><Play size={17} /> Start</Btn>
          </div>
        </Card>
      )}

      {!active && !suggested && (
        <Card className="mb-4">
          <EmptyState icon={Zap} title="Nothing queued yet" body="Add your first task to start seeing where your time actually goes."
            action={sessions.length === 0 ? <Btn variant="subtle" small onClick={app.loadDemo}>Load demo data</Btn> : undefined} />
        </Card>
      )}

      {upcomingExternal.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">From your calendar</p>
          <div className="space-y-2">
            {upcomingExternal.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{e.title}</p>
                  <p className="text-xs text-muted">
                    {e.startTime ? new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""} · {fmtMin(e.durationMinutes)}
                    {(() => { const p = predictFor(e.title, sessions); return p && e.durationMinutes && p.predictedMinutes > e.durationMinutes + 5 ? ` — history says ~${fmtMin(p.predictedMinutes)}` : ""; })()}
                  </p>
                </div>
                <Btn small variant="subtle" onClick={() => app.convertExternalItem(e)}><CalendarPlus size={14} /> Add</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-4"><Stat label="Planned today" value={fmtMin(plannedMin)} /></Card>
        <Card className="p-4"><Stat label="Focus tracked" value={fmtMin(focusToday)} accent /></Card>
        <Card className="p-4"><Stat label="Completed" value={completedToday} /></Card>
        <Card className="p-4"><Stat label="Accuracy today" value={accToday != null ? `${accToday}%` : "—"} /></Card>
      </div>

      {pendingToday.length > 0 && Math.abs(realisticMin - plannedMin) > 4 && (
        <Card className="p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-faint">Reality check</p>
          <RealityBar planned={plannedMin} realistic={realisticMin} />
          <p className="text-sm mt-2.5 text-muted">
            {realisticMin > plannedMin
              ? <>You planned <b className="text-ink">{fmtMin(plannedMin)}</b> today. Based on your history, this may take closer to <b className="text-amber">{fmtMin(realisticMin)}</b>. Your day may need more breathing room.</>
              : <>Good news — history suggests today will take <b className="text-sage">{fmtMin(realisticMin)}</b>, less than your {fmtMin(plannedMin)} plan.</>}
          </p>
        </Card>
      )}

      {pendingToday.length > 1 && (
        <Card className="p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">Today&apos;s plan</p>
          <div className="space-y-1.5">
            {pendingToday.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{t.title}</span>
                <span className="tabular-nums text-muted">~{fmtMin(predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes)}</span>
              </div>
            ))}
            {pendingToday.length > 6 && <Link href="/tasks" className="text-sm text-accent font-medium">+{pendingToday.length - 6} more</Link>}
          </div>
        </Card>
      )}

      <div className="flex gap-2.5">
        <Link href="/routines"><Btn variant="ghost" small><Repeat size={15} /> Routines</Btn></Link>
        <Link href="/insights"><Btn variant="ghost" small><Sparkles size={15} /> Insights</Btn></Link>
      </div>

      {showForm && <TaskForm task={null} sessions={sessions} onClose={() => setShowForm(false)}
        onSave={(t) => { app.addTask(t); setShowForm(false); }} />}
    </div>
  );
}

function RealityBar({ planned, realistic }: { planned: number; realistic: number }) {
  const max = Math.max(planned, realistic, 1);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-3 rounded-full bg-accent" style={{ width: `${(planned / max) * 100}%`, minWidth: 24 }} />
        <span className="text-xs tabular-nums text-muted">plan</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`h-3 rounded-full ${realistic > planned ? "bg-amber" : "bg-sage"}`} style={{ width: `${(realistic / max) * 100}%`, minWidth: 24 }} />
        <span className="text-xs tabular-nums text-muted">history</span>
      </div>
    </div>
  );
}
