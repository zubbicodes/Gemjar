"use client";

import { PackageCheck, Truck } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
  formatDateTime,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

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

type Outstanding = {
  orderItemId: string;
  sku: string;
  name: string;
  ordered: number;
  shipped: number;
  remaining: number;
};

type Shipment = {
  id: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: string | null;
  items: Array<{
    quantity: number;
    orderItem: { skuSnapshot: string; nameSnapshot: string };
  }>;
  trackingEvents: Array<{
    id: string;
    status: string;
    detail: string | null;
    occurredAt: string;
  }>;
};

type ShipmentView = {
  data: Shipment[];
  outstanding: Outstanding[];
  fulfilmentStatus: string;
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: "DISPATCHED",
  DISPATCHED: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
};

export function FulfilmentConsole() {
  const orders = useApi<{ data: OrderRow[] }>("/orders");
  const [selected, setSelected] = useState<OrderRow | null>(null);

  const open = (orders.data?.data ?? []).filter(
    (order) =>
      order.fulfilmentStatus !== "FULFILLED" && order.status !== "CANCELLED",
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="surface overflow-hidden">
        <PanelHeading
          title="Open orders"
          description="Everything still awaiting dispatch, newest first."
        />
        {orders.loading ? (
          <LoadingRow />
        ) : orders.error ? (
          <ErrorRow message={orders.error} />
        ) : !open.length ? (
          <EmptyRow message="Every order has been fully dispatched." />
        ) : (
          <ul className="divide-y divide-ink/[.06]">
            {open.map((order) => (
              <li key={order.id}>
                <button
                  onClick={() => setSelected(order)}
                  aria-current={selected?.id === order.id}
                  className={`flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-forest/[.04] ${selected?.id === order.id ? "bg-forest/[.06]" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{order.number}</p>
                    <p className="mt-1 truncate text-[11px] text-ink/45">
                      {order.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-semibold">
                      {formatMoney(order.totalMinor, order.currency)}
                    </span>
                    <StatusBadge status={order.fulfilmentStatus} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <OrderFulfilment
          key={selected.id}
          order={selected}
          onChanged={() => void orders.reload()}
        />
      ) : (
        <section className="surface grid place-items-center p-10 text-xs text-ink/45">
          Select an order to prepare a shipment.
        </section>
      )}
    </div>
  );
}

function OrderFulfilment({
  order,
  onChanged,
}: {
  order: OrderRow;
  onChanged: () => void;
}) {
  const view = useApi<ShipmentView>(`/orders/${order.id}/shipments`);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [carrier, setCarrier] = useState("DPD");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lines = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

  async function createShipment() {
    setBusy(true);
    setError("");
    try {
      await apiSend(`/orders/${order.id}/shipments`, "POST", {
        lines,
        carrier: carrier.trim() || undefined,
        trackingNumber: tracking.trim() || undefined,
      });
      setQuantities({});
      setTracking("");
      await view.reload();
      onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the shipment",
      );
    } finally {
      setBusy(false);
    }
  }

  async function advance(shipment: Shipment) {
    setBusy(true);
    setError("");
    try {
      await apiSend(`/shipments/${shipment.id}`, "PATCH", {
        status: NEXT_STATUS[shipment.status],
      });
      await view.reload();
      onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update the shipment",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title={order.number}
        description="Ship any part of the outstanding quantity; the order status follows what has actually shipped."
        action={
          <StatusBadge
            status={view.data?.fulfilmentStatus ?? order.fulfilmentStatus}
          />
        }
      />
      {view.loading ? (
        <LoadingRow />
      ) : view.error ? (
        <ErrorRow message={view.error} />
      ) : (
        <div className="space-y-6 p-6">
          <div>
            <p className="portal-label">Outstanding lines</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-ink/38">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2">Ordered</th>
                    <th className="py-2">Shipped</th>
                    <th className="py-2">Remaining</th>
                    <th className="py-2 text-right">Ship now</th>
                  </tr>
                </thead>
                <tbody>
                  {view.data?.outstanding.map((line) => (
                    <tr
                      key={line.orderItemId}
                      className="border-t border-ink/[.06]"
                    >
                      <td className="py-3">
                        <p className="font-semibold">{line.name}</p>
                        <p className="text-[10px] text-ink/40">{line.sku}</p>
                      </td>
                      <td className="py-3">{line.ordered}</td>
                      <td className="py-3">{line.shipped}</td>
                      <td className="py-3 font-bold">{line.remaining}</td>
                      <td className="py-3 text-right">
                        <label
                          className="sr-only"
                          htmlFor={`ship-${line.orderItemId}`}
                        >{`Quantity to ship for ${line.sku}`}</label>
                        <input
                          id={`ship-${line.orderItemId}`}
                          type="number"
                          min={0}
                          max={line.remaining}
                          disabled={!line.remaining}
                          value={quantities[line.orderItemId] ?? ""}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [line.orderItemId]: Math.min(
                                Number(event.target.value) || 0,
                                line.remaining,
                              ),
                            }))
                          }
                          className="field h-9 w-20 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink/[.07] bg-white/45 p-4">
            <div className="flex-1 min-w-[140px]">
              <label className="portal-label" htmlFor="carrier">
                Carrier
              </label>
              <input
                id="carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
                className="field mt-2 h-9"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="portal-label" htmlFor="tracking">
                Tracking number
              </label>
              <input
                id="tracking"
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                placeholder="Optional"
                className="field mt-2 h-9"
              />
            </div>
            <Button
              size="sm"
              disabled={!lines.length || busy}
              onClick={createShipment}
            >
              <PackageCheck className="size-3.5" /> Create shipment
            </Button>
          </div>
          {error && <ErrorRow message={error} />}

          <div>
            <p className="portal-label">Shipments</p>
            {!view.data?.data.length ? (
              <p className="mt-3 text-xs text-ink/45">
                Nothing dispatched yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {view.data.data.map((shipment) => (
                  <article
                    key={shipment.id}
                    className="rounded-2xl border border-ink/[.07] bg-white/45 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold">
                          {shipment.carrier ?? "Carrier pending"} ·{" "}
                          {shipment.trackingNumber ?? "no tracking"}
                        </p>
                        <p className="mt-1 text-[10px] text-ink/40">
                          {shipment.items
                            .map(
                              (item) =>
                                `${item.orderItem.skuSnapshot} ×${item.quantity}`,
                            )
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={shipment.status} />
                        {NEXT_STATUS[shipment.status] ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => advance(shipment)}
                          >
                            <Truck className="size-3.5" /> Mark{" "}
                            {NEXT_STATUS[
                              shipment.status
                            ]!.toLowerCase().replaceAll("_", " ")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {shipment.trackingEvents.length > 0 && (
                      <ol className="mt-4 space-y-2 border-l border-ink/10 pl-4">
                        {shipment.trackingEvents.map((event) => (
                          <li
                            key={event.id}
                            className="text-[10px] text-ink/50"
                          >
                            <span className="font-bold text-ink/70">
                              {event.status.replaceAll("_", " ").toLowerCase()}
                            </span>{" "}
                            · {formatDateTime(event.occurredAt)}
                            {event.detail && (
                              <span className="block text-ink/40">
                                {event.detail}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
