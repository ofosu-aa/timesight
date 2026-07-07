import Link from "next/link";

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link href="/settings" className="text-sm text-accent font-medium">← Back</Link>
      <h1 className="text-3xl font-bold text-ink mt-4 mb-6">Privacy</h1>
      <div className="space-y-4 text-sm text-muted leading-relaxed">
        <p className="text-ink font-medium">Your time data is yours.</p>
        <p>TimeSight stores what you give it: task names, estimates, actual durations, routines, and settings. Signed-in accounts store this in your own protected Firestore space, scoped to your user ID and locked down by security rules — no other user or public request can read it. Guest data never leaves your device.</p>
        <p>We do not sell your data. We do not run advertising. There is no third-party analytics in this build; if analytics is ever added, it will be opt-in.</p>
        <p>Connector credentials (Google Calendar, Notion) are handled server-side only. OAuth secrets are never present in the app you download to your browser.</p>
        <p>You can export all of your data as JSON at any time from Settings, clear your data, or delete your account entirely. Deletion removes your data from Firestore.</p>
        <p>TimeSight is productivity and time-awareness software. It is not a medical device, does not diagnose or treat any condition, and does not make medical claims.</p>
      </div>
    </div>
  );
}
