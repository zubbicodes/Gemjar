"use client";

import { Save, Settings2 } from "lucide-react";
import { useState } from "react";
import {
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";

type Settings = {
  staleStockMinutes: number;
  defaultPaymentTermsDays: number;
  supportEmail: string;
  notificationFromName: string;
};
type DeliveryMethod = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMinor: number;
  freeThresholdMinor: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  active: boolean;
  position: number;
};

export function SettingsManager() {
  const settings = useApi<Settings>("/admin/settings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiSend("/admin/settings", "PATCH", {
        staleStockMinutes: Number(form.get("staleStockMinutes")),
        defaultPaymentTermsDays: Number(form.get("defaultPaymentTermsDays")),
        supportEmail: form.get("supportEmail"),
        notificationFromName: form.get("notificationFromName"),
      });
      setMessage("Platform settings saved and active.");
      await settings.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save settings",
      );
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-6">
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Platform settings"
        description="Operational defaults used by live commerce and integration workflows."
      />
      {settings.loading ? (
        <LoadingRow />
      ) : settings.error || !settings.data ? (
        <ErrorRow message={settings.error || "Settings could not be loaded"} />
      ) : (
        <form
          key={JSON.stringify(settings.data)}
          onSubmit={save}
          className="grid gap-5 p-6 sm:grid-cols-2"
        >
          <div className="col-span-full grid size-12 place-items-center rounded-2xl bg-forest/[.08] text-forest">
            <Settings2 className="size-5" />
          </div>
          <label className="text-xs font-semibold">
            Stock stale after (minutes)
            <input
              name="staleStockMinutes"
              className="field mt-2"
              type="number"
              min="1"
              max="1440"
              defaultValue={settings.data.staleStockMinutes}
              required
            />
            <span className="mt-2 block text-[10px] font-normal text-ink/40">
              Integration dashboard and order confidence use this threshold.
            </span>
          </label>
          <label className="text-xs font-semibold">
            Default payment terms (days)
            <input
              name="defaultPaymentTermsDays"
              className="field mt-2"
              type="number"
              min="0"
              max="365"
              defaultValue={settings.data.defaultPaymentTermsDays}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Support email
            <input
              name="supportEmail"
              className="field mt-2"
              type="email"
              defaultValue={settings.data.supportEmail}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Notification sender name
            <input
              name="notificationFromName"
              className="field mt-2"
              minLength={2}
              defaultValue={settings.data.notificationFromName}
              required
            />
          </label>
          {error && (
            <div className="col-span-full">
              <ErrorRow message={error} />
            </div>
          )}
          {message && (
            <p
              role="status"
              className="col-span-full rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"
            >
              {message}
            </p>
          )}
          <div className="col-span-full">
            <Button type="submit" disabled={busy}>
              <Save className="size-4" />
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      )}
    </section>
    <DeliveryMethodsManager />
  </div>;
}

function DeliveryMethodsManager() {
  const methods = useApi<{ data: DeliveryMethod[] }>("/admin/settings/delivery-methods");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    method?: DeliveryMethod,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(method ? {} : { code: String(form.get("code")) }),
      name: String(form.get("name")),
      description: String(form.get("description")),
      priceMinor: Math.round(Number(form.get("price")) * 100),
      freeThresholdMinor: form.get("freeThreshold")
        ? Math.round(Number(form.get("freeThreshold")) * 100)
        : undefined,
      estimatedDaysMin: Number(form.get("estimatedDaysMin")),
      estimatedDaysMax: Number(form.get("estimatedDaysMax")),
      active: form.get("active") === "on",
      position: Number(form.get("position")),
    };
    setBusy(method?.id ?? "new");
    setError("");
    try {
      await apiSend(
        method
          ? `/admin/settings/delivery-methods/${method.id}`
          : "/admin/settings/delivery-methods",
        method ? "PATCH" : "POST",
        payload,
      );
      event.currentTarget.reset();
      await methods.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save delivery method");
    } finally {
      setBusy("");
    }
  }

  return <section className="surface overflow-hidden">
    <PanelHeading
      title="Delivery methods"
      description="Checkout services, charges, free-delivery thresholds, and estimates."
    />
    {methods.loading ? <LoadingRow /> : methods.error || !methods.data ? (
      <ErrorRow message={methods.error || "Delivery methods could not be loaded"} />
    ) : <div className="space-y-4 p-6">
      {methods.data.data.map((method) => (
        <DeliveryMethodForm
          key={method.id}
          method={method}
          busy={busy === method.id}
          onSubmit={(event) => submit(event, method)}
        />
      ))}
      <DeliveryMethodForm
        busy={busy === "new"}
        onSubmit={(event) => submit(event)}
      />
      {error && <ErrorRow message={error} />}
    </div>}
  </section>;
}

function DeliveryMethodForm({
  method,
  busy,
  onSubmit,
}: {
  method?: DeliveryMethod;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-ink/10 p-4 md:grid-cols-4">
    {!method && <input className="field" name="code" placeholder="Code, e.g. express" minLength={2} required />}
    <input className="field" name="name" placeholder="Name" defaultValue={method?.name} required />
    <input className="field md:col-span-2" name="description" placeholder="Customer-facing description" minLength={5} defaultValue={method?.description} required />
    <label className="text-xs font-semibold">Price (£)<input className="field mt-1" name="price" type="number" min="0" step="0.01" defaultValue={method ? method.priceMinor / 100 : 0} required /></label>
    <label className="text-xs font-semibold">Free over (£)<input className="field mt-1" name="freeThreshold" type="number" min="0" step="0.01" defaultValue={method?.freeThresholdMinor == null ? "" : method.freeThresholdMinor / 100} /></label>
    <label className="text-xs font-semibold">Minimum days<input className="field mt-1" name="estimatedDaysMin" type="number" min="0" defaultValue={method?.estimatedDaysMin ?? 2} required /></label>
    <label className="text-xs font-semibold">Maximum days<input className="field mt-1" name="estimatedDaysMax" type="number" min="0" defaultValue={method?.estimatedDaysMax ?? 4} required /></label>
    <label className="text-xs font-semibold">Position<input className="field mt-1" name="position" type="number" min="0" defaultValue={method?.position ?? 0} required /></label>
    <label className="flex items-center gap-2 text-xs font-semibold"><input name="active" type="checkbox" defaultChecked={method?.active ?? true} /> Active at checkout</label>
    <div className="md:col-span-2 md:text-right"><Button type="submit" disabled={busy}><Save className="size-4" />{busy ? "Saving…" : method ? "Save method" : "Add method"}</Button></div>
  </form>;
}
