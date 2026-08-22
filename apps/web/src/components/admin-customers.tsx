"use client";

import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
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
  paymentTermsDays: number;
  poRequired: boolean;
  creditLimitMinor: number | null;
  catalogueRestricted: boolean;
  vatDisplay: "EXCLUSIVE" | "INCLUSIVE";
  createdAt: string;
  memberships: Array<{
    role: string;
    user: { id: string; email: string; firstName: string; lastName: string };
  }>;
  addresses: Array<{
    id: string;
    label: string;
    recipient: string;
    line1: string;
    line2: string | null;
    city: string;
    county: string | null;
    postcode: string;
  }>;
};

export function AdminCustomers() {
  const organizations = useApi<{ data: Organization[] }>("/organizations");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [managingAddresses, setManagingAddresses] = useState("");

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("create");
    setError("");
    setMessage("");
    try {
      const creditLimit = String(form.get("creditLimit") ?? "").trim();
      const customer = await apiSend<Organization>("/organizations", "POST", {
        companyName: form.get("companyName"),
        accountNumber: form.get("accountNumber") || undefined,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
        paymentTermsDays: Number(form.get("paymentTermsDays")),
        poRequired: form.get("poRequired") === "on",
        creditLimitMinor: creditLimit
          ? Math.round(Number(creditLimit) * 100)
          : undefined,
        catalogueRestricted: form.get("catalogueRestricted") === "on",
      });
      formElement.reset();
      setShowCreate(false);
      setMessage(`${customer.name} was created and approved.`);
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create customer",
      );
    } finally {
      setBusy("");
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(id);
    setError("");
    try {
      await apiSend(`/organizations/${id}/status`, "PATCH", { status });
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update this account",
      );
    } finally {
      setBusy("");
    }
  }

  async function updateTerms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const credit = String(form.get("creditLimit") ?? "").trim();
    setBusy(editing.id);
    setError("");
    try {
      await apiSend(`/organizations/${editing.id}/terms`, "PATCH", {
        paymentTermsDays: Number(form.get("paymentTermsDays")),
        poRequired: form.get("poRequired") === "on",
        creditLimitMinor: credit ? Math.round(Number(credit) * 100) : null,
        catalogueRestricted: form.get("catalogueRestricted") === "on",
        vatDisplay: form.get("vatDisplay"),
      });
      setEditing(null);
      setMessage("Customer terms updated.");
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update terms",
      );
    } finally {
      setBusy("");
    }
  }

  async function addAddress(
    event: React.FormEvent<HTMLFormElement>,
    organizationId: string,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(`address:${organizationId}`);
    setError("");
    try {
      await apiSend(`/organizations/${organizationId}/addresses`, "POST", {
        label: form.get("label"),
        recipient: form.get("recipient"),
        line1: form.get("line1"),
        line2: form.get("line2") || undefined,
        city: form.get("city"),
        county: form.get("county") || undefined,
        postcode: form.get("postcode"),
      });
      formElement.reset();
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to add this delivery location",
      );
    } finally {
      setBusy("");
    }
  }

  async function removeAddress(organizationId: string, addressId: string) {
    setBusy(`address:${organizationId}`);
    setError("");
    try {
      await apiSend(
        `/organizations/${organizationId}/addresses/${addressId}`,
        "DELETE",
      );
      await organizations.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to remove this delivery location",
      );
    } finally {
      setBusy("");
    }
  }

  const pending =
    organizations.data?.data.filter(
      (organization) => organization.status === "PENDING",
    ) ?? [];

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Trade customers"
        description="Approve applications, review terms, and see who can order on each account."
        action={
          <div className="flex items-center gap-3">
            {pending.length > 0 && (
              <p className="text-xs font-semibold text-amber-800">
                {pending.length} awaiting approval
              </p>
            )}
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5" /> Add customer
            </Button>
          </div>
        }
      />
      {message && (
        <div
          role="status"
          className="mx-6 mt-5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {message}
        </div>
      )}
      {error && <ErrorRow message={error} />}
      {showCreate && (
        <form
          onSubmit={createCustomer}
          className="m-6 grid gap-4 rounded-2xl border border-forest/15 bg-forest/[.035] p-5 sm:grid-cols-2"
        >
          <div className="col-span-full flex items-start justify-between">
            <div>
              <p className="font-display text-2xl font-semibold">
                Add trade customer
              </p>
              <p className="mt-1 text-[11px] text-ink/45">
                Creates an approved organization and its owner login.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowCreate(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <label className="text-xs font-semibold">
            Company name
            <input
              name="companyName"
              className="field mt-2"
              minLength={2}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Account number
            <input
              name="accountNumber"
              className="field mt-2 uppercase"
              pattern="[A-Za-z0-9-]{2,30}"
              placeholder="GJ-TRADE-002"
            />
          </label>
          <label className="text-xs font-semibold">
            Owner first name
            <input
              name="firstName"
              className="field mt-2"
              minLength={2}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Owner last name
            <input
              name="lastName"
              className="field mt-2"
              minLength={2}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Owner email
            <input name="email" className="field mt-2" type="email" required />
          </label>
          <label className="text-xs font-semibold">
            Temporary password
            <input
              name="password"
              className="field mt-2"
              type="password"
              minLength={12}
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Payment terms (days)
            <input
              name="paymentTermsDays"
              className="field mt-2"
              type="number"
              min="0"
              max="365"
              defaultValue="30"
              required
            />
          </label>
          <label className="text-xs font-semibold">
            Credit limit (£)
            <input
              name="creditLimit"
              className="field mt-2"
              type="number"
              min="0"
              step="0.01"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input name="poRequired" type="checkbox" /> Purchase order required
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input name="catalogueRestricted" type="checkbox" /> Restrict
            catalogue
          </label>
          <div className="col-span-full flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Create customer"}
            </Button>
          </div>
        </form>
      )}
      {organizations.loading ? (
        <LoadingRow />
      ) : organizations.error ? (
        <ErrorRow message={organizations.error} />
      ) : !organizations.data?.data.length ? (
        <EmptyRow message="No trade accounts have applied yet." />
      ) : (
        <ul className="divide-y divide-ink/[.06]">
          {organizations.data.data.map((organization) => (
            <li key={organization.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    {organization.accountNumber ?? "Account number pending"} ·
                    applied {formatDate(organization.createdAt)} · Net{" "}
                    {organization.paymentTermsDays}
                    {organization.poRequired ? " · PO required" : ""}
                    {organization.catalogueRestricted
                      ? " · restricted catalogue"
                      : ""}
                  </p>
                  <p className="mt-2 text-[11px] text-ink/55">
                    {organization.creditLimitMinor
                      ? `Credit limit ${formatMoney(organization.creditLimitMinor)}`
                      : "No credit limit set"}
                    {organization.memberships.length
                      ? ` · ${organization.memberships.length} user(s)`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={organization.status} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(organization)}
                  >
                    <Pencil className="size-3.5" /> Edit terms
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setManagingAddresses(
                        managingAddresses === organization.id
                          ? ""
                          : organization.id,
                      )
                    }
                  >
                    <MapPin className="size-3.5" /> Delivery locations (
                    {organization.addresses.length})
                  </Button>
                  {organization.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy === organization.id}
                        onClick={() => setStatus(organization.id, "APPROVED")}
                      >
                        <Check className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === organization.id}
                        onClick={() => setStatus(organization.id, "REJECTED")}
                      >
                        <X className="size-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {organization.status === "APPROVED" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === organization.id}
                      onClick={() => setStatus(organization.id, "SUSPENDED")}
                    >
                      Suspend
                    </Button>
                  )}
                  {organization.status === "SUSPENDED" && (
                    <Button
                      size="sm"
                      disabled={busy === organization.id}
                      onClick={() => setStatus(organization.id, "APPROVED")}
                    >
                      Reinstate
                    </Button>
                  )}
                </div>
              </div>
              {editing?.id === organization.id && (
                <form
                  className="mt-5 grid gap-3 rounded-2xl border border-ink/10 bg-white/45 p-4 sm:grid-cols-2 lg:grid-cols-5"
                  onSubmit={updateTerms}
                >
                  <label className="text-xs font-bold">
                    Payment days
                    <input
                      className="field mt-2"
                      name="paymentTermsDays"
                      type="number"
                      min="0"
                      max="365"
                      defaultValue={organization.paymentTermsDays}
                      required
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Credit limit (£)
                    <input
                      className="field mt-2"
                      name="creditLimit"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        organization.creditLimitMinor == null
                          ? ""
                          : organization.creditLimitMinor / 100
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    VAT display
                    <select
                      className="field mt-2"
                      name="vatDisplay"
                      defaultValue={organization.vatDisplay}
                    >
                      <option value="EXCLUSIVE">Exclusive</option>
                      <option value="INCLUSIVE">Inclusive</option>
                    </select>
                  </label>
                  <div className="flex flex-col justify-end gap-2 pb-1 text-xs">
                    <label>
                      <input
                        type="checkbox"
                        name="poRequired"
                        defaultChecked={organization.poRequired}
                      />{" "}
                      PO required
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="catalogueRestricted"
                        defaultChecked={organization.catalogueRestricted}
                      />{" "}
                      Restricted catalogue
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={busy === organization.id}>
                      Save terms
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              {organization.memberships.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {organization.memberships.map((membership) => (
                    <li
                      key={membership.user.id}
                      className="rounded-full border border-ink/[.08] bg-white/50 px-3 py-1.5 text-[10px]"
                    >
                      <b>
                        {membership.user.firstName} {membership.user.lastName}
                      </b>{" "}
                      · {membership.user.email} ·{" "}
                      {membership.role.toLowerCase()}
                    </li>
                  ))}
                </ul>
              )}
              {managingAddresses === organization.id && (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-white/45 p-4">
                  <p className="text-xs font-bold">Delivery locations</p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    Warehouses, stores and branches this account can choose as
                    a delivery destination when ordering.
                  </p>
                  {organization.addresses.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {organization.addresses.map((address) => (
                        <li
                          key={address.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-ink/[.08] bg-white/60 p-3"
                        >
                          <div className="flex items-start gap-2 text-[11px]">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-forest" />
                            <div>
                              <p className="font-bold">{address.label}</p>
                              <p className="text-ink/55">
                                {address.recipient} · {address.line1}
                                {address.line2 ? `, ${address.line2}` : ""},{" "}
                                {address.city}
                                {address.county ? `, ${address.county}` : ""}{" "}
                                {address.postcode}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${address.label}`}
                            disabled={busy === `address:${organization.id}`}
                            onClick={() =>
                              void removeAddress(organization.id, address.id)
                            }
                            className="shrink-0 text-ink/35 hover:text-red-600"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(event) => void addAddress(event, organization.id)}
                    className="mt-4 grid gap-2 sm:grid-cols-2"
                  >
                    <input
                      name="label"
                      className="field"
                      placeholder="Location name (e.g. London Warehouse)"
                      minLength={1}
                      required
                    />
                    <input
                      name="recipient"
                      className="field"
                      placeholder="Recipient"
                      required
                    />
                    <input
                      name="line1"
                      className="field sm:col-span-2"
                      placeholder="Address line 1"
                      required
                    />
                    <input
                      name="line2"
                      className="field sm:col-span-2"
                      placeholder="Address line 2 (optional)"
                    />
                    <input name="city" className="field" placeholder="Town or city" required />
                    <input
                      name="postcode"
                      className="field uppercase"
                      placeholder="Postcode"
                      required
                    />
                    <input
                      name="county"
                      className="field sm:col-span-2"
                      placeholder="County (optional)"
                    />
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={busy === `address:${organization.id}`}
                      >
                        <Plus className="size-3.5" /> Add location
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
