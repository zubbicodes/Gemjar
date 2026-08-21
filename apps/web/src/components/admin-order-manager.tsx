"use client";

import { AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Order = { id: string; number: string; email: string; source: string; status: string; paymentStatus: string; fulfilmentStatus: string; stockConfirmationPending: boolean; totalMinor: number; currency: string; createdAt: string; items: Array<{ id: string; nameSnapshot: string; quantity: number }> };

export function AdminOrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/orders`, { credentials: "include", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load orders");
      setOrders(body.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load orders"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <section className="surface overflow-hidden"><div className="flex items-end justify-between gap-5 border-b border-ink/10 p-6"><div><h2 className="font-display text-3xl font-semibold">Order operations</h2><p className="mt-2 text-xs text-ink/45">Every channel, payment and fulfilment state remains independently visible.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}><RefreshCw className="size-3.5" /> Refresh</Button></div>{error && <div className="m-6 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4" />{error}</div>}<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38"><tr><th className="px-6 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Payment</th><th className="px-6 py-3 text-right">Received</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-ink/[.06]"><td className="px-6 py-4"><p className="font-bold">{order.number}</p><p className="mt-1 text-[10px] text-ink/35">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></td><td className="px-4 py-4">{order.email}</td><td className="px-4 py-4 text-ink/50">{order.source.replaceAll("_", " ")}</td><td className="px-4 py-4 font-semibold">{formatMoney(order.totalMinor, order.currency)}</td><td className="px-4 py-4"><Badge tone={order.stockConfirmationPending ? "warn" : "neutral"}>{order.stockConfirmationPending ? "Stock check" : order.status}</Badge></td><td className="px-4 py-4"><Badge tone={order.paymentStatus === "PAID" ? "good" : order.paymentStatus === "FAILED" ? "danger" : "warn"}>{order.paymentStatus}</Badge></td><td className="px-6 py-4 text-right text-ink/45">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</td></tr>)}</tbody></table>{loading && <div className="p-12 text-center text-xs text-ink/40">Loading live orders…</div>}{!loading && !orders.length && <div className="p-12 text-center"><ShoppingBag className="mx-auto size-6 text-ink/30" /><p className="mt-3 text-xs text-ink/45">No orders have been received yet.</p></div>}</div></section>;
}
