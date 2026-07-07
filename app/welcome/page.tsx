"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Sparkles, TimerIcon, Repeat } from "lucide-react";
import { Btn, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function Welcome() {
  const { continueAsGuest } = useAuth();
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5 bg-gradient-to-br from-accent to-accent2">
        <Clock size={30} className="text-bg" strokeWidth={2.5} />
      </div>
      <h1 className="text-4xl font-bold text-ink">TimeSight</h1>
      <p className="text-lg text-muted mt-2 max-w-sm">See where your time actually goes.</p>
      <p className="text-sm text-faint mt-1 max-w-sm">TimeSight learns how long your life actually takes, then helps you plan around reality.</p>

      <div className="grid gap-3 w-full max-w-sm mt-9 text-left">
        {[
          { icon: TimerIcon, t: "Time real tasks", b: "Estimate, start the timer, and see the truth — kindly." },
          { icon: Sparkles, t: "Predictions that learn", b: "\u201CYou usually take 24 minutes for this\u201D — with confidence scores." },
          { icon: Repeat, t: "Routines that know themselves", b: "Your morning routine, measured — not guessed." },
        ].map((f) => (
          <Card key={f.t} className="p-4 flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-raised flex items-center justify-center shrink-0"><f.icon size={18} className="text-accent" /></div>
            <div><p className="font-semibold text-ink text-sm">{f.t}</p><p className="text-sm text-muted">{f.b}</p></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-2.5 w-full max-w-sm mt-9">
        <Link href="/signup"><Btn className="w-full">Create account</Btn></Link>
        <Link href="/login"><Btn variant="subtle" className="w-full">Sign in</Btn></Link>
        <Btn variant="ghost" onClick={() => { continueAsGuest(); router.push("/today"); }}>Try as guest</Btn>
      </div>
      <p className="text-xs text-faint mt-6 max-w-xs">TimeSight is not here to judge your time. It is here to help you see it.</p>
    </div>
  );
}
