import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { UserKind } from "@prisma/client";
import { AccountsService } from "../accounts/accounts.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CatalogueService } from "../catalogue/catalogue.service";
import { PrismaService } from "../database/prisma.service";

export type QuoteRequest = { channel: "B2C" | "B2B" | "SALES_AGENT"; organizationId?: string; items: Array<{ variantId: string; quantity: number }> };

@Injectable()
export class PricingService {
  constructor(private readonly catalogue: CatalogueService, private readonly prisma: PrismaService, private readonly accounts: AccountsService) {}

  async quote(request: QuoteRequest, actor?: AuthenticatedUser) {
    if (!request.items.length) throw new BadRequestException("At least one item is required");
    const isTrade = request.channel !== "B2C";
    if (isTrade) {
      if (!actor || !request.organizationId) throw new ForbiddenException("Authenticated organization context is required for trade pricing");
      await this.accounts.assertCanAccess(actor, request.organizationId);
    }
    const lines = await Promise.all(request.items.map(async ({ variantId, quantity }) => {
      const variant = await this.catalogue.findVariant(variantId);
      if (!isTrade && !variant.product.b2cVisible) throw new ForbiddenException("This product is not available in the retail catalogue");
      if (isTrade) await this.assertTradeVisibility(request.organizationId!, variant.product.id, variant.product.b2bVisible);
      const validation: { valid: boolean; code?: "MOQ" | "PACK_MULTIPLE" | "UNAVAILABLE"; message?: string } = quantity < variant.moq
        ? { valid: false, code: "MOQ", message: `Minimum quantity is ${variant.moq}` }
        : quantity % variant.packMultiple !== 0
          ? { valid: false, code: "PACK_MULTIPLE", message: `Quantity must be a multiple of ${variant.packMultiple}` }
          : variant.available < quantity
            ? { valid: true, code: "UNAVAILABLE", message: "Stock confirmation is required" }
            : { valid: true };
      const customerPrice = isTrade ? await this.resolveCustomerPrice(request.organizationId!, variantId, quantity) : null;
      const unitPrice = isTrade ? (customerPrice?.unitPriceMinor ?? variant.b2bPriceMinor ?? variant.retailPriceMinor) : variant.retailPriceMinor;
      const grossBeforeVat = unitPrice * quantity;
      const vat = isTrade ? Math.round((grossBeforeVat * variant.vatRateBasis) / 10_000) : Math.round(grossBeforeVat - grossBeforeVat / (1 + variant.vatRateBasis / 10_000));
      const net = isTrade ? grossBeforeVat : grossBeforeVat - vat;
      const gross = isTrade ? grossBeforeVat + vat : grossBeforeVat;
      const appliedRule = !isTrade ? "RETAIL" as const : customerPrice ? (customerPrice.minQuantity > 1 ? "CUSTOMER_QUANTITY_TIER" as const : "CUSTOMER_FIXED" as const) : variant.b2bPriceMinor ? "B2B_DEFAULT" as const : "RETAIL_FALLBACK" as const;
      return { variantId, sku: variant.sku, name: variant.productName, quantity, unitPrice: { amount: unitPrice, currency: "GBP" as const }, net: { amount: net, currency: "GBP" as const }, vat: { amount: vat, currency: "GBP" as const }, gross: { amount: gross, currency: "GBP" as const }, appliedRule, validation, stockCapturedAt: variant.capturedAt };
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.net.amount, 0);
    const vat = lines.reduce((sum, line) => sum + line.vat.amount, 0);
    const total = lines.reduce((sum, line) => sum + line.gross.amount, 0);
    const stale = lines.some((line) => Date.now() - new Date(line.stockCapturedAt).getTime() > 15 * 60_000 || line.validation.code === "UNAVAILABLE");
    return { lines: lines.map(({ stockCapturedAt: _, ...line }) => line), subtotal: { amount: subtotal, currency: "GBP" as const }, vat: { amount: vat, currency: "GBP" as const }, total: { amount: total, currency: "GBP" as const }, stockConfidence: stale ? "PENDING_CONFIRMATION" as const : "LIVE" as const, quotedAt: new Date().toISOString() };
  }

  async tradeQuote(actor: AuthenticatedUser, input: { organizationId: string; items: Array<{ variantId: string; quantity: number }> }) {
    const channel = actor.kind === UserKind.AGENT ? "SALES_AGENT" as const : "B2B" as const;
    return this.quote({ ...input, channel }, actor);
  }

  private resolveCustomerPrice(organizationId: string, variantId: string, quantity: number) {
    const now = new Date();
    return this.prisma.customerPrice.findFirst({ where: { organizationId, variantId, minQuantity: { lte: quantity }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, orderBy: [{ minQuantity: "desc" }, { effectiveFrom: "desc" }] });
  }

  private async assertTradeVisibility(organizationId: string, productId: string, b2bVisible: boolean) {
    if (!b2bVisible) throw new ForbiddenException("This product is not available in the trade catalogue");
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { catalogueRestricted: true } });
    if (organization?.catalogueRestricted && !await this.prisma.organizationProductAccess.findUnique({ where: { organizationId_productId: { organizationId, productId } } })) throw new ForbiddenException("This product is not available to the selected organization");
  }
}
