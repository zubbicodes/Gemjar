"use client";

import {
  AlertCircle,
  BadgePoundSterling,
  Building2,
  Clock3,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Organization = {
  id: string;
  name: string;
  status: string;
  accountNumber?: string;
  paymentTermsDays: number;
  poRequired: boolean;
  creditLimitMinor?: number;
  membershipRole: string;
};

export function TradeAccountOverview() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [applicationMode, setApplicationMode] = useState(false);
  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch(`${API_URL}/organizations/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        Array.isArray(body.message)
          ? body.message.join(". ")
          : body.message || "Application could not be submitted",
      );
      return;
    }
    setError("");
    setMessage("Application submitted. Gemjar will review your trade account.");
    form.reset();
  }
  useEffect(() => {
    void fetch(`${API_URL}/organizations/current`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (response.status === 401) {
          setApplicationMode(true);
          return;
        }
        if (!response.ok)
          throw new Error(body.message || "Unable to load trade account");
        setOrganizations(body.data);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load trade account",
        ),
      );
  }, []);
  if (applicationMode || error || message)
    return (
      <section className="surface overflow-hidden">
        <div className="border-b border-ink/10 p-6">
          <h2 className="font-display text-3xl font-semibold">
            Apply for a trade account
          </h2>
          <p className="mt-2 text-xs text-ink/45">
            Create your organization owner account for review.
          </p>
        </div>
        {message ? (
          <p className="p-6 text-sm text-emerald-800">{message}</p>
        ) : (
          <form onSubmit={apply} className="grid gap-4 p-6 sm:grid-cols-2">
            <label className="text-xs font-bold">
              Company name
              <input className="field mt-2" name="companyName" required />
            </label>
            <label className="text-xs font-bold">
              Email
              <input
                className="field mt-2"
                name="email"
                type="email"
                required
              />
            </label>
            <label className="text-xs font-bold">
              First name
              <input className="field mt-2" name="firstName" required />
            </label>
            <label className="text-xs font-bold">
              Last name
              <input className="field mt-2" name="lastName" required />
            </label>
            <label className="text-xs font-bold">
              Password
              <input
                className="field mt-2"
                name="password"
                type="password"
                minLength={12}
                required
              />
            </label>
            <div className="flex items-end">
              <Button type="submit">Submit application</Button>
            </div>
            {error && (
              <div className="col-span-full flex gap-2 text-xs text-rose-800">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}
          </form>
        )}
      </section>
    );
  if (!organizations.length)
    return (
      <div className="surface p-10 text-center text-xs text-ink/45">
        Loading your approved organization…
      </div>
    );
  const organization = organizations[0]!;
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-[24px] border border-forest/10 bg-forest/[.045] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-forest/55">
            Active organization
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold">
            {organization.name}
          </h2>
          <p className="mt-1 text-xs text-ink/45">
            {organization.accountNumber || "Application pending account number"}{" "}
            · Signed in as {organization.membershipRole.toLowerCase()}
          </p>
        </div>
        <Badge tone={organization.status === "APPROVED" ? "good" : "warn"}>
          {organization.status}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BadgePoundSterling}
          label="Credit limit"
          value={
            organization.creditLimitMinor
              ? formatMoney(organization.creditLimitMinor)
              : "Not set"
          }
          note={`Net ${organization.paymentTermsDays}`}
          trend="neutral"
        />
        <MetricCard
          icon={Clock3}
          label="Payment terms"
          value={`${organization.paymentTermsDays} days`}
          note="Account terms"
        />
        <MetricCard
          icon={Building2}
          label="PO requirement"
          value={organization.poRequired ? "Required" : "Optional"}
          note="At submission"
          trend="neutral"
        />
        <MetricCard
          icon={UsersRound}
          label="Your role"
          value={organization.membershipRole}
          note="Organization access"
        />
      </div>
    </>
  );
}
