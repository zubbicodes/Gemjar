import Image from "next/image";
import Link from "next/link";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center rounded-lg bg-paper px-2 py-1 ${inverse ? "ring-1 ring-white/15" : ""}`} aria-label="Gemjar home">
      <Image src="https://gemjarsocks.com/cdn/shop/files/gemjar-logo.png?v=1736337647" alt="Gemjar — the new name for Joya Socks" width={230} height={70} className="h-10 w-auto object-contain" unoptimized priority />
    </Link>
  );
}
