import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToBag } from "@/components/add-to-bag";
import { SiteHeader } from "@/components/site-header";
import { products } from "@/lib/catalogue";
import { getProduct } from "@/lib/api";
import { getProducts } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed } from "@/components/recently-viewed";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, catalogue] = await Promise.all([
    getProduct(slug),
    getProducts(),
  ]);
  if (!product) notFound();
  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-5 py-6 text-[11px] text-ink/45 lg:px-10">
        Collection <ChevronRight className="mx-2 inline size-3" />{" "}
        {product.collection}
      </div>
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-24 lg:grid-cols-[1.15fr_.85fr] lg:px-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {(product.images?.length
            ? product.images
            : [{ url: product.image, alt: product.name }]
          ).map((media, index) => (
            <div
              key={`${media.url}-${index}`}
              className={`relative aspect-[4/5] overflow-hidden rounded-[24px] bg-mist ${index === 0 ? "sm:col-span-2" : ""}`}
            >
              <Image
                src={media.url}
                alt={media.alt || product.name}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 60vw"
                unoptimized={media.url.startsWith("http")}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center lg:px-12">
          <p className="eyebrow">{product.collection}</p>
          <h1 className="mt-4 font-display text-6xl font-semibold tracking-[-0.04em]">
            {product.name}
          </h1>
          <p className="mt-4 text-xl font-semibold">
            {formatMoney(product.price)}
          </p>
          <p className="mt-7 max-w-lg text-sm leading-7 text-ink/62">
            {product.description}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-ink/10 py-5 text-xs">
            <div>
              <dt className="text-ink/40">Material</dt>
              <dd className="mt-1 font-semibold">{product.material}</dd>
            </div>
            <div>
              <dt className="text-ink/40">Reference</dt>
              <dd className="mt-1 font-semibold">{product.sku}</dd>
            </div>
          </dl>
          <div className="mt-7">
            <AddToBag product={product} />
          </div>
          <div className="mt-8 space-y-4 text-xs text-ink/60">
            <p className="flex items-center gap-3">
              <PackageCheck className="size-4 text-forest" /> Complimentary
              insured UK delivery over £150
            </p>
            <p className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-forest" /> Made with care and
              covered by our guarantee
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10">
        <p className="eyebrow">You may also like</p>
        <h2 className="mt-3 font-display text-4xl font-semibold">
          Related pieces
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {catalogue
            .filter((item) => item.id !== product.id)
            .sort(
              (a, b) =>
                Number(b.collection === product.collection) -
                Number(a.collection === product.collection),
            )
            .slice(0, 4)
            .map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
        </div>
      </section>
      <RecentlyViewed current={product} catalogue={catalogue} />
    </main>
  );
}
