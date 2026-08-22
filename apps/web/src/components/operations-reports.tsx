"use client";

import { formatMoney } from "@/lib/utils";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { useApi } from "@/lib/portal-api";

type Breakdown = {
  channels: Array<{ channel: string; orders: number; revenueMinor: number }>;
  topProducts: Array<{
    sku: string;
    name: string;
    quantity: number;
    revenueMinor: number;
  }>;
  topCustomers: Array<{
    organization?: { name: string; accountNumber: string } | null;
    orders: number;
    revenueMinor: number;
  }>;
  agents: Array<{
    code?: string | null;
    name?: string | null;
    orders: number;
    revenueMinor: number;
  }>;
};
type Audit = {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { email: string; firstName: string; lastName: string } | null;
};

export function AnalyticsReport() {
  const view = useApi<Breakdown>("/admin/analytics/breakdown");
  if (view.loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (view.error)
    return (
      <section className="surface">
        <ErrorRow message={view.error} />
      </section>
    );
  const data = view.data!;
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Commerce analytics"
        description="Revenue, product, customer, and agent performance from live orders."
      />
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <Report
          title="Channels"
          rows={data.channels.map((row) => [
            row.channel,
            `${row.orders} orders · ${formatMoney(row.revenueMinor)}`,
          ])}
        />
        <Report
          title="Top products"
          rows={data.topProducts.map((row) => [
            `${row.name} · ${row.sku}`,
            `${row.quantity} units · ${formatMoney(row.revenueMinor)}`,
          ])}
        />
        <Report
          title="Top customers"
          rows={data.topCustomers.map((row) => [
            row.organization?.name ?? "Unknown",
            `${row.orders} orders · ${formatMoney(row.revenueMinor)}`,
          ])}
        />
        <Report
          title="Agent performance"
          rows={data.agents.map((row) => [
            row.name ?? row.code ?? "Unknown",
            `${row.orders} orders · ${formatMoney(row.revenueMinor)}`,
          ])}
        />
      </div>
    </section>
  );
}

function Report({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-2xl border border-ink/10">
      <h3 className="border-b border-ink/10 p-4 font-semibold">{title}</h3>
      {!rows.length ? (
        <EmptyRow message="No data yet." />
      ) : (
        rows.map(([label, value]) => (
          <div
            key={`${label}-${value}`}
            className="flex justify-between gap-4 border-b border-ink/[.06] p-4 text-xs last:border-0"
          >
            <span className="font-semibold">{label}</span>
            <span className="text-ink/55">{value}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function AuditReport() {
  const view = useApi<{ data: Audit[] }>("/admin/audit?limit=250");
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Audit trail"
        description="Privileged and commercial changes, newest first."
      />
      {view.loading ? (
        <LoadingRow />
      ) : view.error ? (
        <ErrorRow message={view.error} />
      ) : !view.data?.data.length ? (
        <EmptyRow message="No audit events yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/40">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Event</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Actor</th>
              </tr>
            </thead>
            <tbody>
              {view.data.data.map((item) => (
                <tr key={item.id} className="border-t border-ink/[.06]">
                  <td className="p-4">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold">{item.event}</td>
                  <td className="p-4">
                    {item.entityType} · {item.entityId}
                  </td>
                  <td className="p-4">{item.actor?.email ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
