"use client";

import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("admin@gemjar.test");
  const [password, setPassword] = useState("GemjarDemo!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(". ") : body.message || "Sign in failed");
      router.push(search.get("next") || (body.user.kind === "ADMIN" ? "/admin" : "/account"));
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="surface mt-8 p-6 text-left sm:p-8"><label className="text-xs font-bold">Email address<input className="field mt-2" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="mt-5 block text-xs font-bold">Password<input className="field mt-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4 shrink-0" />{error}</div>}<Button className="mt-6 w-full" size="lg" disabled={busy}><LockKeyhole className="size-4" />{busy ? "Signing in…" : "Sign in securely"}<ArrowRight className="size-4" /></Button><p className="mt-4 text-center text-[10px] leading-4 text-ink/38">Demo credentials are pre-filled for the seeded administrator account.</p></form>;
}
