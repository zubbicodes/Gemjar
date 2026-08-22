"use client";

import { Building2, ShoppingBag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
  formatDate,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

const CONTEXT_KEY = "gemjar.agent.customer";

type Customer = {
  id: string;
  name: string;
  status: string;
  accountNumber?: string;
  paymentTermsDays: number;
  poRequired: boolean;
  addresses: Array<{ city: string; postcode: string }>;
};

type AgentOrder = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  purchaseOrder: string | null;
  invoice: { id: string; number: string } | null;
  items: Array<{
    id: string;
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
  }>;
};

/** Remembers which customer the agent is acting for across page loads. */
export function useCustomerContext(customers: Customer[]) {
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(CONTEXT_KEY);
    if (stored && customers.some((customer) => customer.id === stored))
      setSelectedId(stored);
    else if (customers.length === 1) setSelectedId(customers[0]!.id);
  }, [customers]);

  function select(id: string) {
    setSelectedId(id);
    if (id) window.localStorage.setItem(CONTEXT_KEY, id);
    else window.localStorage.removeItem(CONTEXT_KEY);
  }

  const selected = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? null,
    [customers, selectedId],
  );
  return { selected, select };
}

export function AgentWorkspace() {
  const customers = useApi<{ data: Customer[] }>("/agents/me/customers");
  const list = useMemo(() => customers.data?.data ?? [], [customers.data]);
  const { selected, select } = useCustomerContext(list);
  const orders = useApi<{ data: AgentOrder[]; outstandingMinor: number }>(
    selected ? `/orders/organization/${selected.id}` : null,
  );

  if (customers.loading)
    return (
      <section className="surface">
        <LoadingRow label="Loading your customer book…" />
      </section>
    );
  if (customers.error)
    return (
      <section className="surface">
        <ErrorRow message={customers.error} />
      </section>
    );

  return (
    <>
      <div
        className={`mb-6 flex flex-col justify-between gap-4 rounded-[24px] border p-5 sm:flex-row sm:items-center ${selected ? "border-forest/15 bg-forest/[.05]" : "border-amber-300/60 bg-amber-50"}`}
      >
        <div className="flex items-start gap-3">
          {selected ? (
            <Building2 className="mt-1 size-5 text-forest" />
          ) : (
            <TriangleAlert className="mt-1 size-5 text-amber-700" />
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink/50">
              Ordering on behalf of
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold">
              {selected ? selected.name : "No customer selected"}
            </h2>
            <p className="mt-1 text-xs text-ink/50">
              {selected
                ? `${selected.accountNumber ?? "Account pending"} · Net ${selected.paymentTermsDays}${selected.poRequired ? " · PO required" : ""}`
                : "Choose a customer before building an order."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="agent-customer">
            Select customer
          </label>
          <select
            id="agent-customer"
            value={selected?.id ?? ""}
            onChange={(event) => select(event.target.value)}
            className="field h-10 min-w-[220px]"
          >
            <option value="">Select a customer…</option>
            {list.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          {selected && (
            <Link href="/agent/orders/new">
              <Button size="sm">
                <ShoppingBag className="size-3.5" /> New order
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!selected ? (
        <section className="surface overflow-hidden">
          <PanelHeading
            title="Assigned customers"
            description="Only organizations explicitly assigned to you are returned by the API."
          />
          {!list.length ? (
            <EmptyRow message="No customers are assigned to you yet." />
          ) : (
            <div className="grid gap-3 p-5 lg:grid-cols-3">
              {list.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => select(customer.id)}
                  className="rounded-2xl border border-ink/[.08] bg-white/45 p-5 text-left transition hover:border-forest/40"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-forest text-xs font-bold text-white">
                      {customer.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <StatusBadge status={customer.status} />
                  </div>
                  <p className="mt-5 font-display text-2xl font-semibold">
                    {customer.name}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/40">
                    {customer.addresses[0]?.city || "Address pending"} · Net{" "}
                    {customer.paymentTermsDays}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="surface overflow-hidden">
          <PanelHeading
            title={`${selected.name} — purchase history`}
            description="Order history, attribution and outstanding balance for the selected customer."
            action={
              orders.data ? (
                <p className="text-xs text-ink/50">
                  Outstanding{" "}
                  <b className="text-ink">
                    {formatMoney(orders.data.outstandingMinor)}
                  </b>
                </p>
              ) : undefined
            }
          />
          {orders.loading ? (
            <LoadingRow />
          ) : orders.error ? (
            <ErrorRow message={orders.error} />
          ) : !orders.data?.data.length ? (
            <EmptyRow message="This customer has not ordered yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38">
                  <tr>
                    <th className="px-6 py-3">Order</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Placed</th>
                    <th className="px-4 py-3">Fulfilment</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.data.map((order) => (
                    <tr key={order.id} className="border-t border-ink/[.06]">
                      <td className="px-6 py-4">
                        <p className="font-bold">{order.number}</p>
                        {order.purchaseOrder && (
                          <p className="mt-1 text-[10px] text-ink/35">
                            PO {order.purchaseOrder}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-ink/55">
                        {order.items
                          .map(
                            (item) => `${item.skuSnapshot} ×${item.quantity}`,
                          )
                          .join(", ")}
                      </td>
                      <td className="px-4 py-4 text-ink/45">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.fulfilmentStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-4 py-4">
                        {order.invoice ? (
                          <a
                            className="font-bold text-forest underline"
                            href={`${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/invoices/${order.invoice.id}/document`}
                          >
                            {order.invoice.number}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatMoney(order.totalMinor, order.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          className="font-bold text-forest underline"
                          href={`/agent/orders/new?reorder=${order.id}`}
                        >
                          Reorder
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
