import { ShopBrowser } from "@/components/shop-browser";
import { SiteHeader } from "@/components/site-header";
import { getProducts } from "@/lib/api";

export const metadata = { title: "Socks, sleepwear and gifts" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await getProducts();
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-14 lg:px-10 lg:pt-20">
        <div className="grid gap-8 border-b border-ink/10 pb-12 lg:grid-cols-[1fr_440px] lg:items-end">
          <div>
            <p className="eyebrow">Socks, sleepwear and gifts</p>
            <h1 className="display-safe mt-4 font-display text-6xl font-extrabold tracking-[-0.055em] sm:text-8xl">
              Find your happy feet.
            </h1>
          </div>
          <p className="max-w-md text-sm leading-7 text-ink/75">
            Soft bamboo for everyday comfort, warm wool blends for chilly days,
            and colourful Gemjar patterns that make gifting easy.
          </p>
        </div>
        <ShopBrowser products={products} initialCategory={category} />
      </section>
    </main>
  );
}
