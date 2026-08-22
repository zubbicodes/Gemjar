"use client";

import {
  AlertTriangle,
  BadgePoundSterling,
  Boxes,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  StatusBadge,
  relativeTime,
} from "@/components/portal-primitives";
import { useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

type Overview = {
  revenue: {
    today: { amount: number; currency: string };
    monthToDate: { amount: number; currency: string };
  };
  orders: { today: number; monthToDate: number; awaitingFulfilment: number };
  exceptions: Array<{
    key: string;
    label: string;
    count: number;
    tone: string;
  }>;
  needsAttention: number;
};

type OrderRow = {
  id: string;
  number: string;
  source: string;
  status: string;
  fulfilmentStatus: string;
  totalMinor: number;
  currency: string;
  email: string;
  createdAt: string;
};

const CHANNEL_LABELS: Record<string, string> = {
  B2C: "Online",
  B2B: "Trade",
  SALES_AGENT: "Agent",
  ADMIN: "Internal",
};

export function AdminDashboard() {
  const overview = useApi<Overview>("/admin/analytics/overview");
  const orders = useApi<{ data: OrderRow[] }>("/orders");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BadgePoundSterling}
          label="Revenue today"
          value={
            overview.data
              ? formatMoney(overview.data.revenue.today.amount)
              : "—"
          }
          note={
            overview.data
              ? `${formatMoney(overview.data.revenue.monthToDate.amount)} MTD`
              : "Loading"
          }
          trend="neutral"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Orders today"
          value={overview.data ? String(overview.data.orders.today) : "—"}
          note={
            overview.data
              ? `${overview.data.orders.monthToDate} this month`
              : "Loading"
          }
          trend="neutral"
        />
        <MetricCard
          icon={Boxes}
          label="Awaiting fulfilment"
          value={
            overview.data
              ? String(overview.data.orders.awaitingFulfilment)
              : "—"
          }
          note="Open orders"
          trend="neutral"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Needs attention"
          value={overview.data ? String(overview.data.needsAttention) : "—"}
          note="Across exceptions"
          trend={overview.data?.needsAttention ? "down" : "neutral"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 p-6">
            <div>
              <p className="font-display text-2xl font-semibold">
                Order activity
              </p>
              <p className="mt-1 text-[11px] text-ink/45">
                Across online, trade and agents
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-forest"
            >
              View all
            </Link>
          </div>
          {orders.loading ? (
            <LoadingRow label="Loading orders…" />
          ) : orders.error ? (
            <ErrorRow message={orders.error} />
          ) : !orders.data?.data.length ? (
            <EmptyRow message="No orders have been placed yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38">
                  <tr>
                    <th className="px-6 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.data.slice(0, 8).map((order) => (
                    <tr key={order.id} className="border-t border-ink/[.06]">
                      <td className="px-6 py-4 font-bold">{order.number}</td>
                      <td className="px-4 py-4">{order.email}</td>
                      <td className="px-4 py-4 text-ink/50">
                        {CHANNEL_LABELS[order.source] ?? order.source}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {formatMoney(order.totalMinor, order.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          status={
                            order.fulfilmentStatus === "PARTIALLY_FULFILLED"
                              ? "PARTIALLY_FULFILLED"
                              : order.status
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right text-ink/40">
                        {relativeTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="surface p-6">
          <p className="font-display text-2xl font-semibold">
            Operational pulse
          </p>
          <p className="mt-1 text-[11px] text-ink/45">
            Exceptions requiring action
          </p>
          {overview.loading ? (
            <LoadingRow />
          ) : overview.error ? (
            <ErrorRow message={overview.error} />
          ) : (
            <div className="mt-6 space-y-3">
              {overview.data?.exceptions.map((exception) => (
                <div
                  key={exception.key}
                  className="flex items-center justify-between rounded-2xl border border-ink/[.07] bg-white/40 p-4"
                >
                  <div>
                    <p className="text-xs font-bold">{exception.label}</p>
                    <p className="mt-1 text-[10px] text-ink/40">
                      {exception.count
                        ? `${exception.count} to review`
                        : "All clear"}
                    </p>
                  </div>
                  <span
                    className={`size-2 rounded-full ${exception.tone === "warn" ? "bg-amber-500" : exception.tone === "good" ? "bg-emerald-500" : "bg-ink/20"}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
