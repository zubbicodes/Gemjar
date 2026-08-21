import Link from "next/link";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`group flex items-center gap-3 ${inverse ? "text-white" : "text-ink"}`} aria-label="Gemjar home">
      <span className={`grid size-9 rotate-45 place-items-center rounded-[10px] border ${inverse ? "border-white/30 bg-white/10" : "border-forest/25 bg-forest"}`}>
        <span className={`size-3 rounded-[3px] border ${inverse ? "border-gold bg-gold/20" : "border-gold bg-gold/30"}`} />
      </span>
      <span className="font-display text-[29px] font-semibold leading-none tracking-[-0.035em]">Gemjar</span>
    </Link>
  );
}
