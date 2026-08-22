import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

const priceInclude = {
  variant: {
    select: {
      id: true,
      sku: true,
      retailPriceMinor: true,
      b2bPriceMinor: true,
      moq: true,
      packMultiple: true,
      product: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

export type CustomerPriceInput = {
  organizationId: string;
  variantId: string;
  minQuantity: number;
  unitPriceMinor: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
};

/**
 * Write side of the customer-specific pricing engine. Every change is mirrored
 * into PricingHistory and the audit log so a price can always be explained.
 */
@Injectable()
export class AdminPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        catalogueRestricted: true,
      },
    });
    if (!organization)
      throw new NotFoundException("Organization was not found");
    const [prices, history] = await Promise.all([
      this.prisma.customerPrice.findMany({
        where: { organizationId },
        include: priceInclude,
        orderBy: [{ variantId: "asc" }, { minQuantity: "asc" }],
      }),
      this.prisma.pricingHistory.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return { organization, data: prices, total: prices.length, history };
  }

  async upsert(actor: AuthenticatedUser, input: CustomerPriceInput) {
    if (input.minQuantity < 1)
      throw new BadRequestException("Minimum quantity must be at least 1");
    if (input.unitPriceMinor < 0)
      throw new BadRequestException("Unit price cannot be negative");
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: input.variantId },
      select: { id: true, sku: true },
    });
    if (!variant) throw new NotFoundException("Product variant was not found");
    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (effectiveTo && effectiveTo <= effectiveFrom)
      throw new BadRequestException(
        "The end date must fall after the start date",
      );
    const previous = await this.prisma.customerPrice.findFirst({
      where: {
        organizationId: input.organizationId,
        variantId: input.variantId,
        minQuantity: input.minQuantity,
      },
    });
    const price = await this.prisma.$transaction(async (transaction) => {
      const result = previous
        ? await transaction.customerPrice.update({
            where: { id: previous.id },
            data: {
              unitPriceMinor: input.unitPriceMinor,
              effectiveFrom,
              effectiveTo,
            },
            include: priceInclude,
          })
        : await transaction.customerPrice.create({
            data: {
              organizationId: input.organizationId,
              variantId: input.variantId,
              minQuantity: input.minQuantity,
              unitPriceMinor: input.unitPriceMinor,
              effectiveFrom,
              effectiveTo,
            },
            include: priceInclude,
          });
      await transaction.pricingHistory.create({
        data: {
          organizationId: input.organizationId,
          variantId: input.variantId,
          rule:
            input.minQuantity > 1 ? "CUSTOMER_QUANTITY_TIER" : "CUSTOMER_FIXED",
          unitPriceMinor: input.unitPriceMinor,
          minQuantity: input.minQuantity,
          effectiveFrom,
          changedById: actor.id,
        },
      });
      return result;
    });
    await this.audit.record({
      actorId: actor.id,
      event: previous ? "PRICING_UPDATED" : "PRICING_CREATED",
      entityType: "CustomerPrice",
      entityId: price.id,
      before: previous
        ? {
            unitPriceMinor: previous.unitPriceMinor,
            minQuantity: previous.minQuantity,
          }
        : undefined,
      after: {
        unitPriceMinor: input.unitPriceMinor,
        minQuantity: input.minQuantity,
        sku: variant.sku,
      },
    });
    return price;
  }

  async remove(actor: AuthenticatedUser, id: string) {
    const price = await this.prisma.customerPrice.findUnique({ where: { id } });
    if (!price) throw new NotFoundException("Customer price was not found");
    await this.prisma.customerPrice.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      event: "PRICING_REMOVED",
      entityType: "CustomerPrice",
      entityId: id,
      before: {
        unitPriceMinor: price.unitPriceMinor,
        minQuantity: price.minQuantity,
        variantId: price.variantId,
      },
    });
    return { success: true };
  }
}
