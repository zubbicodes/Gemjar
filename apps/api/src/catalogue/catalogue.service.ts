import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";

const productInclude = {
  variants: {
    include: {
      stockSnapshots: { orderBy: { capturedAt: "desc" as const }, take: 1 },
    },
    orderBy: { sku: "asc" as const },
  },
  media: { orderBy: { position: "asc" as const } },
  categories: { include: { category: true } },
};

@Injectable()
export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query?: string, includeInactive = false) {
    const term = query?.trim();
    const products = await this.prisma.product.findMany({
      where: {
        status: includeInactive ? undefined : ProductStatus.ACTIVE,
        b2cVisible: includeInactive ? undefined : true,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                {
                  variants: {
                    some: { sku: { contains: term, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    return products.map((product) => this.toCatalogueItem(product));
  }

  async listForOrganization(organizationId: string, query?: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { catalogueRestricted: true },
    });
    if (!organization)
      throw new NotFoundException("Organization was not found");
    const term = query?.trim();
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        b2bVisible: true,
        ...(organization.catalogueRestricted
          ? { organizationAccess: { some: { organizationId } } }
          : {}),
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                {
                  variants: {
                    some: { sku: { contains: term, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });
    const now = new Date();
    const variants = products.flatMap((product) => product.variants);
    const prices = variants.length
      ? await this.prisma.customerPrice.findMany({
          where: {
            organizationId,
            variantId: { in: variants.map(({ id }) => id) },
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          },
          orderBy: [{ minQuantity: "desc" }, { effectiveFrom: "desc" }],
        })
      : [];
    const priceByVariant = new Map<
      string,
      { unitPriceMinor: number; minQuantity: number }
    >();
    for (const price of prices) {
      const variant = variants.find(({ id }) => id === price.variantId);
      if (
        variant &&
        price.minQuantity <= variant.moq &&
        !priceByVariant.has(price.variantId)
      )
        priceByVariant.set(price.variantId, price);
    }
    return products.map((product) =>
      this.toCatalogueItem(product, priceByVariant),
    );
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    if (
      !product ||
      product.status !== ProductStatus.ACTIVE ||
      !product.b2cVisible
    )
      throw new NotFoundException("Product was not found");
    return this.toCatalogueItem(product);
  }

  async findVariant(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, b2cVisible: true, b2bVisible: true },
        },
        stockSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      },
    });
    if (!variant || !variant.active)
      throw new NotFoundException(`Variant ${id} was not found`);
    return {
      ...variant,
      productName: variant.product.name,
      available: variant.stockSnapshots[0]?.available ?? 0,
      capturedAt: (
        variant.stockSnapshots[0]?.capturedAt ?? new Date(0)
      ).toISOString(),
    };
  }

  async create(
    input: {
      name: string;
      slug: string;
      description: string;
      sku: string;
      retailPriceMinor: number;
      b2bPriceMinor?: number;
      moq: number;
      packMultiple: number;
      imageUrl?: string;
      mediaUrls?: string[];
    },
    actorId?: string,
  ) {
    if (
      await this.prisma.product.findFirst({
        where: {
          OR: [
            { slug: input.slug },
            { variants: { some: { sku: input.sku } } },
          ],
        },
        select: { id: true },
      })
    )
      throw new ConflictException("A product already uses this slug or SKU");
    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        status: ProductStatus.ACTIVE,
        variants: {
          create: {
            sku: input.sku,
            retailPriceMinor: input.retailPriceMinor,
            b2bPriceMinor: input.b2bPriceMinor,
            moq: input.moq,
            packMultiple: input.packMultiple,
            stockSnapshots: {
              create: {
                available: 0,
                capturedAt: new Date(),
                provider: "MANUAL",
              },
            },
          },
        },
        ...(input.mediaUrls?.length || input.imageUrl
          ? {
              media: {
                create: (input.mediaUrls?.length
                  ? input.mediaUrls
                  : [input.imageUrl!]
                ).map((url, position) => ({
                  url,
                  alt: input.name,
                  position,
                })),
              },
            }
          : {}),
      },
      include: productInclude,
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      after: { name: product.name, slug: product.slug, sku: input.sku },
    });
    return this.toCatalogueItem(product);
  }

  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      retailPriceMinor: number;
      b2bPriceMinor: number;
      status: ProductStatus;
      moq: number;
      packMultiple: number;
      sku: string;
      b2cVisible: boolean;
      b2bVisible: boolean;
      seoTitle: string;
      seoDescription: string;
      attributes: Record<string, string>;
      categoryIds: string[];
      imageUrl: string;
      mediaUrls: string[];
    }>,
    actorId?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: { take: 1 } },
    });
    if (!product) throw new NotFoundException("Product was not found");
    const variant = product.variants[0];
    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          b2cVisible: input.b2cVisible,
          b2bVisible: input.b2bVisible,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
        },
      }),
      ...(variant
        ? [
            this.prisma.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: input.sku,
                retailPriceMinor: input.retailPriceMinor,
                b2bPriceMinor: input.b2bPriceMinor,
                moq: input.moq,
                packMultiple: input.packMultiple,
                attributes: input.attributes,
              },
            }),
          ]
        : []),
      ...(input.categoryIds
        ? [
            this.prisma.productCategory.deleteMany({
              where: { productId: id },
            }),
            ...input.categoryIds.map((categoryId) =>
              this.prisma.productCategory.create({
                data: { productId: id, categoryId },
              }),
            ),
          ]
        : []),
      ...(input.mediaUrls
        ? [
            this.prisma.productMedia.deleteMany({
              where: { productId: id },
            }),
            ...input.mediaUrls.map((url, position) =>
              this.prisma.productMedia.create({
                data: {
                  productId: id,
                  url,
                  alt: input.name ?? product.name,
                  position,
                },
              }),
            ),
          ]
        : []),
    ]);
    if (input.imageUrl && !input.mediaUrls) {
      const media = await this.prisma.productMedia.findFirst({
        where: { productId: id },
        orderBy: { position: "asc" },
      });
      if (media)
        await this.prisma.productMedia.update({
          where: { id: media.id },
          data: { url: input.imageUrl, alt: input.name ?? product.name },
        });
      else
        await this.prisma.productMedia.create({
          data: {
            productId: id,
            url: input.imageUrl,
            alt: input.name ?? product.name,
            position: 0,
          },
        });
    }
    const updated = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: productInclude,
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      before: { name: product.name, status: product.status },
      after: { name: updated.name, status: updated.status },
    });
    return this.toCatalogueItem(updated);
  }

  async listCategories() {
    const data = await this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
    return { data, total: data.length };
  }

  async createVariant(
    productId: string,
    input: {
      sku: string;
      name?: string;
      retailPriceMinor: number;
      b2bPriceMinor?: number;
      moq: number;
      packMultiple: number;
      attributes?: Record<string, string>;
    },
    actorId?: string,
  ) {
    if (!(await this.prisma.product.findUnique({ where: { id: productId } })))
      throw new NotFoundException("Product was not found");
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        ...input,
        stockSnapshots: {
          create: { available: 0, capturedAt: new Date(), provider: "MANUAL" },
        },
      },
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_VARIANT_CREATED",
      entityType: "ProductVariant",
      entityId: variant.id,
      after: { productId, sku: variant.sku },
    });
    return variant;
  }
  async updateVariant(
    productId: string,
    id: string,
    input: {
      sku: string;
      name?: string;
      retailPriceMinor: number;
      b2bPriceMinor?: number;
      moq: number;
      packMultiple: number;
      attributes?: Record<string, string>;
    },
    actorId?: string,
  ) {
    const before = await this.prisma.productVariant.findFirst({
      where: { id, productId },
    });
    if (!before) throw new NotFoundException("Product variant was not found");
    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: input,
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_VARIANT_UPDATED",
      entityType: "ProductVariant",
      entityId: id,
      before: { sku: before.sku },
      after: { sku: variant.sku },
    });
    return variant;
  }
  async removeVariant(productId: string, id: string, actorId?: string) {
    const [variant, count] = await Promise.all([
      this.prisma.productVariant.findFirst({ where: { id, productId } }),
      this.prisma.productVariant.count({ where: { productId } }),
    ]);
    if (!variant) throw new NotFoundException("Product variant was not found");
    if (count <= 1)
      throw new ConflictException("A product must retain at least one variant");
    try {
      await this.prisma.productVariant.delete({ where: { id } });
    } catch {
      throw new ConflictException(
        "Variants used by carts, orders, pricing, or integrations cannot be deleted",
      );
    }
    await this.audit.record({
      actorId,
      event: "CATALOGUE_VARIANT_DELETED",
      entityType: "ProductVariant",
      entityId: id,
      before: { productId, sku: variant.sku },
    });
    return { success: true };
  }

  async createCategory(
    input: { name: string; slug: string; parentId?: string },
    actorId?: string,
  ) {
    if (
      input.parentId &&
      !(await this.prisma.category.findUnique({
        where: { id: input.parentId },
      }))
    )
      throw new NotFoundException("Parent category was not found");
    const category = await this.prisma.category.create({
      data: {
        name: input.name.trim(),
        slug: input.slug,
        parentId: input.parentId || null,
      },
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
      after: {
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
      },
    });
    return category;
  }

  async updateCategory(
    id: string,
    input: { name: string; slug: string; parentId?: string },
    actorId?: string,
  ) {
    const before = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!before) throw new NotFoundException("Category was not found");
    let ancestorId = input.parentId;
    while (ancestorId) {
      if (ancestorId === id)
        throw new ConflictException(
          "A category cannot be moved below itself or its descendants",
        );
      const ancestor = await this.prisma.category.findUnique({
        where: { id: ancestorId },
        select: { parentId: true },
      });
      if (!ancestor)
        throw new NotFoundException("Parent category was not found");
      ancestorId = ancestor.parentId ?? undefined;
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: input.name.trim(),
        slug: input.slug,
        parentId: input.parentId || null,
      },
    });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_CATEGORY_UPDATED",
      entityType: "Category",
      entityId: id,
      before: {
        name: before.name,
        slug: before.slug,
        parentId: before.parentId,
      },
      after: {
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
      },
    });
    return category;
  }

  async removeCategory(id: string, actorId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundException("Category was not found");
    if (category._count.products || category._count.children)
      throw new ConflictException(
        "Remove products and child categories before deleting this category",
      );
    await this.prisma.category.delete({ where: { id } });
    await this.audit.record({
      actorId,
      event: "CATALOGUE_CATEGORY_DELETED",
      entityType: "Category",
      entityId: id,
      before: { name: category.name, slug: category.slug },
    });
    return { success: true };
  }

  private toCatalogueItem(
    product: any,
    customerPrices = new Map<
      string,
      { unitPriceMinor: number; minQuantity: number }
    >(),
  ) {
    const variants = product.variants.map((variant: any) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      retailPriceMinor: variant.retailPriceMinor,
      b2bPriceMinor: variant.b2bPriceMinor,
      resolvedTradePriceMinor:
        customerPrices.get(variant.id)?.unitPriceMinor ??
        variant.b2bPriceMinor ??
        variant.retailPriceMinor,
      resolvedTradePriceRule: customerPrices.has(variant.id)
        ? customerPrices.get(variant.id)!.minQuantity > 1
          ? "CUSTOMER_QUANTITY_TIER"
          : "CUSTOMER_FIXED"
        : variant.b2bPriceMinor != null
          ? "B2B_DEFAULT"
          : "RETAIL_FALLBACK",
      vatRateBasis: variant.vatRateBasis,
      moq: variant.moq,
      packMultiple: variant.packMultiple,
      attributes: variant.attributes,
      available: variant.stockSnapshots[0]?.available ?? 0,
      capturedAt: (
        variant.stockSnapshots[0]?.capturedAt ?? new Date(0)
      ).toISOString(),
    }));
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      status: product.status,
      b2cVisible: product.b2cVisible,
      b2bVisible: product.b2bVisible,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      image: product.media[0]?.url ?? null,
      media: product.media,
      categories: product.categories.map(({ category }: any) => category),
      variants,
      variant: variants[0] ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
