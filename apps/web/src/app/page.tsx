import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Gem,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getProducts } from "@/lib/api";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const products = await getProducts();
  return (
    <main>
      <SiteHeader />
      <section className="relative min-h-[720px] overflow-hidden bg-[#0c1e19] text-white lg:min-h-[calc(100vh-106px)]">
        <Image
          src="/images/gemjar-hero.png"
          alt="Gold jewellery and emeralds arranged on sculptural stone plinths"
          fill
          priority
          className="object-cover object-[62%_center] opacity-90"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,18,15,.94)_0%,rgba(6,18,15,.82)_34%,rgba(6,18,15,.18)_70%,rgba(6,18,15,.12)_100%)]" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1440px] items-end px-5 pb-16 pt-32 lg:min-h-[calc(100vh-106px)] lg:items-center lg:px-10 lg:pb-20 lg:pt-20">
          <div className="max-w-[670px] animate-fade-up">
            <div className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.26em] text-white/62">
              <span className="h-px w-10 bg-gold" /> The autumn atelier
            </div>
            <h1 className="font-display text-[64px] font-medium leading-[0.92] tracking-[-0.045em] sm:text-[82px] lg:text-[102px]">
              Objects of quiet{" "}
              <em className="font-medium text-gold">distinction.</em>
            </h1>
            <p className="mt-8 max-w-lg text-[15px] leading-7 text-white/68 sm:text-base">
              Considered jewellery for modern rituals. Precious materials,
              sculptural forms, and pieces made to remain.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className={cn(buttonVariants({ variant: "gold", size: "lg" }))}
              >
                Explore the collection <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/trade"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "border-white/20 bg-white/10 text-white hover:bg-white/15",
                )}
              >
                Trade with Gemjar
              </Link>
            </div>
          </div>
          <div className="absolute bottom-8 right-10 hidden items-center gap-4 text-xs text-white/50 lg:flex">
            <span className="h-px w-12 bg-white/25" /> Scroll to discover
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-[#ebe5d9]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-ink/10 px-5 py-6 lg:grid-cols-4 lg:px-10">
          {(
            [
              [Gem, "Thoughtfully sourced", "Materials with provenance"],
              [ShieldCheck, "Made to endure", "A considered guarantee"],
              [RefreshCw, "Easy returns", "Within 30 days"],
              [Sparkles, "Independent design", "Small-batch collections"],
            ] as Array<[LucideIcon, string, string]>
          ).map(([Icon, title, copy], index) => (
            <div
              key={String(title)}
              className={`flex items-center gap-4 px-3 py-3 lg:px-7 ${index > 1 ? "border-t border-ink/10 lg:border-t-0" : ""}`}
            >
              <Icon className="size-5 shrink-0 stroke-[1.4] text-forest" />
              <div>
                <p className="text-xs font-bold">{String(title)}</p>
                <p className="mt-0.5 text-[11px] text-ink/48">{String(copy)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Newly considered</p>
            <h2 className="mt-3 font-display text-5xl font-semibold tracking-[-0.035em] sm:text-6xl">
              The latest forms
            </h2>
          </div>
          <Link
            href="/shop"
            className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-forest"
          >
            View all pieces{" "}
            <span className="grid size-9 place-items-center rounded-full border border-forest/20 transition group-hover:bg-forest group-hover:text-white">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
        <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="mx-3 overflow-hidden rounded-[32px] bg-forest text-white sm:mx-5 lg:mx-10">
        <div className="mx-auto grid max-w-[1360px] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-center px-7 py-16 sm:px-14 lg:px-20 lg:py-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              For independent retailers
            </p>
            <h2 className="mt-5 max-w-xl font-display text-5xl font-medium leading-[.95] tracking-[-0.035em] sm:text-6xl">
              A better way to buy, built around your business.
            </h2>
            <p className="mt-7 max-w-lg text-sm leading-7 text-white/62">
              Customer-specific pricing, intelligent reordering and a catalogue
              curated for your store—all in one calm workspace.
            </p>
            <Link
              href="/trade"
              className={cn(
                buttonVariants({ variant: "gold", size: "lg" }),
                "mt-9 w-fit",
              )}
            >
              Discover Gemjar Trade <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_70%_35%,rgba(189,166,109,.35),transparent_38%),linear-gradient(135deg,#294b40,#0a211b)]">
            <div className="absolute inset-8 rounded-[24px] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur sm:inset-14 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <span className="text-xs font-semibold">Trade overview</span>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  Live account
                </span>
              </div>
              <p className="mt-8 text-xs text-white/45">
                Available purchasing power
              </p>
              <p className="mt-2 font-display text-5xl">£18,420</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[.07] p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    Orders
                  </p>
                  <p className="mt-2 text-xl font-semibold">24</p>
                </div>
                <div className="rounded-2xl bg-white/[.07] p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    To reorder
                  </p>
                  <p className="mt-2 text-xl font-semibold">8 pieces</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-24 bg-[#0d1b17] px-5 py-14 text-white lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 border-b border-white/10 pb-12 lg:flex-row">
          <div>
            <p className="font-display text-4xl font-semibold">Gemjar</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/45">
              Objects with character. Commerce with care.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-xs text-white/65 sm:grid-cols-3">
            <Link href="/shop">Shop all</Link>
            <Link href="/trade">Trade portal</Link>
            <Link href="/account">My account</Link>
            <Link href="/policies/delivery">Delivery</Link>
            <Link href="/policies/returns">Returns</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1440px] flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-white/30 sm:flex-row sm:justify-between">
          <span>© 2026 Gemjar. All rights reserved.</span>
          <span>United Kingdom · GBP</span>
        </div>
      </footer>
    </main>
  );
}
