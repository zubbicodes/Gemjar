"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalogue";

const STORAGE_KEY = "gemjar.recent-products";

export function RecentlyViewed({
  current,
  catalogue,
}: {
  current: Product;
  catalogue: Product[];
}) {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    let previous: string[] = [];
    try {
      previous = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      previous = [];
    }
    setProducts(
      previous
        .filter((id) => id !== current.id)
        .map((id) => catalogue.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product))
        .slice(0, 4),
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        [current.id, ...previous.filter((id) => id !== current.id)].slice(0, 8),
      ),
    );
  }, [catalogue, current.id]);
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10">
      <p className="eyebrow">Continue exploring</p>
      <h2 className="mt-3 font-display text-4xl font-semibold">
        Recently viewed
      </h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
