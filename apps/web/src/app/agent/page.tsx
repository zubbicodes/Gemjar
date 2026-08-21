import { Building2, CalendarClock, Repeat2, ShoppingBag } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PortalShell } from "@/components/portal-shell";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Agent workspace" };

export default function AgentPage() {
  return (
    <PortalShell
      kind="agent"
      title="Your customer book."
      context="No customer selected"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Assigned customers"
          value="28"
          note="3 active"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Orders this month"
          value="42"
          note="18.2%"
        />
        <MetricCard
          icon={Repeat2}
          label="Reorder opportunities"
          value="11"
          note="£9.6k"
        />
        <MetricCard
          icon={CalendarClock}
          label="Follow-ups due"
          value="7"
          note="Today"
          trend="down"
        />
      </div>
      <section className="surface mt-6 p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl font-semibold">
              Assigned customers
            </p>
            <p className="mt-1 text-xs text-ink/45">
              Select a customer to activate secure ordering context.
            </p>
          </div>
          <input
            className="field max-w-xs"
            placeholder="Search customers or postcode…"
          />
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {([
            ["Aster & Row", "London", "Active"],
            ["North & Finch", "Bath", "Stock review"],
            ["Element House", "Manchester", "Active"],
          ] as Array<[string, string, string]>).map(([name, place, status]) => (
            <button
              key={name}
              className="rounded-2xl border border-ink/[.08] bg-white/45 p-5 text-left transition hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-forest text-xs font-bold text-white">
                  {name
                    .split(" ")
                    .map((word) => word.charAt(0))
                    .join("")
                    .slice(0, 2)}
                </span>
                <Badge tone={status === "Stock review" ? "warn" : "good"}>
                  {status}
                </Badge>
              </div>
              <p className="mt-5 font-display text-2xl font-semibold">{name}</p>
              <p className="mt-1 text-[11px] text-ink/40">{place} · Net 30</p>
            </button>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}
