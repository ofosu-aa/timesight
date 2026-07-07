"use client";
import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, inputCls } from "@/components/ui";
import { useApp } from "@/lib/app-data";
import { ruleBasedCoachProvider } from "@/lib/coach";

const CHIPS = [
  "What should I do next?",
  "Why am I running late?",
  "How realistic is my day?",
  "What am I underestimating?",
  "How long will my routine actually take?",
  "Help me recover after getting distracted",
  "What did I learn this week?",
];

interface Msg { role: "user" | "coach"; text: string; }

export default function CoachPage() { return <AppShell><Coach /></AppShell>; }

function Coach() {
  const app = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  if (!app.data) return null;

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    const answer = await ruleBasedCoachProvider.answer(q, app.data!);
    setMessages((m) => [...m, { role: "coach", text: answer }]);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 160px)" }}>
      <h1 className="text-3xl font-bold mb-1 text-ink">Coach</h1>
      <p className="text-muted mb-5">Grounded in your actual time data — not generic advice.</p>

      <div className="flex-1 space-y-3 mb-4">
        {messages.length === 0 && (
          <Card className="p-5">
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center shrink-0"><MessageCircle size={17} className="text-accent" /></div>
              <p className="text-sm text-muted leading-relaxed">
                I use your real history to answer planning questions. You&apos;re not behind — sometimes the plan is just too compressed. Ask me anything below, or tap a question to start.
              </p>
            </div>
          </Card>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-gradient-to-br from-accent to-accent2 text-bg font-medium" : "bg-surface border border-line text-ink"}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => ask(c)} className="px-3 py-1.5 rounded-full text-xs font-medium border border-line text-muted">{c}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder="Ask your coach…" className={inputCls} />
        <button onClick={() => ask(input)} className="px-4 rounded-xl bg-gradient-to-br from-accent to-accent2 text-bg"><Send size={18} /></button>
      </div>
    </div>
  );
}
