"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListTodo, Timer, Repeat, Sparkles, MessageCircle, Plug, Settings, Clock, Check, ArrowRight, Smartphone, MoreHorizontal, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-data";
import { Btn, Modal, Card, LoadingState } from "./ui";
import { fmtMin } from "@/lib/time";
import { predictFor } from "@/lib/predictions";

const NAV = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/timer", label: "Timer", icon: Timer },
  { href: "/routines", label: "Routines", icon: Repeat },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/coach", label: "Coach", icon: MessageCircle },
];
const NAV_DESKTOP_EXTRA = [
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const app = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  /* Protected routes: signed out → welcome; not onboarded → onboarding. */
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/welcome"); return; }
    if (app.data && !app.data.settings.onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [user, loading, app.data, pathname, router]);

  if (loading || !user || !app.data) return <LoadingState label="Loading TimeSight…" />;

  const { active } = app.data;

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 p-5 border-r border-line">
          <Link href="/today" className="flex items-center gap-2.5 mb-8 px-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent to-accent2">
              <Clock size={18} className="text-bg" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold leading-none text-ink">TimeSight</p>
              <p className="text-[11px] mt-0.5 text-faint">See your time clearly</p>
            </div>
          </Link>
          {[...NAV, ...NAV_DESKTOP_EXTRA].map((n) => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl mb-1 text-[15px] font-medium ${pathname.startsWith(n.href) ? "bg-raised text-ink" : "text-muted"}`}>
              <n.icon size={18} className={pathname.startsWith(n.href) ? "text-accent" : "text-faint"} />
              {n.label}
              {n.href === "/timer" && active && <span className="ml-auto w-2 h-2 rounded-full animate-pulse bg-sage" />}
            </Link>
          ))}
        </aside>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 md:pb-12">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex justify-around">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center gap-1 py-2.5 px-1 min-w-[48px] relative">
              <n.icon size={20} className={pathname.startsWith(n.href) ? "text-accent" : "text-faint"} />
              <span className={`text-[10px] font-medium ${pathname.startsWith(n.href) ? "text-ink" : "text-faint"}`}>{n.label}</span>
              {n.href === "/timer" && active && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse bg-sage" />}
            </Link>
          ))}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5 px-1 min-w-[48px]">
            <MoreHorizontal size={20} className={pathname.startsWith("/settings") || pathname.startsWith("/connectors") || pathname.startsWith("/install") ? "text-accent" : "text-faint"} />
            <span className="text-[10px] font-medium text-faint">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end" onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div className="w-full rounded-t-3xl border-t border-line bg-surface p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-ink">More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 text-faint"><X size={20} /></button>
            </div>
            {[
              { href: "/connectors", label: "Connectors", desc: "Google Calendar, Notion, Apple Calendar", icon: Plug },
              { href: "/settings", label: "Settings", desc: "Account, coach tone, notifications, data", icon: Settings },
              { href: "/install", label: "Install on iPhone", desc: "Add TimeSight to your Home Screen", icon: Smartphone },
            ].map((m) => (
              <Link key={m.href} href={m.href} onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl active:bg-raised">
                <div className="w-10 h-10 rounded-xl bg-raised flex items-center justify-center shrink-0"><m.icon size={18} className="text-accent" /></div>
                <div>
                  <p className="font-semibold text-[15px] text-ink">{m.label}</p>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <GlobalModals />
      {app.toast && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium border border-line bg-raised text-ink shadow-xl">
          {app.toast}
        </div>
      )}
    </div>
  );
}

function GlobalModals() {
  const app = useApp();
  const router = useRouter();
  if (!app.data) return null;
  const { active } = app.data;

  return (
    <>
      {app.checkIn && active && (
        <Modal onClose={app.keepTiming}>
          <p className="text-xl font-bold text-ink mb-1">Are you finished?</p>
          <p className="text-sm mb-5 text-muted">
            Your estimate for &quot;{active.taskTitle}&quot; is up. Need more time? No pressure — this is how TimeSight learns.
          </p>
          <div className="grid gap-2.5">
            <Btn variant="good" onClick={app.finishTask}><Check size={18} /> Yes, I&apos;m finished</Btn>
            <div className="grid grid-cols-2 gap-2.5">
              <Btn variant="subtle" onClick={() => app.extend(5)}>+5 minutes</Btn>
              <Btn variant="subtle" onClick={() => app.extend(10)}>+10 minutes</Btn>
            </div>
            <Btn variant="ghost" onClick={app.keepTiming}>Keep timing, don&apos;t ask again</Btn>
          </div>
        </Modal>
      )}
      {app.finishSummary && <FinishModal onDone={() => { const next = app.finishSummary?.nextRoutineTask; app.dismissFinishSummary(); if (!next) router.push("/today"); }} />}
    </>
  );
}

function FinishModal({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const fs = app.finishSummary;
  if (!fs || !app.data) return null;
  const s = fs.session;
  const early = s.estimateErrorMinutes < 0, exact = s.wasFinishedOnEstimate;
  const pred = predictFor(s.taskTitle, app.data.sessions);
  return (
    <Modal onClose={onDone}>
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-sage/15">
          <Check size={26} className="text-sage" />
        </div>
        <p className="text-xl font-bold text-ink">&quot;{s.taskTitle}&quot; done</p>
        <p className="text-sm mt-1 text-muted">Estimated {fmtMin(s.estimatedMinutes)} · took {fmtMin(s.actualMinutes)}</p>
      </div>
      <Card className="p-4 mb-4 !bg-raised">
        <p className={`text-center font-semibold ${exact || early ? "text-sage" : "text-amber"}`}>
          {exact ? "This estimate was almost exact." : early ? `You finished ${fmtMin(Math.abs(s.estimateErrorMinutes))} earlier than expected.` : `You were ${fmtMin(s.estimateErrorMinutes)} over. TimeSight will remember this.`}
        </p>
        {pred && <p className="text-center text-sm mt-1.5 text-muted">{pred.explanation} {pred.label}.</p>}
      </Card>
      {fs.routineDone && <p className="text-center text-sm mb-4 font-medium text-sage">Routine complete — nice work.</p>}
      <Btn className="w-full" onClick={onDone}>
        {fs.nextRoutineTask ? <>Next: {fs.nextRoutineTask} <ArrowRight size={16} /></> : "Done"}
      </Btn>
    </Modal>
  );
}
