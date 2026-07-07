"use client";
import { Sparkles } from "lucide-react";
import { Prediction } from "@/lib/types";
import { fmtMin } from "@/lib/time";

export function PredictionBadge({ pred, onUse }: { pred: Prediction | null; onUse?: () => void }) {
  if (!pred) return null;
  return (
    <div className="mt-2 rounded-xl px-3.5 py-2.5 text-sm flex items-start gap-2.5 border border-accent/25 bg-accent/5">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex-1">
        <span className="text-ink">You usually take <b>{fmtMin(pred.predictedMinutes)}</b> for this.</span>{" "}
        <span className="text-muted">{pred.label} · {pred.sampleSize} {pred.sampleSize === 1 ? "completion" : "completions"}.</span>
        {onUse && (
          <button onClick={onUse} className="block mt-1 text-sm font-semibold text-accent">
            Use {fmtMin(pred.predictedMinutes)} instead
          </button>
        )}
      </div>
    </div>
  );
}
