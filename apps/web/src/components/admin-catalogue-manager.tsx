"use client";

import {
  AlertCircle,
  CheckCircle2,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UndoToast, useUndoToast } from "@/components/portal-primitives";
import { cn, formatMoney } from "@/lib/utils";
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
  _count: { products: number };
  children: Array<{ id: string }>;
};
type ImportJob = {
  id: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{ row: number; errors: string[] }>;
  committedAt?: string | null;
  createdAt: string;
};
type ExportJob = {
  id: string;
  status: string;
  rowCount: number;
  createdAt: string;
};

export function AdminCatalogueManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useUndoToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [response, categoryResponse, importResponse, exportResponse] =
        await Promise.all([
          fetch(`${API_URL}/admin/products`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${API_URL}/admin/categories`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${API_URL}/admin/catalogue-transfers/imports`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${API_URL}/admin/catalogue-transfers/exports`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message || "Unable to load catalogue");
      setProducts(body.data);
      if (categoryResponse.ok) {
        const categoryBody = await categoryResponse.json();
        setCategories(categoryBody.data);
      }
      if (importResponse.ok) setImports((await importResponse.json()).data);
      if (exportResponse.ok) setExports((await exportResponse.json()).data);
      setUnauthorized(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load catalogue",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  if (unauthorized)
    return (
      <div className="surface p-10 text-center">
        <AlertCircle className="mx-auto size-7 text-amber-700" />
        <h2 className="mt-5 font-display text-3xl font-semibold">
          Administrator sign-in required
        </h2>
        <p className="mt-2 text-xs text-ink/45">
          The catalogue API is protected by server-side permissions.
        </p>
        <Link
          href="/login?next=/admin/catalogue"
          className="mt-6 inline-flex rounded-full bg-forest px-6 py-3 text-xs font-bold text-white"
        >
          Sign in to continue
        </Link>
      </div>
    );

  async function deleteProduct(product: AdminProduct) {
    if (
      !window.confirm(
        `Delete ${product.name}? You can undo this for 10 seconds.`,
      )
    )
      return;
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/products/${product.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: csrfHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Unable to delete this product");
      setProducts((current) => current.filter(({ id }) => id !== product.id));
      show(`${product.name} deleted.`, () => {
        void (async () => {
          try {
            const restoreResponse = await fetch(
              `${API_URL}/admin/products/${product.id}/restore`,
              { method: "POST", credentials: "include", headers: csrfHeaders() },
            );
            if (!restoreResponse.ok)
              throw new Error("Unable to restore this product");
            await load();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Unable to restore this product",
            );
          }
        })();
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete this product",
      );
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`${API_URL}/admin/categories`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        parentId: form.get("parentId") || undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        Array.isArray(body.message)
          ? body.message.join(". ")
          : body.message || "Unable to create category",
      );
      return;
    }
    formElement.reset();
    setMessage(`${body.name} category created.`);
    await load();
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    const response = await fetch(`${API_URL}/admin/categories/${category.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: csrfHeaders(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.message || "Unable to delete category");
      return;
    }
    setMessage(`${category.name} deleted.`);
    await load();
  }

  async function stageImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/catalogue-transfers/imports`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            csv: form.get("csv"),
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Unable to stage import");
      setMessage(
        body.invalidRows
          ? `Import checked: ${body.invalidRows} invalid row(s).`
          : `Import ready: ${body.validRows} valid row(s).`,
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to stage import",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function stageWorkbook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("workbook");
    if (!(file instanceof File) || !file.size) return;
    setSubmitting(true);
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      const response = await fetch(
        `${API_URL}/admin/catalogue-transfers/imports/xlsx`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            base64: btoa(binary),
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to stage workbook");
      setMessage(
        body.invalidRows
          ? `Workbook checked: ${body.invalidRows} invalid row(s).`
          : `Workbook ready: ${body.validRows} valid row(s).`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to stage workbook");
    } finally {
      setSubmitting(false);
    }
  }

  async function commitImport(id: string) {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/catalogue-transfers/imports/${id}/commit`,
        { method: "POST", credentials: "include", headers: csrfHeaders() },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Unable to commit import");
      setMessage("Catalogue import committed.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to commit import",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createExport() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/catalogue-transfers/exports`,
        { method: "POST", credentials: "include", headers: csrfHeaders() },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Unable to export catalogue");
      setMessage(`Export ready: ${body.rowCount} row(s).`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to export catalogue",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col justify-between gap-5 border-b border-ink/10 p-6 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold">Catalogue</h2>
          <p className="mt-2 text-xs text-ink/45">
            Products below are loaded from PostgreSQL through the protected API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Link
            href="/admin/catalogue/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus className="size-3.5" /> New product
          </Link>
        </div>
      </div>
      {message && (
        <div className="mx-6 mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="size-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="mx-6 mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
      <div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => {
            const image = product.image ?? product.media[0]?.url;
            return (
              <article key={product.id} className="overflow-hidden rounded-xl border border-ink/10 bg-white">
                <div className="relative aspect-[4/3] bg-mist">
                  {image ? (
                    <Image src={image} alt={product.name} fill className="object-contain p-4" sizes="(max-width: 640px) 100vw, 25vw" unoptimized={image.startsWith("http")} />
                  ) : (
                    <div className="grid h-full place-items-center text-forest/40"><PackageSearch className="size-8" /></div>
                  )}
                  <div className="absolute left-3 top-3"><Badge tone={product.status === "ACTIVE" ? "good" : "neutral"}>{product.status}</Badge></div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-forest">{product.categories[0]?.name ?? "Uncategorised"}</p>
                  <h3 className="mt-2 line-clamp-2 min-h-12 font-display text-lg font-semibold">{product.name}</h3>
                  <p className="mt-1 text-xs text-ink/45">{product.variant?.sku ?? "No SKU"} · {product.variant?.available ?? 0} in stock</p>
                  <div className="mt-4 flex items-end justify-between border-t border-ink/10 pt-4">
                    <div><p className="font-display text-xl font-semibold">{formatMoney(product.variant?.retailPriceMinor ?? 0)}</p><p className="text-[10px] text-ink/45">Trade {formatMoney(product.variant?.b2bPriceMinor ?? 0)}</p></div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => void deleteProduct(product)}
                        className="grid size-8 place-items-center rounded-full text-ink/35 transition-colors hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <Link
                        href={`/admin/catalogue/${product.id}`}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        <Pencil className="size-3.5" /> Manage
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {loading && (
          <div className="p-12 text-center text-xs text-ink/40">
            Loading the live catalogue…
          </div>
        )}
        {!loading && !products.length && (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold">No products yet</p>
            <p className="mt-2 text-xs text-ink/45">
              Create the first sellable product and it will appear across the
              storefront and portals.
            </p>
            <Link
              href="/admin/catalogue/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-5")}
            >
              <Plus className="size-3.5" /> Create first product
            </Link>
          </div>
        )}
      </div>
      <div className="border-t border-ink/10 p-6">
        <h3 className="font-display text-2xl font-semibold">Categories</h3>
        <form
          onSubmit={createCategory}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <input
            name="name"
            className="field"
            placeholder="Category name"
            required
          />
          <input
            name="slug"
            className="field"
            placeholder="category-slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
          <select name="parentId" className="field">
            <option value="">No parent</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Button type="submit">
            <Plus className="size-3.5" /> Add
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs"
            >
              <span>
                {category.name} ({category._count.products})
              </span>
              <button
                type="button"
                aria-label={`Delete ${category.name}`}
                disabled={Boolean(
                  category._count.products || category.children.length,
                )}
                onClick={() => void removeCategory(category)}
                className="disabled:opacity-25"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 border-t border-ink/10 p-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-2xl font-semibold">CSV/XLSX import</h3>
          <p className="mt-1 text-xs text-ink/45">
            Stage and validate first. Commit only clean files; retries are
            idempotent.
          </p>
          <form onSubmit={stageImport} className="mt-4">
            <textarea
              name="csv"
              className="field min-h-40 py-3 font-mono text-[11px]"
              defaultValue={
                "name,slug,sku,description,retailPrice,b2bPrice,moq,packMultiple,category,imageUrl\n"
              }
              required
            />
            <Button className="mt-3" type="submit" disabled={submitting}>
              Validate CSV
            </Button>
          </form>
          <form onSubmit={stageWorkbook} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-ink/10 p-3">
            <label className="min-w-0 flex-1 text-xs font-bold">
              Excel workbook
              <input name="workbook" className="field mt-2 py-2" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
            </label>
            <Button type="submit" disabled={submitting}>Validate XLSX</Button>
          </form>
          <div className="mt-4 space-y-2">
            {imports.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-ink/10 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span>
                    {job.validRows}/{job.totalRows} valid · {job.status}
                  </span>
                  {!job.committedAt && !job.invalidRows && (
                    <Button
                      size="sm"
                      onClick={() => void commitImport(job.id)}
                      disabled={submitting}
                    >
                      Commit
                    </Button>
                  )}
                </div>
                {job.errors?.slice(0, 3).map((failure) => (
                  <p key={failure.row} className="mt-1 text-rose-700">
                    Row {failure.row}: {failure.errors.join(", ")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold">
                CSV export
              </h3>
              <p className="mt-1 text-xs text-ink/45">
                Generate current catalogue snapshot.
              </p>
            </div>
            <Button onClick={() => void createExport()} disabled={submitting}>
              Create export
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {exports.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-ink/10 p-3 text-xs"
              >
                <span>
                  {job.rowCount} rows ·{" "}
                  {new Date(job.createdAt).toLocaleString()}
                </span>
                <a
                  className="font-bold text-forest underline"
                  href={`${API_URL}/admin/catalogue-transfers/exports/${job.id}/download`}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
      <UndoToast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
