import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({ label, value, note, trend = "up", icon: Icon }: { label: string; value: string; note: string; trend?: "up" | "down" | "neutral"; icon: LucideIcon }) {
  return <article className="rounded-xl border border-ink/10 bg-white p-4"><div className="flex items-center justify-between"><div className="grid size-9 place-items-center rounded-lg bg-mist text-forest"><Icon className="size-4" /></div><span className={`flex items-center gap-1 text-[10px] font-bold ${trend === "down" ? "text-rose-700" : trend === "up" ? "text-emerald-700" : "text-ink/45"}`}>{trend === "up" ? <ArrowUpRight className="size-3" /> : trend === "down" ? <ArrowDownRight className="size-3" /> : null}{note}</span></div><p className="mt-5 font-display text-3xl font-semibold leading-none tracking-[-.025em]">{value}</p><p className="mt-2 text-xs font-semibold text-ink/50">{label}</p></article>;
}
