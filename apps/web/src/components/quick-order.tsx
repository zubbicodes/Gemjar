"use client";

import { AlertCircle, Building2, CheckCircle2, FileText, LoaderCircle, Minus, Plus, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { csrfHeaders } from "@/lib/csrf";
import { formatMoney } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

type Organization = { id: string; name: string; status: string; accountNumber?: string; poRequired: boolean; paymentTermsDays: number };
type Variant = { id: string; sku: string; b2bPriceMinor?: number | null; retailPriceMinor: number; moq: number; packMultiple: number; available: number };
type Product = { id: string; name: string; slug: string; image?: string | null; variant: Variant | null };
type Row = { variantId: string; quantity: number };
type Money = { amount: number; currency: string };
type QuoteLine = { variantId: string; sku: string; name: string; quantity: number; unitPrice: Money; net: Money; vat: Money; gross: Money; appliedRule: string; validation: { valid: boolean; code?: string; message?: string } };
type Quote = { lines: QuoteLine[]; subtotal: Money; vat: Money; total: Money; stockConfidence: "LIVE" | "PENDING_CONFIRMATION"; quotedAt: string };
type Draft = { id: string; name: string | null; updatedAt: string; version: number; items: Array<{ variantId: string; quantity: number; variant: { sku: string; product: { name: string } } }> };

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(". ") : body.message || "The request could not be completed");
  return body;
}

export function QuickOrder({ kind = "trade" }: { kind?: "trade" | "agent" }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftId, setDraftId] = useState<string>();
  const [draftName, setDraftName] = useState("New trade order");
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
  const productByVariant = useMemo(() => new Map(catalogue.filter((product) => product.variant).map((product) => [product.variant!.id, product])), [catalogue]);
  const matches = useMemo(() => query.trim().length > 1 ? catalogue.filter((product) => `${product.name} ${product.variant?.sku ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [], [catalogue, query]);

  const loadDrafts = useCallback(async (contextId: string) => {
    const body = await readJson(await fetch(`${API_URL}/carts/drafts?organizationId=${encodeURIComponent(contextId)}`, { credentials: "include", cache: "no-store" }));
    setDrafts(body.data);
  }, []);

  useEffect(() => {
    let active = true;
    const path = kind === "agent" ? "/agents/me/customers" : "/organizations/current";
    void fetch(`${API_URL}${path}`, { credentials: "include", cache: "no-store" }).then(readJson).then((body) => {
      if (!active) return;
      const approved = (body.data as Organization[]).filter((organization) => organization.status === "APPROVED");
      setOrganizations(approved);
      setOrganizationId(approved[0]?.id ?? "");
      if (!approved.length) setLoading(false);
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "Unable to load account context"); setLoading(false); } });
    return () => { active = false; };
  }, [kind]);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    setLoading(true); setError(""); setRows([]); setQuote(null); setDraftId(undefined); setDraftName("New trade order");
    Promise.all([
      fetch(`${API_URL}/trade/products?organizationId=${encodeURIComponent(organizationId)}`, { credentials: "include", cache: "no-store" }).then(readJson),
      fetch(`${API_URL}/carts/drafts?organizationId=${encodeURIComponent(organizationId)}`, { credentials: "include", cache: "no-store" }).then(readJson),
    ]).then(([productsBody, draftsBody]) => {
      if (!active) return;
      setCatalogue(productsBody.data); setDrafts(draftsBody.data);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load the trade catalogue"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !rows.length) { setQuote(null); setQuoting(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQuoting(true); setError("");
      void fetch(`${API_URL}/pricing/trade-quote`, { method: "POST", credentials: "include", signal: controller.signal, headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ organizationId, items: rows }) })
        .then(readJson).then(setQuote).catch((cause) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setQuote(null); setError(cause instanceof Error ? cause.message : "Unable to verify pricing");
        }).finally(() => { if (!controller.signal.aborted) setQuoting(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [organizationId, rows]);

  function addProduct(product: Product) {
    if (!product.variant) return;
    const variant = product.variant;
    setRows((current) => current.some((row) => row.variantId === variant.id) ? current : [...current, { variantId: variant.id, quantity: Math.max(variant.moq, variant.packMultiple) }]);
    setQuery(""); setMessage("");
  }

  function changeQuantity(variantId: string, direction: -1 | 1) {
    const variant = productByVariant.get(variantId)?.variant;
    if (!variant) return;
    const step = Math.max(1, variant.packMultiple);
    setRows((current) => current.map((row) => row.variantId === variantId ? { ...row, quantity: Math.max(variant.moq, row.quantity + direction * step) } : row));
  }

  function loadDraft(draft: Draft) {
    setRows(draft.items.map(({ variantId, quantity }) => ({ variantId, quantity })));
    setDraftId(draft.id); setDraftName(draft.name || "Untitled draft"); setMessage(`Loaded ${draft.name || "draft"}`);
  }

  async function saveDraft() {
    if (!organizationId || !rows.length || !draftName.trim()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await readJson(await fetch(`${API_URL}/carts/drafts`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ organizationId, name: draftName, items: rows, ...(draftId ? { draftId } : {}) }) }));
      setDraftId(saved.id); setMessage("Draft saved securely"); await loadDrafts(organizationId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the draft"); }
    finally { setSaving(false); }
  }

  const invalid = quote?.lines.some((line) => !line.validation.valid) ?? false;
  const lineByVariant = new Map(quote?.lines.map((line) => [line.variantId, line]) ?? []);

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[24px] border border-forest/15 bg-forest text-white shadow-soft"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><Building2 className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">{kind === "agent" ? "Ordering on behalf of" : "Account pricing context"}</p><p className="mt-1 font-display text-2xl font-semibold">{selectedOrganization?.name || "Select an approved customer"}</p></div></div>{organizations.length > 1 && <select aria-label="Select customer organization" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold text-white outline-none focus:border-white/50">{organizations.map((organization) => <option className="text-ink" key={organization.id} value={organization.id}>{organization.name}</option>)}</select>}{selectedOrganization && <div className="flex gap-2"><Badge className="bg-white/10 text-white">Net {selectedOrganization.paymentTermsDays}</Badge>{selectedOrganization.poRequired && <Badge className="bg-amber-300/15 text-amber-100">PO required</Badge>}</div>}</div></section>
    {error && <div role="alert" className="flex gap-3 rounded-2xl bg-rose-50 p-4 text-xs text-rose-800"><AlertCircle className="size-4 shrink-0" />{error}</div>}
    {message && <div role="status" className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800"><CheckCircle2 className="size-4 shrink-0" />{message}</div>}
    {!loading && !organizations.length ? <section className="surface p-10 text-center"><Building2 className="mx-auto size-7 text-ink/25" /><h2 className="mt-4 font-display text-2xl font-semibold">No approved account available</h2><p className="mt-2 text-xs text-ink/45">An approved organization or active customer assignment is required to build a trade order.</p></section> : <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="surface p-5 sm:p-7"><div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35" /><input className="field pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your catalogue by product or SKU…" />{matches.length > 0 && <div className="absolute inset-x-0 top-12 z-10 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lift">{matches.map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)} className="flex w-full items-center justify-between border-b border-ink/[.06] px-5 py-4 text-left last:border-0 hover:bg-forest/[.035]"><span><span className="block text-xs font-bold">{product.name}</span><span className="mt-1 block text-[10px] text-ink/40">{product.variant?.sku} · MOQ {product.variant?.moq} · Pack {product.variant?.packMultiple}</span></span><Plus className="size-4 text-forest" /></button>)}</div>}</div>
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink/40"><LoaderCircle className="size-4 animate-spin" /> Loading account catalogue…</div> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-ink/35"><tr><th className="pb-3">Product</th><th className="pb-3">Verified unit price</th><th className="pb-3">Quantity</th><th className="pb-3 text-right">Ex VAT</th><th /></tr></thead><tbody>{rows.map((row) => { const product = productByVariant.get(row.variantId); const variant = product?.variant; const line = lineByVariant.get(row.variantId); if (!product || !variant) return null; return <tr key={row.variantId} className="border-t border-ink/[.07]"><td className="py-5"><p className="font-bold">{product.name}</p><p className="mt-1 text-[10px] text-ink/38">{variant.sku} · MOQ {variant.moq} · Pack {variant.packMultiple}</p>{line?.validation.message && <p className={line.validation.valid ? "mt-2 text-[10px] text-amber-700" : "mt-2 text-[10px] font-semibold text-rose-700"}>{line.validation.message}</p>}</td><td className="py-5"><p className="font-semibold">{line ? formatMoney(line.unitPrice.amount) : "Verifying…"}</p>{line && <p className="mt-1 text-[9px] uppercase tracking-wider text-forest/60">{line.appliedRule.replaceAll("_", " ")}</p>}</td><td className="py-5"><div className="flex w-fit items-center rounded-full border border-ink/10"><button aria-label={`Decrease ${product.name}`} className="grid size-8 place-items-center" onClick={() => changeQuantity(row.variantId, -1)}><Minus className="size-3" /></button><span className="w-9 text-center font-bold">{row.quantity}</span><button aria-label={`Increase ${product.name}`} className="grid size-8 place-items-center" onClick={() => changeQuantity(row.variantId, 1)}><Plus className="size-3" /></button></div></td><td className="py-5 text-right font-bold">{line ? formatMoney(line.net.amount) : "—"}</td><td className="py-5 pl-4"><button aria-label={`Remove ${product.name}`} className="text-ink/30 hover:text-rose-700" onClick={() => setRows((current) => current.filter((item) => item.variantId !== row.variantId))}><Trash2 className="size-4" /></button></td></tr>; })}</tbody></table>{rows.length === 0 && <div className="py-14 text-center"><Search className="mx-auto size-6 text-ink/20" /><p className="mt-3 text-xs text-ink/40">Search above to add products from this account’s catalogue.</p><p className="mt-1 text-[10px] text-ink/30">{catalogue.length} product{catalogue.length === 1 ? "" : "s"} available</p></div>}</div>}
      </section>
      <aside className="space-y-5"><section className="surface p-6"><div className="flex items-center justify-between"><p className="eyebrow">Verified draft</p>{quoting && <LoaderCircle className="size-4 animate-spin text-forest" />}</div><input aria-label="Draft name" className="field mt-4" value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={100} /><dl className="mt-5 space-y-3 border-b border-ink/10 pb-5 text-xs"><div className="flex justify-between"><dt className="text-ink/45">Subtotal</dt><dd>{quote ? formatMoney(quote.subtotal.amount) : "—"}</dd></div><div className="flex justify-between"><dt className="text-ink/45">VAT</dt><dd>{quote ? formatMoney(quote.vat.amount) : "—"}</dd></div></dl><div className="mt-5 flex items-end justify-between"><dt className="text-xs font-bold">Total</dt><dd className="font-display text-3xl font-semibold">{quote ? formatMoney(quote.total.amount) : formatMoney(0)}</dd></div>{quote?.stockConfidence === "PENDING_CONFIRMATION" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] leading-4 text-amber-900">Last-known stock is being used. Operations will confirm availability.</p>}<Button className="mt-6 w-full" size="lg" disabled={!quote || invalid || saving || quoting || !draftName.trim()} onClick={() => void saveDraft()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : draftId ? "Update saved draft" : "Save order draft"}</Button><p className="mt-4 text-center text-[10px] leading-4 text-ink/38">Prices, VAT, pack rules, permissions and current stock are verified by the API.</p></section>
        <section className="surface p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Saved work</p><p className="mt-2 text-xs text-ink/45">Private to your login</p></div><FileText className="size-5 text-ink/25" /></div><div className="mt-4 space-y-2">{drafts.slice(0, 5).map((draft) => <button type="button" key={draft.id} onClick={() => loadDraft(draft)} className={`w-full rounded-xl border p-3 text-left transition ${draft.id === draftId ? "border-forest/30 bg-forest/[.06]" : "border-ink/[.07] hover:border-forest/20"}`}><span className="block truncate text-xs font-bold">{draft.name || "Untitled draft"}</span><span className="mt-1 block text-[10px] text-ink/38">{draft.items.length} line{draft.items.length === 1 ? "" : "s"} · v{draft.version} · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(draft.updatedAt))}</span></button>)}{!drafts.length && <p className="rounded-xl border border-dashed border-ink/10 p-5 text-center text-[10px] text-ink/35">Saved drafts will appear here.</p>}</div></section>
      </aside>
    </div>}
  </div>;
}
