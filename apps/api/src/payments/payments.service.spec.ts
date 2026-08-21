import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PaymentsService } from "./payments.service";

const quote = {
  lines: [
    {
      variantId: "variant-1",
      sku: "GJ-001",
      name: "Verdant Signet",
      quantity: 1,
      unitPrice: { amount: 8333 },
      net: { amount: 8333 },
      vat: { amount: 1667 },
      gross: { amount: 10000 },
      appliedRule: "RETAIL",
      validation: { valid: true },
    },
  ],
  subtotal: { amount: 8333 },
  vat: { amount: 1667 },
  total: { amount: 10000 },
  stockConfidence: "LIVE",
};
const input = {
  email: "maya@example.test",
  deliveryMethodCode: "standard",
  deliveryAddress: {
    firstName: "Maya",
    lastName: "Hart",
    phone: "07123456789",
    line1: "7 Stonegate",
    city: "York",
    postcode: "YO1 8AW",
    countryCode: "GB",
  },
  items: [{ variantId: "variant-1", quantity: 1 }],
};

function createService() {
  const payment = {
    id: "payment-1",
    provider: "mock",
    externalId: null,
    idempotencyKey: "payment:checkout-key-123456",
    status: "PENDING",
    amountMinor: 10495,
  };
  const order = {
    id: "order-1",
    number: "GJ-2026-0001",
    idempotencyKey: "checkout-key-123456",
    status: "DRAFT",
    paymentStatus: "PENDING",
    fulfilmentStatus: "UNFULFILLED",
    stockConfirmationPending: false,
    email: input.email,
    currency: "GBP",
    subtotalMinor: 8333,
    vatMinor: 1667,
    shippingMinor: 495,
    totalMinor: 10495,
    deliveryMethodName: "Standard delivery",
    deliveryAddress: input.deliveryAddress,
    createdAt: new Date(),
    items: [],
    payments: [payment],
  };
  const tx = {
    payment: {
      findUnique: vi.fn().mockResolvedValue({
        ...payment,
        externalId: "mock_pi_payment-1",
        order,
      }),
      update: vi.fn(),
    },
    order: {
      update: vi.fn().mockResolvedValue({
        ...order,
        status: "SUBMITTED",
        paymentStatus: "PAID",
        events: [],
      }),
    },
    outboxEvent: { create: vi.fn() },
  };
  const prisma = {
    deliveryMethod: {
      findMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({
        code: "standard",
        name: "Standard delivery",
        active: true,
        priceMinor: 495,
        freeThresholdMinor: 15000,
      }),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(order),
      findFirst: vi.fn(),
    },
    payment: { update: vi.fn(), findUnique: vi.fn() },
    outboxEvent: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback) =>
        typeof callback === "function" ? callback(tx) : Promise.all(callback),
      ),
  };
  const pricing = { quote: vi.fn().mockResolvedValue(quote) };
  const gateway = {
    activeProvider: "mock",
    createIntent: vi.fn().mockResolvedValue({
      provider: "mock",
      externalId: "mock_pi_payment-1",
      clientSecret: "mock_secret_payment-1",
    }),
    resumeIntent: vi.fn(),
    verifyStripeWebhook: vi.fn(),
  };
  const audit = { record: vi.fn() };
  return {
    payments: new PaymentsService(
      prisma as never,
      pricing as never,
      gateway as never,
      audit as never,
    ),
    prisma,
    pricing,
    gateway,
    audit,
    order,
    payment,
    tx,
  };
}

describe("PaymentsService", () => {
  it("creates a draft order and includes delivery in the provider amount", async () => {
    const { payments, prisma, gateway } = createService();
    const result = await payments.startCheckout(
      undefined,
      input,
      "checkout-key-123456",
    );
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
          paymentStatus: "PENDING",
          shippingMinor: 495,
          totalMinor: 10495,
        }),
      }),
    );
    expect(gateway.createIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 10495, currency: "GBP" }),
    );
    expect(result).toMatchObject({
      orderId: "order-1",
      paymentId: "payment-1",
      provider: "mock",
      amountMinor: 10495,
    });
  });

  it("does not expose an order confirmation for the wrong token", async () => {
    const { payments, prisma } = createService();
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(
      payments.confirmation("order-1", "wrong-confirmation-token"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("moves the order to submitted only after a verified provider event", async () => {
    const { payments, gateway, tx } = createService();
    gateway.verifyStripeWebhook.mockReturnValue({
      id: "evt-1",
      type: "succeeded",
      externalId: "mock_pi_payment-1",
    });
    await expect(
      payments.handleStripeWebhook(Buffer.from("signed"), "signature"),
    ).resolves.toEqual({ received: true });
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          paymentStatus: "PAID",
        }),
      }),
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(2);
  });

  it("acknowledges a repeated webhook without changing state again", async () => {
    const { payments, prisma, gateway } = createService();
    gateway.verifyStripeWebhook.mockReturnValue({
      id: "evt-1",
      type: "succeeded",
      externalId: "mock_pi_payment-1",
    });
    prisma.outboxEvent.findFirst.mockResolvedValue({ id: "already-processed" });
    await expect(
      payments.handleStripeWebhook(Buffer.from("signed"), "signature"),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
