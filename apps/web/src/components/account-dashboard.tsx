"use client";

import { Heart, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
  formatDate,
} from "@/components/portal-primitives";
import { useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

type Profile = {
  firstName: string;
  _count: { customerOrders: number; favourites: number };
};
type Order = {
  id: string;
  number: string;
  fulfilmentStatus: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  shipments: Array<{ trackingNumber: string | null }>;
};

export function AccountDashboard() {
  const profile = useApi<Profile>("/account/profile");
  const orders = useApi<{ data: Order[] }>("/orders/mine");
  if (profile.loading || orders.loading)
    return (
      <section className="surface">
        <LoadingRow label="Loading your account…" />
      </section>
    );
  if (profile.error || orders.error)
    return (
      <section className="surface">
        <ErrorRow message={profile.error || orders.error} />
      </section>
    );
  const list = orders.data?.data ?? [];
  const latest = list[0];
  const inTransit = list.filter(
    (order) => order.fulfilmentStatus === "PARTIALLY_FULFILLED",
  ).length;
  const delivered = list.filter(
    (order) => order.fulfilmentStatus === "FULFILLED",
  ).length;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShoppingBag}
          label="Orders"
          value={String(list.length)}
          note="All time"
          trend="neutral"
        />
        <MetricCard
          icon={Truck}
          label="In transit"
          value={String(inTransit)}
          note="Current deliveries"
        />
        <MetricCard
          icon={Heart}
          label="Saved pieces"
          value={String(profile.data?._count.favourites ?? 0)}
          note="Account favourites"
          trend="neutral"
        />
        <MetricCard
          icon={PackageCheck}
          label="Delivered"
          value={String(delivered)}
          note="Completed orders"
        />
      </div>
      <section className="surface mt-6 overflow-hidden">
        <PanelHeading
          title={`Welcome back${profile.data?.firstName ? `, ${profile.data.firstName}` : ""}`}
          description="Latest order and delivery progress."
        />
        {!latest ? (
          <EmptyRow message="No orders yet. Your first purchase will appear here." />
        ) : (
          <Link
            href="/account/orders"
            className="m-5 flex flex-col justify-between gap-5 rounded-2xl border border-ink/[.07] bg-white/50 p-5 transition hover:border-forest/25 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold">{latest.number}</p>
                <StatusBadge status={latest.fulfilmentStatus} />
              </div>
              <p className="mt-2 text-xs text-ink/45">
                {formatDate(latest.createdAt)} ·{" "}
                {formatMoney(latest.totalMinor, latest.currency)}
              </p>
            </div>
            <p className="flex items-center gap-2 text-xs font-semibold text-forest">
              <Truck className="size-4" />
              {latest.shipments[0]?.trackingNumber ?? "View order progress"}
            </p>
          </Link>
        )}
      </section>
    </>
  );
}
