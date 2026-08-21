"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useCartStore } from "@/stores/cart";

export function SiteHeader() {
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
      <div className="bg-forest px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
        Complimentary UK delivery on orders over £150
      </div>
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <button className="lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
        <BrandMark />
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
          <Link className="nav-link" href="/shop">New arrivals</Link>
          <Link className="nav-link" href="/shop?collection=atelier">Collections</Link>
          <Link className="nav-link" href="/shop?category=rings">Rings</Link>
          <Link className="nav-link" href="/shop?category=necklaces">Necklaces</Link>
          <Link className="nav-link" href="/trade">Trade</Link>
        </nav>
        <div className="flex items-center gap-1 text-ink/75">
          <Link className="icon-link hidden sm:grid" href="/shop" aria-label="Search"><Search /></Link>
          <Link className="icon-link hidden sm:grid" href="/account/favourites" aria-label="Favourites"><Heart /></Link>
          <Link className="icon-link hidden sm:grid" href="/account" aria-label="Account"><UserRound /></Link>
          <Link className="icon-link relative" href="/cart" aria-label={`Basket with ${count} items`}>
            <ShoppingBag />
            {count > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-bold text-forest">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
