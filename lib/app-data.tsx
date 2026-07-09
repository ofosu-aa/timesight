"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  AppData, EMPTY_DATA, Task, Routine, ActiveSession, TimeSession, UserSettings,
  RoutineRun, ExternalItem, ConnectorState, Priority, Energy,
} from "./types";
import { uid, normalize } from "./time";
import { predictFor, isAccurate } from "./predictions";
import { repositoryFor, SyncStatus } from "./data";
import { useAuth } from "./auth-context";
import { notifyEstimateExpired } from "./notifications";

interface TaskInput {
  title: string; estimatedMinutes: number; category?: string; priority?: Priority;
  energyLevel?: Energy; scheduledFor?: "today" | "later"; dueAt?: number | null; notes?: string;
  source?: Task["source"];
}

interface AppCtx {
  data: AppData | null;
  now: number;
  activeElapsedMs: number;
  activeTargetMin: number;
  activeRemainingMs: number;
  checkIn: boolean;
  setCheckIn(v: boolean): void;
  finishSummary: FinishSummary | null;
  dismissFinishSummary(): void;
  toast: string | null;
  flash(msg: string): void;
  syncStatus: SyncStatus;
  addTask(t: TaskInput): Task;
  updateTask(id: string, patch: Partial<Task>): void;
  deleteTask(id: string): void;
  duplicateTask(id: string): void;
  completeWithoutTiming(id: string): void;
  startTask(task: Task): void;
  pauseResume(): void;
  extend(mins: number): void;
  keepTiming(): void;
  finishTask(): void;
  cancelSession(): void;
  skipRoutineStep(): void;
  saveRoutine(r: Partial<Routine> & { name: string; tasks: Routine["tasks"] }): void;
  deleteRoutine(id: string): void;
  startRoutine(r: Routine): void;
  updateSettings(patch: Partial<UserSettings>): void;
  setConnector(state: ConnectorState): void;
  addExternalItems(items: ExternalItem[]): void;
  convertExternalItem(item: ExternalItem): void;
  loadDemo(): void;
  clearDemo(): void;
  clearAllData(): void;
  hasDemo: boolean;
}

export interface FinishSummary {
  session: TimeSession;
  nextRoutineTask: string | null;
  routineDone: boolean;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [now, setNow] = useState(Date.now());
  const [checkIn, setCheckIn] = useState(false);
  const [finishSummary, setFinishSummary] = useState<FinishSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notified = useRef(false);
  /* dataRef always holds the LATEST state synchronously, so mutations that
     run back-to-back in the same tick (e.g. onboarding: addTask → startTask →
     updateSettings) each build on the previous one instead of a stale render
     snapshot. This is the fix for the "first task doesn't start timing" bug. */
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    let live = true;
    if (!user) { setData(null); dataRef.current = null; return; }
    const repo = repositoryFor(!!user.isGuest, setSyncStatus);
    repo.load(user.uid).then((d) => {
      if (live) { dataRef.current = d; setData(d); }
    });
    /* Real-time: apply changes made on OTHER devices/tabs as they happen —
       start a timer on your phone, watch it tick on your laptop. */
    const unsubscribe = repo.subscribe?.(user.uid, (remote) => {
      if (!live) return;
      dataRef.current = remote;
      setData(remote);
    });
    return () => { live = false; unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.isGuest]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback((next: AppData) => {
    dataRef.current = next;           // synchronous — chained mutations see it
    setData(next);
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const repo = repositoryFor(!!user.isGuest, setSyncStatus);
    saveTimer.current = setTimeout(() => { repo.save(user.uid, next).catch(() => {}); }, 300);
  }, [user]);

  /** Latest state for mutations — never a stale render closure. */
  const cur = (): AppData => dataRef.current ?? EMPTY_DATA;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const active = data?.active || null;
  const activeElapsedMs = active ? (active.pausedAt ?? now) - active.startedAt - active.pausedTotalMs : 0;
  const activeTargetMin = active ? active.estimatedMinutes + active.extraMinutes : 0;
  const activeRemainingMs = active ? activeTargetMin * 60000 - activeElapsedMs : 0;

  /* Estimate-expiry check-in — hook runs unconditionally (stable order). */
  useEffect(() => {
    if (active && !active.pausedAt && !active.keepTiming && activeRemainingMs <= 0 && !checkIn && !finishSummary) {
      setCheckIn(true);
      if (!notified.current) {
        notified.current = true;
        notifyEstimateExpired(active.taskTitle, data?.settings.notificationsEnabled ?? false);
      }
    }
    if (activeRemainingMs > 0) notified.current = false;
  }, [now, active, activeRemainingMs, checkIn, finishSummary, data?.settings.notificationsEnabled]);

  const makeTask = (t: TaskInput): Task => ({
    id: uid(), title: t.title.trim(), normalizedTitle: normalize(t.title),
    category: t.category || "", priority: t.priority || "medium", energyLevel: t.energyLevel || "",
    estimatedMinutes: Math.max(1, Math.round(t.estimatedMinutes || 15)),
    status: "pending", scheduledFor: t.scheduledFor || "today", dueAt: t.dueAt ?? null,
    createdAt: Date.now(), updatedAt: Date.now(), completedAt: null, actualMinutes: null,
    routineId: null, notes: t.notes || "", source: t.source || "manual",
  });

  function completeActive(skipped: boolean) {
    const d = cur();
    if (!d.active) return;
    const a = d.active;
    const endedAt = Date.now();
    const elapsed = (a.pausedAt ?? endedAt) - a.startedAt - a.pausedTotalMs;
    const actual = Math.max(1, Math.round(elapsed / 60000));
    const err = actual - a.estimatedMinutes;
    const session: TimeSession = {
      id: uid(), taskId: a.taskId, taskTitle: a.taskTitle, normalizedTaskTitle: normalize(a.taskTitle),
      category: d.tasks.find((t) => t.id === a.taskId)?.category || "",
      estimatedMinutes: a.estimatedMinutes, actualMinutes: actual,
      startedAt: a.startedAt, endedAt, pausedMs: a.pausedTotalMs,
      wasFinishedOnEstimate: isAccurate(err, a.estimatedMinutes),
      estimateErrorMinutes: err, estimateErrorPercent: Math.round((err / a.estimatedMinutes) * 100),
      routineId: a.routine?.routineId ?? null, routineRunId: a.routine?.runId ?? null,
    };
    let tasks = d.tasks.map((t) => t.id === a.taskId
      ? { ...t, status: (skipped ? "skipped" : "completed") as Task["status"], completedAt: endedAt, actualMinutes: skipped ? null : actual }
      : t);
    const sessions = skipped ? d.sessions : [...d.sessions, session];
    let routineRuns = d.routineRuns;
    let nextActive: ActiveSession | null = null;
    let nextRoutineTask: string | null = null;

    if (a.routine) {
      routineRuns = routineRuns.map((r) => r.id === a.routine!.runId ? {
        ...r,
        actualTotalMinutes: r.actualTotalMinutes + (skipped ? 0 : actual),
        completedTaskCount: r.completedTaskCount + (skipped ? 0 : 1),
        skippedTaskCount: r.skippedTaskCount + (skipped ? 1 : 0),
      } : r);
      const routine = d.routines.find((r) => r.id === a.routine!.routineId);
      const nextIdx = a.routine.index + 1;
      if (routine && nextIdx < routine.tasks.length) {
        const rt = routine.tasks[nextIdx];
        const est = predictFor(rt.title, sessions)?.predictedMinutes ?? rt.estimatedMinutes;
        const newTask = { ...makeTask({ title: rt.title, estimatedMinutes: est, category: rt.category, source: "routine" }), routineId: routine.id, status: "active" as const };
        tasks = [newTask, ...tasks];
        nextActive = {
          taskId: newTask.id, taskTitle: newTask.title, estimatedMinutes: est,
          startedAt: endedAt, pausedAt: null, pausedTotalMs: 0, extraMinutes: 0, keepTiming: false,
          routine: { ...a.routine, index: nextIdx },
        };
        nextRoutineTask = newTask.title;
      } else {
        routineRuns = routineRuns.map((r) => r.id === a.routine!.runId ? { ...r, endedAt } : r);
      }
    }

    persist({ ...d, tasks, sessions, routineRuns, active: nextActive });
    setCheckIn(false);

    /* Notion write-back: if this task was imported from Notion, record the
       actual duration on the Notion page. Fire-and-forget — timing data is
       already saved locally regardless of whether Notion is reachable. */
    if (!skipped) {
      const ext = d.externalItems.find((e) => e.provider === "notion" && e.importedTaskId === a.taskId);
      const notionToken = d.connectors.find((c) => c.provider === "notion")?.tokens?.accessToken;
      if (ext && notionToken) {
        import("./connectors/notion")
          .then((m) => m.writeBackToNotion(notionToken, ext.externalId, actual, a.estimatedMinutes))
          .then(() => flash("Actual time written back to Notion"))
          .catch(() => { /* Notion unreachable — local data is the source of truth */ });
      }
    }

    if (!skipped) setFinishSummary({ session, nextRoutineTask, routineDone: !!a.routine && !nextActive });
    else if (nextActive) flash(`Skipped — next: ${nextActive.taskTitle}`);
    else flash("Step skipped");
  }

  const value: AppCtx = {
    data, now, activeElapsedMs, activeTargetMin, activeRemainingMs,
    checkIn, setCheckIn, finishSummary, toast, flash, syncStatus,
    hasDemo: (data ?? EMPTY_DATA).sessions.some((s) => s.demo) || (data ?? EMPTY_DATA).routines.some((r) => r.demo),

    dismissFinishSummary() {
      const d = cur();
      const goRoutine = finishSummary?.nextRoutineTask;
      setFinishSummary(null);
      if (goRoutine && d.active) {
        // Don't count summary-reading time against the next routine step.
        persist({ ...d, active: { ...d.active, startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0 } });
      }
    },

    addTask(t) {
      const d = cur();
      const task = makeTask(t);
      persist({ ...d, tasks: [task, ...d.tasks] });
      flash(`Added "${task.title}"`);
      return task;
    },
    updateTask(id, patch) {
      const d = cur();
      persist({ ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, ...patch, normalizedTitle: patch.title ? normalize(patch.title) : t.normalizedTitle, updatedAt: Date.now() } : t) });
    },
    deleteTask(id) {
      const d = cur();
      persist({ ...d, tasks: d.tasks.filter((t) => t.id !== id) });
    },
    duplicateTask(id) {
      const d = cur();
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      persist({ ...d, tasks: [{ ...t, id: uid(), status: "pending", createdAt: Date.now(), completedAt: null, actualMinutes: null }, ...d.tasks] });
      flash(`Duplicated "${t.title}"`);
    },
    completeWithoutTiming(id) {
      const d = cur();
      const t = d.tasks.find((x) => x.id === id);
      persist({ ...d, tasks: d.tasks.map((x) => x.id === id ? { ...x, status: "completed", completedAt: Date.now() } : x) });
      if (t) flash(`"${t.title}" marked complete`);
    },

    startTask(task) {
      const d = cur();
      const session: ActiveSession = {
        taskId: task.id, taskTitle: task.title, estimatedMinutes: task.estimatedMinutes,
        startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0, extraMinutes: 0, keepTiming: false, routine: null,
      };
      setCheckIn(false);
      persist({ ...d, active: session, tasks: d.tasks.map((t) => t.id === task.id ? { ...t, status: "active" } : t) });
    },
    pauseResume() {
      const d = cur();
      if (!d.active) return;
      const a = d.active;
      persist({ ...d, active: a.pausedAt
        ? { ...a, pausedTotalMs: a.pausedTotalMs + (Date.now() - a.pausedAt), pausedAt: null }
        : { ...a, pausedAt: Date.now() } });
    },
    extend(mins) {
      const d = cur();
      if (!d.active) return;
      persist({ ...d, active: { ...d.active, extraMinutes: d.active.extraMinutes + mins } });
      setCheckIn(false);
      flash(`Added ${mins} minutes — keep going`);
    },
    keepTiming() {
      const d = cur();
      if (!d.active) return;
      persist({ ...d, active: { ...d.active, keepTiming: true } });
      setCheckIn(false);
    },

    finishTask() { completeActive(false); },
    skipRoutineStep() { completeActive(true); },

    cancelSession() {
      const d = cur();
      if (!d.active) return;
      persist({ ...d, active: null, tasks: d.tasks.map((t) => t.id === d.active!.taskId ? { ...t, status: "pending" } : t) });
      setCheckIn(false);
      flash("Session cancelled — no time recorded");
    },

    saveRoutine(r) {
      const d = cur();
      const existing = r.id ? d.routines.find((x) => x.id === r.id) : null;
      if (existing) {
        persist({ ...d, routines: d.routines.map((x) => x.id === r.id ? { ...existing, ...r, updatedAt: Date.now() } as Routine : x) });
      } else {
        persist({ ...d, routines: [{ id: uid(), name: r.name, description: r.description || "", tasks: r.tasks, createdAt: Date.now(), updatedAt: Date.now() }, ...d.routines] });
      }
      flash("Routine saved");
    },
    deleteRoutine(id) {
      const d = cur();
      persist({ ...d, routines: d.routines.filter((r) => r.id !== id) });
    },

    startRoutine(routine) {
      const d = cur();
      if (!routine.tasks.length) { flash("Add at least one step first"); return; }
      const rt = routine.tasks[0];
      const runId = uid();
      const est = predictFor(rt.title, d.sessions)?.predictedMinutes ?? rt.estimatedMinutes;
      const task = { ...makeTask({ title: rt.title, estimatedMinutes: est, category: rt.category, source: "routine" }), routineId: routine.id, status: "active" as const };
      const run: RoutineRun = {
        id: runId, routineId: routine.id, routineName: routine.name, startedAt: Date.now(), endedAt: null,
        estimatedTotalMinutes: routine.tasks.reduce((a, t) => a + t.estimatedMinutes, 0),
        actualTotalMinutes: 0, completedTaskCount: 0, skippedTaskCount: 0,
      };
      persist({
        ...d, tasks: [task, ...d.tasks], routineRuns: [run, ...d.routineRuns],
        active: {
          taskId: task.id, taskTitle: task.title, estimatedMinutes: est,
          startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0, extraMinutes: 0, keepTiming: false,
          routine: { routineId: routine.id, routineName: routine.name, runId, index: 0, total: routine.tasks.length },
        },
      });
    },

    updateSettings(patch) {
      const d = cur();
      persist({ ...d, settings: { ...d.settings, ...patch } });
    },
    setConnector(state) {
      const d = cur();
      const rest = d.connectors.filter((c) => c.provider !== state.provider);
      persist({ ...d, connectors: [...rest, state] });
    },
    addExternalItems(items) {
      const d = cur();
      const seen = new Set(d.externalItems.map((e) => e.provider + e.externalId));
      const fresh = items.filter((i) => !seen.has(i.provider + i.externalId));
      persist({ ...d, externalItems: [...fresh, ...d.externalItems] });
      flash(`Imported ${fresh.length} item${fresh.length === 1 ? "" : "s"}`);
    },
    convertExternalItem(item) {
      const d = cur();
      const task = makeTask({ title: item.title, estimatedMinutes: item.durationMinutes || 30, source: "connector" });
      persist({
        ...d, tasks: [task, ...d.tasks],
        externalItems: d.externalItems.map((e) => e.id === item.id ? { ...e, importedTaskId: task.id } : e),
      });
      flash(`"${item.title}" added to today`);
    },

    loadDemo() {
      const d = cur();
      const demo = makeDemoData();
      persist({ ...d, sessions: [...d.sessions, ...demo.sessions], routines: [...demo.routines, ...d.routines] });
      flash("Demo data loaded — explore Insights and predictions");
    },
    clearDemo() {
      const d = cur();
      persist({ ...d, sessions: d.sessions.filter((s) => !s.demo), routines: d.routines.filter((r) => !r.demo) });
      flash("Demo data cleared");
    },
    clearAllData() {
      const d = cur();
      persist({ ...EMPTY_DATA, settings: { ...d.settings } });
      flash("All data cleared");
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppDataProvider");
  return c;
}

/* ---------------- demo seed data ---------------- */
function makeDemoData() {
  const templates = [
    { title: "Shower", est: 10, mean: 19, sd: 3, n: 9 },
    { title: "Breakfast", est: 15, mean: 17, sd: 3, n: 7 },
    { title: "Emails", est: 20, mean: 34, sd: 8, n: 8 },
    { title: "Gym", est: 60, mean: 76, sd: 10, n: 5 },
    { title: "Study block", est: 45, mean: 51, sd: 6, n: 6 },
    { title: "Brush teeth", est: 3, mean: 3, sd: 0.5, n: 8 },
    { title: "Laundry", est: 20, mean: 28, sd: 5, n: 4 },
    { title: "Clean room", est: 30, mean: 22, sd: 4, n: 3 },
  ];
  const sessions: TimeSession[] = [];
  const nowMs = Date.now();
  templates.forEach((t) => {
    for (let i = 0; i < t.n; i++) {
      const actual = Math.max(1, Math.round(t.mean + (Math.random() * 2 - 1) * t.sd));
      const end = nowMs - (i + 1) * 86400000 - Math.random() * 4e7;
      const err = actual - t.est;
      sessions.push({
        id: uid(), demo: true, taskId: null, taskTitle: t.title, normalizedTaskTitle: normalize(t.title),
        category: "", estimatedMinutes: t.est, actualMinutes: actual,
        startedAt: end - actual * 60000, endedAt: end, pausedMs: 0,
        wasFinishedOnEstimate: Math.abs(err) <= Math.max(2, t.est * 0.2),
        estimateErrorMinutes: err, estimateErrorPercent: Math.round((err / t.est) * 100),
        routineId: null, routineRunId: null,
      });
    }
  });
  const routines: Routine[] = [
    { id: uid(), demo: true, name: "Morning Routine", description: "Weekday startup", createdAt: nowMs, updatedAt: nowMs,
      tasks: [
        { id: uid(), title: "Shower", estimatedMinutes: 10, category: "Personal", order: 0, notes: "" },
        { id: uid(), title: "Brush teeth", estimatedMinutes: 3, category: "Personal", order: 1, notes: "" },
        { id: uid(), title: "Breakfast", estimatedMinutes: 15, category: "Personal", order: 2, notes: "" },
      ] },
    { id: uid(), demo: true, name: "Night Routine", description: "Wind down", createdAt: nowMs, updatedAt: nowMs,
      tasks: [
        { id: uid(), title: "Clean room", estimatedMinutes: 15, category: "Home", order: 0, notes: "" },
        { id: uid(), title: "Brush teeth", estimatedMinutes: 3, category: "Personal", order: 1, notes: "" },
      ] },
  ];
  return { sessions, routines };
}
