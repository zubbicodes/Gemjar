"use client";

import { FileText, PackageCheck, Plus, Repeat2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  accountNumber?: string;
  membershipRole: string;
};

type TradeOrder = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalMinor: number;
  currency: string;
  purchaseOrder: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    totalMinor: number;
  }>;
  invoice: {
    id: string;
    number: string;
    issuedAt: string;
    totalMinor: number;
  } | null;
  agent: { user: { firstName: string; lastName: string } } | null;
  shipments: Array<{
    id: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingEvents: Array<{
      id: string;
      status: string;
      detail: string | null;
      occurredAt: string;
    }>;
  }>;
};

type Invoice = {
  id: string;
  number: string;
  totalMinor: number;
  issuedAt: string;
  order: { number: string; purchaseOrder: string | null };
};

/** Resolves the signed-in buyer's organization before loading scoped data. */
function useOrganization() {
  const organizations = useApi<{ data: Organization[] }>(
    "/organizations/current",
  );
  return {
    organization: organizations.data?.data[0] ?? null,
    loading: organizations.loading,
    error: organizations.error,
  };
}

export function TradeOrders() {
  const { organization, loading, error } = useOrganization();
  const orders = useApi<{ data: TradeOrder[]; outstandingMinor: number }>(
    organization ? `/orders/organization/${organization.id}` : null,
  );

  if (loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (error)
    return (
      <section className="surface">
        <ErrorRow message={error} />
      </section>
    );

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Order history"
        description="Every order placed by your team or your Gemjar account manager."
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
        <EmptyRow message="No orders yet. Use quick order to build your first one." />
      ) : (
        <ul className="divide-y divide-ink/[.06]">
          {orders.data.data.map((order) => (
            <li key={order.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">{order.number}</p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    {formatDate(order.createdAt)}
                    {order.purchaseOrder ? ` · PO ${order.purchaseOrder}` : ""}
                    {order.agent
                      ? ` · placed by ${order.agent.user.firstName} ${order.agent.user.lastName}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.fulfilmentStatus} />
                  <StatusBadge status={order.paymentStatus} />
                  <span className="ml-2 text-sm font-bold">
                    {formatMoney(order.totalMinor, order.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="portal-label">Items</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-ink/60">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-4">
                        <span>
                          {item.nameSnapshot}{" "}
                          <span className="text-ink/35">
                            {item.skuSnapshot}
                          </span>{" "}
                          × {item.quantity}
                        </span>
                        <span className="font-semibold">
                          {formatMoney(item.totalMinor, order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="portal-label">Delivery</p>
                  {!order.shipments.length ? (
                    <p className="mt-2 text-[11px] text-ink/45">
                      Awaiting dispatch.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {order.shipments.map((shipment) => (
                        <li
                          key={shipment.id}
                          className="rounded-xl border border-ink/[.07] bg-white/45 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold">
                              {shipment.carrier ?? "Carrier pending"} ·{" "}
                              {shipment.trackingNumber ?? "no tracking"}
                            </span>
                            <StatusBadge status={shipment.status} />
                          </div>
                          {shipment.trackingEvents.slice(-1).map((event) => (
                            <p
                              key={event.id}
                              className="mt-1 text-[10px] text-ink/45"
                            >
                              {event.detail ?? event.status} ·{" "}
                              {formatDateTime(event.occurredAt)}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                  {order.invoice && (
                    <p className="mt-3 flex items-center gap-2 text-[11px] text-ink/55">
                      <FileText className="size-3.5" /> Invoice{" "}
                      {order.invoice.number} ·{" "}
                      {formatMoney(order.invoice.totalMinor)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Link href={`/trade/quick-order?reorder=${order.id}`}>
                  <Button size="sm" variant="secondary">
                    <Repeat2 className="size-3.5" /> Reorder these items
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TradeInvoices() {
  const { organization, loading, error } = useOrganization();
  const invoices = useApi<{ data: Invoice[]; outstandingMinor: number }>(
    organization ? `/invoices?organizationId=${organization.id}` : null,
  );

  if (loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (error)
    return (
      <section className="surface">
        <ErrorRow message={error} />
      </section>
    );

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Invoices"
        description="Invoice history for your trade account, issued against your agreed payment terms."
      />
      {invoices.loading ? (
        <LoadingRow />
      ) : invoices.error ? (
        <ErrorRow message={invoices.error} />
      ) : !invoices.data?.data.length ? (
        <EmptyRow message="No invoices have been issued yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38">
              <tr>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">PO</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.data.data.map((invoice) => (
                <tr key={invoice.id} className="border-t border-ink/[.06]">
                  <td className="px-6 py-4 font-bold">
                    <a
                      className="text-forest underline"
                      href={`${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/invoices/${invoice.id}/document`}
                    >
                      {invoice.number}
                    </a>
                  </td>
                  <td className="px-4 py-4">{invoice.order.number}</td>
                  <td className="px-4 py-4 text-ink/50">
                    {invoice.order.purchaseOrder ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-ink/50">
                    {formatDate(invoice.issuedAt)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {formatMoney(invoice.totalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TradeTeam() {
  const organizations = useApi<{
    data: Array<
      Organization & {
        memberships: Array<{
          role: string;
          user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
          };
        }>;
        addresses: Array<{
          id: string;
          label: string | null;
          line1: string;
          city: string;
          postcode: string;
        }>;
      }
    >;
  }>("/organizations/current");
  const organization = organizations.data?.data[0];
  const canManage = organization?.membershipRole === "OWNER";
  const [form, setForm] = useState<"member" | "address" | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    const values = new FormData(event.currentTarget);
    setBusy("member");
    setError("");
    try {
      await apiSend(`/organizations/${organization.id}/members`, "POST", {
        email: values.get("email"),
        role: values.get("role"),
      });
      setForm(null);
      await organizations.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add member");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(userId: string) {
    if (!organization) return;
    setBusy(userId);
    setError("");
    try {
      await apiSend(
        `/organizations/${organization.id}/members/${userId}`,
        "DELETE",
      );
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove member",
      );
    } finally {
      setBusy("");
    }
  }

  async function addAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    const element = event.currentTarget;
    setBusy("address");
    setError("");
    try {
      await apiSend(
        `/organizations/${organization.id}/addresses`,
        "POST",
        Object.fromEntries(new FormData(element).entries()),
      );
      element.reset();
      setForm(null);
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add address",
      );
    } finally {
      setBusy("");
    }
  }

  async function removeAddress(addressId: string) {
    if (!organization) return;
    setBusy(addressId);
    setError("");
    try {
      await apiSend(
        `/organizations/${organization.id}/addresses/${addressId}`,
        "DELETE",
      );
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove address",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Account team"
        description="Owners can place orders and manage members; viewers have read-only access."
        action={
          canManage ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setForm("address")}
              >
                <Plus className="size-3.5" /> Address
              </Button>
              <Button size="sm" onClick={() => setForm("member")}>
                <Plus className="size-3.5" /> Member
              </Button>
            </div>
          ) : undefined
        }
      />
      {error && <ErrorRow message={error} />}
      {form === "member" && (
        <form
          onSubmit={addMember}
          className="m-5 grid gap-3 rounded-2xl border border-forest/15 bg-forest/[.035] p-5 sm:grid-cols-[1fr_160px_auto]"
        >
          <input
            name="email"
            type="email"
            className="field"
            placeholder="Existing user email"
            required
          />
          <select name="role" className="field" defaultValue="BUYER">
            <option value="OWNER">Owner</option>
            <option value="BUYER">Buyer</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy === "member"}>
              {busy === "member" ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Close"
              onClick={() => setForm(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </form>
      )}
      {form === "address" && (
        <form
          onSubmit={addAddress}
          className="m-5 grid gap-3 rounded-2xl border border-forest/15 bg-forest/[.035] p-5 sm:grid-cols-2"
        >
          <input name="label" className="field" placeholder="Label" required />
          <input
            name="recipient"
            className="field"
            placeholder="Recipient"
            required
          />
          <input
            name="line1"
            className="field sm:col-span-2"
            placeholder="Address line 1"
            required
          />
          <input
            name="line2"
            className="field sm:col-span-2"
            placeholder="Address line 2"
          />
          <input
            name="city"
            className="field"
            placeholder="Town or city"
            required
          />
          <input name="county" className="field" placeholder="County" />
          <input
            name="postcode"
            className="field uppercase"
            placeholder="Postcode"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={busy === "address"}>
              {busy === "address" ? "Adding…" : "Add address"}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Close"
              onClick={() => setForm(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </form>
      )}
      {organizations.loading ? (
        <LoadingRow />
      ) : organizations.error ? (
        <ErrorRow message={organizations.error} />
      ) : !organization?.memberships?.length ? (
        <EmptyRow message="No team members are recorded for this account." />
      ) : (
        <>
          <ul className="divide-y divide-ink/[.06]">
            {organization.memberships.map((membership) => (
              <li
                key={membership.user.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="text-xs font-bold">
                    {membership.user.firstName} {membership.user.lastName}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    {membership.user.email}
                  </p>
                </div>
                <StatusBadge status={membership.role} />
                {canManage && membership.user.id !== undefined && (
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Remove ${membership.user.firstName}`}
                    disabled={busy === membership.user.id}
                    onClick={() => void removeMember(membership.user.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {organization.addresses?.length > 0 && (
            <div className="border-t border-ink/[.07] p-6">
              <p className="portal-label">Delivery addresses</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {organization.addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-2xl border border-ink/[.07] bg-white/45 p-4 text-[11px]"
                  >
                    <p className="flex items-center gap-2 font-bold">
                      <PackageCheck className="size-3.5" />
                      {address.label ?? "Delivery address"}
                    </p>
                    <p className="mt-2 text-ink/55">
                      {address.line1}, {address.city}, {address.postcode}
                    </p>
                    {canManage && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="secondary"
                        disabled={busy === address.id}
                        onClick={() => void removeAddress(address.id)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
