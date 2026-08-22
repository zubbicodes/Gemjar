"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalogue";

const CATEGORIES: Array<[label: string, match: (product: Product) => boolean]> =
  [
    ["All products", () => true],
    ["Bamboo Socks", (product) => product.collection === "Bamboo Socks"],
    ["Wool & Cosy", (product) => product.collection === "Wool & Cosy"],
    ["Sleepwear", (product) => product.collection === "Sleepwear"],
    ["Gifts", (product) => /bundle|gift/i.test(`${product.name} ${product.collection}`)],
  ];

const SORTS = {
  featured: { label: "Featured", compare: () => 0 },
  "price-asc": {
    label: "Price: low to high",
    compare: (a: Product, b: Product) => a.price - b.price,
  },
  "price-desc": {
    label: "Price: high to low",
    compare: (a: Product, b: Product) => b.price - a.price,
  },
  name: {
    label: "Alphabetical",
    compare: (a: Product, b: Product) => a.name.localeCompare(b.name),
  },
} as const;

export function ShopBrowser({
  products,
  initialCategory: requestedCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const normalizedCategory = requestedCategory?.toLowerCase().replaceAll("-", " ");
  const initialCategory = CATEGORIES.findIndex(
    ([label]) => label.toLowerCase() === normalizedCategory,
  );
  const [category, setCategory] = useState(
    initialCategory >= 0 ? initialCategory : 0,
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<keyof typeof SORTS>("featured");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products
      .filter(CATEGORIES[category]![1])
      .filter(
        (product) =>
          !term ||
          `${product.name} ${product.sku} ${product.collection} ${product.material} ${product.description}`
            .toLowerCase()
            .includes(term),
      )
      .slice()
      .sort(SORTS[sort].compare);
  }, [products, category, query, sort]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 py-7">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(([label], index) => (
            <button
              key={label}
              onClick={() => setCategory(index)}
              aria-pressed={category === index}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${category === index ? "bg-forest text-white" : "border border-ink/10 bg-white/40 hover:border-forest/30"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink/35"
              aria-hidden
            />
            <label className="sr-only" htmlFor="shop-search">
              Search the collection
            </label>
            <input
              id="shop-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or SKU…"
              className="field h-10 w-52 pl-9"
            />
          </div>
          <label className="sr-only" htmlFor="shop-sort">
            Sort products
          </label>
          <div className="relative">
            <SlidersHorizontal
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink/35"
              aria-hidden
            />
            <select
              id="shop-sort"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as keyof typeof SORTS)
              }
              className="field h-10 pl-9"
            >
              {Object.entries(SORTS).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="pb-6 text-xs text-ink/70">
        {visible.length} {visible.length === 1 ? "product" : "products"}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {visible.length ? (
        <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-ink/70">
          Nothing matches that search yet. Try a different name or SKU.
        </p>
      )}
    </>
  );
}
