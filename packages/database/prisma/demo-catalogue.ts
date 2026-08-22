import { type PrismaClient, ProductStatus } from "@prisma/client";
import { TRADE_ACCOUNT_NUMBER } from "./demo-users";

const catalogue = [
  {
    name: "Beach Hut Bamboo Socks",
    slug: "beach-hut-bamboo-socks",
    sku: "GJ-BS-284",
    category: "Bamboo Socks",
    categorySlug: "bamboo-socks",
    material: "Sustainable bamboo blend",
    price: 895,
    description:
      "Cheerful beach-hut socks made with a soft, breathable bamboo-rich blend.",
    image:
      "https://gemjarsocks.com/cdn/shop/files/beach-hut-bamboo-socks.png",
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
    name: "Lemon Bamboo Socks",
    slug: "lemon-bamboo-socks",
    sku: "GJ-BS-286",
    category: "Bamboo Socks",
    categorySlug: "bamboo-socks",
    material: "Sustainable bamboo blend",
    price: 895,
    description:
      "Bright lemon-print socks with the smooth, breathable feel of bamboo fibre.",
    image:
      "https://gemjarsocks.com/cdn/shop/files/lemons-bamboo-socks.png",
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
    where: { slug: { in: ["beach-hut-bamboo-socks", "fairisle-wool-sock-bundle", "lemon-bamboo-socks"] } },
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
            unitPriceMinor: 545,
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
