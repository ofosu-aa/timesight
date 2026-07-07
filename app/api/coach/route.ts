import { NextResponse } from "next/server";

/* Optional LLM layer for the coach.
   The app NEVER depends on this route — lib/coach.ts falls back to the
   rule-based provider on any failure. Configure LLM_API_KEY (server-side
   only) and implement the fetch below to enable it. */
export async function POST(req: Request) {
  const key = process.env.LLM_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 501 });
  }
  const { question } = await req.json();
  // TODO: call your LLM provider here with `question` + a summary of user stats,
  // using non-shaming ADHD-aware system instructions. Return { answer: string }.
  return NextResponse.json({ error: "LLM call not implemented", question }, { status: 501 });
}
