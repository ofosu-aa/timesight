"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListTodo, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, EmptyState, inputCls } from "@/components/ui";
import { TaskCard, TaskForm, CATEGORIES } from "@/components/TaskBits";
import { useApp } from "@/lib/app-data";
import { Task } from "@/lib/types";

export default function TasksPage() { return <AppShell><Tasks /></AppShell>; }

function Tasks() {
  const app = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<Task | null | "new">(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [pri, setPri] = useState("");
  if (!app.data) return null;
  const { tasks, sessions, active } = app.data;

  const match = (t: Task) =>
    (!query || t.title.toLowerCase().includes(query.toLowerCase())) &&
    (!cat || t.category === cat) && (!pri || t.priority === pri);

  const groups = [
    { name: "Overdue", list: tasks.filter((t) => t.status === "pending" && t.dueAt != null && t.dueAt < Date.now()).filter(match) },
    { name: "Today", list: tasks.filter((t) => (t.status === "pending" || t.status === "active") && t.scheduledFor !== "later" && !(t.dueAt != null && t.dueAt < Date.now())).filter(match) },
    { name: "Upcoming", list: tasks.filter((t) => t.status === "pending" && t.scheduledFor === "later").filter(match) },
    { name: "Completed", list: tasks.filter((t) => t.status === "completed" || t.status === "skipped").filter(match).slice(0, 25) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold text-ink">Tasks</h1>
        <Btn small onClick={() => setEditing("new")}><Plus size={16} /> New task</Btn>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className={`${inputCls} !pl-10 !py-2.5`} />
        </div>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl px-3 py-2 text-sm bg-raised border border-line text-muted outline-none">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={pri} onChange={(e) => setPri(e.target.value)} className="rounded-xl px-3 py-2 text-sm bg-raised border border-line text-muted outline-none">
          <option value="">All priorities</option>
          {["high", "medium", "low"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {tasks.length === 0 && (
        <Card><EmptyState icon={ListTodo} title="No tasks yet"
          body="Capture what you're planning to do. TimeSight compares your estimate with reality every time you start the timer."
          action={<Btn small onClick={() => setEditing("new")}>Add your first task</Btn>} /></Card>
      )}

      {groups.map((g) => g.list.length > 0 && (
        <div key={g.name} className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">{g.name} · {g.list.length}</p>
          <div className="space-y-2.5">
            {g.list.map((t) => (
              <TaskCard key={t.id} task={t} sessions={sessions}
                onStart={() => { app.startTask(t); router.push("/timer"); }}
                onEdit={() => setEditing(t)}
                onDelete={() => app.deleteTask(t.id)}
                onDuplicate={() => app.duplicateTask(t.id)}
                onComplete={() => app.completeWithoutTiming(t.id)}
                disabled={!!active} />
            ))}
          </div>
        </div>
      ))}

      {editing !== null && (
        <TaskForm task={editing === "new" ? null : editing} sessions={sessions} onClose={() => setEditing(null)}
          onSave={(t) => { editing === "new" ? app.addTask(t) : app.updateTask((editing as Task).id, t); setEditing(null); }} />
      )}
    </div>
  );
}
