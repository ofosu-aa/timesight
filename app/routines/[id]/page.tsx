"use client";
import { useParams, useRouter } from "next/navigation";
import { Play, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Chip, Stat } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { predictFor, statsFor, confLabel, confidenceFrom } from "@/lib/predictions";
import { fmtMin } from "@/lib/time";

export default function RoutineDetailPage() { return <AppShell><RoutineDetail /></AppShell>; }

function RoutineDetail() {
  const app = useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  if (!app.data) return null;
  const routine = app.data.routines.find((r) => r.id === params.id);
  if (!routine) return <p className="text-muted">This routine no longer exists. <button className="text-accent" onClick={() => router.push("/routines")}>Back to routines</button></p>;

  const { sessions, routineRuns, active } = app.data;
  const runs = routineRuns.filter((run) => run.routineId === routine.id && run.endedAt != null);
  const totals = runs.map((r) => r.actualTotalMinutes).filter((t) => t > 0);
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  const predTotal = routine.tasks.reduce((a, t) => a + (predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes), 0);
  const stats = routine.tasks.map((t) => ({ t, st: statsFor(t.title, sessions) }));
  const variable = [...stats].filter((x) => x.st && x.st.count >= 2).sort((a, b) => (b.st!.stdev / Math.max(1, b.st!.mean)) - (a.st!.stdev / Math.max(1, a.st!.mean)));

  return (
    <div>
      <button onClick={() => router.push("/routines")} className="flex items-center gap-1.5 text-sm text-muted mb-4"><ArrowLeft size={15} /> Routines</button>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-ink">{routine.name}</h1>
          {routine.description && <p className="text-muted mt-1">{routine.description}</p>}
        </div>
        <Btn onClick={() => { app.startRoutine(routine); router.push("/timer"); }} disabled={!!active}><Play size={16} /> Start</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="p-4"><Stat label="Realistic total" value={fmtMin(predTotal)} accent /></Card>
        <Card className="p-4"><Stat label="Average run" value={avg != null ? fmtMin(avg) : "—"} /></Card>
        <Card className="p-4"><Stat label="Fastest" value={totals.length ? fmtMin(Math.min(...totals)) : "—"} /></Card>
        <Card className="p-4"><Stat label="Slowest" value={totals.length ? fmtMin(Math.max(...totals)) : "—"} /></Card>
      </div>

      <Card className="p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-faint">Steps</p>
        <div className="space-y-2.5">
          {routine.tasks.map((t, i) => {
            const p = predictFor(t.title, sessions);
            return (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-ink text-sm"><span className="tabular-nums mr-2 text-faint">{i + 1}</span>{t.title}</span>
                <div className="flex items-center gap-2">
                  {p && <Chip tone="accent">{p.label.replace(" confidence", "")}</Chip>}
                  <span className="tabular-nums text-sm text-muted">{fmtMin(p?.predictedMinutes ?? t.estimatedMinutes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {variable[0]?.st && (
        <Card className="p-4 mb-4">
          <p className="text-sm text-muted">
            Most variable step: <b className="text-ink">{variable[0].t.title}</b> ({fmtMin(variable[0].st.min)}–{fmtMin(variable[0].st.max)}).
            {variable.length > 1 && variable[variable.length - 1].st && <> Most predictable: <b className="text-ink">{variable[variable.length - 1].t.title}</b>.</>}
          </p>
        </Card>
      )}

      {runs.length > 0 && (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-faint">Recent runs</p>
          <div className="space-y-2">
            {runs.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-muted">{new Date(r.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="text-muted">{r.completedTaskCount} done{r.skippedTaskCount ? ` · ${r.skippedTaskCount} skipped` : ""}</span>
                <span className="tabular-nums text-ink font-medium">{fmtMin(r.actualTotalMinutes)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
