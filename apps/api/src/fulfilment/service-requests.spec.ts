import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { FulfilmentService } from "./fulfilment.service";

const actor: AuthenticatedUser = {
  id: "customer-1",
  email: "customer@test.local",
  firstName: "Test",
  lastName: "Customer",
  kind: "CONSUMER",
  permissions: [],
  sessionId: "session-1",
};

function service(fulfilmentStatus = "UNFULFILLED") {
  const order = {
    id: "order-1",
    userId: actor.id,
    organizationId: null,
    status: "SUBMITTED",
    fulfilmentStatus,
    items: [{ id: "item-1", quantity: 2 }],
  };
  const prisma = {
    order: { findUnique: vi.fn().mockResolvedValue(order) },
    serviceRequest: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue({
          id: "request-1",
          reason: "Changed mind",
          items: [],
        }),
    },
  };
  return {
    fulfilment: new FulfilmentService(
      prisma as never,
      {} as never,
      { record: vi.fn() } as never,
    ),
    prisma,
  };
}

describe("customer service requests", () => {
  it("creates an item-scoped return for the owning customer", async () => {
    const { fulfilment, prisma } = service();
    await fulfilment.createRequest(actor, "order-1", {
      type: "RETURN",
      reason: "Changed mind",
      items: [{ orderItemId: "item-1", quantity: 1 }],
    });
    expect(prisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-1",
          type: "RETURN",
          items: { create: [{ orderItemId: "item-1", quantity: 1 }] },
        }),
      }),
    );
  });

  it("rejects cancellation after fulfilment starts", async () => {
    const { fulfilment } = service("PARTIALLY_FULFILLED");
    await expect(
      fulfilment.createRequest(actor, "order-1", {
        type: "CANCELLATION",
        reason: "Too late",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
