"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderSuccess } from "@/components/checkout-flow";
import { useCartStore } from "@/stores/cart";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Order = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  totalMinor: number;
  deliveryMethodName?: string;
};

export function OrderConfirmation() {
  const search = useSearchParams();
  const orderId = search.get("order");
  const token = search.get("token");
  const clear = useCartStore((state) => state.clear);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!orderId || !token) {
      setError(
        "This confirmation link is incomplete. Return to your basket and try checkout again.",
      );
      return;
    }
    let active = true;
    let attempts = 0;
    let timer: number | undefined;
    const load = async () => {
      try {
        const response = await fetch(
          `${API_URL}/payments/orders/${encodeURIComponent(orderId)}/confirmation`,
          { headers: { "X-Confirmation-Token": token }, cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.message || "Order confirmation could not be loaded",
          );
        if (!active) return;
        setOrder(body);
        if (body.paymentStatus === "PAID") {
          clear();
          return;
        }
        if (body.paymentStatus === "FAILED") {
          setError(
            "The payment was not completed. Return to checkout and try another payment method.",
          );
          return;
        }
        if (++attempts < 20) timer = window.setTimeout(load, 1500);
        else
          setError(
            "Payment is still being confirmed. Refresh this page in a moment; your order reference is held safely.",
          );
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Order confirmation could not be loaded",
          );
      }
    };
    void load();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [clear, orderId, token]);
  if (order?.paymentStatus === "PAID") return <OrderSuccess order={order} />;
  return (
    <section className="mx-auto max-w-xl px-5 py-24">
      <div className="border-y border-ink/15 py-12 text-center">
        {error ? (
          <>
            <AlertCircle className="mx-auto size-7 text-rose-700" />
            <h1 className="display-safe mt-5 font-display text-4xl font-semibold">
              Confirmation needs attention.
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/65">{error}</p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto size-7 animate-spin text-forest" />
            <h1 className="display-safe mt-5 font-display text-4xl font-semibold">
              Confirming your payment.
            </h1>
            <p className="mt-4 text-sm text-ink/65">
              Keep this page open while the payment provider completes its
              verified response.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
