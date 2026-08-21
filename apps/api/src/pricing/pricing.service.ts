import { BadRequestException, Injectable } from "@nestjs/common";
import { CatalogueService } from "../catalogue/catalogue.service";

export type QuoteRequest = { channel: "B2C" | "B2B" | "SALES_AGENT"; organizationId?: string; items: Array<{ variantId: string; quantity: number }> };

@Injectable()
export class PricingService {
  constructor(private readonly catalogue: CatalogueService) {}
  async quote(request: QuoteRequest) {
    if (!request.items.length) throw new BadRequestException("At least one item is required");
    const lines = await Promise.all(request.items.map(async ({ variantId, quantity }) => {
      const variant = await this.catalogue.findVariant(variantId);
      const validation: { valid: boolean; code?: "MOQ" | "PACK_MULTIPLE" | "UNAVAILABLE"; message?: string } = quantity < variant.moq
        ? { valid: false, code: "MOQ", message: `Minimum quantity is ${variant.moq}` }
        : quantity % variant.packMultiple !== 0
          ? { valid: false, code: "PACK_MULTIPLE", message: `Quantity must be a multiple of ${variant.packMultiple}` }
          : variant.available < quantity
            ? { valid: true, code: "UNAVAILABLE", message: "Stock confirmation is required" }
            : { valid: true };
      const isTrade = request.channel !== "B2C";
      const unitPrice = isTrade ? (variant.b2bPriceMinor ?? variant.retailPriceMinor) : variant.retailPriceMinor;
      const grossBeforeVat = unitPrice * quantity;
      const vat = isTrade ? Math.round((grossBeforeVat * variant.vatRateBasis) / 10_000) : Math.round(grossBeforeVat - grossBeforeVat / (1 + variant.vatRateBasis / 10_000));
      const net = isTrade ? grossBeforeVat : grossBeforeVat - vat;
      const gross = isTrade ? grossBeforeVat + vat : grossBeforeVat;
      return { variantId, sku: variant.sku, name: variant.productName, quantity, unitPrice: { amount: unitPrice, currency: "GBP" as const }, net: { amount: net, currency: "GBP" as const }, vat: { amount: vat, currency: "GBP" as const }, gross: { amount: gross, currency: "GBP" as const }, appliedRule: isTrade ? "B2B_DEFAULT" as const : "RETAIL" as const, validation, stockCapturedAt: variant.capturedAt };
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.net.amount, 0);
    const vat = lines.reduce((sum, line) => sum + line.vat.amount, 0);
    const total = lines.reduce((sum, line) => sum + line.gross.amount, 0);
    const stale = lines.some((line) => Date.now() - new Date(line.stockCapturedAt).getTime() > 15 * 60_000 || line.validation.code === "UNAVAILABLE");
    return { lines: lines.map(({ stockCapturedAt: _, ...line }) => line), subtotal: { amount: subtotal, currency: "GBP" as const }, vat: { amount: vat, currency: "GBP" as const }, total: { amount: total, currency: "GBP" as const }, stockConfidence: stale ? "PENDING_CONFIRMATION" as const : "LIVE" as const, quotedAt: new Date().toISOString() };
  }
}
