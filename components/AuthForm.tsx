"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Btn, Card, Field, inputCls } from "./ui";

export function AuthScaffold({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent to-accent2">
        <Clock size={22} className="text-bg" strokeWidth={2.5} />
      </div>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-muted mt-1 mb-7 text-center max-w-xs">{subtitle}</p>
      <Card className="w-full max-w-sm p-6">{children}</Card>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup, loginWithGoogle, continueAsGuest, firebaseAvailable } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      if (mode === "signup") await signup(email, password, name);
      else await login(email, password);
      router.replace("/today");
    } catch (e: unknown) {
      setError(friendly(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!firebaseAvailable && (
        <p className="text-sm rounded-xl border border-amber/30 bg-amber/5 text-amber px-3.5 py-2.5">
          Accounts aren&apos;t configured on this deployment yet (Firebase env vars missing). You can continue as a guest — your data stays on this device.
        </p>
      )}
      {mode === "signup" && (
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your name" /></Field>
      )}
      <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" /></Field>
      <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" /></Field>
      {error && <p className="text-sm text-rose">{error}</p>}
      <Btn className="w-full" onClick={submit} disabled={busy || !email || !password || !firebaseAvailable}>
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </Btn>
      {firebaseAvailable && (
        <Btn variant="subtle" className="w-full" onClick={async () => {
          try { await loginWithGoogle(); router.replace("/today"); } catch (e) { setError(friendly(e)); }
        }}>Continue with Google</Btn>
      )}
      <Btn variant="ghost" className="w-full" onClick={() => { continueAsGuest(); router.replace("/today"); }}>
        Continue as guest
      </Btn>
      <div className="text-sm text-muted text-center space-y-1.5 pt-1">
        {mode === "login" ? (
          <>
            <p><Link className="text-accent font-medium" href="/forgot-password">Forgot password?</Link></p>
            <p>New here? <Link className="text-accent font-medium" href="/signup">Create an account</Link></p>
          </>
        ) : (
          <p>Already have an account? <Link className="text-accent font-medium" href="/login">Sign in</Link></p>
        )}
      </div>
    </div>
  );
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) return "That email and password don't match. Try again or reset your password.";
  if (msg.includes("auth/email-already-in-use")) return "An account with this email already exists. Try signing in.";
  if (msg.includes("auth/weak-password")) return "Passwords need at least 6 characters.";
  if (msg.includes("auth/invalid-email")) return "That email address doesn't look right.";
  return msg.replace(/^Firebase: /, "");
}
