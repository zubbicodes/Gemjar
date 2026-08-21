"use client";

import { AlertCircle, CheckCircle2, Plus, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { csrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type AdminProduct = { id: string; name: string; slug: string; description: string; status: "ACTIVE" | "INACTIVE"; variant: { sku: string; retailPriceMinor: number; b2bPriceMinor?: number; available: number } | null };

export function AdminCatalogueManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/admin/products`, { credentials: "include", cache: "no-store" });
      if (response.status === 401) { setUnauthorized(true); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load catalogue");
      setProducts(body.data); setUnauthorized(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load catalogue"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  if (unauthorized) return <div className="surface p-10 text-center"><AlertCircle className="mx-auto size-7 text-amber-700" /><h2 className="mt-5 font-display text-3xl font-semibold">Administrator sign-in required</h2><p className="mt-2 text-xs text-ink/45">The catalogue API is protected by server-side permissions.</p><Link href="/login?next=/admin/catalogue" className="mt-6 inline-flex rounded-full bg-forest px-6 py-3 text-xs font-bold text-white">Sign in to continue</Link></div>;

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = { name: form.get("name"), slug: form.get("slug"), description: form.get("description"), sku: form.get("sku"), retailPriceMinor: Math.round(Number(form.get("retailPrice")) * 100), b2bPriceMinor: Math.round(Number(form.get("b2bPrice")) * 100), moq: Number(form.get("moq")), packMultiple: Number(form.get("packMultiple")), imageUrl: form.get("imageUrl") || undefined };
    const response = await fetch(`${API_URL}/admin/products`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) { setError(Array.isArray(body.message) ? body.message.join(". ") : body.message || "Unable to create product"); return; }
    setMessage(`${body.name} is now live in the Gemjar catalogue.`); setShowCreate(false); event.currentTarget.reset(); await load();
  }

  return <section className="surface overflow-hidden"><div className="flex flex-col justify-between gap-5 border-b border-ink/10 p-6 sm:flex-row sm:items-end"><div><h2 className="font-display text-3xl font-semibold">Catalogue</h2><p className="mt-2 text-xs text-ink/45">Products below are loaded from PostgreSQL through the protected API.</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => void load()}><RefreshCw className="size-3.5" /> Refresh</Button><Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> New product</Button></div></div>{message && <div className="mx-6 mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 className="size-4" />{message}</div>}{error && <div className="mx-6 mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4" />{error}</div>}{showCreate && <form onSubmit={createProduct} className="m-6 grid gap-4 rounded-2xl border border-forest/15 bg-forest/[.035] p-5 sm:grid-cols-2"><div className="col-span-full flex justify-between"><div><p className="font-display text-2xl font-semibold">Create a product</p><p className="mt-1 text-[10px] text-ink/40">The first variant becomes the primary sellable SKU.</p></div><button type="button" onClick={() => setShowCreate(false)}><X className="size-4" /></button></div><label className="text-xs font-bold">Product name<input name="name" className="field mt-2" required /></label><label className="text-xs font-bold">URL slug<input name="slug" className="field mt-2" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label className="col-span-full text-xs font-bold">Description<textarea name="description" className="field mt-2 min-h-24 py-3" minLength={10} required /></label><label className="text-xs font-bold">SKU<input name="sku" className="field mt-2 uppercase" required /></label><label className="text-xs font-bold">Image URL<input name="imageUrl" className="field mt-2" type="url" /></label><label className="text-xs font-bold">Retail price (£)<input name="retailPrice" className="field mt-2" type="number" min="0.01" step="0.01" required /></label><label className="text-xs font-bold">Trade price (£)<input name="b2bPrice" className="field mt-2" type="number" min="0.01" step="0.01" required /></label><label className="text-xs font-bold">Minimum order<input name="moq" className="field mt-2" type="number" min="1" defaultValue="1" required /></label><label className="text-xs font-bold">Pack multiple<input name="packMultiple" className="field mt-2" type="number" min="1" defaultValue="1" required /></label><div className="col-span-full flex justify-end"><Button type="submit">Create and publish</Button></div></form>}<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38"><tr><th className="px-6 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Retail</th><th className="px-4 py-3">Trade</th><th className="px-4 py-3">Stock</th><th className="px-6 py-3 text-right">Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-ink/[.06]"><td className="px-6 py-4"><p className="font-bold">{product.name}</p><p className="mt-1 text-[10px] text-ink/35">/{product.slug}</p></td><td className="px-4 py-4">{product.variant?.sku}</td><td className="px-4 py-4 font-semibold">{formatMoney(product.variant?.retailPriceMinor ?? 0)}</td><td className="px-4 py-4">{formatMoney(product.variant?.b2bPriceMinor ?? 0)}</td><td className="px-4 py-4">{product.variant?.available ?? 0}</td><td className="px-6 py-4 text-right"><Badge tone={product.status === "ACTIVE" ? "good" : "neutral"}>{product.status}</Badge></td></tr>)}</tbody></table>{loading && <div className="p-12 text-center text-xs text-ink/40">Loading the live catalogue…</div>}</div></section>;
}
