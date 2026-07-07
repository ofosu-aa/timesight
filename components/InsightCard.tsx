"use client";
import { TrendingUp, AlertCircle, Info } from "lucide-react";
import { Insight } from "@/lib/types";
import { Card } from "./ui";

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = insight.severity === "good" ? TrendingUp : insight.severity === "warn" ? AlertCircle : Info;
  const color = insight.severity === "good" ? "text-sage" : insight.severity === "warn" ? "text-amber" : "text-accent";
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center shrink-0">
          <Icon size={17} className={color} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-ink">{insight.title}</p>
          <p className="text-sm text-muted mt-0.5 leading-relaxed">{insight.body}</p>
          {insight.suggestedAction && <p className={`text-sm mt-1.5 font-medium ${color}`}>{insight.suggestedAction}</p>}
        </div>
      </div>
    </Card>
  );
}
