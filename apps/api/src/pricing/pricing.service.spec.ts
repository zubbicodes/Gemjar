import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { CatalogueService } from "../catalogue/catalogue.service";
import { PricingService } from "./pricing.service";

const capturedNow = new Date().toISOString();
const variants = {
  ring: { id: "ring", sku: "GJ-RNG-042", productId: "product-ring", productName: "Verdant Signet", product: { id: "product-ring", b2cVisible: true, b2bVisible: true }, retailPriceMinor: 18900, b2bPriceMinor: 12850, vatRateBasis: 2000, moq: 1, packMultiple: 1, available: 18, capturedAt: capturedNow },
  hoops: { id: "hoops", sku: "GJ-ER-118", productId: "product-hoops", productName: "Luna Hoops", product: { id: "product-hoops", b2cVisible: true, b2bVisible: true }, retailPriceMinor: 9600, b2bPriceMinor: 6450, vatRateBasis: 2000, moq: 2, packMultiple: 2, available: 7, capturedAt: new Date(Date.now() - 18 * 60_000).toISOString() },
};
const catalogue = { findVariant: async (id: string) => variants[id as keyof typeof variants] } as unknown as CatalogueService;
const actor: AuthenticatedUser = { id: "buyer", email: "buyer@test.local", firstName: "Test", lastName: "Buyer", kind: "B2B", permissions: [], sessionId: "session" };
const accounts = {
  assertApprovedAccess: vi
    .fn()
    .mockResolvedValue({ id: "org_demo", status: "APPROVED" }),
};

function createService(customerPrice: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(null)) {
  const prisma = { customerPrice: { findFirst: customerPrice }, organization: { findUnique: vi.fn().mockResolvedValue({ catalogueRestricted: false }) }, organizationProductAccess: { findUnique: vi.fn() } };
  return new PricingService(
    catalogue,
    prisma as never,
    accounts as never,
    { commerce: vi.fn().mockResolvedValue({ staleStockMinutes: 15 }) } as never,
  );
}

describe("PricingService", () => {
  it("returns VAT-inclusive B2C pricing", async () => {
    const quote = await createService().quote({ channel: "B2C", items: [{ variantId: "ring", quantity: 1 }] });
    expect(quote.total.amount).toBe(18900);
    expect(quote.vat.amount).toBe(3150);
    expect(quote.lines[0]?.appliedRule).toBe("RETAIL");
  });

  it("enforces trade MOQ and pack multiples", async () => {
    const quote = await createService().quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "hoops", quantity: 1 }] }, actor);
    expect(quote.lines[0]?.validation).toMatchObject({ valid: false, code: "MOQ" });
  });

  it("flags a stale Mintsoft snapshot without blocking ordering", async () => {
    const quote = await createService().quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "hoops", quantity: 2 }] }, actor);
    expect(quote.stockConfidence).toBe("PENDING_CONFIRMATION");
  });

  it("selects customer quantity tiers ahead of fixed and default trade prices", async () => {
    const resolver = vi.fn().mockImplementation(({ where }) => Promise.resolve(where.minQuantity.lte >= 4 ? { minQuantity: 4, unitPriceMinor: 10000 } : { minQuantity: 1, unitPriceMinor: 11000 }));
    const service = createService(resolver);
    const tier = await service.quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "ring", quantity: 4 }] }, actor);
    const fixed = await service.quote({ channel: "B2B", organizationId: "org_demo", items: [{ variantId: "ring", quantity: 1 }] }, actor);
    expect(tier.lines[0]).toMatchObject({ appliedRule: "CUSTOMER_QUANTITY_TIER", unitPrice: { amount: 10000 } });
    expect(fixed.lines[0]).toMatchObject({ appliedRule: "CUSTOMER_FIXED", unitPrice: { amount: 11000 } });
  });
});
