import { describe, expect, it, vi } from "vitest";
import { CatalogueService } from "./catalogue.service";

describe("trade catalogue pricing", () => {
  it("returns the customer's effective price at the variant MOQ", async () => {
    const product = {
      id: "product-1",
      name: "Verdant Signet",
      slug: "verdant-signet",
      description: "A signet ring",
      status: "ACTIVE",
      b2cVisible: true,
      b2bVisible: true,
      seoTitle: null,
      seoDescription: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      media: [],
      categories: [],
      variants: [
        {
          id: "variant-1",
          sku: "GJ-RNG-042",
          name: null,
          retailPriceMinor: 18900,
          b2bPriceMinor: 12850,
          vatRateBasis: 2000,
          moq: 2,
          packMultiple: 2,
          attributes: {},
          active: true,
          stockSnapshots: [{ available: 10, capturedAt: new Date() }],
        },
      ],
    };
    const prisma = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ catalogueRestricted: false }),
      },
      product: { findMany: vi.fn().mockResolvedValue([product]) },
      customerPrice: {
        findMany: vi.fn().mockResolvedValue([
          {
            variantId: "variant-1",
            minQuantity: 2,
            unitPriceMinor: 11000,
          },
        ]),
      },
    };
    const service = new CatalogueService(prisma as never, {} as never);

    const [result] = await service.listForOrganization("org-1");

    expect(result?.variant).toMatchObject({
      resolvedTradePriceMinor: 11000,
      resolvedTradePriceRule: "CUSTOMER_QUANTITY_TIER",
    });
  });
});
