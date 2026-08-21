"use client";

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: Studio · enrichment: none */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import { csrfHeaders } from "@/lib/csrf";
import { useCartStore } from "@/stores/cart";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(10, "Enter a UK contact number"),
  line1: z.string().trim().min(4, "Enter your street address"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter your town or city"),
  county: z.string().trim().optional(),
  postcode: z.string().trim().min(5, "Enter a valid UK postcode"),
  deliveryMethodCode: z.string().min(1, "Choose a delivery method"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;
type Money = { amount: number };
type Quote = {
  lines: Array<{
    variantId: string;
    gross: Money;
    validation: { valid: boolean; message?: string };
  }>;
  subtotal: Money;
  vat: Money;
  total: Money;
  stockConfidence: "LIVE" | "PENDING_CONFIRMATION";
};
type DeliveryMethod = {
  code: string;
  name: string;
  description: string;
  priceMinor: number;
  freeThresholdMinor: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
};
type CheckoutSession = {
  orderId: string;
  number: string;
  paymentId: string;
  provider: "mock" | "stripe";
  clientSecret: string;
  amountMinor: number;
  currency: string;
  confirmationToken: string;
};
type ConfirmedOrder = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  totalMinor: number;
  deliveryMethodName?: string;
};

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message || "Checkout could not continue",
    );
  return body;
}

export function CheckoutFlow() {
  const { items, clear } = useCartStore();
  const checkoutKey = useRef<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryMethodCode: "standard" },
  });
  const selectedMethod = deliveryMethods.find(
    (method) => method.code === watch("deliveryMethodCode"),
  );
  const shippingMinor = selectedMethod
    ? selectedMethod.freeThresholdMinor !== null &&
      (quote?.total.amount ?? 0) >= selectedMethod.freeThresholdMinor
      ? 0
      : selectedMethod.priceMinor
    : 0;
  const payableMinor = (quote?.total.amount ?? 0) + shippingMinor;

  useEffect(() => {
    void fetch(`${API_URL}/payments/delivery-methods`, { cache: "no-store" })
      .then(readJson)
      .then((body) => setDeliveryMethods(body.data))
      .catch((cause) =>
        setSubmitError(
          cause instanceof Error
            ? cause.message
            : "Delivery methods are unavailable",
        ),
      );
  }, []);
  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    setQuoteError("");
    void fetch(`${API_URL}/pricing/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "B2C",
        items: items.map(({ variantId, quantity }) => ({
          variantId,
          quantity,
        })),
      }),
      signal: controller.signal,
    })
      .then(readJson)
      .then(setQuote)
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError"))
          setQuoteError(
            cause instanceof Error
              ? cause.message
              : "Pricing is temporarily unavailable",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoting(false);
      });
    return () => controller.abort();
  }, [items]);

  async function beginPayment(values: CheckoutValues) {
    if (!quote) return;
    setStartingPayment(true);
    setSubmitError("");
    try {
      const key = checkoutKey.current ?? crypto.randomUUID();
      checkoutKey.current = key;
      const body = await readJson(
        await fetch(`${API_URL}/payments/checkout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key,
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            email: values.email,
            deliveryMethodCode: values.deliveryMethodCode,
            deliveryAddress: {
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone,
              line1: values.line1,
              line2: values.line2 || undefined,
              city: values.city,
              county: values.county || undefined,
              postcode: values.postcode.toUpperCase(),
              countryCode: "GB",
            },
            items: items.map(({ variantId, quantity }) => ({
              variantId,
              quantity,
            })),
          }),
        }),
      );
      setSession(body);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Payment could not be started",
      );
    } finally {
      setStartingPayment(false);
    }
  }

  async function confirmMock() {
    if (!session) return;
    setStartingPayment(true);
    setSubmitError("");
    try {
      const order = await readJson(
        await fetch(`${API_URL}/payments/${session.paymentId}/mock-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmationToken: session.confirmationToken,
          }),
        }),
      );
      setConfirmed(order);
      clear();
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Payment confirmation failed",
      );
    } finally {
      setStartingPayment(false);
    }
  }

  if (confirmed) return <OrderSuccess order={confirmed} />;
  if (!items.length && !session)
    return (
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="surface p-12">
          <PackageCheck className="mx-auto size-8 text-forest" />
          <h1 className="display-safe mt-5 font-display text-4xl font-semibold">
            Your basket is empty.
          </h1>
          <p className="mt-3 text-sm text-ink/65">
            Choose a piece before beginning checkout.
          </p>
          <Link
            href="/shop"
            className={cn(buttonVariants({ size: "lg" }), "mt-7")}
          >
            Browse the collection
          </Link>
        </div>
      </section>
    );

  return (
    <section className="checkout-workbench mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <div className="mb-8 flex flex-col gap-5 border-b border-ink/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/cart"
            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink/65 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest active:translate-y-px"
          >
            <ArrowLeft className="size-4" /> Back to basket
          </Link>
          <h1 className="display-safe mt-5 font-display text-4xl font-semibold tracking-[-.035em] sm:text-5xl">
            Checkout, carefully handled.
          </h1>
        </div>
        <ol
          className="flex gap-2 text-xs font-semibold"
          aria-label="Checkout progress"
        >
          <li
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2",
              !session ? "bg-forest text-white" : "bg-forest/10 text-forest",
            )}
          >
            <span>{session ? <Check className="size-3.5" /> : "1"}</span>{" "}
            Delivery
          </li>
          <li
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2",
              session ? "bg-forest text-white" : "bg-ink/[.05] text-ink/65",
            )}
          >
            <span>2</span> Payment
          </li>
        </ol>
      </div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {!session ? (
            <form
              id="checkout-form"
              onSubmit={handleSubmit(beginPayment)}
              className="space-y-8"
            >
              <fieldset className="border-0 p-0">
                <legend className="font-display text-2xl font-semibold">
                  Where should it arrive?
                </legend>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  UK delivery details are checked before payment begins.
                </p>
                <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  {field("firstName", "First name", {
                    autoComplete: "given-name",
                  })}
                  {field("lastName", "Last name", {
                    autoComplete: "family-name",
                  })}
                  {field("email", "Email address", {
                    type: "email",
                    autoComplete: "email",
                    wide: true,
                  })}
                  {field("phone", "Contact number", {
                    type: "tel",
                    autoComplete: "tel",
                    wide: true,
                  })}
                  {field("line1", "Address line 1", {
                    autoComplete: "address-line1",
                    wide: true,
                  })}
                  {field("line2", "Address line 2 (optional)", {
                    autoComplete: "address-line2",
                    wide: true,
                  })}
                  {field("city", "Town or city", {
                    autoComplete: "address-level2",
                  })}
                  {field("county", "County (optional)", {
                    autoComplete: "address-level1",
                  })}
                  {field("postcode", "Postcode", {
                    autoComplete: "postal-code",
                  })}
                </div>
              </fieldset>
              <fieldset className="border-0 p-0">
                <legend className="font-display text-2xl font-semibold">
                  Choose delivery
                </legend>
                <div className="mt-5 grid gap-3">
                  {deliveryMethods.map((method) => {
                    const free =
                      method.freeThresholdMinor !== null &&
                      (quote?.total.amount ?? 0) >= method.freeThresholdMinor;
                    return (
                      <label
                        key={method.code}
                        className="group flex min-h-20 cursor-pointer items-start gap-4 rounded-2xl border border-ink/10 bg-white/45 p-4 hover:border-forest/30 has-[:checked]:border-forest/50 has-[:checked]:bg-forest/[.045]"
                      >
                        <input
                          type="radio"
                          value={method.code}
                          {...register("deliveryMethodCode")}
                          className="mt-1 size-4 accent-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                        />
                        <Truck className="mt-0.5 size-5 shrink-0 text-forest/65" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <b className="text-sm">{method.name}</b>
                            <b className="whitespace-nowrap text-sm">
                              {free
                                ? "Complimentary"
                                : formatMoney(method.priceMinor)}
                            </b>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-ink/65">
                            {method.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.deliveryMethodCode && (
                  <p className="mt-2 text-xs text-rose-700">
                    {errors.deliveryMethodCode.message}
                  </p>
                )}
              </fieldset>
            </form>
          ) : (
            <section className="rounded-[28px] border border-ink/10 bg-white/55 p-5 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
                  <LockKeyhole className="size-5" />
                </span>
                <div>
                  <h2 className="display-safe font-display text-3xl font-semibold">
                    Complete payment
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">
                    Order {session.number} remains a draft until the payment
                    provider confirms it.
                  </p>
                </div>
              </div>
              {session.provider === "mock" ? (
                <div className="mt-8 border-y border-ink/10 py-7">
                  <p className="text-sm font-semibold">
                    Local payment simulation
                  </p>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-ink/65">
                    No card details are collected in development. This control
                    emits the same verified payment event consumed by the order
                    state machine.
                  </p>
                  <Button
                    className="mt-6 w-full sm:w-auto"
                    size="lg"
                    disabled={startingPayment}
                    onClick={() => void confirmMock()}
                  >
                    {startingPayment ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    {startingPayment
                      ? "Confirming payment…"
                      : `Confirm test payment · ${formatMoney(session.amountMinor)}`}
                  </Button>
                </div>
              ) : stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: session.clientSecret,
                    appearance: { theme: "stripe" },
                  }}
                >
                  <StripePaymentPanel
                    session={session}
                    onError={setSubmitError}
                  />
                </Elements>
              ) : (
                <ErrorNotice message="Stripe checkout is active, but the public Stripe key is missing from the web application." />
              )}
              {submitError && <ErrorNotice message={submitError} />}
              <Button
                type="button"
                variant="ghost"
                className="-ml-4 mt-6"
                onClick={() => {
                  checkoutKey.current = null;
                  setSession(null);
                  setSubmitError("");
                }}
              >
                Change delivery details
              </Button>
            </section>
          )}
        </div>
        <OrderSummary
          items={items}
          quote={quote}
          quoteError={quoteError}
          quoting={quoting}
          shippingMinor={shippingMinor}
          payableMinor={payableMinor}
          session={session}
          startingPayment={startingPayment}
        />
      </div>
    </section>
  );

  function field(
    name: keyof CheckoutValues,
    label: string,
    options?: { type?: string; autoComplete?: string; wide?: boolean },
  ) {
    const error = errors[name];
    return (
      <label
        className={cn(
          "text-sm font-semibold",
          options?.wide && "sm:col-span-2",
        )}
      >
        {label}
        <input
          {...register(name)}
          className="field mt-2"
          type={options?.type}
          autoComplete={options?.autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <span
          id={`${name}-error`}
          className={cn(
            "mt-1.5 block min-h-4 text-xs",
            error ? "text-rose-700" : "text-transparent",
          )}
          aria-live="polite"
        >
          {error?.message ?? "Valid"}
        </span>
      </label>
    );
  }
}

function OrderSummary({
  items,
  quote,
  quoteError,
  quoting,
  shippingMinor,
  payableMinor,
  session,
  startingPayment,
}: {
  items: ReturnType<typeof useCartStore.getState>["items"];
  quote: Quote | null;
  quoteError: string;
  quoting: boolean;
  shippingMinor: number;
  payableMinor: number;
  session: CheckoutSession | null;
  startingPayment: boolean;
}) {
  return (
    <aside className="h-fit border-t border-ink/15 pt-7 lg:sticky lg:top-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <h2 className="display-safe font-display text-3xl font-semibold">
        Order summary
      </h2>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span className="min-w-0 text-ink/65">
              <b className="block truncate font-semibold text-ink">
                {item.name}
              </b>
              {item.sku} × {item.quantity}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatMoney(
                quote?.lines.find((line) => line.variantId === item.variantId)
                  ?.gross.amount ?? item.price * item.quantity,
              )}
            </span>
          </div>
        ))}
      </div>
      {quoting && (
        <div className="mt-5 flex items-center gap-2 text-xs text-ink/65">
          <LoaderCircle className="size-4 animate-spin" /> Verifying price and
          stock…
        </div>
      )}
      {quoteError && <ErrorNotice message={quoteError} />}
      {quote && (
        <>
          <dl className="mt-6 space-y-3 border-y border-ink/10 py-5 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-ink/65">Excluding VAT</dt>
              <dd>{formatMoney(quote.subtotal.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/65">VAT</dt>
              <dd>{formatMoney(quote.vat.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/65">Delivery</dt>
              <dd>
                {shippingMinor === 0
                  ? "Complimentary"
                  : formatMoney(shippingMinor)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-semibold tabular-nums">
              {formatMoney(payableMinor)}
            </span>
          </div>
          {quote.stockConfidence === "PENDING_CONFIRMATION" && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Stock will be confirmed by operations after payment.
            </p>
          )}
        </>
      )}
      {!session && (
        <Button
          form="checkout-form"
          className="mt-7 w-full"
          size="lg"
          disabled={
            !quote ||
            quoting ||
            startingPayment ||
            quote?.lines.some((line) => !line.validation.valid)
          }
        >
          {startingPayment ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {startingPayment ? "Starting secure payment…" : "Continue to payment"}
        </Button>
      )}
      <div className="mt-5 flex items-start gap-3 text-xs leading-5 text-ink/65">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest" />
        <p>
          Authoritative pricing and availability are checked again before the
          payment session is created.
        </p>
      </div>
    </aside>
  );
}

function StripePaymentPanel({
  session,
  onError,
}: {
  session: CheckoutSession;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  async function confirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    onError("");
    const returnUrl = `${window.location.origin}/checkout/confirmation?order=${encodeURIComponent(session.orderId)}&token=${encodeURIComponent(session.confirmationToken)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (result.error)
      onError(
        result.error.message ||
          "Stripe could not confirm the payment. Check the payment details and try again.",
      );
    setBusy(false);
  }
  return (
    <div className="mt-8">
      <PaymentElement />
      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={!stripe || busy}
        onClick={() => void confirm()}
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ShieldCheck className="size-4" />
        )}
        {busy
          ? "Confirming with Stripe…"
          : `Pay ${formatMoney(session.amountMinor)}`}
      </Button>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}
export function OrderSuccess({ order }: { order: ConfirmedOrder }) {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <div className="border-y border-ink/15 py-10 text-left sm:py-14">
        <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="display-safe mt-7 font-display text-5xl font-semibold tracking-[-.03em]">
          Payment confirmed.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-ink/65">
          Order <strong className="text-ink">{order.number}</strong> is now with
          the Gemjar operations team. We’ll send dispatch and tracking updates
          to the checkout email address.
        </p>
        <dl className="mt-8 grid gap-4 border-y border-ink/10 py-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink/65">Payment</dt>
            <dd className="mt-1 font-semibold">{order.paymentStatus}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/65">Delivery</dt>
            <dd className="mt-1 font-semibold">
              {order.deliveryMethodName || "Tracked delivery"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink/65">Total</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {formatMoney(order.totalMinor)}
            </dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/account/orders"
            className={buttonVariants({ size: "lg" })}
          >
            View order history <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/shop"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
