import { type PrismaClient, ProductStatus } from "@prisma/client";
import { TRADE_ACCOUNT_NUMBER } from "./demo-users";

const catalogue = [
  {
    name: "Verdant Signet",
    slug: "verdant-signet",
    sku: "GJ-RNG-042",
    price: 18900,
    description:
      "A sculptural signet in satin gold, set with a deep green lab-grown emerald.",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=88",
    available: 18,
  },
  {
    name: "Luna Hoops",
    slug: "luna-hoops",
    sku: "GJ-ER-118",
    price: 9600,
    description:
      "Quietly bold hoops with a softly brushed finish and balanced weight.",
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=88",
    available: 7,
    moq: 2,
    packMultiple: 2,
  },
  {
    name: "Serein Chain",
    slug: "serein-chain",
    sku: "GJ-NK-207",
    price: 14200,
    description:
      "An understated chain with a hand-finished clasp, designed for daily layering.",
    image:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=88",
    available: 31,
  },
  {
    name: "Solitaire Cuff",
    slug: "solitaire-cuff",
    sku: "GJ-BR-076",
    price: 22500,
    description:
      "A precise open cuff punctuated with a bezel-set white sapphire.",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=88",
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
  const category = await prisma.category.upsert({
    where: { slug: "atelier-edit" },
    update: { name: "The Atelier Edit" },
    create: { name: "The Atelier Edit", slug: "atelier-edit" },
  });
  for (const item of catalogue) {
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
              item.slug === "luna-hoops"
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
}

export async function seedTradePricing(prisma: PrismaClient) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { accountNumber: TRADE_ACCOUNT_NUMBER },
  });
  const products = await prisma.product.findMany({
    where: { slug: { in: ["verdant-signet", "luna-hoops", "serein-chain"] } },
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
  const verdant = products.find((product) => product.slug === "verdant-signet")
    ?.variants[0];
  const luna = products.find((product) => product.slug === "luna-hoops")
    ?.variants[0];
  await prisma.customerPrice.deleteMany({
    where: { organizationId: organization.id },
  });
  await prisma.pricingHistory.deleteMany({
    where: { organizationId: organization.id },
  });
  const prices = [
    ...(verdant
      ? [
          {
            variantId: verdant.id,
            minQuantity: 1,
            unitPriceMinor: 11500,
            rule: "CUSTOMER_FIXED",
          },
        ]
      : []),
    ...(luna
      ? [
          {
            variantId: luna.id,
            minQuantity: 1,
            unitPriceMinor: 6400,
            rule: "CUSTOMER_FIXED",
          },
          {
            variantId: luna.id,
            minQuantity: 4,
            unitPriceMinor: 5900,
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
