"use client";

import { PackageSearch, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  vatDisplay: "EXCLUSIVE" | "INCLUSIVE";
};
type Product = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  variant: {
    sku: string;
    b2bPriceMinor: number | null;
    resolvedTradePriceMinor: number;
    resolvedTradePriceRule: string;
    retailPriceMinor: number;
    vatRateBasis: number;
    moq: number;
    packMultiple: number;
    available: number;
  } | null;
};

export function TradeCatalogue() {
  const [query, setQuery] = useState("");
  const organizations = useApi<{ data: Organization[] }>(
    "/organizations/current",
  );
  const organization = organizations.data?.data[0];
  const catalogue = useApi<{ data: Product[] }>(
    organization ? `/trade/products?organizationId=${organization.id}` : null,
  );
  const products = useMemo(() => {
    const term = query.trim().toLowerCase();
    const data = catalogue.data?.data ?? [];
    return term
      ? data.filter((product) =>
          `${product.name} ${product.variant?.sku ?? ""}`
            .toLowerCase()
            .includes(term),
        )
      : data;
  }, [catalogue.data, query]);

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Account catalogue"
        description={
          organization
            ? `Products and verified trade prices available to ${organization.name}.`
            : "Products and verified prices available to your trade account."
        }
        action={
          <Link href="/trade/quick-order">
            <Button size="sm">
              <ShoppingBag className="size-3.5" /> Build order
            </Button>
          </Link>
        }
      />
      <div className="border-b border-ink/[.07] p-4">
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
          <span className="sr-only">Search account catalogue</span>
          <input
            className="field h-10 pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or SKU…"
          />
        </label>
      </div>
      {organizations.loading || catalogue.loading ? (
        <LoadingRow label="Loading account catalogue…" />
      ) : organizations.error ? (
        <ErrorRow message={organizations.error} />
      ) : catalogue.error ? (
        <ErrorRow message={catalogue.error} />
      ) : !organization ? (
        <EmptyRow message="No trade organization is linked to this login." />
      ) : !products.length ? (
        <EmptyRow
          message={
            query
              ? "No products match this search."
              : "No products are available to this account yet."
          }
        />
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-ink/[.08] bg-white/45 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-forest/[.08] text-forest">
                  <PackageSearch className="size-5" />
                </span>
                <span className="text-[10px] font-semibold text-ink/40">
                  {product.variant?.available ?? 0} available
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                {product.variant?.sku}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">
                {product.name}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/50">
                {product.description}
              </p>
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink/[.07] pt-4">
                <div>
                  <p className="text-lg font-semibold">
                    {formatMoney(
                      organization.vatDisplay === "INCLUSIVE"
                        ? Math.round(
                            (product.variant?.resolvedTradePriceMinor ?? 0) *
                              (1 +
                                (product.variant?.vatRateBasis ?? 0) / 10_000),
                          )
                        : (product.variant?.resolvedTradePriceMinor ?? 0),
                    )}
                  </p>
                  <p className="mt-1 text-[10px] text-ink/40">
                    {organization.vatDisplay === "INCLUSIVE"
                      ? "Incl. VAT"
                      : "Ex. VAT"}{" "}
                    · MOQ {product.variant?.moq ?? 1} · pack{" "}
                    {product.variant?.packMultiple ?? 1}
                  </p>
                </div>
                <Link
                  href="/trade/quick-order"
                  className="text-xs font-semibold text-forest hover:underline"
                >
                  Add to order
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
