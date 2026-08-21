import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { OrdersService } from "./orders.service";

const agent: AuthenticatedUser = { id: "agent-user-1", email: "agent@test.local", firstName: "Alex", lastName: "Agent", kind: "AGENT", permissions: [], sessionId: "session-1" };
const input = { organizationId: "org-1", email: "orders@customer.test", deliveryAddress: { line1: "1 High Street", city: "York", postcode: "YO1 1AA", countryCode: "GB" }, purchaseOrder: "PO-1042", items: [{ variantId: "variant-1", quantity: 2 }] };
const quote = { lines: [{ variantId: "variant-1", sku: "GJ-001", name: "Verdant Signet", quantity: 2, unitPrice: { amount: 10000 }, net: { amount: 20000 }, vat: { amount: 4000 }, gross: { amount: 24000 }, appliedRule: "CUSTOMER_FIXED", validation: { valid: true } }], subtotal: { amount: 20000 }, vat: { amount: 4000 }, total: { amount: 24000 }, stockConfidence: "LIVE" };

function createService(poRequired = true) {
  const orderCreate = vi.fn().mockImplementation(async ({ data }) => ({ id: "order-1", ...data }));
  const prisma = { order: { findUnique: vi.fn().mockResolvedValue(null) }, $transaction: vi.fn().mockImplementation(async (callback) => callback({ order: { create: orderCreate } })) };
  const pricing = { quote: vi.fn().mockResolvedValue(quote) };
  const accounts = { assertCanOrder: vi.fn().mockResolvedValue({ agentId: "agent-1", organization: { poRequired } }) };
  return { orders: new OrdersService(pricing as never, prisma as never, accounts as never), orderCreate, pricing, accounts };
}

describe("OrdersService trade order controls", () => {
  it("attributes an agent order to its organization, agent, and authenticated creator", async () => {
    const { orders, orderCreate } = createService();
    await orders.createTrade(agent, input, "agent-order-1");
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ source: "SALES_AGENT", organizationId: "org-1", agentId: "agent-1", userId: agent.id, createdById: agent.id, purchaseOrder: "PO-1042" }) }));
  });

  it("blocks submission when the customer requires a PO number", async () => {
    const { orders, orderCreate } = createService();
    await expect(orders.createTrade(agent, { ...input, purchaseOrder: undefined }, "agent-order-2")).rejects.toBeInstanceOf(ConflictException);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("replays an existing order for the same idempotency key", async () => {
    const { orders, accounts } = createService();
    const existing = { id: "existing-order", idempotencyKey: "agent-order-3", items: [] };
    (orders as unknown as { prisma: { order: { findUnique: ReturnType<typeof vi.fn> } } }).prisma.order.findUnique.mockResolvedValue(existing);
    await expect(orders.createTrade(agent, input, "agent-order-3")).resolves.toEqual(existing);
    expect(accounts.assertCanOrder).not.toHaveBeenCalled();
  });
});
