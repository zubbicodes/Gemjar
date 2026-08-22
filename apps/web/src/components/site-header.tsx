"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useCartStore } from "@/stores/cart";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
      <div className="bg-forest px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
        Free standard UK delivery over £150 · Trade customers welcome
      </div>
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <button
          type="button"
          className="icon-link lg:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu className="size-5" />
        </button>
        <BrandMark />
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
          <Link className="nav-link" href="/shop">New</Link>
          <Link className="nav-link" href="/shop?category=bamboo-socks">Bamboo socks</Link>
          <Link className="nav-link" href="/shop?category=wool-and-cosy">Wool &amp; cosy</Link>
          <Link className="nav-link" href="/shop?category=sleepwear">Sleepwear</Link>
          <Link className="nav-link" href="/shop?category=gifts">Gifts</Link>
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
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="grid border-t border-ink/10 bg-paper px-5 py-3 lg:hidden"
        >
          {([
            ["New", "/shop"],
            ["Bamboo socks", "/shop?category=bamboo-socks"],
            ["Wool & cosy", "/shop?category=wool-and-cosy"],
            ["Sleepwear", "/shop?category=sleepwear"],
            ["Gifts", "/shop?category=gifts"],
            ["Trade", "/trade"],
            ["My account", "/account"],
            ["Favourites", "/account/favourites"],
          ] as const).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="border-b border-ink/[.06] py-3 text-sm font-semibold last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
