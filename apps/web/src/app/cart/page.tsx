"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney, cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

export default function CartPage() {
  const { items, remove, setQuantity } = useCartStore();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <main><SiteHeader /><section className="mx-auto max-w-[1200px] px-5 py-14 lg:px-10 lg:py-20">
    <p className="eyebrow">Your selection</p><h1 className="mt-3 font-display text-6xl font-semibold tracking-[-0.04em]">The basket</h1>
    {items.length === 0 ? <div className="mt-10 surface p-12 text-center"><p className="font-display text-3xl">Your basket is waiting.</p><p className="mt-3 text-sm text-ink/50">Explore colourful socks, cosy layers and gifts.</p><Link href="/shop" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-7")}>Shop the collection</Link></div> :
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">{items.map((item) => <article key={item.id} className="surface flex gap-5 p-4 sm:p-5"><div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-mist sm:size-36"><Image src={item.image} alt="" fill className="object-cover" /></div><div className="flex min-w-0 flex-1 flex-col py-1"><p className="text-[10px] uppercase tracking-wider text-ink/40">{item.sku}</p><h2 className="mt-2 font-display text-2xl font-semibold">{item.name}</h2><p className="mt-1 text-sm font-semibold">{formatMoney(item.price)}</p><div className="mt-auto flex items-center justify-between"><div className="flex items-center rounded-full border border-ink/10"><Button variant="ghost" size="icon" onClick={() => setQuantity(item.id, item.quantity - 1)}><Minus className="size-3" /></Button><span className="w-7 text-center text-xs font-bold">{item.quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity(item.id, item.quantity + 1)}><Plus className="size-3" /></Button></div><button onClick={() => remove(item.id)} className="p-2 text-ink/35 hover:text-rose-700" aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></button></div></div></article>)}</div>
      <aside className="surface h-fit p-7"><h2 className="font-display text-3xl font-semibold">Order summary</h2><dl className="mt-6 space-y-3 border-b border-ink/10 pb-5 text-sm"><div className="flex justify-between"><dt className="text-ink/50">Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div><div className="flex justify-between"><dt className="text-ink/50">Delivery</dt><dd>{subtotal >= 15000 ? "Complimentary" : "Calculated next"}</dd></div><div className="flex justify-between"><dt className="text-ink/50">Includes VAT</dt><dd>{formatMoney(Math.round(subtotal / 6))}</dd></div></dl><div className="mt-5 flex items-end justify-between"><span className="font-semibold">Total</span><span className="font-display text-3xl font-semibold">{formatMoney(subtotal)}</span></div><Link href="/checkout" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-7 w-full")}>Secure checkout <ArrowRight className="size-4" /></Link><p className="mt-4 text-center text-[10px] leading-4 text-ink/40">Final pricing and availability are verified securely at checkout.</p></aside>
    </div>}
  </section></main>;
}
