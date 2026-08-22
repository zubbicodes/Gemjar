"use client";

import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { AddToBag } from "@/components/add-to-bag";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";
import type { Product } from "@/lib/catalogue";
import { formatMoney } from "@/lib/utils";

type FavouriteProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  variant: {
    id: string;
    sku: string;
    retailPriceMinor: number;
    available: number;
  } | null;
};

function cartProduct(product: FavouriteProduct): Product | null {
  if (!product.variant) return null;
  return {
    id: product.id,
    variantId: product.variant.id,
    name: product.name,
    slug: product.slug,
    sku: product.variant.sku,
    collection: "Saved collection",
    description: product.description,
    price: product.variant.retailPriceMinor,
    image: product.image ?? "/images/gemjar-hero.png",
    accent: "#c9b99c",
    availability:
      product.variant.available > 8
        ? "In stock"
        : product.variant.available > 0
          ? "Low stock"
          : "Made to order",
    material: "Gemjar selected materials",
  };
}

export function AccountFavourites() {
  const favourites = useApi<{ data: FavouriteProduct[] }>(
    "/account/favourites",
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function remove(productId: string) {
    setBusy(productId);
    setError("");
    try {
      await apiSend(`/account/favourites/${productId}`, "DELETE");
      await favourites.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove favourite",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Saved pieces"
        description="Products saved to this account for later."
      />
      {error && <ErrorRow message={error} />}
      {favourites.loading ? (
        <LoadingRow />
      ) : favourites.error ? (
        <ErrorRow message={favourites.error} />
      ) : !favourites.data?.data.length ? (
        <div className="p-12 text-center">
          <Heart className="mx-auto size-7 text-ink/25" />
          <p className="mt-4 text-sm font-semibold">Nothing saved yet</p>
          <Link href="/shop">
            <Button className="mt-5" size="sm">
              <ShoppingBag className="size-3.5" /> Browse products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {favourites.data.data.map((product) => {
            const mapped = cartProduct(product);
            return (
              <article
                key={product.id}
                className="rounded-2xl border border-ink/[.08] bg-white/45 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                    {product.variant?.sku}
                  </p>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Remove ${product.name}`}
                    disabled={busy === product.id}
                    onClick={() => void remove(product.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <Link href={`/shop/${product.slug}`}>
                  <h3 className="mt-4 font-display text-xl font-semibold">
                    {product.name}
                  </h3>
                </Link>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/50">
                  {product.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-ink/[.07] pt-4">
                  <p className="font-semibold">
                    {formatMoney(product.variant?.retailPriceMinor ?? 0)}
                  </p>
                  {mapped && <AddToBag product={mapped} compact />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
