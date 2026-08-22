"use client";
import { Button } from "@/components/ui/button";
import {
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { apiSend, useApi } from "@/lib/portal-api";
import type { StorefrontContent } from "@/lib/api";
export function ContentManager() {
  const view = useApi<StorefrontContent>("/content/storefront");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiSend(
      "/content/storefront",
      "PATCH",
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    await view.reload();
  }
  if (view.loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (view.error || !view.data)
    return (
      <section className="surface">
        <ErrorRow message={view.error || "Content unavailable"} />
      </section>
    );
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Storefront content"
        description="Edit homepage hero and trade promotion without a separate CMS."
      />
      <form onSubmit={save} className="grid gap-4 p-6 sm:grid-cols-2">
        {(
          [
            ["eyebrow", "Eyebrow"],
            ["headline", "Headline"],
            ["emphasis", "Emphasis"],
            ["heroImageUrl", "Hero image URL"],
            ["tradeHeadline", "Trade headline"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="text-xs font-bold">
            {label}
            <input
              className="field mt-2"
              name={name}
              defaultValue={view.data![name]}
              required
            />
          </label>
        ))}
        <label className="col-span-full text-xs font-bold">
          Introduction
          <textarea
            className="field mt-2 min-h-24 py-3"
            name="introduction"
            defaultValue={view.data.introduction}
            required
          />
        </label>
        <label className="col-span-full text-xs font-bold">
          Trade introduction
          <textarea
            className="field mt-2 min-h-24 py-3"
            name="tradeIntroduction"
            defaultValue={view.data.tradeIntroduction}
            required
          />
        </label>
        <label className="col-span-full text-xs font-bold">
          Delivery policy
          <textarea
            className="field mt-2 min-h-32 py-3"
            name="deliveryPolicy"
            defaultValue={view.data.deliveryPolicy}
            required
          />
        </label>
        <label className="col-span-full text-xs font-bold">
          Returns policy
          <textarea
            className="field mt-2 min-h-32 py-3"
            name="returnsPolicy"
            defaultValue={view.data.returnsPolicy}
            required
          />
        </label>
        <label className="text-xs font-bold">
          Contact email
          <input
            className="field mt-2"
            name="contactEmail"
            type="email"
            defaultValue={view.data.contactEmail}
            required
          />
        </label>
        <div className="col-span-full flex justify-end">
          <Button type="submit">Publish content</Button>
        </div>
      </form>
    </section>
  );
}
