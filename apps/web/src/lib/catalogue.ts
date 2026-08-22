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
    sku: "BS285",
    collection: "Bamboo Socks",
    description: "Cheerful beach-hut socks made with a soft, breathable bamboo-rich blend.",
    price: 795,
    image: "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs285b_27133511-649f-42ab-9ba4-dacf67e09fc5.jpg?v=1782208938",
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
    name: "Lemons Bamboo Socks",
    slug: "lemons-bamboo-socks",
    sku: "BS284",
    collection: "Bamboo Socks",
    description: "Bright lemon-print socks with the smooth, breathable feel of bamboo fibre.",
    price: 795,
    image: "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs284b.jpg?v=1782208756",
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
  ...([
    ["vegetables-bamboo-socks", "Vegetables Bamboo Socks", "HA001", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/ha001_64cb47a0-6d51-46ab-b4ae-7e4b815e2f5c.jpg?v=1777462146", "Bamboo Socks"],
    ["pink-hearts-bamboo-socks-size-4-7", "Grey Hearts Bamboo Socks", "BS168", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/products/bs168b__PadWzEyMDAsMTIwMCwiRkZGRkZGIiwwXQ_1.jpg?v=1613200995", "Bamboo Socks"],
    ["turquoise-swan-bamboo-socks", "Turquoise Swan Bamboo Socks", "BS290", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs290b.jpg?v=1782210772", "Bamboo Socks"],
    ["dolphin-and-lighthouse-bamboo-socks", "Dolphin and Lighthouse Bamboo Socks", "BS289", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs289b.jpg?v=1782210584", "Bamboo Socks"],
    ["red-hare-bamboo-socks", "Red Hare Bamboo Socks", "BS288", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs288b.jpg?v=1782210130", "Bamboo Socks"],
    ["blue-hedgehog-bamboo-socks", "Blue Hedgehog Bamboo Socks", "BS287", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs287b.jpg?v=1782209318", "Bamboo Socks"],
    ["green-guinea-pig-bamboo-socks", "Green Guinea Pig Bamboo Socks", "BS286", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs286b.jpg?v=1782209129", "Bamboo Socks"],
    ["scallops-and-lobster-bamboo-socks", "Scallops and Lobster Bamboo Socks", "BS283", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs283b.jpg?v=1782208627", "Bamboo Socks"],
    ["seaside-bamboo-socks", "Seaside Bamboo Socks", "BS282", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs282b.jpg?v=1782208159", "Bamboo Socks"],
    ["sailing-boat-bamboo-crew-socks", "Sailing Boat Men's Bamboo Socks", "BL647", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl647b.jpg?v=1782137234", "Bamboo Socks"],
    ["sea-shell-bamboo-crew-socks", "Sea Shell Bamboo Crew Socks", "BL646", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl646b.jpg?v=1780412567", "Bamboo Socks"],
    ["piggy-bamboo-crew-socks", "Pig Print Men's Bamboo Socks", "BL645", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl645b.jpg?v=1780412406", "Bamboo Socks"],
    ["chicken-and-rooster-bamboo-crew-socks", "Chicken & Rooster Men's Bamboo Socks", "BL644", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl644b.jpg?v=1780412292", "Bamboo Socks"],
    ["tractor-bamboo-crew-socks", "Tractor Print Men's Bamboo Socks", "BL642", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl642b.jpg?v=1780412047", "Bamboo Socks"],
    ["stag-head-bamboo-crew-socks", "Stag Head Men's Bamboo Socks", "BL641", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl641b.jpg?v=1780411194", "Bamboo Socks"],
    ["flock-of-sheep-gift-box", "Flock of Sheep Gift Box", "GBFlock", 3400, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/GBFlock.png?v=1786375387", "Gifts"],
  ] as const).map(([slug, name, sku, price, image, collection], index) => ({
    id: `prd_client_${index + 1}`,
    variantId: `var_client_${index + 1}`,
    name,
    slug,
    sku,
    collection,
    description: collection === "Gifts" ? "A ready-to-gift Gemjar sock selection." : "Colourful bamboo-rich crew socks from the current Gemjar collection.",
    price,
    image,
    accent: "#4f758b",
    availability: "In stock" as const,
    material: collection === "Gifts" ? "Mixed sock selection" : "Bamboo-rich blend",
  })),
];

export const orders = [
  { id: "GJ-10482", customer: "Aster & Row", channel: "Trade", total: 184250, status: "Processing", age: "12 min" },
  { id: "GJ-10481", customer: "Maya Clarke", channel: "Online", total: 18900, status: "Paid", age: "28 min" },
  { id: "GJ-10480", customer: "North & Finch", channel: "Agent", total: 328400, status: "Stock check", age: "46 min" },
  { id: "GJ-10479", customer: "Eleanor Reed", channel: "Online", total: 23800, status: "Part dispatched", age: "1 hr" },
];
