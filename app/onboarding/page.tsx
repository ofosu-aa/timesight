"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Play } from "lucide-react";
import { Btn, Card, Field, inputCls } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { useAuth } from "@/lib/auth-context";
import { PlanningStyle, CoachTone, Task } from "@/lib/types";
import { LoadingState } from "@/components/ui";

const STRUGGLES = ["I'm always late", "I underestimate tasks", "I overplan my day", "I struggle to start", "I lose track of time"];
const STYLES: { id: PlanningStyle; label: string }[] = [
  { id: "flexible", label: "Flexible" }, { id: "time-blocked", label: "Time-blocked" },
  { id: "routine-based", label: "Routine-based" }, { id: "low-pressure", label: "Low-pressure" },
];
const TONES: { id: CoachTone; label: string }[] = [
  { id: "gentle", label: "Gentle" }, { id: "direct", label: "Direct" },
  { id: "structured", label: "Structured" }, { id: "minimal", label: "Minimal" },
];

export default function Onboarding() {
  const { user, loading } = useAuth();
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [struggle, setStruggle] = useState("");
  const [style, setStyle] = useState<PlanningStyle>("flexible");
  const [tone, setTone] = useState<CoachTone>("gentle");
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState("");
  const [firstTask, setFirstTask] = useState<Task | null>(null);

  if (loading || !user || !app.data) return <LoadingState label="Loading…" />;

  const finish = (startNow: boolean) => {
    app.updateSettings({ mainStruggle: struggle, planningStyle: style, coachTone: tone, onboardingCompleted: true });
    if (startNow && firstTask) { app.startTask(firstTask); router.replace("/timer"); }
    else router.replace("/today");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent to-accent2">
            <Clock size={17} className="text-bg" strokeWidth={2.5} />
          </div>
          <p className="font-bold text-ink">TimeSight</p>
        </div>
        <div className="flex gap-1.5 mb-8 justify-center">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? "w-8 bg-accent" : "w-4 bg-raised"}`} />)}
        </div>

        {step === 0 && (
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-ink mb-2">Welcome to TimeSight</h1>
            <p className="text-muted leading-relaxed mb-2">We learn how long your tasks <i>actually</i> take, then help you plan around reality.</p>
            <p className="text-sm text-faint mb-6">You do not need better willpower. You need better feedback.</p>
            <Btn className="w-full" onClick={() => setStep(1)}>Let&apos;s go</Btn>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-ink mb-1">What&apos;s your main struggle?</h2>
            <p className="text-sm text-muted mb-4">This tunes what TimeSight highlights first.</p>
            <div className="grid gap-2 mb-5">
              {STRUGGLES.map((s) => (
                <button key={s} onClick={() => setStruggle(s)}
                  className={`text-left px-4 py-3 rounded-xl border text-[15px] font-medium ${struggle === s ? "border-accent bg-raised text-accent" : "border-line text-ink"}`}>{s}</button>
              ))}
            </div>
            <Btn className="w-full" disabled={!struggle} onClick={() => setStep(2)}>Continue</Btn>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-ink mb-4">How do you like to be coached?</h2>
            <p className="text-xs uppercase tracking-wider text-faint mb-2 font-medium">Planning style</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {STYLES.map((s) => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium ${style === s.id ? "border-accent bg-raised text-accent" : "border-line text-ink"}`}>{s.label}</button>
              ))}
            </div>
            <p className="text-xs uppercase tracking-wider text-faint mb-2 font-medium">Coach tone</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {TONES.map((s) => (
                <button key={s.id} onClick={() => setTone(s.id)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium ${tone === s.id ? "border-accent bg-raised text-accent" : "border-line text-ink"}`}>{s.label}</button>
              ))}
            </div>
            <Btn className="w-full" onClick={() => setStep(3)}>Continue</Btn>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-ink mb-1">Create your first timed task</h2>
            <p className="text-sm text-muted mb-4">Your first estimate does not need to be accurate. That is the point.</p>
            <div className="space-y-3.5 mb-5">
              <Field label="Something you'll do today">
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shower, Emails, Tidy desk" className={inputCls} />
              </Field>
              <Field label="Your best guess (minutes)">
                <input value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="15" className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
            <div className="grid gap-2.5">
              <Btn disabled={!title.trim()} onClick={() => {
                const t = app.addTask({ title, estimatedMinutes: +mins || 15 });
                setFirstTask(t);
                app.startTask(t);
                app.updateSettings({ mainStruggle: struggle, planningStyle: style, coachTone: tone, onboardingCompleted: true });
                router.replace("/timer");
              }}><Play size={16} /> Start timing it now</Btn>
              <Btn variant="subtle" disabled={!title.trim()} onClick={() => {
                app.addTask({ title, estimatedMinutes: +mins || 15 });
                finish(false);
              }}>Save for later</Btn>
              <Btn variant="ghost" onClick={() => finish(false)}>Skip for now</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
