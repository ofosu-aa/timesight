import Link from "next/link";

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link href="/settings" className="text-sm text-accent font-medium">← Back</Link>
      <h1 className="text-3xl font-bold text-ink mt-4 mb-6">Terms of Use</h1>
      <div className="space-y-4 text-sm text-muted leading-relaxed">
        <p>TimeSight is provided as-is, without warranty of any kind. It is a personal productivity tool: predictions and insights are estimates derived from your own history, not guarantees.</p>
        <p>You are responsible for the content you store. Don&apos;t use TimeSight for anything unlawful.</p>
        <p>TimeSight is not medical software and is not a substitute for professional advice, diagnosis, or treatment.</p>
        <p>These terms are a placeholder for V1 and will be replaced by full terms before public launch.</p>
      </div>
    </div>
  );
}
