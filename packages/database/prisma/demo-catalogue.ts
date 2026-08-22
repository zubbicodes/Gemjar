import { type PrismaClient, ProductStatus } from "@prisma/client";
import { TRADE_ACCOUNT_NUMBER } from "./demo-users";

const catalogue = [
  {
    name: "Beach Hut Bamboo Socks",
    slug: "beach-hut-bamboo-socks",
    sku: "BS285",
    category: "Bamboo Socks",
    categorySlug: "bamboo-socks",
    material: "Sustainable bamboo blend",
    price: 795,
    description:
      "Cheerful beach-hut socks made with a soft, breathable bamboo-rich blend.",
    image:
      "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs285b_27133511-649f-42ab-9ba4-dacf67e09fc5.jpg?v=1782208938",
    available: 18,
  },
  {
    name: "Fairisle Wool Sock Bundle",
    slug: "fairisle-wool-sock-bundle",
    sku: "GJ-WS-640",
    category: "Wool & Cosy",
    categorySlug: "wool-and-cosy",
    material: "Wool-rich blend",
    price: 2495,
    description:
      "A warm Fairisle-inspired sock bundle for colder days and cosy gifting.",
    image:
      "https://gemjarsocks.com/cdn/shop/files/FAIRISLE_BUNDLE.jpg",
    available: 7,
    moq: 2,
    packMultiple: 2,
  },
  {
    name: "Lemons Bamboo Socks",
    slug: "lemons-bamboo-socks",
    sku: "BS284",
    category: "Bamboo Socks",
    categorySlug: "bamboo-socks",
    material: "Sustainable bamboo blend",
    price: 795,
    description:
      "Bright lemon-print socks with the smooth, breathable feel of bamboo fibre.",
    image:
      "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs284b.jpg?v=1782208756",
    available: 31,
  },
  {
    name: "Bamboo Pyjama Set",
    slug: "bamboo-pyjama-set",
    sku: "GJ-PJ-101",
    category: "Sleepwear",
    categorySlug: "sleepwear",
    material: "Bamboo-rich jersey",
    price: 4495,
    description:
      "A soft bamboo pyjama set made for breathable lounging and comfortable sleep.",
    image:
      "https://gemjarsocks.com/cdn/shop/files/JOYA_SEPT_20204-22.jpg",
    available: 4,
  },
  ...([
    ["Vegetables Bamboo Socks", "vegetables-bamboo-socks", "HA001", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/ha001_64cb47a0-6d51-46ab-b4ae-7e4b815e2f5c.jpg?v=1777462146", "Bamboo Socks", "bamboo-socks"],
    ["Grey Hearts Bamboo Socks", "pink-hearts-bamboo-socks-size-4-7", "BS168", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/products/bs168b__PadWzEyMDAsMTIwMCwiRkZGRkZGIiwwXQ_1.jpg?v=1613200995", "Bamboo Socks", "bamboo-socks"],
    ["Turquoise Swan Bamboo Socks", "turquoise-swan-bamboo-socks", "BS290", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs290b.jpg?v=1782210772", "Bamboo Socks", "bamboo-socks"],
    ["Dolphin and Lighthouse Bamboo Socks", "dolphin-and-lighthouse-bamboo-socks", "BS289", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs289b.jpg?v=1782210584", "Bamboo Socks", "bamboo-socks"],
    ["Red Hare Bamboo Socks", "red-hare-bamboo-socks", "BS288", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs288b.jpg?v=1782210130", "Bamboo Socks", "bamboo-socks"],
    ["Blue Hedgehog Bamboo Socks", "blue-hedgehog-bamboo-socks", "BS287", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs287b.jpg?v=1782209318", "Bamboo Socks", "bamboo-socks"],
    ["Green Guinea Pig Bamboo Socks", "green-guinea-pig-bamboo-socks", "BS286", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs286b.jpg?v=1782209129", "Bamboo Socks", "bamboo-socks"],
    ["Scallops and Lobster Bamboo Socks", "scallops-and-lobster-bamboo-socks", "BS283", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs283b.jpg?v=1782208627", "Bamboo Socks", "bamboo-socks"],
    ["Seaside Bamboo Socks", "seaside-bamboo-socks", "BS282", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bs282b.jpg?v=1782208159", "Bamboo Socks", "bamboo-socks"],
    ["Sailing Boat Men's Bamboo Socks", "sailing-boat-bamboo-crew-socks", "BL647", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl647b.jpg?v=1782137234", "Bamboo Socks", "bamboo-socks"],
    ["Sea Shell Bamboo Crew Socks", "sea-shell-bamboo-crew-socks", "BL646", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl646b.jpg?v=1780412567", "Bamboo Socks", "bamboo-socks"],
    ["Pig Print Men's Bamboo Socks", "piggy-bamboo-crew-socks", "BL645", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl645b.jpg?v=1780412406", "Bamboo Socks", "bamboo-socks"],
    ["Chicken & Rooster Men's Bamboo Socks", "chicken-and-rooster-bamboo-crew-socks", "BL644", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl644b.jpg?v=1780412292", "Bamboo Socks", "bamboo-socks"],
    ["Tractor Print Men's Bamboo Socks", "tractor-bamboo-crew-socks", "BL642", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl642b.jpg?v=1780412047", "Bamboo Socks", "bamboo-socks"],
    ["Stag Head Men's Bamboo Socks", "stag-head-bamboo-crew-socks", "BL641", 795, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/bl641b.jpg?v=1780411194", "Bamboo Socks", "bamboo-socks"],
    ["Flock of Sheep Gift Box", "flock-of-sheep-gift-box", "GBFlock", 3400, "https://cdn.shopify.com/s/files/1/0544/4013/2795/files/GBFlock.png?v=1786375387", "Gifts", "gifts"],
  ] as const).map(([name, slug, sku, price, image, category, categorySlug], index) => ({
    name, slug, sku, price, image, category, categorySlug,
    material: category === "Gifts" ? "Mixed sock selection" : "Bamboo-rich blend",
    description: category === "Gifts" ? "A ready-to-gift Gemjar sock selection." : "Colourful bamboo-rich crew socks from the current Gemjar collection.",
    available: 12 + (index % 9),
  })),
] as const;

export async function seedDeliveryMethods(prisma: PrismaClient) {
  await prisma.deliveryMethod.upsert({
    where: { code: "standard" },
    update: {
      name: "Standard delivery",
      description: "Tracked UK delivery in 3–5 working days",
      priceMinor: 495,
      freeThresholdMinor: 15000,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      active: true,
      position: 1,
    },
    create: {
      code: "standard",
      name: "Standard delivery",
      description: "Tracked UK delivery in 3–5 working days",
      priceMinor: 495,
      freeThresholdMinor: 15000,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      position: 1,
    },
  });
  await prisma.deliveryMethod.upsert({
    where: { code: "express" },
    update: {
      name: "Express delivery",
      description: "Tracked UK delivery in 1–2 working days",
      priceMinor: 995,
      freeThresholdMinor: null,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
      active: true,
      position: 2,
    },
    create: {
      code: "express",
      name: "Express delivery",
      description: "Tracked UK delivery in 1–2 working days",
      priceMinor: 995,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
      position: 2,
    },
  });
}

export async function seedCatalogue(prisma: PrismaClient) {
  for (const item of catalogue) {
    const category = await prisma.category.upsert({
      where: { slug: item.categorySlug },
      update: { name: item.category },
      create: { name: item.category, slug: item.categorySlug },
    });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        status: ProductStatus.ACTIVE,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        status: ProductStatus.ACTIVE,
        categories: { create: { categoryId: category.id } },
        media: { create: { url: item.image, alt: item.name, position: 0 } },
        variants: {
          create: {
            sku: item.sku,
            retailPriceMinor: item.price,
            b2bPriceMinor: Math.round(item.price * 0.68),
            moq: "moq" in item ? item.moq : 1,
            packMultiple: "packMultiple" in item ? item.packMultiple : 1,
            attributes: { material: item.material },
          },
        },
      },
      include: { variants: true, media: true },
    });
    const variant = product.variants[0];
    if (variant) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          retailPriceMinor: item.price,
          b2bPriceMinor: Math.round(item.price * 0.68),
          moq: "moq" in item ? item.moq : 1,
          packMultiple: "packMultiple" in item ? item.packMultiple : 1,
          attributes: { material: item.material },
        },
      });
      const stockCount = await prisma.stockSnapshot.count({
        where: { variantId: variant.id },
      });
      if (!stockCount)
        await prisma.stockSnapshot.create({
          data: {
            variantId: variant.id,
            available: item.available,
            capturedAt:
              item.slug === "fairisle-wool-sock-bundle"
                ? new Date(Date.now() - 18 * 60_000)
                : new Date(),
            provider: "MINTSOFT_DEMO",
          },
        });
    }
    if (!product.media.length)
      await prisma.productMedia.create({
        data: {
          productId: product.id,
          url: item.image,
          alt: item.name,
          position: 0,
        },
      });
  }
  await prisma.product.updateMany({
    where: {
      slug: {
        in: ["verdant-signet", "luna-hoops", "serein-chain", "solitaire-cuff"],
      },
    },
    data: { status: ProductStatus.INACTIVE },
  });
}

export async function seedTradePricing(prisma: PrismaClient) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { accountNumber: TRADE_ACCOUNT_NUMBER },
  });
  const products = await prisma.product.findMany({
    where: { slug: { in: catalogue.map((item) => item.slug) } },
    include: { variants: true },
  });
  await prisma.organizationProductAccess.deleteMany({
    where: { organizationId: organization.id },
  });
  await prisma.organizationProductAccess.createMany({
    data: products.map((product) => ({
      organizationId: organization.id,
      productId: product.id,
    })),
  });
  const beachHut = products.find((product) => product.slug === "beach-hut-bamboo-socks")
    ?.variants[0];
  const fairisle = products.find((product) => product.slug === "fairisle-wool-sock-bundle")
    ?.variants[0];
  await prisma.customerPrice.deleteMany({
    where: { organizationId: organization.id },
  });
  await prisma.pricingHistory.deleteMany({
    where: { organizationId: organization.id },
  });
  const prices = [
    ...(beachHut
      ? [
          {
            variantId: beachHut.id,
            minQuantity: 1,
            unitPriceMinor: 525,
            rule: "CUSTOMER_FIXED",
          },
        ]
      : []),
    ...(fairisle
      ? [
          {
            variantId: fairisle.id,
            minQuantity: 1,
            unitPriceMinor: 1595,
            rule: "CUSTOMER_FIXED",
          },
          {
            variantId: fairisle.id,
            minQuantity: 4,
            unitPriceMinor: 1495,
            rule: "CUSTOMER_QUANTITY_TIER",
          },
        ]
      : []),
  ];
  for (const price of prices) {
    const current = await prisma.customerPrice.create({
      data: {
        organizationId: organization.id,
        variantId: price.variantId,
        minQuantity: price.minQuantity,
        unitPriceMinor: price.unitPriceMinor,
      },
    });
    await prisma.pricingHistory.create({
      data: {
        organizationId: organization.id,
        variantId: price.variantId,
        rule: price.rule,
        unitPriceMinor: price.unitPriceMinor,
        minQuantity: price.minQuantity,
        effectiveFrom: current.effectiveFrom,
      },
    });
  }
}

/**
 * Seeds the reference trade prices only when the account has none, so a fresh
 * environment demonstrates customer-specific pricing while any prices set
 * deliberately afterwards survive future deployments untouched.
 */
export async function seedInitialTradePricing(prisma: PrismaClient) {
  const organization = await prisma.organization.findUnique({
    where: { accountNumber: TRADE_ACCOUNT_NUMBER },
    select: { id: true },
  });
  if (!organization) return 0;
  if (
    await prisma.customerPrice.count({
      where: { organizationId: organization.id },
    })
  )
    return 0;
  await seedTradePricing(prisma);
  return prisma.customerPrice.count({
    where: { organizationId: organization.id },
  });
}
