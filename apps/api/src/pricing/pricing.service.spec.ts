import { describe, expect, it } from "vitest";
import { CatalogueService } from "../catalogue/catalogue.service";
import { PricingService } from "./pricing.service";

describe("PricingService", () => {
  const service = new PricingService(new CatalogueService());
  it("returns VAT-inclusive B2C pricing", () => {
    const quote = service.quote({ channel: "B2C", items: [{ variantId: "var_emerald_signet", quantity: 1 }] });
    expect(quote.total.amount).toBe(18900);
    expect(quote.vat.amount).toBe(3150);
    expect(quote.lines[0]?.appliedRule).toBe("RETAIL");
  });
  it("enforces trade MOQ and pack multiples", () => {
    const quote = service.quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "var_luna_hoops", quantity: 1 }] });
    expect(quote.lines[0]?.validation).toMatchObject({ valid: false, code: "MOQ" });
  });
  it("flags a stale Mintsoft snapshot without blocking ordering", () => {
    const quote = service.quote({ channel: "B2B", items: [{ variantId: "var_luna_hoops", quantity: 2 }] });
    expect(quote.stockConfidence).toBe("PENDING_CONFIRMATION");
  });
});
