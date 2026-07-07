"use client";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Btn, EmptyState, Stat } from "@/components/ui";
import { InsightCard } from "@/components/InsightCard";
import { useApp } from "@/lib/app-data";
import { buildInsights, weeklyReview } from "@/lib/insights";
import { fmtMin } from "@/lib/time";

export default function InsightsPage() { return <AppShell><Insights /></AppShell>; }

function Insights() {
  const app = useApp();
  if (!app.data) return null;
  const { sessions } = app.data;
  const insights = buildInsights(sessions);
  const review = weeklyReview(sessions);
  const totalFocus = sessions.reduce((a, s) => a + s.actualMinutes, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1 text-ink">Insights</h1>
      <p className="text-muted mb-6">What your time has taught TimeSight so far.</p>

      {sessions.length === 0 ? (
        <Card><EmptyState icon={Sparkles} title="No data yet"
          body="Insights appear once you've timed a few tasks. Every completed timer teaches TimeSight something about your real pace."
          action={<Btn small variant="subtle" onClick={app.loadDemo}>Load demo data to preview</Btn>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Card className="p-4"><Stat label="Tasks timed" value={sessions.length} /></Card>
            <Card className="p-4"><Stat label="Total time tracked" value={fmtMin(totalFocus)} accent /></Card>
          </div>

          <div className="space-y-3 mb-7">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-faint">Weekly review</p>
          <Card className="p-5">
            {review.count === 0 ? (
              <p className="text-sm text-muted">No timed tasks yet this week. One timed task is enough to start next week&apos;s review.</p>
            ) : (
              <div className="space-y-2.5 text-sm leading-relaxed">
                <p className="text-ink">This week you completed <b>{review.count}</b> timed {review.count === 1 ? "task" : "tasks"} and tracked <b className="text-accent">{fmtMin(review.focus)}</b> of real focus time.</p>
                {review.accuracy != null && (
                  <p className="text-muted">Estimate accuracy: <b className="text-ink">{review.accuracy}%</b>
                    {review.prevAccuracy != null && review.accuracy !== review.prevAccuracy && (
                      review.accuracy > review.prevAccuracy
                        ? <span className="text-sage"> — up from {review.prevAccuracy}% last week.</span>
                        : <span> (was {review.prevAccuracy}% last week — normal fluctuation, not failure).</span>
                    )}
                  </p>
                )}
                {review.biggestMiss && review.biggestMiss.avgErr > 2 && (
                  <p className="text-muted">Biggest mismatch: <b className="text-ink">&quot;{review.biggestMiss.displayTitle}&quot;</b> ran {fmtMin(review.biggestMiss.avgErr)} over estimate on average. Try planning it at {fmtMin(review.biggestMiss.mean)} next week.</p>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
