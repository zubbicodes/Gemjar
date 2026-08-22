import { describe, expect, it, vi } from "vitest";
import { CatalogueService } from "./catalogue.service";

describe("trade catalogue pricing", () => {
  it("returns the customer's effective price at the variant MOQ", async () => {
    const product = {
      id: "product-1",
      name: "Beach Hut Bamboo Socks",
      slug: "beach-hut-bamboo-socks",
      description: "Soft bamboo-rich socks",
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
          sku: "GJ-BS-284",
          name: null,
          retailPriceMinor: 895,
          b2bPriceMinor: 610,
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
            unitPriceMinor: 545,
          },
        ]),
      },
    };
    const service = new CatalogueService(prisma as never, {} as never);

    const [result] = await service.listForOrganization("org-1");

    expect(result?.variant).toMatchObject({
      resolvedTradePriceMinor: 545,
      resolvedTradePriceRule: "CUSTOMER_QUANTITY_TIER",
    });
  });
});
