import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";

const productInclude = {
  variants: { include: { stockSnapshots: { orderBy: { capturedAt: "desc" as const }, take: 1 } }, orderBy: { sku: "asc" as const } },
  media: { orderBy: { position: "asc" as const } },
  categories: { include: { category: true } },
};

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(query?: string, includeInactive = false) {
    const term = query?.trim();
    const products = await this.prisma.product.findMany({
      where: { status: includeInactive ? undefined : ProductStatus.ACTIVE, b2cVisible: includeInactive ? undefined : true, ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { variants: { some: { sku: { contains: term, mode: "insensitive" } } } }] } : {}) },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    return products.map((product) => this.toCatalogueItem(product));
  }

  async listForOrganization(organizationId: string, query?: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { catalogueRestricted: true } });
    if (!organization) throw new NotFoundException("Organization was not found");
    const term = query?.trim();
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE, b2bVisible: true, ...(organization.catalogueRestricted ? { organizationAccess: { some: { organizationId } } } : {}), ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { variants: { some: { sku: { contains: term, mode: "insensitive" } } } }] } : {}) },
      include: productInclude,
      orderBy: { name: "asc" },
    });
    return products.map((product) => this.toCatalogueItem(product));
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug }, include: productInclude });
    if (!product || product.status !== ProductStatus.ACTIVE || !product.b2cVisible) throw new NotFoundException("Product was not found");
    return this.toCatalogueItem(product);
  }

  async findVariant(id: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id }, include: { product: { select: { id: true, name: true, b2cVisible: true, b2bVisible: true } }, stockSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } });
    if (!variant || !variant.active) throw new NotFoundException(`Variant ${id} was not found`);
    return { ...variant, productName: variant.product.name, available: variant.stockSnapshots[0]?.available ?? 0, capturedAt: (variant.stockSnapshots[0]?.capturedAt ?? new Date(0)).toISOString() };
  }

  async create(input: { name: string; slug: string; description: string; sku: string; retailPriceMinor: number; b2bPriceMinor?: number; moq: number; packMultiple: number; imageUrl?: string }, actorId?: string) {
    if (await this.prisma.product.findFirst({ where: { OR: [{ slug: input.slug }, { variants: { some: { sku: input.sku } } }] }, select: { id: true } })) throw new ConflictException("A product already uses this slug or SKU");
    const product = await this.prisma.product.create({ data: { name: input.name, slug: input.slug, description: input.description, status: ProductStatus.ACTIVE, variants: { create: { sku: input.sku, retailPriceMinor: input.retailPriceMinor, b2bPriceMinor: input.b2bPriceMinor, moq: input.moq, packMultiple: input.packMultiple, stockSnapshots: { create: { available: 0, capturedAt: new Date(), provider: "MANUAL" } } } }, ...(input.imageUrl ? { media: { create: { url: input.imageUrl, alt: input.name, position: 0 } } } : {}) }, include: productInclude });
    await this.audit.record({ actorId, event: "CATALOGUE_PRODUCT_CREATED", entityType: "Product", entityId: product.id, after: { name: product.name, slug: product.slug, sku: input.sku } });
    return this.toCatalogueItem(product);
  }

  async update(id: string, input: Partial<{ name: string; description: string; retailPriceMinor: number; b2bPriceMinor: number; status: ProductStatus; moq: number; packMultiple: number }>, actorId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { variants: { take: 1 } } });
    if (!product) throw new NotFoundException("Product was not found");
    const variant = product.variants[0];
    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { name: input.name, description: input.description, status: input.status } }),
      ...(variant ? [this.prisma.productVariant.update({ where: { id: variant.id }, data: { retailPriceMinor: input.retailPriceMinor, b2bPriceMinor: input.b2bPriceMinor, moq: input.moq, packMultiple: input.packMultiple } })] : []),
    ]);
    const updated = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    await this.audit.record({ actorId, event: "CATALOGUE_PRODUCT_UPDATED", entityType: "Product", entityId: id, before: { name: product.name, status: product.status }, after: { name: updated.name, status: updated.status } });
    return this.toCatalogueItem(updated);
  }

  private toCatalogueItem(product: any) {
    const variants = product.variants.map((variant: any) => ({ id: variant.id, sku: variant.sku, name: variant.name, retailPriceMinor: variant.retailPriceMinor, b2bPriceMinor: variant.b2bPriceMinor, vatRateBasis: variant.vatRateBasis, moq: variant.moq, packMultiple: variant.packMultiple, attributes: variant.attributes, available: variant.stockSnapshots[0]?.available ?? 0, capturedAt: (variant.stockSnapshots[0]?.capturedAt ?? new Date(0)).toISOString() }));
    return { id: product.id, name: product.name, slug: product.slug, description: product.description, status: product.status, seoTitle: product.seoTitle, seoDescription: product.seoDescription, image: product.media[0]?.url ?? null, media: product.media, categories: product.categories.map(({ category }: any) => category), variants, variant: variants[0] ?? null, createdAt: product.createdAt, updatedAt: product.updatedAt };
  }
}
