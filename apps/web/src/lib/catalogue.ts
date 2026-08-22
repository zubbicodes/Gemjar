export type Product = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  sku: string;
  collection: string;
  description: string;
  price: number;
  previousPrice?: number;
  image: string;
  images?: Array<{ url: string; alt: string }>;
  accent: string;
  availability: "In stock" | "Low stock" | "Made to order";
  material: string;
};

export const products: Product[] = [
  {
    id: "prd_beach_hut",
    variantId: "var_beach_hut",
    name: "Beach Hut Bamboo Socks",
    slug: "beach-hut-bamboo-socks",
    sku: "GJ-BS-284",
    collection: "Bamboo Socks",
    description: "Cheerful beach-hut socks made with a soft, breathable bamboo-rich blend.",
    price: 895,
    image: "https://gemjarsocks.com/cdn/shop/files/beach-hut-bamboo-socks.png",
    accent: "#72b7d2",
    availability: "In stock",
    material: "Sustainable bamboo blend",
  },
  {
    id: "prd_fairisle_bundle",
    variantId: "var_fairisle_bundle",
    name: "Fairisle Wool Sock Bundle",
    slug: "fairisle-wool-sock-bundle",
    sku: "GJ-WS-640",
    collection: "Wool & Cosy",
    description: "A warm Fairisle-inspired sock bundle for colder days and cosy gifting.",
    price: 2495,
    image: "https://gemjarsocks.com/cdn/shop/files/FAIRISLE_BUNDLE.jpg",
    accent: "#e96b58",
    availability: "Low stock",
    material: "Wool-rich blend",
  },
  {
    id: "prd_lemon_bamboo",
    variantId: "var_lemon_bamboo",
    name: "Lemon Bamboo Socks",
    slug: "lemon-bamboo-socks",
    sku: "GJ-BS-286",
    collection: "Bamboo Socks",
    description: "Bright lemon-print socks with the smooth, breathable feel of bamboo fibre.",
    price: 895,
    image: "https://gemjarsocks.com/cdn/shop/files/lemons-bamboo-socks.png",
    accent: "#f4b130",
    availability: "In stock",
    material: "Sustainable bamboo blend",
  },
  {
    id: "prd_bamboo_pyjamas",
    variantId: "var_bamboo_pyjamas",
    name: "Bamboo Pyjama Set",
    slug: "bamboo-pyjama-set",
    sku: "GJ-PJ-101",
    collection: "Sleepwear",
    description: "A soft bamboo pyjama set made for breathable lounging and comfortable sleep.",
    price: 4495,
    image: "https://gemjarsocks.com/cdn/shop/files/JOYA_SEPT_20204-22.jpg",
    accent: "#5d9e83",
    availability: "In stock",
    material: "Bamboo-rich jersey",
  },
];

export const orders = [
  { id: "GJ-10482", customer: "Aster & Row", channel: "Trade", total: 184250, status: "Processing", age: "12 min" },
  { id: "GJ-10481", customer: "Maya Clarke", channel: "Online", total: 18900, status: "Paid", age: "28 min" },
  { id: "GJ-10480", customer: "North & Finch", channel: "Agent", total: 328400, status: "Stock check", age: "46 min" },
  { id: "GJ-10479", customer: "Eleanor Reed", channel: "Online", total: 23800, status: "Part dispatched", age: "1 hr" },
];
