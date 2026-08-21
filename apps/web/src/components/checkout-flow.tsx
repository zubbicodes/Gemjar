"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, PackageCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  email: z.email("Enter a valid email address"),
  line1: z.string().trim().min(4, "Enter your street address"),
  city: z.string().trim().min(2, "Enter your town or city"),
  postcode: z.string().trim().min(5, "Enter a valid postcode"),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;
type Quote = {
  lines: Array<{ variantId: string; sku: string; name: string; quantity: number; gross: { amount: number }; validation: { valid: boolean; message?: string } }>;
  subtotal: { amount: number };
  vat: { amount: number };
  total: { amount: number };
  stockConfidence: "LIVE" | "PENDING_CONFIRMATION";
};

export function CheckoutFlow() {
  const { items, clear } = useCartStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [order, setOrder] = useState<{ number: string; status: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutValues>({ resolver: zodResolver(checkoutSchema) });

  useEffect(() => {
    if (!items.length) { setQuote(null); return; }
    const controller = new AbortController();
    setQuoting(true); setQuoteError("");
    void fetch(`${API_URL}/pricing/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "B2C", items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })) }),
      signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(". ") : body.message || "Pricing is temporarily unavailable");
      setQuote(body);
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setQuoteError(cause instanceof Error ? cause.message : "Pricing is temporarily unavailable");
    }).finally(() => setQuoting(false));
    return () => controller.abort();
  }, [items]);

  async function placeOrder(values: CheckoutValues) {
    if (!quote) return;
    setSubmitError("");
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        channel: "B2C",
        email: values.email,
        deliveryAddress: { firstName: values.firstName, lastName: values.lastName, line1: values.line1, city: values.city, postcode: values.postcode.toUpperCase(), country: "GB" },
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      }),
    });
    const body = await response.json();
    if (!response.ok) { setSubmitError(Array.isArray(body.message) ? body.message.join(". ") : body.message || "We could not place your order"); return; }
    setOrder({ number: body.number, status: body.status });
    clear();
  }

  if (order) return <section className="mx-auto max-w-2xl px-5 py-20 text-center"><div className="surface p-10 sm:p-14"><div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-7" /></div><p className="eyebrow mt-7">Order received</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.03em]">Thank you.</h1><p className="mt-5 text-sm leading-6 text-ink/55">Order <strong className="text-ink">{order.number}</strong> has been created and is visible to the operations team.</p><div className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">This development environment records the order with payment pending. Stripe confirmation will replace this step when client credentials are connected.</div><Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>Continue shopping <ArrowRight className="size-4" /></Link></div></section>;

  if (!items.length) return <section className="mx-auto max-w-2xl px-5 py-20 text-center"><div className="surface p-12"><PackageCheck className="mx-auto size-8 text-forest" /><h1 className="mt-5 font-display text-4xl font-semibold">Your basket is empty.</h1><Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-7")}>Browse the collection</Link></div></section>;

  const field = (name: keyof CheckoutValues, label: string, options?: { type?: string; autoComplete?: string; wide?: boolean }) => <label className={cn("text-xs font-semibold", options?.wide && "sm:col-span-2")}>{label}<input {...register(name)} className="field mt-2" type={options?.type} autoComplete={options?.autoComplete} aria-invalid={Boolean(errors[name])} />{errors[name] && <span className="mt-1.5 block text-[10px] text-rose-700">{errors[name]?.message}</span>}</label>;

  return <section className="mx-auto grid max-w-[1100px] gap-8 px-5 py-10 lg:grid-cols-[1fr_400px]"><div><Link href="/cart" className="text-xs font-semibold text-ink/55">← Back to basket</Link><h1 className="mt-8 font-display text-5xl font-semibold">Delivery details</h1><form id="checkout-form" onSubmit={handleSubmit(placeOrder)} className="mt-8 grid gap-4 rounded-[28px] bg-white/60 p-6 shadow-soft sm:grid-cols-2 sm:p-8">{field("firstName", "First name", { autoComplete: "given-name" })}{field("lastName", "Last name", { autoComplete: "family-name" })}{field("email", "Email", { type: "email", autoComplete: "email", wide: true })}{field("line1", "Address", { autoComplete: "street-address", wide: true })}{field("city", "Town or city", { autoComplete: "address-level2" })}{field("postcode", "Postcode", { autoComplete: "postal-code" })}</form></div><aside className="surface h-fit p-7 lg:mt-16"><p className="eyebrow">Verified summary</p><h2 className="mt-3 font-display text-3xl font-semibold">Your order</h2><div className="mt-6 space-y-4">{items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-xs"><span className="text-ink/55">{item.name} × {item.quantity}</span><span className="font-semibold">{formatMoney(quote?.lines.find((line) => line.variantId === item.variantId)?.gross.amount ?? item.price * item.quantity)}</span></div>)}</div>{quoting && <div className="mt-5 flex items-center gap-2 text-xs text-ink/45"><LoaderCircle className="size-4 animate-spin" /> Verifying price and stock…</div>}{quoteError && <div className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4 shrink-0" />{quoteError}</div>}{quote && <><dl className="mt-6 space-y-3 border-y border-ink/10 py-5 text-sm"><div className="flex justify-between"><dt className="text-ink/50">Excluding VAT</dt><dd>{formatMoney(quote.subtotal.amount)}</dd></div><div className="flex justify-between"><dt className="text-ink/50">VAT</dt><dd>{formatMoney(quote.vat.amount)}</dd></div><div className="flex justify-between"><dt className="text-ink/50">Delivery</dt><dd>Complimentary</dd></div></dl><div className="mt-5 flex items-end justify-between"><span className="font-semibold">Total</span><span className="font-display text-3xl font-semibold">{formatMoney(quote.total.amount)}</span></div>{quote.stockConfidence === "PENDING_CONFIRMATION" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] leading-4 text-amber-900">Stock will be confirmed by our operations team after submission.</p>}</>}{submitError && <div className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="size-4 shrink-0" />{submitError}</div>}<Button form="checkout-form" className="mt-6 w-full" size="lg" disabled={!quote || quoting || isSubmitting}>{isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{isSubmitting ? "Placing order…" : "Place secure order"}</Button><p className="mt-4 text-center text-[10px] leading-4 text-ink/40">The server revalidates price, VAT, stock and quantity rules before creating your order.</p></aside></section>;
}
