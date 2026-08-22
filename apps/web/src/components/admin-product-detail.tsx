"use client";

import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorRow, LoadingRow, UndoToast, useUndoToast } from "@/components/portal-primitives";
import { formatMoney } from "@/lib/utils";
import { csrfHeaders } from "@/lib/csrf";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  b2cVisible: boolean;
  b2bVisible: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  image?: string | null;
  media: Array<{ id: string; url: string; alt: string; position: number }>;
  categories: Array<{ id: string; name: string }>;
  variant: {
    sku: string;
    retailPriceMinor: number;
    b2bPriceMinor?: number;
    available: number;
    moq: number;
    packMultiple: number;
    attributes?: Record<string, string>;
  } | null;
  variants: Array<{
    id: string;
    sku: string;
    name?: string | null;
    retailPriceMinor: number;
    b2bPriceMinor?: number | null;
    moq: number;
    packMultiple: number;
  }>;
};
type Category = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message || "The request could not be completed",
    );
  return body;
}

export function AdminProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const isNew = productId === "new";
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const { toast, show, dismiss } = useUndoToast();

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [productBody, categoryBody] = await Promise.all([
        isNew
          ? Promise.resolve(null)
          : readJson(
              await fetch(`${API_URL}/admin/products/${productId}`, {
                credentials: "include",
                cache: "no-store",
              }),
            ),
        readJson(
          await fetch(`${API_URL}/admin/categories`, {
            credentials: "include",
            cache: "no-store",
          }),
        ),
      ]);
      if (productBody) setProduct(productBody);
      setCategories(categoryBody.data);
    } catch (cause) {
      if (cause instanceof Error && /not found/i.test(cause.message)) {
        setNotFound(true);
      } else {
        setError(
          cause instanceof Error ? cause.message : "Unable to load product",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isNew, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      slug: form.get("slug"),
      description: form.get("description"),
      sku: String(form.get("sku")).trim().toUpperCase(),
      retailPriceMinor: Math.round(Number(form.get("retailPrice")) * 100),
      b2bPriceMinor: Math.round(Number(form.get("b2bPrice")) * 100),
      moq: Number(form.get("moq")),
      packMultiple: Number(form.get("packMultiple")),
      imageUrl: form.get("imageUrl") || undefined,
      mediaUrls: String(form.get("mediaUrls") ?? "")
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    };
    setSubmitting(true);
    try {
      const created = await readJson(
        await fetch(`${API_URL}/admin/products`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify(payload),
        }),
      );
      router.push(`/admin/catalogue/${created.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create product",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    const form = new FormData(event.currentTarget);
    let attributes: Record<string, string> = {};
    try {
      attributes = JSON.parse(String(form.get("attributes") || "{}"));
    } catch {
      setError("Attributes must be a valid JSON object");
      return;
    }
    const primaryImage = String(form.get("imageUrl") ?? "").trim();
    const gallery = String(form.get("mediaUrls") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const mediaUrls = [primaryImage, ...gallery].filter(
      (value, index, values) => value && values.indexOf(value) === index,
    );
    const payload = {
      name: form.get("name"),
      description: form.get("description"),
      sku: String(form.get("sku")).trim().toUpperCase(),
      retailPriceMinor: Math.round(Number(form.get("retailPrice")) * 100),
      b2bPriceMinor: Math.round(Number(form.get("b2bPrice")) * 100),
      moq: Number(form.get("moq")),
      packMultiple: Number(form.get("packMultiple")),
      status: form.get("status"),
      b2cVisible: form.get("b2cVisible") === "on",
      b2bVisible: form.get("b2bVisible") === "on",
      seoTitle: form.get("seoTitle"),
      seoDescription: form.get("seoDescription"),
      imageUrl: form.get("imageUrl") || undefined,
      mediaUrls,
      categoryIds: form.getAll("categoryIds"),
      attributes,
    };
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const updated = await readJson(
        await fetch(`${API_URL}/admin/products/${product.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify(payload),
        }),
      );
      setProduct(updated);
      setMessage("Product updated.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update product",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    try {
      await readJson(
        await fetch(`${API_URL}/admin/products/${product.id}/variants`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            sku: String(form.get("sku")).trim().toUpperCase(),
            name: form.get("name") || undefined,
            retailPriceMinor: Math.round(Number(form.get("retailPrice")) * 100),
            b2bPriceMinor: Math.round(Number(form.get("b2bPrice")) * 100),
            moq: Number(form.get("moq")),
            packMultiple: Number(form.get("packMultiple")),
            attributes: {},
          }),
        }),
      );
      formElement.reset();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create variant",
      );
    }
  }

  async function confirmDelete() {
    if (!product) return;
    setConfirmingDelete(false);
    setError("");
    try {
      await readJson(
        await fetch(`${API_URL}/admin/products/${product.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: csrfHeaders(),
        }),
      );
      setDeleted(true);
      show(`${product.name} deleted.`, () => {
        // Flip back to "not deleted" synchronously so the redirect effect
        // (keyed on the toast disappearing) never fires for a manual undo —
        // only for the countdown expiring naturally. The restore call itself
        // can finish after this.
        setDeleted(false);
        void (async () => {
          try {
            await readJson(
              await fetch(`${API_URL}/admin/products/${product.id}/restore`, {
                method: "POST",
                credentials: "include",
                headers: csrfHeaders(),
              }),
            );
            await load();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Unable to restore this product",
            );
            setDeleted(true);
          }
        })();
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete this product",
      );
    }
  }

  useEffect(() => {
    if (!deleted || toast) return;
    router.push("/admin/catalogue");
  }, [deleted, toast, router]);

  const breadcrumbLabel = isNew
    ? "New product"
    : (product?.name ?? (loading ? "Loading…" : "Product"));

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-ink/45">
        <Link href="/admin/catalogue" className="hover:text-forest">
          Catalogue
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-ink" aria-current="page">
          {breadcrumbLabel}
        </span>
      </nav>

      {deleted ? (
        <section className="surface p-10 text-center">
          <AlertTriangle className="mx-auto size-7 text-amber-700" />
          <h2 className="mt-5 font-display text-2xl font-semibold">
            {product?.name} was deleted
          </h2>
          <p className="mt-2 text-xs text-ink/45">
            Returning to the catalogue shortly. Use Undo below to restore it.
          </p>
        </section>
      ) : notFound ? (
        <section className="surface p-10 text-center">
          <AlertCircle className="mx-auto size-7 text-amber-700" />
          <h2 className="mt-5 font-display text-2xl font-semibold">
            Product not found
          </h2>
          <Link
            href="/admin/catalogue"
            className="mt-5 inline-flex rounded-full bg-forest px-6 py-3 text-xs font-bold text-white"
          >
            Back to catalogue
          </Link>
        </section>
      ) : loading ? (
        <section className="surface">
          <LoadingRow label="Loading product…" />
        </section>
      ) : (
        <>
          {message && (
            <div className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              {message}
            </div>
          )}
          {error && <ErrorRow message={error} />}

          <form
            onSubmit={isNew ? createProduct : updateProduct}
            className="surface grid gap-4 p-6 sm:grid-cols-2"
          >
            <div className="col-span-full">
              <p className="font-display text-2xl font-semibold">
                {isNew ? "Create a product" : "Product details"}
              </p>
              <p className="mt-1 text-[10px] text-ink/40">
                {isNew
                  ? "The first variant becomes the primary sellable SKU."
                  : "Pricing, visibility, taxonomy, media, and SEO."}
              </p>
            </div>
            <label className="text-xs font-bold">
              Product name
              <input
                name="name"
                className="field mt-2"
                defaultValue={product?.name}
                required
              />
            </label>
            {isNew ? (
              <label className="text-xs font-bold">
                URL slug
                <input
                  name="slug"
                  className="field mt-2"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </label>
            ) : (
              <label className="text-xs font-bold">
                SKU
                <input
                  name="sku"
                  className="field mt-2 uppercase"
                  defaultValue={product?.variant?.sku}
                  required
                />
              </label>
            )}
            <label className="col-span-full text-xs font-bold">
              Description
              <textarea
                name="description"
                className="field mt-2 min-h-24 py-3"
                defaultValue={product?.description}
                minLength={10}
                required
              />
            </label>
            {isNew && (
              <label className="text-xs font-bold">
                SKU
                <input name="sku" className="field mt-2 uppercase" required />
              </label>
            )}
            <label className="text-xs font-bold">
              Retail price (£)
              <input
                name="retailPrice"
                className="field mt-2"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  product ? (product.variant?.retailPriceMinor ?? 0) / 100 : undefined
                }
                required
              />
            </label>
            <label className="text-xs font-bold">
              Trade price (£)
              <input
                name="b2bPrice"
                className="field mt-2"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  product ? (product.variant?.b2bPriceMinor ?? 0) / 100 : undefined
                }
                required
              />
            </label>
            <label className="text-xs font-bold">
              Minimum order
              <input
                name="moq"
                className="field mt-2"
                type="number"
                min="1"
                defaultValue={product?.variant?.moq ?? 1}
                required
              />
            </label>
            <label className="text-xs font-bold">
              Pack multiple
              <input
                name="packMultiple"
                className="field mt-2"
                type="number"
                min="1"
                defaultValue={product?.variant?.packMultiple ?? 1}
                required
              />
            </label>
            <label className="text-xs font-bold">
              Image URL
              <input
                name="imageUrl"
                className="field mt-2"
                type="url"
                defaultValue={isNew ? undefined : (product?.image ?? "")}
              />
            </label>
            {!isNew && (
              <>
                <label className="text-xs font-bold">
                  Status
                  <select
                    name="status"
                    className="field mt-2"
                    defaultValue={product?.status}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <label className="col-span-full text-xs font-bold">
                  Media gallery URLs (one per line)
                  <textarea
                    name="mediaUrls"
                    className="field mt-2 min-h-28 py-3"
                    defaultValue={product?.media.map(({ url }) => url).join("\n")}
                    placeholder="https://…"
                  />
                </label>
                <label className="text-xs font-bold">
                  SEO title
                  <input
                    name="seoTitle"
                    className="field mt-2"
                    maxLength={160}
                    defaultValue={product?.seoTitle ?? ""}
                  />
                </label>
                <label className="text-xs font-bold">
                  SEO description
                  <input
                    name="seoDescription"
                    className="field mt-2"
                    maxLength={320}
                    defaultValue={product?.seoDescription ?? ""}
                  />
                </label>
                <label className="col-span-full text-xs font-bold">
                  Attributes (JSON)
                  <textarea
                    name="attributes"
                    className="field mt-2 min-h-20 py-3 font-mono"
                    defaultValue={JSON.stringify(
                      product?.variant?.attributes ?? {},
                      null,
                      2,
                    )}
                  />
                </label>
                <fieldset className="col-span-full">
                  <legend className="text-xs font-bold">Categories</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <input
                          name="categoryIds"
                          type="checkbox"
                          value={category.id}
                          defaultChecked={product?.categories.some(
                            ({ id }) => id === category.id,
                          )}
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {!!product?.variants.length && (
                  <div className="col-span-full rounded-xl border border-ink/10 p-4">
                    <p className="text-xs font-bold">Sellable variants</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <span
                          key={variant.id}
                          className="rounded-full bg-mist px-3 py-2 text-xs"
                        >
                          {variant.sku} · {formatMoney(variant.retailPriceMinor)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="col-span-full flex gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      name="b2cVisible"
                      type="checkbox"
                      defaultChecked={product?.b2cVisible}
                    />{" "}
                    B2C visible
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      name="b2bVisible"
                      type="checkbox"
                      defaultChecked={product?.b2bVisible}
                    />{" "}
                    B2B visible
                  </label>
                </div>
              </>
            )}
            <div className="col-span-full flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? isNew
                    ? "Creating…"
                    : "Saving…"
                  : isNew
                    ? "Create and publish"
                    : "Save changes"}
              </Button>
            </div>
          </form>

          {!isNew && (
            <form
              onSubmit={createVariant}
              className="surface grid gap-2 p-4 sm:grid-cols-6"
            >
              <input
                className="field"
                name="sku"
                placeholder="New variant SKU"
                required
              />
              <input className="field" name="name" placeholder="Variant name" />
              <input
                className="field"
                name="retailPrice"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Retail £"
                required
              />
              <input
                className="field"
                name="b2bPrice"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Trade £"
                required
              />
              <input
                className="field"
                name="moq"
                type="number"
                min="1"
                defaultValue="1"
                aria-label="Minimum order"
                required
              />
              <input
                className="field"
                name="packMultiple"
                type="number"
                min="1"
                defaultValue="1"
                aria-label="Pack multiple"
                required
              />
              <Button className="sm:col-span-6" type="submit">
                Add variant
              </Button>
            </form>
          )}

          {!isNew && (
            <section className="surface flex items-center justify-between p-6">
              <div>
                <p className="text-xs font-bold text-rose-800">Danger zone</p>
                <p className="mt-1 text-[11px] text-ink/45">
                  Removes this product from every storefront and portal. You
                  can undo for 10 seconds after deleting.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="border-rose-200 text-rose-800 hover:bg-rose-50"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-3.5" /> Delete product
              </Button>
            </section>
          )}
        </>
      )}

      {confirmingDelete && product && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm product deletion"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <AlertTriangle className="size-7 text-rose-700" />
            <p className="mt-4 font-display text-xl font-semibold">
              Delete {product.name}?
            </p>
            <p className="mt-2 text-xs text-ink/55">
              This removes it from the storefront and every portal. You will
              have 10 seconds to undo.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-700 hover:bg-rose-800"
                onClick={() => void confirmDelete()}
              >
                Delete product
              </Button>
            </div>
          </div>
        </div>
      )}

      <UndoToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
