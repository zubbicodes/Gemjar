"use client";

import { AlertCircle, Building2, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Customer = { id: string; name: string; status: string; accountNumber?: string; paymentTermsDays: number; orders: Array<{ id: string }>; addresses: Array<{ city: string; postcode: string }> };

export function AgentCustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void fetch(`${API_URL}/agents/me/customers`, { credentials: "include", cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Unable to load assigned customers"); setCustomers(body.data); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load customers")); }, []);
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.accountNumber} ${customer.addresses.map((address) => address.postcode).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  if (error) return <div className="surface flex gap-3 p-6 text-xs text-rose-800"><AlertCircle className="size-4" />{error}</div>;
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><MetricCard icon={Building2} label="Assigned customers" value={String(customers.length)} note="Server-authorized" /><MetricCard icon={ShoppingBag} label="Recent orders" value={String(customers.reduce((sum, customer) => sum + customer.orders.length, 0))} note="Across assignments" /><MetricCard icon={MapPin} label="Active territory" value={String(new Set(customers.flatMap((customer) => customer.addresses.map((address) => address.city))).size)} note="Customer locations" trend="neutral" /></div><section className="surface mt-6 p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="font-display text-2xl font-semibold">Assigned customers</p><p className="mt-1 text-xs text-ink/45">Only explicitly assigned organizations are returned by the API.</p></div><input className="field max-w-xs" placeholder="Search customer or postcode…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-6 grid gap-3 lg:grid-cols-3">{filtered.map((customer) => <article key={customer.id} className="rounded-2xl border border-ink/[.08] bg-white/45 p-5"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-forest text-xs font-bold text-white">{customer.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><Badge tone={customer.status === "APPROVED" ? "good" : "warn"}>{customer.status}</Badge></div><p className="mt-5 font-display text-2xl font-semibold">{customer.name}</p><p className="mt-1 text-[11px] text-ink/40">{customer.addresses[0]?.city || "Address pending"} · Net {customer.paymentTermsDays}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-forest/55">{customer.orders.length} recent order(s)</p></article>)}{!customers.length && <p className="text-xs text-ink/40">Loading assigned customers…</p>}</div></section></>;
}
