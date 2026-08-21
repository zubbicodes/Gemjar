export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  collection: string;
  description: string;
  price: number;
  previousPrice?: number;
  image: string;
  accent: string;
  availability: "In stock" | "Low stock" | "Made to order";
  material: string;
};

export const products: Product[] = [
  {
    id: "prd_emerald_signet",
    name: "Verdant Signet",
    slug: "verdant-signet",
    sku: "GJ-RNG-042",
    collection: "The Atelier Edit",
    description: "A sculptural signet in satin gold, set with a deep green lab-grown emerald.",
    price: 18900,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=88",
    accent: "#c9b99c",
    availability: "In stock",
    material: "18k gold vermeil",
  },
  {
    id: "prd_luna_hoops",
    name: "Luna Hoops",
    slug: "luna-hoops",
    sku: "GJ-ER-118",
    collection: "Everyday Forms",
    description: "Quietly bold hoops with a softly brushed finish and balanced weight.",
    price: 9600,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=88",
    accent: "#d4cab8",
    availability: "Low stock",
    material: "Recycled sterling silver",
  },
  {
    id: "prd_serein_chain",
    name: "Serein Chain",
    slug: "serein-chain",
    sku: "GJ-NK-207",
    collection: "Modern Heirlooms",
    description: "An understated chain with a hand-finished clasp, designed for daily layering.",
    price: 14200,
    previousPrice: 16500,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=88",
    accent: "#b6a78c",
    availability: "In stock",
    material: "14k gold fill",
  },
  {
    id: "prd_solitaire_cuff",
    name: "Solitaire Cuff",
    slug: "solitaire-cuff",
    sku: "GJ-BR-076",
    collection: "The Atelier Edit",
    description: "A precise open cuff punctuated with a bezel-set white sapphire.",
    price: 22500,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=88",
    accent: "#ded6c7",
    availability: "Made to order",
    material: "18k gold vermeil",
  },
];

export const orders = [
  { id: "GJ-10482", customer: "Aster & Row", channel: "Trade", total: 184250, status: "Processing", age: "12 min" },
  { id: "GJ-10481", customer: "Maya Clarke", channel: "Online", total: 18900, status: "Paid", age: "28 min" },
  { id: "GJ-10480", customer: "North & Finch", channel: "Agent", total: 328400, status: "Stock check", age: "46 min" },
  { id: "GJ-10479", customer: "Eleanor Reed", channel: "Online", total: 23800, status: "Part dispatched", age: "1 hr" },
];
