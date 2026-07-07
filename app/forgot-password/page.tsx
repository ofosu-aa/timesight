"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthScaffold } from "@/components/AuthForm";
import { Btn, Field, inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPassword() {
  const { resetPassword, firebaseAvailable } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  return (
    <AuthScaffold title="Reset your password" subtitle="We'll email you a reset link.">
      {state === "sent" ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-sage">Reset link sent. Check your inbox (and spam folder).</p>
          <Link className="text-accent text-sm font-medium" href="/login">Back to sign in</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" /></Field>
          {error && <p className="text-sm text-rose">{error}</p>}
          <Btn className="w-full" disabled={!email || !firebaseAvailable} onClick={async () => {
            try { await resetPassword(email); setState("sent"); }
            catch (e) { setError(e instanceof Error ? e.message.replace(/^Firebase: /, "") : "Something went wrong."); }
          }}>Send reset link</Btn>
          {!firebaseAvailable && <p className="text-xs text-amber">Password reset needs Firebase configuration on this deployment.</p>}
          <p className="text-sm text-muted text-center"><Link className="text-accent font-medium" href="/login">Back to sign in</Link></p>
        </div>
      )}
    </AuthScaffold>
  );
}
