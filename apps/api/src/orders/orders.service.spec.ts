import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { OrdersService } from "./orders.service";

const agent: AuthenticatedUser = {
  id: "agent-user-1",
  email: "agent@test.local",
  firstName: "Alex",
  lastName: "Agent",
  kind: "AGENT",
  permissions: [],
  sessionId: "session-1",
};
const input = {
  organizationId: "org-1",
  email: "orders@customer.test",
  deliveryAddress: {
    line1: "1 High Street",
    city: "York",
    postcode: "YO1 1AA",
    countryCode: "GB",
  },
  purchaseOrder: "PO-1042",
  items: [{ variantId: "variant-1", quantity: 2 }],
};
const quote = {
  lines: [
    {
      variantId: "variant-1",
      sku: "GJ-001",
      name: "Verdant Signet",
      quantity: 2,
      unitPrice: { amount: 10000 },
      net: { amount: 20000 },
      vat: { amount: 4000 },
      gross: { amount: 24000 },
      appliedRule: "CUSTOMER_FIXED",
      validation: { valid: true },
    },
  ],
  subtotal: { amount: 20000 },
  vat: { amount: 4000 },
  total: { amount: 24000 },
  stockConfidence: "LIVE",
};

function createService(
  poRequired = true,
  options: { creditLimitMinor?: number; stockConfidence?: string } = {},
) {
  const orderCreate = vi
    .fn()
    .mockImplementation(async ({ data }) => ({ id: "order-1", ...data }));
  const outboxCreate = vi.fn().mockResolvedValue({ id: "event-1" });
  const notificationCreate = vi
    .fn()
    .mockResolvedValue({ id: "notification-1" });
  const orderAggregate = vi.fn().mockResolvedValue({
    _sum: { totalMinor: 0 },
  });
  const prisma = {
    order: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback) =>
        callback({
          order: { create: orderCreate, aggregate: orderAggregate },
          outboxEvent: { create: outboxCreate },
          notification: {
            create: notificationCreate,
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          user: { findMany: vi.fn().mockResolvedValue([]) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
  };
  const pricing = {
    quote: vi.fn().mockResolvedValue({
      ...quote,
      stockConfidence: options.stockConfidence ?? quote.stockConfidence,
    }),
  };
  const accounts = {
    assertCanOrder: vi
      .fn()
      .mockResolvedValue({
        agentId: "agent-1",
        organization: { poRequired, creditLimitMinor: options.creditLimitMinor },
      }),
  };
  return {
    orders: new OrdersService(
      pricing as never,
      prisma as never,
      accounts as never,
    ),
    orderCreate,
    outboxCreate,
    pricing,
    accounts,
    orderAggregate,
  };
}

describe("OrdersService trade order controls", () => {
  it("attributes an agent order to its organization, agent, and authenticated creator", async () => {
    const { orders, orderCreate, outboxCreate } = createService();
    await orders.createTrade(agent, input, "agent-order-1");
    expect(orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "SALES_AGENT",
          organizationId: "org-1",
          agentId: "agent-1",
          userId: agent.id,
          createdById: agent.id,
          purchaseOrder: "PO-1042",
        }),
      }),
    );
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aggregateId: "order-1",
          type: "ORDER_SUBMIT",
        }),
      }),
    );
  });

  it("blocks submission when the customer requires a PO number", async () => {
    const { orders, orderCreate } = createService();
    await expect(
      orders.createTrade(
        agent,
        { ...input, purchaseOrder: undefined },
        "agent-order-2",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("enforces the organization's available credit inside the order transaction", async () => {
    const { orders, orderCreate, orderAggregate } = createService(true, {
      creditLimitMinor: 30000,
    });
    orderAggregate.mockResolvedValue({ _sum: { totalMinor: 10000 } });
    await expect(
      orders.createTrade(agent, input, "agent-order-credit-limit"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("queues immediate stock recovery when accepting an order against stale stock", async () => {
    const { orders, outboxCreate } = createService(true, {
      stockConfidence: "PENDING_CONFIRMATION",
    });
    await orders.createTrade(agent, input, "agent-order-stale-stock");
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "STOCK_SYNC_REQUESTED" }),
      }),
    );
  });

  it("replays an existing order for the same idempotency key", async () => {
    const { orders, accounts } = createService();
    const existing = {
      id: "existing-order",
      idempotencyKey: "agent-order-3",
      items: [],
    };
    (
      orders as unknown as {
        prisma: { order: { findUnique: ReturnType<typeof vi.fn> } };
      }
    ).prisma.order.findUnique.mockResolvedValue(existing);
    await expect(
      orders.createTrade(agent, input, "agent-order-3"),
    ).resolves.toEqual(existing);
    expect(accounts.assertCanOrder).not.toHaveBeenCalled();
  });
});
