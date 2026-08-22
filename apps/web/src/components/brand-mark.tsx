import Link from "next/link";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 whitespace-nowrap ${inverse ? "text-white" : "text-ink"}`} aria-label="Gemjar home">
      <svg viewBox="0 0 30 38" className="h-9 w-7" aria-hidden="true">
        <path d="M7 2h16v17c0 3 2 4 4 6 3 3 2 8-1 10-4 3-13 2-18-1-4-3-5-7-2-11l3-4V2Z" fill="currentColor" />
        <path d="M7 9h16M8 16h15" fill="none" stroke={inverse ? "var(--color-sun)" : "var(--color-paper)"} strokeWidth="4" />
      </svg>
      <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.045em]">Gemjar</span>
    </Link>
  );
}
