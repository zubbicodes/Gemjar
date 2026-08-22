import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  Leaf,
  Palette,
  Store,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getProducts, getStorefrontContent } from "@/lib/api";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [products, content] = await Promise.all([
    getProducts(),
    getStorefrontContent(),
  ]);
  return (
    <main>
      <SiteHeader />
      <section className="grid min-h-[650px] min-w-0 bg-gold lg:grid-cols-[.9fr_1.1fr]">
        <div className="flex min-w-0 flex-col justify-center px-5 py-16 sm:px-10 lg:px-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] lg:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink">{content.eyebrow}</p>
          <h1 className="display-safe mt-5 max-w-3xl font-display text-[clamp(3.5rem,7vw,5.5rem)] font-extrabold leading-[.9] tracking-[-0.06em]">
            {content.headline} <span className="text-forest">{content.emphasis}</span>
          </h1>
          <p className="mt-7 max-w-lg text-base font-medium leading-7 text-ink/75">
            {content.introduction}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "bg-ink text-paper hover:bg-forest")}>
              Shop colourful comfort <ArrowRight className="size-4" />
            </Link>
            <Link href="/trade" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "border-ink/20 bg-paper/55")}>
              Wholesale
            </Link>
          </div>
        </div>
        <div className="relative min-h-[420px] min-w-0 overflow-hidden lg:min-h-full">
          <Image src={content.heroImageUrl} alt="Colourful Gemjar socks arranged for the collection" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" unoptimized={content.heroImageUrl.startsWith("http")} />
          <p className="absolute bottom-5 left-5 bg-paper px-4 py-2 text-xs font-bold text-ink shadow-soft">Soft on feet. Big on colour.</p>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-ink/10 px-5 py-6 lg:grid-cols-4 lg:px-10">
          {(
            [
              [Leaf, "Bamboo softness", "Breathable everyday comfort"],
              [CloudSun, "Wool warmth", "Cosy blends for colder days"],
              [Palette, "Original colour", "Playful prints and patterns"],
              [Store, "Retail & trade", "Made for wardrobes and shops"],
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
            <p className="eyebrow">Fresh from Gemjar</p>
            <h2 className="display-safe mt-3 font-display text-5xl font-extrabold tracking-[-0.05em] sm:text-6xl">
              Pick your pair
            </h2>
          </div>
          <Link
            href="/shop"
            className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-forest"
          >
            Shop all products{" "}
            <span className="grid size-9 place-items-center rounded-full border border-forest/20 transition group-hover:bg-forest group-hover:text-paper">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
        <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="mx-3 overflow-hidden bg-forest text-paper sm:mx-5 lg:mx-10">
        <div className="mx-auto grid max-w-[1360px] min-w-0 lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex min-w-0 flex-col justify-center px-7 py-16 sm:px-14 lg:px-20 lg:py-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-paper">Gemjar wholesale</p>
            <h2 className="display-safe mt-5 max-w-xl font-display text-4xl font-extrabold leading-[.98] tracking-[-0.04em] sm:text-6xl">
              {content.tradeHeadline}
            </h2>
            <p className="mt-7 max-w-lg text-sm leading-7 text-paper/75">
              {content.tradeIntroduction}
            </p>
            <Link
              href="/trade"
              className={cn(
                buttonVariants({ variant: "gold", size: "lg" }),
                "mt-9 w-fit",
              )}
            >
              Open trade portal <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative min-h-[420px] min-w-0 bg-mist">
            <Image src="https://gemjarsocks.com/cdn/shop/files/FAIRISLE_BUNDLE.jpg" alt="Gemjar Fairisle wool-blend sock bundle" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 45vw" unoptimized />
          </div>
        </div>
      </section>

      <footer className="mt-24 overflow-hidden bg-ink text-paper">
        <div className="border-b border-paper/15 py-5" aria-hidden="true">
          <p className="marquee-track whitespace-nowrap font-display text-4xl font-extrabold tracking-[-0.04em]">GEMJAR · BAMBOO SOFT · WOOL WARM · COLOUR HAPPY · GEMJAR · BAMBOO SOFT · WOOL WARM · COLOUR HAPPY ·</p>
        </div>
        <div className="px-5 py-14 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 border-b border-paper/15 pb-12 lg:flex-row">
          <div>
            <p className="font-display text-4xl font-semibold">Gemjar</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-paper/75">
              Colourful socks, cosy layers and good gifting for everyday life.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-xs text-paper/75 sm:grid-cols-3">
            <Link href="/shop">Shop all</Link>
            <Link href="/trade">Trade portal</Link>
            <Link href="/account">My account</Link>
            <Link href="/policies/delivery">Delivery</Link>
            <Link href="/policies/returns">Returns</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1440px] flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-paper/75 sm:flex-row sm:justify-between">
          <span>© 2026 Gemjar. All rights reserved.</span>
          <span>United Kingdom · GBP</span>
        </div>
        </div>
      </footer>
    </main>
  );
}
