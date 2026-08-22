"use client";

import {
  AlertCircle,
  Box,
  LoaderCircle,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { CustomerRequestActions } from "@/components/service-requests";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Order = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalMinor: number;
  currency: string;
  deliveryMethodName?: string;
  createdAt: string;
  invoice?: { id: string; number: string } | null;
  items: Array<{
    id: string;
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    totalMinor: number;
  }>;
  events: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  shipments: Array<{
    id: string;
    status: string;
    carrier?: string;
    trackingNumber?: string;
  }>;
};

export function ConsumerOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cart = useCartStore();
  const router = useRouter();
  async function reorder(orderId: string) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/reorder`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to reorder");
      cart.clear();
      for (const item of body.items) {
        cart.add(item.product);
        cart.setQuantity(item.product.id, item.quantity);
      }
      await cart.sync();
      router.push("/bag");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reorder");
    }
  }
  useEffect(() => {
    void fetch(`${API_URL}/orders/mine`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message || "Order history could not be loaded");
        setOrders(body.data);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Order history could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="surface flex items-center justify-center gap-2 p-12 text-sm text-ink/65">
        <LoaderCircle className="size-4 animate-spin" /> Loading your orders…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="surface flex gap-3 p-6 text-sm text-rose-800"
      >
        <AlertCircle className="size-5 shrink-0" />
        {error}
      </div>
    );
  if (!orders.length)
    return (
      <div className="surface p-12 text-center">
        <Box className="mx-auto size-7 text-ink/50" />
        <h2 className="display-safe mt-5 font-display text-3xl font-semibold">
          No orders yet.
        </h2>
        <p className="mt-2 text-sm text-ink/65">
          Completed purchases will appear here with payment and delivery
          updates.
        </p>
      </div>
    );
  return (
    <div className="space-y-5">
      {orders.map((order) => (
        <article key={order.id} className="surface overflow-hidden">
          <header className="flex flex-col gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="display-safe font-display text-2xl font-semibold">
                  {order.number}
                </h2>
                <Badge tone={order.paymentStatus === "PAID" ? "good" : "warn"}>
                  {order.paymentStatus}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink/65">
                Placed{" "}
                {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
                  new Date(order.createdAt),
                )}{" "}
                · {order.deliveryMethodName || "Tracked delivery"}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void reorder(order.id)}
            >
              Buy again
            </Button>
            {order.invoice && (
              <a
                className="text-xs font-bold text-forest underline"
                href={`${API_URL}/invoices/${order.invoice.id}/document`}
              >
                Download invoice {order.invoice.number}
              </a>
            )}
            <p className="font-display text-3xl font-semibold tabular-nums">
              {formatMoney(order.totalMinor, order.currency)}
            </p>
          </header>
          <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
            <div>
              <h3 className="text-sm font-bold">Products</h3>
              <div className="mt-4 divide-y divide-ink/[.07]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span>
                      <b className="block">{item.nameSnapshot}</b>
                      <span className="text-xs text-ink/65">
                        {item.skuSnapshot} × {item.quantity}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(item.totalMinor, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-ink/10 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                {order.fulfilmentStatus === "FULFILLED" ? (
                  <PackageCheck className="size-4 text-forest" />
                ) : (
                  <Truck className="size-4 text-forest" />
                )}{" "}
                Progress
              </h3>
              <ol className="mt-4 space-y-4">
                {order.events.map((event, index) => (
                  <li
                    key={event.id}
                    className="grid grid-cols-[10px_1fr] gap-3"
                  >
                    <span className="mt-1.5 size-2 rounded-full bg-forest" />
                    <span>
                      <b className="block text-xs">{event.message}</b>
                      <span className="mt-1 block text-xs text-ink/65">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(event.createdAt))}
                      </span>
                      {index < order.events.length - 1 && (
                        <span className="ml-[3px] mt-2 block h-4 w-px bg-ink/10" />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {order.shipments[0]?.trackingNumber && (
                <p className="mt-5 rounded-xl bg-forest/[.05] p-3 text-xs">
                  <b>{order.shipments[0].carrier}</b>
                  <br />
                  {order.shipments[0].trackingNumber}
                </p>
              )}
            </div>
          </div>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <CustomerRequestActions
              orderId={order.id}
              status={order.status}
              fulfilmentStatus={order.fulfilmentStatus}
              items={order.items}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
