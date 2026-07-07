"use client";
import React, { useState } from "react";
import { Play, Pencil, Trash2, CircleCheck, Copy, X } from "lucide-react";
import { Task, TimeSession, Priority, Energy } from "@/lib/types";
import { predictFor } from "@/lib/predictions";
import { fmtMin } from "@/lib/time";
import { Card, Chip, Btn, Field, inputCls, Modal } from "./ui";
import { PredictionBadge } from "./PredictionBadge";

export const CATEGORIES = ["Personal", "Work", "Health", "Home", "Study", "Admin"];
const ENERGY: Energy[] = ["Low", "Medium", "High"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function TaskCard({ task, sessions, onStart, onEdit, onDelete, onDuplicate, onComplete, disabled }: {
  task: Task; sessions: TimeSession[]; onStart: () => void; onEdit: () => void;
  onDelete: () => void; onDuplicate: () => void; onComplete: () => void; disabled?: boolean;
}) {
  const pred = predictFor(task.title, sessions);
  const done = task.status === "completed" || task.status === "skipped";
  const err = done && task.actualMinutes != null ? task.actualMinutes - task.estimatedMinutes : null;
  const overdue = task.dueAt != null && task.dueAt < Date.now() && !done;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-ink ${done ? "line-through opacity-60" : ""}`}>{task.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Chip>{fmtMin(task.estimatedMinutes)} est</Chip>
            {done && task.actualMinutes != null && err != null && (
              <Chip tone={Math.abs(err) <= Math.max(2, task.estimatedMinutes * 0.2) ? "good" : err > 0 ? "warn" : "good"}>
                {fmtMin(task.actualMinutes)} actual{err !== 0 ? ` (${err > 0 ? "+" : ""}${err}m)` : ""}
              </Chip>
            )}
            {!done && pred && <Chip tone="accent">~{fmtMin(pred.predictedMinutes)} · {pred.label.replace(" confidence", "")}</Chip>}
            {task.priority !== "medium" && <Chip tone={task.priority === "high" ? "warn" : "default"}>{task.priority} priority</Chip>}
            {overdue && <Chip tone="rose">overdue</Chip>}
            {task.category && <Chip>{task.category}</Chip>}
            {task.status === "skipped" && <Chip>skipped</Chip>}
          </div>
        </div>
        {!done && (
          <div className="flex items-center gap-1 shrink-0">
            {task.status !== "active" ? (
              <>
                <button onClick={onComplete} title="Complete without timing" className="p-2 text-faint"><CircleCheck size={18} /></button>
                <button onClick={onDuplicate} title="Duplicate" className="p-2 text-faint"><Copy size={16} /></button>
                <button onClick={onEdit} className="p-2 text-faint"><Pencil size={16} /></button>
                <button onClick={onDelete} className="p-2 text-faint"><Trash2 size={16} /></button>
                <Btn small onClick={onStart} disabled={disabled}><Play size={14} /> Start</Btn>
              </>
            ) : <Chip tone="good">timing…</Chip>}
          </div>
        )}
      </div>
    </Card>
  );
}

export function TaskForm({ task, sessions, onSave, onClose }: {
  task: Task | null; sessions: TimeSession[];
  onSave: (t: { title: string; estimatedMinutes: number; category: string; priority: Priority; energyLevel: Energy; scheduledFor: "today" | "later"; dueAt: number | null; notes: string }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    title: task?.title || "", estimatedMinutes: task ? String(task.estimatedMinutes) : "",
    category: task?.category || "", priority: (task?.priority || "medium") as Priority,
    energyLevel: (task?.energyLevel || "") as Energy,
    scheduledFor: (task?.scheduledFor || "today") as "today" | "later",
    dueAt: task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "",
    notes: task?.notes || "",
  });
  const pred = f.title.trim().length > 1 ? predictFor(f.title, sessions) : null;
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xl font-bold text-ink">{task ? "Edit task" : "New task"}</p>
        <button onClick={onClose} className="p-1.5 text-faint"><X size={20} /></button>
      </div>
      <div className="space-y-4">
        <Field label="Task name">
          <input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Shower" className={inputCls} />
          <PredictionBadge pred={pred} onUse={() => pred && set("estimatedMinutes", String(pred.predictedMinutes))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimate (minutes)">
            <input value={f.estimatedMinutes} onChange={(e) => set("estimatedMinutes", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="15" className={`${inputCls} tabular-nums`} />
          </Field>
          <Field label="When">
            <div className="flex rounded-xl border border-line overflow-hidden">
              {(["today", "later"] as const).map((w) => (
                <button key={w} type="button" onClick={() => set("scheduledFor", w)}
                  className={`flex-1 py-3 text-sm font-semibold capitalize ${f.scheduledFor === w ? "bg-raised text-accent" : "text-faint"}`}>{w}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => set("priority", p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border ${f.priority === p ? "bg-raised border-accent text-accent" : "border-line text-muted"}`}>{p}</button>
              ))}
            </div>
          </Field>
          <Field label="Deadline (optional)">
            <input type="date" value={f.dueAt} onChange={(e) => set("dueAt", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Category (optional)">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => set("category", f.category === c ? "" : c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${f.category === c ? "bg-raised border-accent text-accent" : "border-line text-muted"}`}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="Energy needed (optional)">
          <div className="flex gap-2">
            {ENERGY.map((c) => (
              <button key={c} type="button" onClick={() => set("energyLevel", f.energyLevel === c ? "" : c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${f.energyLevel === c ? "bg-raised border-accent text-accent" : "border-line text-muted"}`}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="Notes (optional)">
          <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} />
        </Field>
        <Btn className="w-full" disabled={!f.title.trim()} onClick={() => onSave({
          title: f.title, estimatedMinutes: +f.estimatedMinutes || pred?.predictedMinutes || 15,
          category: f.category, priority: f.priority, energyLevel: f.energyLevel,
          scheduledFor: f.scheduledFor, dueAt: f.dueAt ? new Date(f.dueAt + "T23:59:00").getTime() : null, notes: f.notes,
        })}>
          {task ? "Save changes" : "Add task"}
        </Btn>
      </div>
    </Modal>
  );
}
