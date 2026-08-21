import { describe, expect, it } from "vitest";
import type { CatalogueService } from "../catalogue/catalogue.service";
import { PricingService } from "./pricing.service";

const capturedNow = new Date().toISOString();
const variants = {
  ring: { id: "ring", sku: "GJ-RNG-042", retailPriceMinor: 18900, b2bPriceMinor: 12850, vatRateBasis: 2000, moq: 1, packMultiple: 1, available: 18, capturedAt: capturedNow },
  hoops: { id: "hoops", sku: "GJ-ER-118", retailPriceMinor: 9600, b2bPriceMinor: 6450, vatRateBasis: 2000, moq: 2, packMultiple: 2, available: 7, capturedAt: new Date(Date.now() - 18 * 60_000).toISOString() },
};
const catalogue = { findVariant: async (id: string) => variants[id as keyof typeof variants] } as CatalogueService;

describe("PricingService", () => {
  const service = new PricingService(catalogue);
  it("returns VAT-inclusive B2C pricing", async () => {
    const quote = await service.quote({ channel: "B2C", items: [{ variantId: "ring", quantity: 1 }] });
    expect(quote.total.amount).toBe(18900);
    expect(quote.vat.amount).toBe(3150);
    expect(quote.lines[0]?.appliedRule).toBe("RETAIL");
  });
  it("enforces trade MOQ and pack multiples", async () => {
    const quote = await service.quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "hoops", quantity: 1 }] });
    expect(quote.lines[0]?.validation).toMatchObject({ valid: false, code: "MOQ" });
  });
  it("flags a stale Mintsoft snapshot without blocking ordering", async () => {
    const quote = await service.quote({ channel: "B2B", items: [{ variantId: "hoops", quantity: 2 }] });
    expect(quote.stockConfidence).toBe("PENDING_CONFIRMATION");
  });
});
