import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { FulfilmentService } from "./fulfilment.service";

const staff: AuthenticatedUser = {
  id: "staff-1",
  email: "ops@gemjar.test",
  firstName: "Ola",
  lastName: "Ops",
  kind: "ADMIN",
  permissions: ["fulfilment:read", "fulfilment:update"],
  sessionId: "session-1",
};
const buyer: AuthenticatedUser = {
  id: "buyer-1",
  email: "buyer@gemjar.test",
  firstName: "Priya",
  lastName: "Shah",
  kind: "B2B",
  permissions: [],
  sessionId: "session-2",
};

const orderItems = [
  {
    id: "item-a",
    quantity: 10,
    skuSnapshot: "GJ-RNG-042",
    nameSnapshot: "Verdant Signet",
  },
  {
    id: "item-b",
    quantity: 4,
    skuSnapshot: "GJ-ER-118",
    nameSnapshot: "Luna Hoops",
  },
];

function createService(
  existingShipments: Array<{
    id?: string;
    items: Array<{ orderItemId: string; quantity: number }>;
  }> = [],
) {
  const order = {
    id: "order-1",
    number: "GJ-1001",
    email: "buyer@gemjar.test",
    status: "SUBMITTED",
    fulfilmentStatus: "UNFULFILLED",
    organizationId: "org-1",
    userId: null,
    createdById: "buyer-1",
    items: orderItems,
  };
  const orderUpdate = vi.fn().mockResolvedValue(order);
  const eventCreate = vi.fn().mockResolvedValue({});
  const notificationCreate = vi.fn().mockResolvedValue({ id: "notice-1" });
  const outboxCreate = vi.fn().mockResolvedValue({ id: "outbox-1" });
  const shipmentCreate = vi
    .fn()
    .mockImplementation(async ({ data }) => ({
      id: "shipment-new",
      ...data,
      items: data.items.create,
      trackingEvents: [],
    }));
  const prisma = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: orderUpdate,
    },
    shipment: { findMany: vi.fn().mockResolvedValue(existingShipments) },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback) =>
        callback({
          shipment: { create: shipmentCreate },
          order: { update: orderUpdate },
          orderStatusEvent: { create: eventCreate },
          organizationMembership: {
            findMany: vi.fn().mockResolvedValue([{ userId: "buyer-1" }]),
          },
          notification: { create: notificationCreate },
          outboxEvent: { create: outboxCreate },
        }),
      ),
  };
  const accounts = {
    assertCanAccess: vi.fn().mockResolvedValue({ id: "org-1" }),
  };
  const audit = { record: vi.fn().mockResolvedValue({}) };
  return {
    fulfilment: new FulfilmentService(
      prisma as never,
      accounts as never,
      audit as never,
    ),
    orderUpdate,
    eventCreate,
    shipmentCreate,
    notificationCreate,
    outboxCreate,
    accounts,
  };
}

describe("FulfilmentService partial shipments", () => {
  it("marks an order partially fulfilled when only some quantity ships", async () => {
    const {
      fulfilment,
      orderUpdate,
      eventCreate,
      notificationCreate,
      outboxCreate,
    } = createService();
    await fulfilment.create(staff, "order-1", {
      lines: [{ orderItemId: "item-a", quantity: 6 }],
      carrier: "DPD",
      trackingNumber: "TRK-1",
    });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfilmentStatus: "PARTIALLY_FULFILLED",
          status: "PROCESSING",
        }),
      }),
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SHIPMENT_CREATED_PARTIAL" }),
      }),
    );
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "buyer-1", kind: "ORDER" }),
      }),
    );
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "NOTIFICATION_EMAIL",
          payload: expect.objectContaining({ email: "buyer@gemjar.test" }),
        }),
      }),
    );
  });

  it("marks the order fulfilled once the final outstanding quantity ships", async () => {
    const existing = [
      {
        items: [
          { orderItemId: "item-a", quantity: 6 },
          { orderItemId: "item-b", quantity: 4 },
        ],
      },
    ];
    const { fulfilment, orderUpdate, eventCreate } = createService(existing);
    await fulfilment.create(staff, "order-1", {
      lines: [{ orderItemId: "item-a", quantity: 4 }],
    });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fulfilmentStatus: "FULFILLED" }),
      }),
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SHIPMENT_CREATED_FINAL" }),
      }),
    );
  });

  it("refuses to ship more than the outstanding quantity", async () => {
    const { fulfilment, shipmentCreate } = createService([
      { items: [{ orderItemId: "item-a", quantity: 8 }] },
    ]);
    await expect(
      fulfilment.create(staff, "order-1", {
        lines: [{ orderItemId: "item-a", quantity: 3 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(shipmentCreate).not.toHaveBeenCalled();
  });

  it("refuses a line that belongs to another order", async () => {
    const { fulfilment } = createService();
    await expect(
      fulfilment.create(staff, "order-1", {
        lines: [{ orderItemId: "item-z", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reports outstanding quantities per line", async () => {
    const { fulfilment } = createService([
      { items: [{ orderItemId: "item-a", quantity: 6 }] },
    ]);
    const result = await fulfilment.listForOrder(staff, "order-1");
    expect(result.outstanding).toEqual([
      expect.objectContaining({
        orderItemId: "item-a",
        ordered: 10,
        shipped: 6,
        remaining: 4,
      }),
      expect.objectContaining({
        orderItemId: "item-b",
        ordered: 4,
        shipped: 0,
        remaining: 4,
      }),
    ]);
  });

  it("lets an authorized buyer read shipments but never create them", async () => {
    const { fulfilment, accounts } = createService();
    await expect(
      fulfilment.listForOrder(buyer, "order-1"),
    ).resolves.toBeDefined();
    expect(accounts.assertCanAccess).toHaveBeenCalledWith(buyer, "org-1");
    await expect(
      fulfilment.create(buyer, "order-1", {
        lines: [{ orderItemId: "item-a", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
