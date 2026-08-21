import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { getProducts } from "@/lib/api";

export const metadata = { title: "The Collection" };

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <main><SiteHeader />
      <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-14 lg:px-10 lg:pt-20">
        <div className="grid gap-8 border-b border-ink/10 pb-12 lg:grid-cols-[1fr_440px] lg:items-end">
          <div><p className="eyebrow">The complete collection</p><h1 className="mt-4 font-display text-6xl font-semibold tracking-[-0.045em] sm:text-8xl">Made to be kept.</h1></div>
          <p className="max-w-md text-sm leading-7 text-ink/60">A study in precious materials and enduring shapes. Each piece is selected for its presence, proportion and capacity to become distinctly yours.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-7">
          <div className="flex gap-2">
            {["All pieces", "Rings", "Necklaces", "Earrings", "Bracelets"].map((filter, index) => <button key={filter} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${index === 0 ? "bg-forest text-white" : "border border-ink/10 bg-white/40 hover:border-forest/30"}`}>{filter}</button>)}
          </div>
          <button className="flex items-center gap-2 text-xs font-semibold"><SlidersHorizontal className="size-4" /> Filters & sort</button>
        </div>
        <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      </section>
    </main>
  );
}
