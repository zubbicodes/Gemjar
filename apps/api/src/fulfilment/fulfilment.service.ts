import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FulfilmentStatus,
  OrderStatus,
  Prisma,
  RequestStatus,
  ShipmentStatus,
  UserKind,
} from "@prisma/client";
import { AccountsService } from "../accounts/accounts.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

const shipmentInclude = {
  items: { include: { orderItem: true } },
  trackingEvents: { orderBy: { occurredAt: "asc" } },
} as const;

export type ShipmentLine = { orderItemId: string; quantity: number };
type QuantityLine = { orderItemId: string; quantity: number };
type OrderLine = {
  id: string;
  quantity: number;
  skuSnapshot: string;
  nameSnapshot: string;
};

@Injectable()
export class FulfilmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  /** Every shipment for an order, with the outstanding quantity per line. */
  async listForOrder(actor: AuthenticatedUser, orderId: string) {
    const order = await this.assertOrderAccess(actor, orderId);
    const shipments = await this.prisma.shipment.findMany({
      where: { orderId },
      include: shipmentInclude,
      orderBy: { createdAt: "asc" },
    });
    return {
      data: shipments,
      outstanding: this.outstanding(order.items, shipments),
      fulfilmentStatus: order.fulfilmentStatus,
    };
  }

  /**
   * Records a shipment covering some or all of the remaining quantities. Partial
   * shipments are the normal case, so fulfilment status is always recalculated
   * from shipped quantities rather than assigned by hand.
   */
  async create(
    actor: AuthenticatedUser,
    orderId: string,
    input: { lines: ShipmentLine[]; carrier?: string; trackingNumber?: string },
  ) {
    const order = await this.assertOrderAccess(
      actor,
      orderId,
      "fulfilment:update",
    );
    if (!input.lines.length)
      throw new BadRequestException("A shipment requires at least one line");
    const existing = await this.prisma.shipment.findMany({
      where: { orderId },
      include: { items: true },
    });
    const outstanding = new Map(
      this.outstanding(order.items, existing).map((line) => [
        line.orderItemId,
        line,
      ]),
    );
    for (const line of input.lines) {
      const entry = outstanding.get(line.orderItemId);
      if (!entry)
        throw new BadRequestException(
          "A shipment line does not belong to this order",
        );
      if (line.quantity < 1)
        throw new BadRequestException("Shipment quantities must be positive");
      if (line.quantity > entry.remaining)
        throw new BadRequestException(
          `Only ${entry.remaining} of ${entry.sku} remain to be shipped`,
        );
    }
    const shipment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.shipment.create({
        data: {
          orderId,
          status: ShipmentStatus.PENDING,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          items: {
            create: input.lines.map((line) => ({
              orderItemId: line.orderItemId,
              quantity: line.quantity,
            })),
          },
        },
        include: shipmentInclude,
      });
      const fulfilmentStatus = this.deriveFulfilment(order.items, [
        ...existing,
        { items: created.items },
      ]);
      const status =
        order.status === OrderStatus.SUBMITTED ||
        order.status === OrderStatus.CONFIRMED
          ? OrderStatus.PROCESSING
          : order.status;
      await transaction.order.update({
        where: { id: orderId },
        data: { fulfilmentStatus, status },
      });
      await transaction.orderStatusEvent.create({
        data: {
          orderId,
          type:
            fulfilmentStatus === FulfilmentStatus.FULFILLED
              ? "SHIPMENT_CREATED_FINAL"
              : "SHIPMENT_CREATED_PARTIAL",
          message:
            fulfilmentStatus === FulfilmentStatus.FULFILLED
              ? "Final shipment prepared"
              : "Partial shipment prepared",
          metadata: { shipmentId: created.id, lines: input.lines.length },
        },
      });
      await this.notifyOrder(transaction, order, {
        title: `Shipment prepared for order ${order.number}`,
        message:
          fulfilmentStatus === FulfilmentStatus.FULFILLED
            ? "Your final shipment has been prepared."
            : "Part of your order has been prepared for shipment.",
      });
      return created;
    });
    await this.audit.record({
      actorId: actor.id,
      event: "SHIPMENT_CREATED",
      entityType: "Shipment",
      entityId: shipment.id,
      after: { orderId, lines: input.lines },
    });
    return shipment;
  }

  /** Moves a shipment along its own status track and records a tracking event. */
  async updateStatus(
    actor: AuthenticatedUser,
    shipmentId: string,
    input: {
      status: ShipmentStatus;
      detail?: string;
      trackingNumber?: string;
      carrier?: string;
    },
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: { items: true, shipments: { include: { items: true } } },
        },
      },
    });
    if (!shipment) throw new NotFoundException("Shipment was not found");
    await this.assertOrderAccess(actor, shipment.orderId, "fulfilment:update");
    const dispatchedAt =
      input.status === ShipmentStatus.DISPATCHED
        ? (shipment.dispatchedAt ?? new Date())
        : shipment.dispatchedAt;
    const deliveredAt =
      input.status === ShipmentStatus.DELIVERED
        ? (shipment.deliveredAt ?? new Date())
        : shipment.deliveredAt;
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.shipment.update({
        where: { id: shipmentId },
        data: {
          status: input.status,
          dispatchedAt,
          deliveredAt,
          carrier: input.carrier ?? shipment.carrier,
          trackingNumber: input.trackingNumber ?? shipment.trackingNumber,
        },
        include: shipmentInclude,
      });
      await transaction.trackingEvent.create({
        data: {
          shipmentId,
          status: input.status,
          detail: input.detail,
          occurredAt: new Date(),
        },
      });
      const siblings = shipment.order.shipments.map((entry) =>
        entry.id === shipmentId ? { ...entry, status: input.status } : entry,
      );
      const everythingShipped =
        this.deriveFulfilment(
          shipment.order.items,
          shipment.order.shipments,
        ) === FulfilmentStatus.FULFILLED;
      if (
        everythingShipped &&
        siblings.every((entry) => entry.status === ShipmentStatus.DELIVERED)
      ) {
        await transaction.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
        await transaction.orderStatusEvent.create({
          data: {
            orderId: shipment.orderId,
            type: "ORDER_DELIVERED",
            message: "All shipments delivered",
          },
        });
      } else {
        await transaction.orderStatusEvent.create({
          data: {
            orderId: shipment.orderId,
            type: `SHIPMENT_${input.status}`,
            message:
              input.detail ??
              `Shipment marked ${input.status.toLowerCase().replaceAll("_", " ")}`,
            metadata: { shipmentId },
          },
        });
      }
      const trackingNumber = input.trackingNumber ?? shipment.trackingNumber;
      await this.notifyOrder(transaction, shipment.order, {
        title: `Order ${shipment.order.number}: shipment ${input.status.toLowerCase().replaceAll("_", " ")}`,
        message:
          input.detail ??
          `${trackingNumber ? `Tracking ${trackingNumber}: ` : ""}shipment is ${input.status.toLowerCase().replaceAll("_", " ")}.`,
      });
      return result;
    });
    await this.audit.record({
      actorId: actor.id,
      event: "SHIPMENT_STATUS_UPDATED",
      entityType: "Shipment",
      entityId: shipmentId,
      before: { status: shipment.status },
      after: { status: input.status },
    });
    return updated;
  }

  /** Customer-facing timeline merged from order, shipment, and tracking events. */
  async timeline(actor: AuthenticatedUser, orderId: string) {
    const order = await this.assertOrderAccess(actor, orderId);
    const [events, shipments] = await Promise.all([
      this.prisma.orderStatusEvent.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.shipment.findMany({
        where: { orderId },
        include: shipmentInclude,
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const entries = [
      ...events.map((event) => ({
        at: event.createdAt,
        type: event.type,
        message: event.message,
        source: "ORDER" as const,
      })),
      ...shipments.flatMap((shipment) =>
        shipment.trackingEvents.map((event) => ({
          at: event.occurredAt,
          type: event.status,
          message:
            event.detail ??
            `Shipment ${shipment.trackingNumber ?? shipment.id.slice(-6)}`,
          source: "SHIPMENT" as const,
        })),
      ),
    ].sort((first, second) => first.at.getTime() - second.at.getTime());
    return {
      data: entries,
      outstanding: this.outstanding(order.items, shipments),
      fulfilmentStatus: order.fulfilmentStatus,
      status: order.status,
    };
  }

  async requestsForOrder(actor: AuthenticatedUser, orderId: string) {
    await this.assertOrderAccess(actor, orderId);
    const data = await this.prisma.serviceRequest.findMany({
      where: { orderId },
      include: { items: { include: { orderItem: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { data, total: data.length };
  }

  async createRequest(
    actor: AuthenticatedUser,
    orderId: string,
    input: {
      type: "CANCELLATION" | "RETURN";
      reason: string;
      items?: Array<{ orderItemId: string; quantity: number }>;
    },
  ) {
    const order = await this.assertOrderAccess(actor, orderId);
    if (order.status === OrderStatus.CANCELLED)
      throw new ConflictException(
        "Cancelled orders cannot receive new requests",
      );
    if (
      input.type === "CANCELLATION" &&
      order.fulfilmentStatus !== FulfilmentStatus.UNFULFILLED
    )
      throw new ConflictException(
        "An order cannot be cancelled after fulfilment begins",
      );
    if (input.type === "RETURN" && !input.items?.length)
      throw new BadRequestException("A return requires at least one item");
    const open = await this.prisma.serviceRequest.findFirst({
      where: {
        orderId,
        type: input.type,
        status: {
          in: [
            RequestStatus.REQUESTED,
            RequestStatus.APPROVED,
            RequestStatus.RECEIVED,
          ],
        },
      },
    });
    if (open)
      throw new ConflictException(
        `An open ${input.type.toLowerCase()} request already exists`,
      );
    for (const line of input.items ?? []) {
      const item = order.items.find(
        (candidate) => candidate.id === line.orderItemId,
      );
      if (!item || line.quantity > item.quantity)
        throw new BadRequestException(
          "Return quantities must belong to this order and not exceed quantities ordered",
        );
    }
    const request = await this.prisma.serviceRequest.create({
      data: {
        orderId,
        type: input.type,
        reason: input.reason.trim(),
        items: input.items?.length ? { create: input.items } : undefined,
      },
      include: { items: true },
    });
    await this.audit.record({
      actorId: actor.id,
      event: `${input.type}_REQUESTED`,
      entityType: "ServiceRequest",
      entityId: request.id,
      after: { orderId, reason: request.reason },
    });
    return request;
  }

  async listRequests() {
    const data = await this.prisma.serviceRequest.findMany({
      include: {
        order: {
          include: {
            items: true,
            payments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        items: { include: { orderItem: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { data, total: data.length };
  }

  async updateRequest(
    actor: AuthenticatedUser,
    id: string,
    status: RequestStatus,
  ) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!request) throw new NotFoundException("Service request was not found");
    const allowed: Record<RequestStatus, RequestStatus[]> = {
      REQUESTED: [RequestStatus.APPROVED, RequestStatus.REJECTED],
      APPROVED: [RequestStatus.RECEIVED, RequestStatus.COMPLETED],
      REJECTED: [],
      RECEIVED: [RequestStatus.COMPLETED],
      COMPLETED: [],
    };
    if (!allowed[request.status].includes(status))
      throw new ConflictException(
        `Cannot move request from ${request.status} to ${status}`,
      );
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.serviceRequest.update({
        where: { id },
        data: { status },
      });
      if (
        request.type === "CANCELLATION" &&
        status === RequestStatus.APPROVED
      ) {
        await transaction.order.update({
          where: { id: request.orderId },
          data: { status: OrderStatus.CANCELLED },
        });
        await transaction.orderStatusEvent.create({
          data: {
            orderId: request.orderId,
            type: "ORDER_CANCELLED",
            message: "Cancellation request approved",
          },
        });
      }
      await this.notifyOrder(transaction, request.order, {
        title: `Order ${request.order.number}: ${request.type.toLowerCase()} ${status.toLowerCase()}`,
        message: `Your ${request.type.toLowerCase()} request is now ${status.toLowerCase()}.`,
      });
      return result;
    });
    await this.audit.record({
      actorId: actor.id,
      event: "SERVICE_REQUEST_STATUS_UPDATED",
      entityType: "ServiceRequest",
      entityId: id,
      before: { status: request.status },
      after: { status },
    });
    return updated;
  }

  private async notifyOrder(
    transaction: Prisma.TransactionClient,
    order: {
      id: string;
      number: string;
      email: string;
      userId: string | null;
      createdById: string | null;
      organizationId: string | null;
    },
    content: { title: string; message: string },
  ) {
    const recipientIds = new Set(
      [order.userId, order.createdById].filter((id): id is string => Boolean(id)),
    );
    if (order.organizationId) {
      const members = await transaction.organizationMembership.findMany({
        where: { organizationId: order.organizationId },
        select: { userId: true },
      });
      for (const member of members) recipientIds.add(member.userId);
    }
    for (const userId of recipientIds)
      await transaction.notification.create({
        data: {
          userId,
          kind: "ORDER",
          title: content.title,
          message: content.message,
          link: order.organizationId ? "/trade/orders" : "/account/orders",
        },
      });
    await transaction.outboxEvent.create({
      data: {
        aggregate: "OrderNotification",
        aggregateId: crypto.randomUUID(),
        type: "NOTIFICATION_EMAIL",
        payload: {
          email: order.email,
          subject: content.title,
          message: content.message,
        },
      },
    });
  }

  private shippedFor(
    orderItemId: string,
    shipments: Array<{ items: QuantityLine[] }>,
  ) {
    return shipments.reduce(
      (sum, shipment) =>
        sum +
        shipment.items
          .filter((line) => line.orderItemId === orderItemId)
          .reduce((lineSum, line) => lineSum + line.quantity, 0),
      0,
    );
  }

  private outstanding(
    items: OrderLine[],
    shipments: Array<{ items: QuantityLine[] }>,
  ) {
    return items.map((item) => {
      const shipped = this.shippedFor(item.id, shipments);
      return {
        orderItemId: item.id,
        sku: item.skuSnapshot,
        name: item.nameSnapshot,
        ordered: item.quantity,
        shipped,
        remaining: item.quantity - shipped,
      };
    });
  }

  private deriveFulfilment(
    items: Array<{ id: string; quantity: number }>,
    shipments: Array<{ items: QuantityLine[] }>,
  ) {
    const lines = items.map((item) => {
      const shipped = this.shippedFor(item.id, shipments);
      return shipped >= item.quantity ? "FULL" : shipped > 0 ? "PART" : "NONE";
    });
    if (lines.every((line) => line === "FULL"))
      return FulfilmentStatus.FULFILLED;
    if (lines.every((line) => line === "NONE"))
      return FulfilmentStatus.UNFULFILLED;
    return FulfilmentStatus.PARTIALLY_FULFILLED;
  }

  /** Server-side ownership check; route guards alone are never sufficient. */
  private async assertOrderAccess(
    actor: AuthenticatedUser,
    orderId: string,
    permission = "fulfilment:read",
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order was not found");
    if (actor.permissions.includes(permission)) return order;
    if (permission !== "fulfilment:read")
      throw new ForbiddenException("Fulfilment permission is required");
    if (actor.kind === UserKind.CONSUMER && order.userId === actor.id)
      return order;
    if (order.organizationId) {
      await this.accounts.assertCanAccess(actor, order.organizationId);
      return order;
    }
    throw new ForbiddenException("You do not have access to this order");
  }
}
