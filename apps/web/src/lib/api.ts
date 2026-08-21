import { products as fallbackProducts, type Product } from "./catalogue";

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  categories: Array<{ name: string }>;
  variant: { id: string; sku: string; retailPriceMinor: number; available: number } | null;
};

function mapProduct(item: ApiProduct): Product | null {
  if (!item.variant) return null;
  return {
    id: item.id,
    variantId: item.variant.id,
    name: item.name,
    slug: item.slug,
    sku: item.variant.sku,
    collection: item.categories[0]?.name ?? "Gemjar Collection",
    description: item.description,
    price: item.variant.retailPriceMinor,
    image: item.image ?? fallbackProducts.find((product) => product.slug === item.slug)?.image ?? "/images/gemjar-hero.png",
    accent: "#c9b99c",
    availability: item.variant.available > 8 ? "In stock" : item.variant.available > 0 ? "Low stock" : "Made to order",
    material: "Gemjar selected materials",
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_URL}/products`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error(`Catalogue API returned ${response.status}`);
    const body = await response.json() as { data: ApiProduct[] };
    return body.data.map(mapProduct).filter((product): product is Product => Boolean(product));
  } catch {
    return fallbackProducts;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const response = await fetch(`${API_URL}/products/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) return undefined;
    return mapProduct(await response.json() as ApiProduct) ?? undefined;
  } catch {
    return fallbackProducts.find((product) => product.slug === slug);
  }
}
