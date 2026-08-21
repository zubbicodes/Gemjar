import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToBag } from "@/components/add-to-bag";
import { SiteHeader } from "@/components/site-header";
import { products } from "@/lib/catalogue";
import { getProduct } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <main><SiteHeader />
      <div className="mx-auto max-w-[1440px] px-5 py-6 text-[11px] text-ink/45 lg:px-10">Collection <ChevronRight className="mx-2 inline size-3" /> {product.collection}</div>
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-24 lg:grid-cols-[1.15fr_.85fr] lg:px-10">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-mist lg:aspect-[6/7]"><Image src={product.image} alt={product.name} fill priority className="object-cover" sizes="(max-width:1024px) 100vw, 60vw" /></div>
        <div className="flex flex-col justify-center lg:px-12">
          <p className="eyebrow">{product.collection}</p><h1 className="mt-4 font-display text-6xl font-semibold tracking-[-0.04em]">{product.name}</h1>
          <p className="mt-4 text-xl font-semibold">{formatMoney(product.price)}</p><p className="mt-7 max-w-lg text-sm leading-7 text-ink/62">{product.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-ink/10 py-5 text-xs"><div><dt className="text-ink/40">Material</dt><dd className="mt-1 font-semibold">{product.material}</dd></div><div><dt className="text-ink/40">Reference</dt><dd className="mt-1 font-semibold">{product.sku}</dd></div></dl>
          <div className="mt-7"><AddToBag product={product} /></div>
          <div className="mt-8 space-y-4 text-xs text-ink/60"><p className="flex items-center gap-3"><PackageCheck className="size-4 text-forest" /> Complimentary insured UK delivery over £150</p><p className="flex items-center gap-3"><ShieldCheck className="size-4 text-forest" /> Made with care and covered by our guarantee</p></div>
        </div>
      </section>
    </main>
  );
}
