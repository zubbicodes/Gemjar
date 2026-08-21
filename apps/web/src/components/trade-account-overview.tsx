"use client";

import { AlertCircle, BadgePoundSterling, Building2, Clock3, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Organization = { id: string; name: string; status: string; accountNumber?: string; paymentTermsDays: number; poRequired: boolean; creditLimitMinor?: number; membershipRole: string };

export function TradeAccountOverview() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch(`${API_URL}/organizations/current`, { credentials: "include", cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Unable to load trade account"); setOrganizations(body.data); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load trade account")); }, []);
  if (error) return <div className="surface flex gap-3 p-6 text-xs text-rose-800"><AlertCircle className="size-4" />{error}</div>;
  if (!organizations.length) return <div className="surface p-10 text-center text-xs text-ink/45">Loading your approved organization…</div>;
  const organization = organizations[0]!;
  return <><div className="mb-6 flex flex-col justify-between gap-4 rounded-[24px] border border-forest/10 bg-forest/[.045] p-5 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-forest/55">Active organization</p><h2 className="mt-1 font-display text-3xl font-semibold">{organization.name}</h2><p className="mt-1 text-xs text-ink/45">{organization.accountNumber || "Application pending account number"} · Signed in as {organization.membershipRole.toLowerCase()}</p></div><Badge tone={organization.status === "APPROVED" ? "good" : "warn"}>{organization.status}</Badge></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={BadgePoundSterling} label="Credit limit" value={organization.creditLimitMinor ? formatMoney(organization.creditLimitMinor) : "Not set"} note={`Net ${organization.paymentTermsDays}`} trend="neutral" /><MetricCard icon={Clock3} label="Payment terms" value={`${organization.paymentTermsDays} days`} note="Account terms" /><MetricCard icon={Building2} label="PO requirement" value={organization.poRequired ? "Required" : "Optional"} note="At submission" trend="neutral" /><MetricCard icon={UsersRound} label="Your role" value={organization.membershipRole} note="Organization access" /></div></>;
}
