"use client";

import { AlertCircle, Laptop, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { csrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Session = { id: string; createdAt: string; lastUsedAt: string; expiresAt: string; userAgent?: string; current: boolean };

export function SecurityManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch(`${API_URL}/auth/sessions`, { credentials: "include", cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Unable to load sessions"); setSessions(body.data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load sessions"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function revoke(id: string) { const response = await fetch(`${API_URL}/auth/sessions/${id}`, { method: "DELETE", credentials: "include", headers: csrfHeaders() }); const body = await response.json(); if (!response.ok) { setError(body.message || "Unable to revoke session"); return; } await load(); }

  return <div className="grid gap-6 xl:grid-cols-[1fr_340px]"><section className="surface overflow-hidden"><div className="flex items-end justify-between border-b border-ink/10 p-6"><div><h2 className="font-display text-3xl font-semibold">Active sessions</h2><p className="mt-2 text-xs text-ink/45">Review browsers with access to your Gemjar account.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}><RefreshCw className="size-3.5" /> Refresh</Button></div>{error && <div className="m-6 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4" />{error}</div>}<div className="divide-y divide-ink/[.06]">{sessions.map((session) => { const mobile = /Mobile|Android|iPhone/i.test(session.userAgent || ""); const Icon = mobile ? Smartphone : Laptop; return <div key={session.id} className="flex items-center gap-4 p-6"><div className="grid size-11 place-items-center rounded-2xl bg-forest/[.07] text-forest"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-bold">{friendlyAgent(session.userAgent)}</p>{session.current && <Badge tone="good">Current</Badge>}</div><p className="mt-1 text-[10px] text-ink/40">Created {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.createdAt))}</p></div>{!session.current && <Button variant="secondary" size="sm" onClick={() => void revoke(session.id)}>Revoke</Button>}</div>; })}{loading && <p className="p-10 text-center text-xs text-ink/40">Loading secure sessions…</p>}</div></section><aside className="surface h-fit p-6"><div className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-800"><ShieldCheck className="size-5" /></div><h2 className="mt-5 font-display text-2xl font-semibold">Account protection</h2><p className="mt-3 text-xs leading-5 text-ink/50">Privileged Gemjar accounts use authenticator-based verification. Sessions rotate securely and can be revoked independently.</p><dl className="mt-6 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-ink/45">Access token</dt><dd className="font-semibold">15 minutes</dd></div><div className="flex justify-between"><dt className="text-ink/45">Session lifetime</dt><dd className="font-semibold">30 days</dd></div><div className="flex justify-between"><dt className="text-ink/45">CSRF protection</dt><dd className="font-semibold text-emerald-700">Active</dd></div></dl></aside></div>;
}

function friendlyAgent(agent = "") { if (/Edg/i.test(agent)) return "Microsoft Edge"; if (/Chrome/i.test(agent)) return "Google Chrome"; if (/Firefox/i.test(agent)) return "Mozilla Firefox"; if (/Safari/i.test(agent)) return "Safari"; return "Unknown browser"; }
