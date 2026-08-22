import { products as fallbackProducts, type Product } from "./catalogue";

const API_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4100/api/v1";

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  media?: Array<{ url: string; alt: string }>;
  categories: Array<{ name: string }>;
  variant: {
    id: string;
    sku: string;
    retailPriceMinor: number;
    available: number;
    attributes?: Record<string, string>;
  } | null;
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
    image:
      item.image ??
      fallbackProducts.find((product) => product.slug === item.slug)?.image ??
      "/images/gemjar-hero.png",
    images: item.media?.length
      ? item.media.map(({ url, alt }) => ({ url, alt }))
      : undefined,
    accent: "#c9b99c",
    availability:
      item.variant.available > 8
        ? "In stock"
        : item.variant.available > 0
          ? "Low stock"
          : "Made to order",
    material:
      item.variant.attributes?.material ?? "Gemjar selected materials",
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_URL}/products`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok)
      throw new Error(`Catalogue API returned ${response.status}`);
    const body = (await response.json()) as { data: ApiProduct[] };
    return body.data
      .map(mapProduct)
      .filter((product): product is Product => Boolean(product));
  } catch {
    return fallbackProducts;
  }
}

export type StorefrontContent = {
  eyebrow: string;
  headline: string;
  emphasis: string;
  introduction: string;
  heroImageUrl: string;
  tradeHeadline: string;
  tradeIntroduction: string;
  deliveryPolicy: string;
  returnsPolicy: string;
  contactEmail: string;
};
export async function getStorefrontContent(): Promise<StorefrontContent> {
  const fallback = {
    eyebrow: "The autumn atelier",
    headline: "Objects of quiet",
    emphasis: "distinction.",
    introduction:
      "Considered jewellery for modern rituals. Precious materials, sculptural forms, and pieces made to remain.",
    heroImageUrl: "/images/gemjar-hero.png",
    tradeHeadline: "A better way to buy, built around your business.",
    tradeIntroduction:
      "Customer-specific pricing, intelligent reordering and a catalogue curated for your store—all in one calm workspace.",
    deliveryPolicy:
      "UK orders are prepared after payment and stock confirmation. Available delivery services, prices and estimated times are shown before checkout. Tracking appears in your account when a shipment is dispatched.",
    returnsPolicy:
      "Eligible items may be requested for return within 30 days of delivery. Submit the request from order history before sending goods. Personalized, worn or damaged items may be excluded where permitted by law.",
    contactEmail: "support@gemjar.co.uk",
  };
  try {
    const response = await fetch(`${API_URL}/content/storefront`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return response.ok
      ? ((await response.json()) as StorefrontContent)
      : fallback;
  } catch {
    return fallback;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const response = await fetch(
      `${API_URL}/products/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: AbortSignal.timeout(2500) },
    );
    if (!response.ok) return undefined;
    return mapProduct((await response.json()) as ApiProduct) ?? undefined;
  } catch {
    return fallbackProducts.find((product) => product.slug === slug);
  }
}
