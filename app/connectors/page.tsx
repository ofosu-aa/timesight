"use client";
import { useEffect, useState } from "react";
import { Plug, RefreshCw, CalendarPlus, Check, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Chip } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { providers, comingSoon } from "@/lib/connectors";
import { buildDayPlanIcs, downloadIcs } from "@/lib/ics";
import { parseCallbackHash, syncGoogleEvents, pushDayPlanToGoogle, GTokens } from "@/lib/connectors/google";
import { parseNotionCallbackHash, listNotionDatabases, syncNotionTasks } from "@/lib/connectors/notion";

export default function ConnectorsPage() { return <AppShell><Connectors /></AppShell>; }

function Connectors() {
  const app = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notionDbs, setNotionDbs] = useState<{ id: string; name: string }[] | null>(null);
  const data = app.data;

  /* Handle the OAuth callback fragment (#gcal=... / #gcal_error=...). */
  useEffect(() => {
    if (!data || typeof window === "undefined" || !window.location.hash) return;
    const hash = window.location.hash;
    const parsed = parseCallbackHash(hash);
    const nParsed = parseNotionCallbackHash(hash);
    if (!parsed && !nParsed) return;
    window.history.replaceState(null, "", window.location.pathname); // clear tokens from URL
    if (parsed) {
      if ("error" in parsed) {
        setNotes((n) => ({ ...n, "google-calendar": `Google connection failed: ${parsed.error}. Check that the redirect URI and env vars are configured (docs/CONNECTORS.md).` }));
      } else {
        app.setConnector({
          provider: "google-calendar", status: "connected",
          connectedAt: Date.now(), lastSyncAt: null,
          tokens: parsed.tokens, accountEmail: parsed.email,
        });
        app.flash("Google Calendar connected");
        void doGoogleSync(parsed.tokens);
      }
    }
    if (nParsed) {
      if ("error" in nParsed) {
        setNotes((n) => ({ ...n, notion: `Notion connection failed: ${nParsed.error}. Check redirect URI and env vars (docs/CONNECTORS.md).` }));
      } else {
        app.setConnector({
          provider: "notion", status: "connected",
          connectedAt: Date.now(), lastSyncAt: null,
          tokens: { accessToken: nParsed.accessToken, refreshToken: null, expiresAt: Number.MAX_SAFE_INTEGER },
          accountEmail: nParsed.workspaceName, config: null,
        });
        app.flash("Notion connected — now pick a database");
        void loadNotionDbs(nParsed.accessToken);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data ? 1 : 0]);

  if (!data) return null;
  const { connectors, tasks, sessions } = data;
  const stateOf = (id: string) => connectors.find((c) => c.provider === id);
  const gState = stateOf("google-calendar");
  const gConnected = gState?.status === "connected" && !!gState.tokens;

  async function doGoogleSync(tokens: GTokens) {
    setBusy("google-calendar");
    const result = await syncGoogleEvents(tokens);
    if ("error" in result) {
      setNotes((n) => ({ ...n, "google-calendar": result.error === "auth_expired" ? "Google session expired — hit Connect to re-link." : `Sync failed (${result.error}). Try reconnecting.` }));
    } else {
      app.addExternalItems(result.items);
      app.setConnector({
        provider: "google-calendar", status: "connected",
        connectedAt: stateOf("google-calendar")?.connectedAt ?? Date.now(),
        lastSyncAt: Date.now(), tokens: result.tokens,
        accountEmail: stateOf("google-calendar")?.accountEmail ?? null,
      });
    }
    setBusy(null);
  }

  async function doGooglePush(tokens: GTokens) {
    setBusy("google-calendar");
    const result = await pushDayPlanToGoogle(tokens, tasks, sessions);
    if ("error" in result) {
      setNotes((n) => ({ ...n, "google-calendar": "Push failed — session expired. Hit Connect to re-link." }));
    } else {
      app.setConnector({ ...stateOf("google-calendar")!, tokens: result.tokens });
      app.flash(result.created ? `${result.created} task${result.created === 1 ? "" : "s"} added to Google Calendar` : "No pending tasks to push");
      setNotes((n) => ({ ...n, "google-calendar": result.created ? "Check your Google Calendar — your day plan is there with realistic durations." : "Add some tasks for today first, then push." }));
    }
    setBusy(null);
  }

  async function loadNotionDbs(token: string) {
    setBusy("notion");
    try { setNotionDbs(await listNotionDatabases(token)); }
    catch { setNotes((n) => ({ ...n, notion: "Couldn't list your databases. Make sure you granted access to at least one database when connecting." })); }
    setBusy(null);
  }

  async function doNotionSync(token: string, databaseId: string) {
    setBusy("notion");
    try {
      const items = await syncNotionTasks(token, databaseId);
      app.addExternalItems(items);
      const st = stateOf("notion")!;
      app.setConnector({ ...st, lastSyncAt: Date.now() });
      setNotes((n) => ({ ...n, notion: items.length ? "" : "Connected — no open tasks found in that database." }));
    } catch {
      setNotes((n) => ({ ...n, notion: "Sync failed — try reconnecting." }));
    }
    setBusy(null);
  }

  const connect = async (id: string) => {
    const p = providers.find((x) => x.id === id)!;
    setBusy(id);
    const res = await p.connect();
    if (id === "google-calendar" || id === "notion") return; // redirecting to OAuth now
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
    if (id === "google-calendar" && gState?.tokens) return doGoogleSync(gState.tokens);
    if (id === "notion") {
      const st = stateOf("notion");
      if (st?.tokens && st.config?.databaseId) return doNotionSync(st.tokens.accessToken, st.config.databaseId);
      if (st?.tokens) return loadNotionDbs(st.tokens.accessToken);
      return;
    }
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
          const connected = p.id === "google-calendar" ? gConnected : st?.status === "connected" && (p.id !== "notion" || !!st?.tokens);
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
                  {p.id === "google-calendar" && gState?.accountEmail && connected && (
                    <p className="text-xs text-faint mt-1">{gState.accountEmail}</p>
                  )}
                  {p.id === "notion" && connected && (
                    <div className="mt-1">
                      {st?.accountEmail && <p className="text-xs text-faint">{st.accountEmail}</p>}
                      {st?.config?.databaseId ? (
                        <p className="text-xs text-faint mt-0.5">Database: {st.config.databaseName || st.config.databaseId}</p>
                      ) : (
                        <div className="mt-2">
                          {notionDbs === null ? (
                            <Btn small variant="subtle" disabled={busy === "notion"} onClick={() => st?.tokens && loadNotionDbs(st.tokens.accessToken)}>Choose database…</Btn>
                          ) : notionDbs.length === 0 ? (
                            <p className="text-xs text-amber">No databases shared with TimeSight. Reconnect and select one on Notion&apos;s screen.</p>
                          ) : (
                            <select className="rounded-xl px-3 py-2 text-sm bg-raised border border-line text-ink outline-none max-w-full"
                              defaultValue=""
                              onChange={(e) => {
                                const db = notionDbs.find((d) => d.id === e.target.value);
                                if (!db || !st) return;
                                app.setConnector({ ...st, config: { databaseId: db.id, databaseName: db.name } });
                                if (st.tokens) void doNotionSync(st.tokens.accessToken, db.id);
                              }}>
                              <option value="" disabled>Pick a database to sync…</option>
                              {notionDbs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                      {p.id === "google-calendar" && gState?.tokens && (
                        <Btn small disabled={busy === p.id} onClick={() => doGooglePush(gState.tokens!)}><Upload size={13} /> Push day plan</Btn>
                      )}
                      <Btn small variant="ghost" onClick={async () => {
                        await p.disconnect();
                        app.setConnector({ provider: p.id, status: "disconnected", connectedAt: null, lastSyncAt: null, tokens: null, accountEmail: null });
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
