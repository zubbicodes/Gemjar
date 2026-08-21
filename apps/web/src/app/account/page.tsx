import { Heart, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PortalShell } from "@/components/portal-shell";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return <PortalShell kind="account" title="Your Gemjar collection."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ShoppingBag} label="Orders" value="8" note="All time" trend="neutral" /><MetricCard icon={Truck} label="In transit" value="1" note="Due Friday" /><MetricCard icon={Heart} label="Saved pieces" value="6" note="2 low stock" trend="down" /><MetricCard icon={PackageCheck} label="Delivered" value="7" note="Latest 14 Aug" /></div><section className="surface mt-6 p-6"><p className="font-display text-2xl font-semibold">Your latest order</p><div className="mt-6 flex flex-col justify-between gap-6 rounded-2xl bg-white/50 p-5 sm:flex-row sm:items-center"><div><div className="flex items-center gap-3"><p className="text-sm font-bold">GJ-10348</p><Badge tone="good">Dispatched</Badge></div><p className="mt-2 text-xs text-ink/45">2 pieces · £285.00 · Placed 14 August</p></div><div className="flex items-center gap-3 text-xs font-semibold text-forest"><Truck className="size-4" /> Arriving Friday <span>→</span></div></div></section></PortalShell>;
}
