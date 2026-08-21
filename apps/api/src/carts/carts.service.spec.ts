import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CartsService } from "./carts.service";

const buyer: AuthenticatedUser = {
  id: "buyer-1",
  email: "buyer@test.local",
  firstName: "Test",
  lastName: "Buyer",
  kind: "B2B",
  permissions: [],
  sessionId: "session-1",
};
const agent: AuthenticatedUser = {
  ...buyer,
  id: "agent-user-1",
  email: "agent@test.local",
  kind: "AGENT",
};

function createService() {
  const prisma = {
    cart: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    cartItem: { deleteMany: vi.fn(), upsert: vi.fn() },
  };
  const emptyQuote = {
    lines: [],
    subtotal: { amount: 0 },
    vat: { amount: 0 },
    total: { amount: 0 },
    stockConfidence: "LIVE",
  };
  const pricing = {
    tradeQuote: vi.fn().mockResolvedValue(emptyQuote),
    quote: vi.fn().mockResolvedValue(emptyQuote),
  };
  const accounts = {
    assertCanOrder: vi.fn().mockResolvedValue({ agentId: undefined }),
    assertCanAccess: vi.fn(),
  };
  const audit = { record: vi.fn() };
  return {
    carts: new CartsService(
      prisma as never,
      pricing as never,
      accounts as never,
      audit as never,
    ),
    prisma,
    pricing,
    accounts,
    audit,
  };
}

describe("CartsService authorization and attribution", () => {
  it("scopes saved draft queries to the authenticated user", async () => {
    const { carts, prisma } = createService();
    await carts.listDrafts(buyer, "org-1");
    expect(prisma.cart.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: buyer.id, status: "DRAFT", organizationId: "org-1" },
      }),
    );
  });

  it("does not reveal a draft owned by another user", async () => {
    const { carts, prisma, accounts } = createService();
    prisma.cart.findFirst.mockResolvedValue(null);
    await expect(
      carts.getDraft(buyer, "someone-elses-draft"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "someone-elses-draft",
          userId: buyer.id,
        }),
      }),
    );
    expect(accounts.assertCanAccess).not.toHaveBeenCalled();
  });

  it("attributes an agent draft to both the user and sales agent", async () => {
    const { carts, prisma, accounts } = createService();
    accounts.assertCanOrder.mockResolvedValue({ agentId: "agent-1" });
    prisma.cart.create.mockImplementation(async ({ data }) => ({
      id: "draft-1",
      version: 1,
      updatedAt: new Date(),
      items: data.items.create,
      ...data,
    }));
    const result = await carts.saveDraft(agent, {
      organizationId: "org-1",
      name: "Friday replenishment",
      items: [{ variantId: "variant-1", quantity: 2 }],
    });
    expect(prisma.cart.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: agent.id,
          agentId: "agent-1",
          organizationId: "org-1",
          channel: "SALES_AGENT",
          status: "DRAFT",
        }),
      }),
    );
    expect(result.id).toBe("draft-1");
  });

  it("stores a one-way hash instead of the guest basket token", async () => {
    const { carts, prisma } = createService();
    prisma.cart.findFirst.mockResolvedValue(null);
    prisma.cart.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: "guest-cart-1",
      version: 1,
      updatedAt: new Date(),
      items: [],
    }));
    const result = await carts.saveGuestCart(undefined, [
      { variantId: "variant-1", quantity: 1 },
    ]);
    const create = prisma.cart.create.mock.calls[0]![0];
    expect(create.data.anonymousToken).not.toBe(result.cartToken);
    expect(create.data.anonymousToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prevents non-consumer identities from using consumer account baskets", async () => {
    const { carts } = createService();
    await expect(carts.consumerCart(agent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
