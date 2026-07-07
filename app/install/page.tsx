"use client";
import Link from "next/link";
import { Share, PlusSquare, Smartphone, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { isStandalone, isIOS } from "@/lib/platform";

export default function Install() {
  const standalone = typeof window !== "undefined" && isStandalone();
  const ios = typeof window !== "undefined" && isIOS();
  return (
    <div className="max-w-md mx-auto px-5 py-12">
      <Link href="/today" className="text-sm text-accent font-medium">← Back to TimeSight</Link>
      <div className="flex items-center gap-3 mt-5 mb-2">
        <Smartphone size={26} className="text-accent" />
        <h1 className="text-3xl font-bold text-ink">Install TimeSight</h1>
      </div>
      <p className="text-muted mb-7">Put TimeSight on your Home Screen so starting a timer is one tap away.</p>

      {standalone ? (
        <Card className="p-5 flex items-center gap-3">
          <Check size={20} className="text-sage" />
          <p className="text-sm text-ink font-medium">You&apos;re already running TimeSight as an installed app. Nice.</p>
        </Card>
      ) : (
        <>
          <Card className="p-5 mb-4">
            <p className="font-bold text-ink mb-3">On iPhone (Safari)</p>
            <ol className="space-y-3 text-sm text-muted">
              <li className="flex gap-3"><span className="text-accent font-bold">1.</span> Open TimeSight in <b className="text-ink">Safari</b> (installing doesn&apos;t work from inside other apps&apos; browsers).</li>
              <li className="flex gap-3"><span className="text-accent font-bold">2.</span> Tap the <b className="text-ink">Share</b> button <Share size={14} className="inline text-accent" /> at the bottom of the screen.</li>
              <li className="flex gap-3"><span className="text-accent font-bold">3.</span> Scroll down and tap <b className="text-ink">Add to Home Screen</b> <PlusSquare size={14} className="inline text-accent" />.</li>
              <li className="flex gap-3"><span className="text-accent font-bold">4.</span> Tap <b className="text-ink">Add</b>. TimeSight opens full-screen like a native app.</li>
            </ol>
            {!ios && <p className="text-xs text-faint mt-4">Tip: these steps are for iPhone — on Android/desktop, use your browser&apos;s &quot;Install app&quot; option in the menu.</p>}
          </Card>
          <Card className="p-5">
            <p className="font-bold text-ink mb-2">Why install?</p>
            <ul className="text-sm text-muted space-y-1.5">
              <li>• One-tap access from your Home Screen</li>
              <li>• Full-screen, app-like experience</li>
              <li>• Your running timer survives app switches and refreshes</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
