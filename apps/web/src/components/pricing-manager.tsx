"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  formatDate,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  accountNumber: string | null;
  status: string;
};

type Price = {
  id: string;
  minQuantity: number;
  unitPriceMinor: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  variant: {
    id: string;
    sku: string;
    retailPriceMinor: number;
    b2bPriceMinor: number | null;
    product: { name: string };
  };
};

type History = {
  id: string;
  rule: string;
  unitPriceMinor: number;
  minQuantity: number;
  createdAt: string;
};

type PricingView = {
  organization: Organization;
  data: Price[];
  history: History[];
};

type ProductRow = {
  id: string;
  name: string;
  variant: { id: string; sku: string; retailPriceMinor: number } | null;
};

export function PricingManager() {
  const organizations = useApi<{ data: Organization[] }>("/organizations");
  const products = useApi<{ data: ProductRow[] }>("/admin/products");
  const [organizationId, setOrganizationId] = useState("");
  const active = organizationId || organizations.data?.data[0]?.id || "";
  const pricing = useApi<PricingView>(
    active ? `/admin/pricing/organizations/${active}` : null,
  );

  const [variantId, setVariantId] = useState("");
  const [minQuantity, setMinQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await apiSend("/admin/pricing", "POST", {
        organizationId: active,
        variantId,
        minQuantity,
        unitPriceMinor: Math.round(Number(price) * 100),
      });
      setPrice("");
      await pricing.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this price",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await apiSend(`/admin/pricing/${id}`, "DELETE");
      await pricing.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove this price",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Customer pricing"
        description="Set the price a specific customer pays. Quantity tiers take precedence over fixed prices, which take precedence over trade and retail defaults."
        action={
          <div>
            <label className="portal-label" htmlFor="pricing-org">
              Customer
            </label>
            <select
              id="pricing-org"
              value={active}
              onChange={(event) => setOrganizationId(event.target.value)}
              className="field mt-2 h-9 min-w-[220px]"
            >
              {organizations.data?.data.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                  {organization.accountNumber
                    ? ` · ${organization.accountNumber}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 border-b border-ink/[.07] p-5">
        <div className="min-w-[220px] flex-1">
          <label className="portal-label" htmlFor="pricing-variant">
            Product
          </label>
          <select
            id="pricing-variant"
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="field mt-2 h-9"
          >
            <option value="">Select a product…</option>
            {products.data?.data
              .filter((product) => product.variant)
              .map((product) => (
                <option key={product.variant!.id} value={product.variant!.id}>
                  {product.name} · {product.variant!.sku}
                </option>
              ))}
          </select>
        </div>
        <div className="w-32">
          <label className="portal-label" htmlFor="pricing-qty">
            From qty
          </label>
          <input
            id="pricing-qty"
            type="number"
            min={1}
            value={minQuantity}
            onChange={(event) =>
              setMinQuantity(Math.max(1, Number(event.target.value) || 1))
            }
            className="field mt-2 h-9"
          />
        </div>
        <div className="w-36">
          <label className="portal-label" htmlFor="pricing-price">
            Unit price (£)
          </label>
          <input
            id="pricing-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="field mt-2 h-9"
          />
        </div>
        <Button
          size="sm"
          disabled={!variantId || !price || busy || !active}
          onClick={save}
        >
          <Plus className="size-3.5" /> Save price
        </Button>
      </div>
      {error && <ErrorRow message={error} />}

      {pricing.loading ? (
        <LoadingRow />
      ) : pricing.error ? (
        <ErrorRow message={pricing.error} />
      ) : !pricing.data?.data.length ? (
        <EmptyRow message="This customer has no bespoke prices; trade defaults apply." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-4 py-3">From qty</th>
                <th className="px-4 py-3">Customer price</th>
                <th className="px-4 py-3">Retail</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-6 py-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {pricing.data.data.map((entry) => (
                <tr key={entry.id} className="border-t border-ink/[.06]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">
                      {entry.variant.product.name}
                    </p>
                    <p className="text-[10px] text-ink/40">
                      {entry.variant.sku}
                    </p>
                  </td>
                  <td className="px-4 py-4">{entry.minQuantity}</td>
                  <td className="px-4 py-4 font-bold text-forest">
                    {formatMoney(entry.unitPriceMinor)}
                  </td>
                  <td className="px-4 py-4 text-ink/45 line-through">
                    {formatMoney(entry.variant.retailPriceMinor)}
                  </td>
                  <td className="px-4 py-4 text-ink/45">
                    {formatDate(entry.effectiveFrom)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => remove(entry.id)}
                      disabled={busy}
                      aria-label={`Remove price for ${entry.variant.sku}`}
                      className="text-ink/35 transition hover:text-rose-700"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pricing.data?.history.length ? (
        <div className="border-t border-ink/[.07] p-6">
          <p className="portal-label">Price history</p>
          <ul className="mt-3 space-y-2">
            {pricing.data.history.slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-ink/55">
                  {entry.rule.replaceAll("_", " ").toLowerCase()} · from qty{" "}
                  {entry.minQuantity}
                </span>
                <span className="font-semibold">
                  {formatMoney(entry.unitPriceMinor)}{" "}
                  <span className="ml-2 text-ink/35">
                    {formatDate(entry.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
