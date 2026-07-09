"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, CalendarPlus, Bell, LogOut, Trash2, Plug, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Field, inputCls, Modal } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { useAuth } from "@/lib/auth-context";
import { CoachTone, PlanningStyle } from "@/lib/types";
import { requestNotificationPermission, notificationsSupported } from "@/lib/notifications";
import { buildDayPlanIcs, downloadIcs, downloadJson } from "@/lib/ics";

const TONES: CoachTone[] = ["gentle", "direct", "structured", "minimal"];
const STYLES: PlanningStyle[] = ["flexible", "time-blocked", "routine-based", "low-pressure"];

export default function SettingsPage() { return <AppShell><SettingsView /></AppShell>; }

function SettingsView() {
  const app = useApp();
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  if (!app.data || !user) return null;
  const s = app.data.settings;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-ink">Settings</h1>

      <Section title="Profile">
        <p className="text-sm text-ink font-medium">{user.displayName || "You"}</p>
        <p className="text-sm text-muted">{user.isGuest ? "Guest — data is stored on this device only. Create an account to sync." : user.email}</p>
        {user.isGuest && <Link href="/signup"><Btn small variant="subtle" className="mt-3">Create account &amp; keep my data</Btn></Link>}
      </Section>

      <Section title="Coach tone">
        <div className="grid grid-cols-2 gap-2">
          {TONES.map((t) => (
            <button key={t} onClick={() => app.updateSettings({ coachTone: t })}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium capitalize ${s.coachTone === t ? "border-accent bg-raised text-accent" : "border-line text-ink"}`}>{t}</button>
          ))}
        </div>
      </Section>

      <Section title="Planning style">
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((t) => (
            <button key={t} onClick={() => app.updateSettings({ planningStyle: t })}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium capitalize ${s.planningStyle === t ? "border-accent bg-raised text-accent" : "border-line text-ink"}`}>{t.replace("-", " ")}</button>
          ))}
        </div>
      </Section>

      <Section title="Defaults">
        <Field label="Default timer estimate (minutes)">
          <input value={s.defaultTimerMinutes} onChange={(e) => app.updateSettings({ defaultTimerMinutes: +e.target.value.replace(/\D/g, "") || 15 })}
            inputMode="numeric" className={`${inputCls} !w-28 text-center tabular-nums`} />
        </Field>
      </Section>

      <Section title="Notifications">
        <p className="text-sm text-muted mb-3">Gentle reminders only — like when your estimate is up. Never spam.</p>
        <p className="text-xs text-faint mb-3 leading-relaxed">On iPhone: install TimeSight to your Home Screen first (Settings → Install on iPhone), then enable here. Requires iOS 16.4+. Notifications fire while the app is open or in the background with a timer running.</p>
        <div className="flex items-center gap-3">
          <Btn small variant={s.notificationsEnabled ? "good" : "subtle"} onClick={async () => {
            if (s.notificationsEnabled) { app.updateSettings({ notificationsEnabled: false }); return; }
            const ok = await requestNotificationPermission();
            app.updateSettings({ notificationsEnabled: ok });
            if (!ok) app.flash("Notifications blocked by the browser — check site permissions");
          }}>
            <Bell size={14} /> {s.notificationsEnabled ? "Enabled" : "Enable notifications"}
          </Btn>
          {!notificationsSupported() && <p className="text-xs text-faint">Not supported in this browser.</p>}
        </div>
      </Section>

      <Section title="Data">
        <div className="flex flex-wrap gap-2">
          <Btn small variant="subtle" onClick={() => downloadJson("timesight-export.json", app.data)}><Download size={14} /> Export data (JSON)</Btn>
          <Btn small variant="subtle" onClick={() => downloadIcs("timesight-day-plan.ics", buildDayPlanIcs(app.data!.tasks, app.data!.sessions))}><CalendarPlus size={14} /> Export day plan (.ics)</Btn>
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {app.hasDemo && <Btn small variant="ghost" onClick={app.clearDemo}>Clear demo data</Btn>}
          <Btn small variant="danger" onClick={() => setConfirm("clear")}><Trash2 size={14} /> Clear all data</Btn>
        </div>
      </Section>

      <Section title="More">
        <div className="grid gap-1.5 text-sm">
          <Link className="text-accent font-medium flex items-center gap-2" href="/connectors"><Plug size={14} /> Connected accounts</Link>
          <Link className="text-accent font-medium flex items-center gap-2" href="/install"><Smartphone size={14} /> Install on iPhone</Link>
          <Link className="text-muted" href="/privacy">Privacy policy</Link>
          <Link className="text-muted" href="/terms">Terms</Link>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex flex-wrap gap-2">
          <Btn small variant="subtle" onClick={async () => { await logout(); router.replace("/welcome"); }}><LogOut size={14} /> Sign out</Btn>
          <Btn small variant="danger" onClick={() => setConfirm("delete")}>Delete account</Btn>
        </div>
      </Section>

      <p className="text-xs text-faint leading-relaxed mt-2">
        TimeSight is productivity and time-awareness software. It is not medical software and is not a treatment for ADHD or any condition.
      </p>

      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <p className="text-xl font-bold text-ink mb-2">{confirm === "clear" ? "Clear all data?" : "Delete account?"}</p>
          <p className="text-sm text-muted mb-5">
            {confirm === "clear"
              ? "This removes all tasks, sessions, routines, and history. Your account stays. This can't be undone."
              : "This permanently deletes your account and all data. This can't be undone."}
          </p>
          <div className="grid gap-2.5">
            <Btn variant="danger" onClick={async () => {
              if (confirm === "clear") { app.clearAllData(); setConfirm(null); }
              else {
                try { await deleteAccount(); router.replace("/welcome"); }
                catch { app.flash("Recent sign-in required — sign out, sign back in, then delete."); setConfirm(null); }
              }
            }}>{confirm === "clear" ? "Yes, clear everything" : "Yes, delete my account"}</Btn>
            <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-faint">{title}</p>
      {children}
    </Card>
  );
}
