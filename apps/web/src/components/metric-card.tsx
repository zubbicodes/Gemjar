import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({ label, value, note, trend = "up", icon: Icon }: { label: string; value: string; note: string; trend?: "up" | "down" | "neutral"; icon: LucideIcon }) {
  return <article className="surface p-5 sm:p-6"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-forest/[.07] text-forest"><Icon className="size-4" /></div><span className={`flex items-center gap-1 text-[10px] font-bold ${trend === "down" ? "text-rose-700" : trend === "up" ? "text-emerald-700" : "text-ink/40"}`}>{trend === "up" ? <ArrowUpRight className="size-3" /> : trend === "down" ? <ArrowDownRight className="size-3" /> : null}{note}</span></div><p className="mt-6 font-display text-[38px] font-semibold leading-none tracking-[-.03em]">{value}</p><p className="mt-2 text-[11px] font-semibold text-ink/45">{label}</p></article>;
}
