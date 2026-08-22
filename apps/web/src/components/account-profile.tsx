"use client";

import { MapPin, Plus, Save, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";

type Address = {
  id: string;
  label: string;
  recipient: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  countryCode: string;
};
type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  addresses: Address[];
};

export function AccountProfile() {
  const profile = useApi<Profile>("/account/profile");
  const [showAddress, setShowAddress] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("profile");
    setError("");
    try {
      await apiSend("/account/profile", "PATCH", {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
      });
      setMessage("Profile updated.");
      await profile.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update profile",
      );
    } finally {
      setBusy("");
    }
  }

  async function addAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy("address");
    setError("");
    try {
      await apiSend(
        "/account/addresses",
        "POST",
        Object.fromEntries(form.entries()),
      );
      element.reset();
      setShowAddress(false);
      setMessage("Address added.");
      await profile.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add address",
      );
    } finally {
      setBusy("");
    }
  }

  async function removeAddress(id: string) {
    setBusy(id);
    setError("");
    try {
      await apiSend(`/account/addresses/${id}`, "DELETE");
      setMessage("Address removed.");
      await profile.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove address",
      );
    } finally {
      setBusy("");
    }
  }

  if (profile.loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (profile.error || !profile.data)
    return (
      <section className="surface">
        <ErrorRow message={profile.error || "Profile could not be loaded"} />
      </section>
    );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <section className="surface h-fit overflow-hidden">
        <PanelHeading
          title="Personal details"
          description="Used for account communication and checkout."
        />
        <form onSubmit={updateProfile} className="space-y-4 p-6">
          <div className="grid size-12 place-items-center rounded-2xl bg-forest/[.08] text-forest">
            <UserRound className="size-5" />
          </div>
          <label className="block text-xs font-semibold">
            First name
            <input
              name="firstName"
              className="field mt-2"
              defaultValue={profile.data.firstName}
              minLength={2}
              required
            />
          </label>
          <label className="block text-xs font-semibold">
            Last name
            <input
              name="lastName"
              className="field mt-2"
              defaultValue={profile.data.lastName}
              minLength={2}
              required
            />
          </label>
          <label className="block text-xs font-semibold">
            Email
            <input className="field mt-2" value={profile.data.email} disabled />
          </label>
          {error && <ErrorRow message={error} />}
          {message && (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"
            >
              {message}
            </p>
          )}
          <Button type="submit" disabled={busy === "profile"}>
            <Save className="size-4" />
            {busy === "profile" ? "Saving…" : "Save details"}
          </Button>
        </form>
      </section>

      <section className="surface overflow-hidden">
        <PanelHeading
          title="Delivery addresses"
          description="Saved addresses remain private to this account."
          action={
            <Button size="sm" onClick={() => setShowAddress(true)}>
              <Plus className="size-3.5" /> Add address
            </Button>
          }
        />
        {showAddress && (
          <form
            onSubmit={addAddress}
            className="m-6 grid gap-3 rounded-2xl border border-forest/15 bg-forest/[.035] p-5 sm:grid-cols-2"
          >
            <div className="col-span-full flex items-center justify-between">
              <p className="font-display text-xl font-semibold">New address</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowAddress(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <input
              name="label"
              className="field"
              placeholder="Label, e.g. Home"
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
            <input
              name="city"
              className="field"
              placeholder="Town or city"
              required
            />
            <input
              name="county"
              className="field"
              placeholder="County (optional)"
            />
            <input
              name="postcode"
              className="field uppercase"
              placeholder="Postcode"
              required
            />
            <input name="countryCode" type="hidden" value="GB" />
            <div className="col-span-full flex justify-end">
              <Button type="submit" disabled={busy === "address"}>
                {busy === "address" ? "Adding…" : "Add address"}
              </Button>
            </div>
          </form>
        )}
        {!profile.data.addresses.length ? (
          <EmptyRow message="No delivery addresses saved yet." />
        ) : (
          <ul className="grid gap-3 p-5 sm:grid-cols-2">
            {profile.data.addresses.map((address) => (
              <li
                key={address.id}
                className="rounded-2xl border border-ink/[.08] bg-white/45 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <MapPin className="size-4 text-forest" />
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label={`Remove ${address.label}`}
                    disabled={busy === address.id}
                    onClick={() => void removeAddress(address.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-4 text-xs font-bold">{address.label}</p>
                <p className="mt-2 text-xs leading-5 text-ink/55">
                  {address.recipient}
                  <br />
                  {address.line1}
                  {address.line2 ? (
                    <>
                      <br />
                      {address.line2}
                    </>
                  ) : null}
                  <br />
                  {address.city}
                  {address.county ? `, ${address.county}` : ""}
                  <br />
                  {address.postcode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
