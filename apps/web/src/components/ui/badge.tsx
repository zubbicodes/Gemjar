import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-ink/[0.06] text-ink/70",
    good: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]", tones[tone], className)}>{children}</span>;
}
