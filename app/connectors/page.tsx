"use client";
import { useState } from "react";
import { Plug, RefreshCw, CalendarPlus, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Chip } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { providers, comingSoon } from "@/lib/connectors";
import { buildDayPlanIcs, downloadIcs } from "@/lib/ics";

export default function ConnectorsPage() { return <AppShell><Connectors /></AppShell>; }

function Connectors() {
  const app = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!app.data) return null;
  const { connectors, tasks, sessions } = app.data;
  const stateOf = (id: string) => connectors.find((c) => c.provider === id);

  const connect = async (id: string) => {
    const p = providers.find((x) => x.id === id)!;
    setBusy(id);
    const res = await p.connect();
    setNotes((n) => ({ ...n, [id]: res.message }));
    if (res.ok) {
      app.setConnector({ provider: id, status: "connected", connectedAt: Date.now(), lastSyncAt: null });
      const items = await p.sync();
      if (items.length) {
        app.addExternalItems(items);
        app.setConnector({ provider: id, status: "connected", connectedAt: Date.now(), lastSyncAt: Date.now() });
      }
    } else {
      app.setConnector({ provider: id, status: "needs_setup", connectedAt: null, lastSyncAt: null });
    }
    setBusy(null);
  };

  const syncNow = async (id: string) => {
    const p = providers.find((x) => x.id === id)!;
    setBusy(id);
    const items = await p.sync();
    app.addExternalItems(items);
    app.setConnector({ provider: id, status: "connected", connectedAt: stateOf(id)?.connectedAt ?? Date.now(), lastSyncAt: Date.now() });
    setBusy(null);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1 text-ink">Connectors</h1>
      <p className="text-muted mb-6">Bring your calendar and tasks into TimeSight — and check them against reality.</p>

      <div className="space-y-3">
        {providers.map((p) => {
          const st = stateOf(p.id);
          const connected = st?.status === "connected";
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-ink">{p.name}</p>
                    {connected && <Chip tone="good"><Check size={11} className="inline mr-0.5" />Connected</Chip>}
                    {p.availability === "needs_oauth" && !connected && <Chip tone="warn">Needs OAuth setup</Chip>}
                    {p.availability === "fallback" && <Chip tone="accent">.ics export</Chip>}
                    {p.availability === "ready" && !connected && <Chip>Ready</Chip>}
                  </div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{p.description}</p>
                  {st?.lastSyncAt && <p className="text-xs text-faint mt-1.5">Last synced {new Date(st.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}
                  {notes[p.id] && <p className="text-xs text-amber mt-1.5 leading-relaxed">{notes[p.id]}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {p.id === "apple-calendar" ? (
                    <Btn small variant="subtle" onClick={() => downloadIcs("timesight-day-plan.ics", buildDayPlanIcs(tasks, sessions))}>
                      <CalendarPlus size={14} /> Export day plan
                    </Btn>
                  ) : connected ? (
                    <>
                      <Btn small variant="subtle" disabled={busy === p.id} onClick={() => syncNow(p.id)}><RefreshCw size={13} /> Sync now</Btn>
                      <Btn small variant="ghost" onClick={async () => {
                        await p.disconnect();
                        app.setConnector({ provider: p.id, status: "disconnected", connectedAt: null, lastSyncAt: null });
                      }}>Disconnect</Btn>
                    </>
                  ) : (
                    <Btn small disabled={busy === p.id} onClick={() => connect(p.id)}><Plug size={14} /> Connect</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        <p className="text-xs font-semibold uppercase tracking-wider pt-3 text-faint">Coming soon</p>
        {comingSoon.map((p) => (
          <Card key={p.id} className="p-5 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-ink">{p.name}</p>
                <p className="text-sm text-muted">{p.description}</p>
              </div>
              <Chip>Coming soon</Chip>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
