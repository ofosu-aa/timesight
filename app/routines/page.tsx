"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, Pencil, Trash2, Repeat, CalendarPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Chip, EmptyState } from "@/components/ui";
import { RoutineForm } from "@/components/RoutineBits";
import { useApp } from "@/lib/app-data";
import { predictFor, confidenceFrom, confLabel } from "@/lib/predictions";
import { fmtMin } from "@/lib/time";
import { Routine } from "@/lib/types";
import { buildRoutineIcs, downloadIcs } from "@/lib/ics";

export default function RoutinesPage() { return <AppShell><Routines /></AppShell>; }

function Routines() {
  const app = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<Routine | null | "new">(null);
  if (!app.data) return null;
  const { routines, sessions, routineRuns, active } = app.data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-ink">Routines</h1>
        <Btn small onClick={() => setEditing("new")}><Plus size={16} /> New routine</Btn>
      </div>

      {routines.length === 0 && (
        <Card><EmptyState icon={Repeat} title="No routines yet"
          body="Create a routine you repeat often, like your morning routine or gym session. TimeSight times each step and learns your real pace."
          action={<Btn small onClick={() => setEditing("new")}>Create a routine</Btn>} /></Card>
      )}

      <div className="space-y-3">
        {routines.map((r) => {
          const runs = routineRuns.filter((run) => run.routineId === r.id && run.endedAt != null);
          const totals = runs.map((run) => run.actualTotalMinutes).filter((t) => t > 0);
          const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
          const listed = r.tasks.reduce((a, t) => a + t.estimatedMinutes, 0);
          const predTotal = r.tasks.reduce((a, t) => a + (predictFor(t.title, sessions)?.predictedMinutes ?? t.estimatedMinutes), 0);
          const stdev = totals.length > 1 && avg ? Math.sqrt(totals.reduce((a, b) => a + (b - avg) ** 2, 0) / totals.length) : 0;
          const conf = confidenceFrom(totals.length, avg || predTotal, stdev);
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/routines/${r.id}`} className="min-w-0 flex-1">
                  <p className="font-bold text-lg text-ink">{r.name}</p>
                  {r.description && <p className="text-sm text-muted">{r.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Chip>{r.tasks.length} steps</Chip>
                    <Chip tone="accent">~{fmtMin(predTotal)} realistic</Chip>
                    {predTotal > listed + 5 && <Chip tone="warn">listed {fmtMin(listed)}</Chip>}
                    {avg != null && <Chip>avg {fmtMin(avg)}</Chip>}
                    {totals.length > 0 && <Chip tone="good">fastest {fmtMin(Math.min(...totals))}</Chip>}
                    {totals.length > 1 && <Chip tone="warn">slowest {fmtMin(Math.max(...totals))}</Chip>}
                    {totals.length > 0 && <Chip>{confLabel(conf).replace(" confidence", "")} confidence</Chip>}
                  </div>
                </Link>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Btn small onClick={() => { app.startRoutine(r); router.push("/timer"); }} disabled={!!active}><Play size={14} /> Start</Btn>
                  <div className="flex gap-1">
                    <button title="Export to calendar (.ics)" onClick={() => downloadIcs(`${r.name.replace(/\s+/g, "-").toLowerCase()}.ics`, buildRoutineIcs(r, sessions, Date.now() + 3600000))} className="p-2 text-faint"><CalendarPlus size={16} /></button>
                    <button onClick={() => setEditing(r)} className="p-2 text-faint"><Pencil size={16} /></button>
                    <button onClick={() => app.deleteRoutine(r.id)} className="p-2 text-faint"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-line space-y-1.5">
                {r.tasks.map((t, i) => {
                  const p = predictFor(t.title, sessions);
                  return (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted"><span className="tabular-nums mr-2 text-faint">{i + 1}</span>{t.title}</span>
                      <span className={`tabular-nums ${p ? "text-accent" : "text-faint"}`}>{fmtMin(p?.predictedMinutes ?? t.estimatedMinutes)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {editing !== null && (
        <RoutineForm routine={editing === "new" ? null : editing} sessions={sessions} onClose={() => setEditing(null)}
          onSave={(r) => { app.saveRoutine(r); setEditing(null); }} />
      )}
    </div>
  );
}
