"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Copy, RefreshCw, ThumbsUp, Trash2, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, Chip, EmptyState, inputCls } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { useAuth } from "@/lib/auth-context";
import { fmtMin } from "@/lib/time";
import {
  FriendProfile, SharedPost, computeWeeklyStats, fetchFriendProfiles, fetchFeed,
  lookupByFriendCode, toggleKudos, deletePost,
} from "@/lib/social";

export default function FriendsPage() { return <AppShell><Friends /></AppShell>; }

function Friends() {
  const app = useApp();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);
  const [feed, setFeed] = useState<SharedPost[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const data = app.data;
  const sharing = data?.settings.sharingEnabled;

  const refresh = useCallback(async () => {
    if (!data || !user || !sharing) return;
    const uids = data.friends.map((f) => f.uid);
    const [ps, fd] = await Promise.all([fetchFriendProfiles(uids), fetchFeed(uids, user.uid)]);
    setProfiles(ps); setFeed(fd);
  }, [data?.friends.length, user?.uid, sharing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void refresh(); }, [refresh]);

  if (!data || !user) return null;

  if (user.isGuest) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6 text-ink">Friends</h1>
        <Card><EmptyState icon={Users} title="Friends need an account"
          body="Guest data lives only on this device. Create a free account to share progress with friends."
          action={<Link href="/signup"><Btn small>Create account</Btn></Link>} /></Card>
      </div>
    );
  }

  if (!sharing) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2 text-ink">Friends</h1>
        <p className="text-muted mb-6">Progress is better with witnesses.</p>
        <Card className="p-6">
          <p className="font-bold text-lg text-ink mb-2">Share your consistency, not your tasks</p>
          <p className="text-sm text-muted leading-relaxed mb-2">
            Friends see your weekly rhythm — tasks timed, focus time, accuracy, streak. Never your task list. Individual tasks are shared only when you choose, and you can edit what they say first.
          </p>
          <p className="text-sm text-muted leading-relaxed mb-5">Everything is off until you turn it on, and you can switch it off (and erase what you shared) anytime in Settings.</p>
          <Btn onClick={() => { app.enableSharing(); }} className="w-full">Turn on sharing</Btn>
        </Card>
      </div>
    );
  }

  const myStats = computeWeeklyStats(data.sessions);
  const addFriend = async () => {
    if (!code.trim()) return;
    setBusy(true); setNote("");
    const found = await lookupByFriendCode(code);
    if (!found) setNote("No sharing profile found for that code. Double-check it — and make sure your friend has sharing turned on.");
    else if (found.uid === user.uid) setNote("That's your own code.");
    else if (data.friends.some((f) => f.uid === found.uid)) setNote(`${found.name} is already in your friends.`);
    else {
      app.addFriend({ uid: found.uid, name: found.name, addedAt: Date.now() });
      setNote(`Added ${found.name}. Give them your code so they can follow you back.`);
      setCode("");
    }
    setBusy(false);
    void refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-ink">Friends</h1>
        <Btn small variant="ghost" onClick={() => void refresh()}><RefreshCw size={14} /> Refresh</Btn>
      </div>

      <Card className="p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-faint">Your friend code</p>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-2xl font-bold tabular-nums text-accent">{data.settings.shareCode || "—"}</p>
          <Btn small variant="subtle" onClick={() => { navigator.clipboard?.writeText(data.settings.shareCode || ""); app.flash("Code copied"); }}><Copy size={13} /> Copy</Btn>
        </div>
        <p className="text-xs text-faint mt-2">Anyone with this code can follow your shared stats. Regenerate it in Settings to cut off new adds.</p>
      </Card>

      <Card className="p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">Add a friend</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TS-XXXXX" className={`${inputCls} uppercase`} />
          <Btn onClick={addFriend} disabled={busy || !code.trim()}>Add</Btn>
        </div>
        {note && <p className="text-xs text-amber mt-2">{note}</p>}
      </Card>

      <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">This week</p>
      <div className="space-y-2.5 mb-6">
        <WeekCard name={`${data.settings.shareName || "You"} (you)`} stats={myStats} highlight />
        {profiles.map((p) => <WeekCard key={p.uid} name={p.name} stats={p.stats} />)}
        {profiles.length === 0 && data.friends.length === 0 && (
          <Card className="p-4"><p className="text-sm text-muted">No friends yet. Swap codes with someone who gets it.</p></Card>
        )}
      </div>

      {feed.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-faint">Shared tasks</p>
          <div className="space-y-2.5">
            {feed.map((post) => (
              <Card key={post.ownerUid + post.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-faint">{post.ownerUid === user.uid ? "You" : post.ownerName} · {new Date(post.at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    <p className="font-semibold text-ink mt-0.5">{post.title}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <Chip>{fmtMin(post.minutes)} focused</Chip>
                      {post.onEstimate && <Chip tone="good">on estimate</Chip>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        const next = await toggleKudos(post.ownerUid, post.id, user.uid, post.kudos || []);
                        setFeed((f) => f.map((x) => x.id === post.id && x.ownerUid === post.ownerUid ? { ...x, kudos: next } : x));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${(post.kudos || []).includes(user.uid) ? "border-accent text-accent bg-accent/10" : "border-line text-muted"}`}>
                      <ThumbsUp size={14} /> {(post.kudos || []).length || ""}
                    </button>
                    {post.ownerUid === user.uid && (
                      <button className="p-1.5 text-faint" title="Delete post"
                        onClick={async () => { await deletePost(user.uid, post.id); setFeed((f) => f.filter((x) => !(x.id === post.id && x.ownerUid === user.uid))); }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WeekCard({ name, stats, highlight }: { name: string; stats: import("@/lib/social").WeeklyStats; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "!border-accent/40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink truncate">{name}</p>
        {stats.streakDays > 1 && <Chip tone="warn"><Flame size={11} className="inline mr-0.5" />{stats.streakDays}-day streak</Chip>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Chip tone={stats.activeDays > 0 ? "good" : "default"}>{stats.activeDays > 0 ? `showed up ${stats.activeDays} ${stats.activeDays === 1 ? "day" : "days"}` : "quiet week so far"}</Chip>
        {stats.tasksTimed > 0 && <Chip>{stats.tasksTimed} timed</Chip>}
        {stats.focusMinutes > 0 && <Chip tone="accent">{fmtMin(stats.focusMinutes)} focus</Chip>}
        {stats.accuracy != null && <Chip>{stats.accuracy}% accuracy</Chip>}
      </div>
    </Card>
  );
}
