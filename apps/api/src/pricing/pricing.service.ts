import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CatalogueService } from "../catalogue/catalogue.service";

export type QuoteRequest = { channel: "B2C" | "B2B" | "SALES_AGENT"; organizationId?: string; items: Array<{ variantId: string; quantity: number }> };

@Injectable()
export class PricingService {
  constructor(private readonly catalogue: CatalogueService) {}
  quote(request: QuoteRequest) {
    if (!request.items.length) throw new BadRequestException("At least one item is required");
    let subtotal = 0;
    const lines = request.items.map(({ variantId, quantity }) => {
      const variant = this.catalogue.findVariant(variantId);
      if (!variant) throw new NotFoundException(`Variant ${variantId} was not found`);
      const validation = quantity < variant.moq ? { valid: false, code: "MOQ", message: `Minimum quantity is ${variant.moq}` } : quantity % variant.packMultiple !== 0 ? { valid: false, code: "PACK_MULTIPLE", message: `Quantity must be a multiple of ${variant.packMultiple}` } : { valid: true };
      const isTrade = request.channel !== "B2C";
      const unitPrice = isTrade ? variant.b2bPriceMinor : variant.retailPriceMinor;
      const gross = unitPrice * quantity;
      const vat = isTrade ? Math.round(gross * .2) : Math.round(gross / 6);
      const net = isTrade ? gross : gross - vat;
      const lineGross = isTrade ? gross + vat : gross;
      subtotal += net;
      return { variantId, sku: variant.sku, quantity, unitPrice: { amount: unitPrice, currency: "GBP" }, net: { amount: net, currency: "GBP" }, vat: { amount: vat, currency: "GBP" }, gross: { amount: lineGross, currency: "GBP" }, appliedRule: isTrade ? "B2B_DEFAULT" : "RETAIL", validation };
    });
    const vat = lines.reduce((sum, line) => sum + line.vat.amount, 0);
    const total = lines.reduce((sum, line) => sum + line.gross.amount, 0);
    const stale = request.items.some((item) => { const variant = this.catalogue.findVariant(item.variantId); return variant && Date.now() - new Date(variant.capturedAt).getTime() > 15 * 60_000; });
    return { lines, subtotal: { amount: subtotal, currency: "GBP" }, vat: { amount: vat, currency: "GBP" }, total: { amount: total, currency: "GBP" }, stockConfidence: stale ? "PENDING_CONFIRMATION" : "LIVE", quotedAt: new Date().toISOString() };
  }
}
