import {
  OrganizationRole,
  OrganizationStatus,
  PrismaClient,
  ProductStatus,
  UserKind,
} from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

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

async function seedPermissions() {
  const pairs = [
    "catalogue:read",
    "catalogue:create",
    "catalogue:update",
    "pricing:read",
    "pricing:update",
    "customers:read",
    "customers:create",
    "customers:update",
    "agents:read",
    "agents:create",
    "agents:update",
    "orders:read",
    "orders:update",
    "fulfilment:read",
    "fulfilment:update",
    "finance:read",
    "finance:refund",
    "integrations:read",
    "integrations:retry",
    "audit:read",
    "settings:update",
  ];
  const permissionIds: string[] = [];
  for (const pair of pairs) {
    const [resource, action] = pair.split(":") as [string, string];
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
    permissionIds.push(permission.id);
  }
  const role = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: { description: "Full Gemjar platform administration" },
    create: {
      name: "Administrator",
      description: "Full Gemjar platform administration",
    },
  });
  for (const permissionId of permissionIds)
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId } },
      update: {},
      create: { roleId: role.id, permissionId },
    });
  const user = await prisma.user.upsert({
    where: { email: "admin@gemjar.test" },
    update: {
      firstName: "Amara",
      lastName: "Morgan",
      kind: UserKind.ADMIN,
      emailVerifiedAt: new Date(),
      mfaRequired: true,
    },
    create: {
      email: "admin@gemjar.test",
      passwordHash: await argon2.hash("GemjarDemo!2026", {
        type: argon2.argon2id,
      }),
      firstName: "Amara",
      lastName: "Morgan",
      kind: UserKind.ADMIN,
      emailVerifiedAt: new Date(),
      mfaRequired: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
}

async function seedAccounts() {
  const passwordHash = await argon2.hash("GemjarDemo!2026", {
    type: argon2.argon2id,
  });
  await prisma.user.upsert({
    where: { email: "customer@gemjar.test" },
    update: { kind: UserKind.CONSUMER, emailVerifiedAt: new Date() },
    create: {
      email: "customer@gemjar.test",
      passwordHash,
      firstName: "Maya",
      lastName: "Hart",
      kind: UserKind.CONSUMER,
      emailVerifiedAt: new Date(),
    },
  });
  const owner = await prisma.user.upsert({
    where: { email: "buyer@gemjar.test" },
    update: { kind: UserKind.B2B, emailVerifiedAt: new Date() },
    create: {
      email: "buyer@gemjar.test",
      passwordHash,
      firstName: "Priya",
      lastName: "Shah",
      kind: UserKind.B2B,
      emailVerifiedAt: new Date(),
    },
  });
  const organization = await prisma.organization.upsert({
    where: { accountNumber: "GJ-TRADE-001" },
    update: {
      name: "North & Finch",
      status: OrganizationStatus.APPROVED,
      catalogueRestricted: true,
    },
    create: {
      name: "North & Finch",
      accountNumber: "GJ-TRADE-001",
      status: OrganizationStatus.APPROVED,
      paymentTermsDays: 30,
      poRequired: true,
      creditLimitMinor: 250000,
      catalogueRestricted: true,
    },
  });
  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: organization.id,
      },
    },
    update: { role: OrganizationRole.OWNER },
    create: {
      userId: owner.id,
      organizationId: organization.id,
      role: OrganizationRole.OWNER,
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@gemjar.test" },
    update: {
      kind: UserKind.AGENT,
      emailVerifiedAt: new Date(),
      mfaRequired: true,
    },
    create: {
      email: "agent@gemjar.test",
      passwordHash,
      firstName: "Theo",
      lastName: "Bennett",
      kind: UserKind.AGENT,
      emailVerifiedAt: new Date(),
      mfaRequired: true,
    },
  });
  const agent = await prisma.salesAgent.upsert({
    where: { userId: agentUser.id },
    update: { active: true },
    create: { userId: agentUser.id, code: "AG-001" },
  });
  await prisma.agentCustomerAssignment.upsert({
    where: {
      agentId_organizationId: {
        agentId: agent.id,
        organizationId: organization.id,
      },
    },
    update: { active: true, unassignedAt: null },
    create: { agentId: agent.id, organizationId: organization.id },
  });
  if (
    !(await prisma.address.count({
      where: { organizationId: organization.id },
    }))
  )
    await prisma.address.create({
      data: {
        organizationId: organization.id,
        label: "Head office",
        recipient: "North & Finch",
        line1: "18 Walcot Street",
        city: "Bath",
        postcode: "BA1 5BD",
      },
    });
}

async function seedDeliveryMethods() {
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

async function seedTradePricing() {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { accountNumber: "GJ-TRADE-001" },
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

async function seedCatalogue() {
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

async function main() {
  await seedPermissions();
  await seedAccounts();
  await seedCatalogue();
  await seedTradePricing();
  await seedDeliveryMethods();
}
main().finally(() => prisma.$disconnect());
