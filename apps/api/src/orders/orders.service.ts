import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Channel,
  FulfilmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  UserKind,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { PricingService, type QuoteRequest } from "../pricing/pricing.service";
import { AccountsService } from "../accounts/accounts.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { createHash } from "node:crypto";

export type TradeOrderInput = Omit<QuoteRequest, "channel"> & {
  email: string;
  deliveryAddress: Record<string, string>;
  notes?: string;
  purchaseOrder?: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly pricing: PricingService,
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}
  async list() {
    const data = await this.prisma.order.findMany({
      include: {
        items: true,
        shipments: { include: { items: true } },
        events: { orderBy: { createdAt: "asc" } },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data, page: 1, pageSize: data.length, total: data.length };
  }
  async mine(actor: AuthenticatedUser) {
    if (actor.kind !== UserKind.CONSUMER)
      throw new ForbiddenException("A consumer account is required");
    const data = await this.prisma.order.findMany({
      where: {
        userId: actor.id,
        source: Channel.B2C,
        status: { not: OrderStatus.DRAFT },
      },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        shipments: {
          include: { trackingEvents: { orderBy: { occurredAt: "asc" } } },
        },
        events: { orderBy: { createdAt: "asc" } },
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { data, total: data.length };
  }

  async reorder(actor: AuthenticatedUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    media: { orderBy: { position: "asc" }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException("Order was not found");
    if (order.organizationId)
      await this.accounts.assertCanAccess(actor, order.organizationId);
    else if (
      order.userId !== actor.id &&
      !actor.permissions.includes("orders:read")
    )
      throw new ForbiddenException("You do not have access to this order");
    return {
      orderId,
      organizationId: order.organizationId,
      items: order.items.flatMap((item) =>
        item.variant?.active
          ? [
              {
                variantId: item.variantId,
                quantity: item.quantity,
                product: {
                  id: item.variant.product.id,
                  variantId: item.variant.id,
                  name: item.variant.product.name,
                  slug: item.variant.product.slug,
                  sku: item.variant.sku,
                  price: item.variant.retailPriceMinor,
                  image:
                    item.variant.product.media[0]?.url ??
                    "/images/gemjar-hero.png",
                  collection: "Gemjar Collection",
                  description: item.variant.product.description,
                  accent: "#c9b99c",
                  availability: "Repriced in basket",
                  material: "Gemjar selected materials",
                },
              },
            ]
          : [],
      ),
    };
  }
  /** Orders for one customer organization: trade members, their agent, or staff. */
  async forOrganization(actor: AuthenticatedUser, organizationId: string) {
    await this.accounts.assertCanAccess(actor, organizationId);
    const data = await this.prisma.order.findMany({
      where: { organizationId, status: { not: OrderStatus.DRAFT } },
      include: {
        items: true,
        invoice: true,
        agent: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        shipments: {
          include: {
            items: true,
            trackingEvents: { orderBy: { occurredAt: "asc" } },
          },
        },
        events: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      data,
      total: data.length,
      outstandingMinor: data
        .filter((order) => order.paymentStatus !== "PAID")
        .reduce((sum, order) => sum + order.totalMinor, 0),
    };
  }

  async create(
    input: QuoteRequest & {
      email: string;
      deliveryAddress: Record<string, string>;
      notes?: string;
      purchaseOrder?: string;
    },
    key: string,
    actor?: AuthenticatedUser,
    options: { paymentProvider?: string } = {},
  ) {
    if (!key) throw new ConflictException("Idempotency-Key header is required");
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: { items: true, payments: true, events: true },
    });
    if (existing) return existing;
    if (input.channel !== "B2C" && (!actor || !input.organizationId))
      throw new ConflictException(
        "Authenticated organization context is required",
      );
    const context =
      input.channel === "B2C"
        ? null
        : await this.accounts.assertCanOrder(actor!, input.organizationId!);
    if (context?.organization.poRequired && !input.purchaseOrder?.trim())
      throw new ConflictException(
        "A purchase order number is required for this organization",
      );
    const quote = await this.pricing.quote(input, actor);
    if (quote.lines.some((line) => !line.validation.valid))
      throw new ConflictException("Order contains invalid quantities");
    const number = `GJ-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-8)}`;
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (
          !options.paymentProvider &&
          context?.organization.creditLimitMinor != null &&
          input.organizationId
        ) {
          const outstanding = await transaction.order.aggregate({
            where: {
              organizationId: input.organizationId,
              status: { notIn: [OrderStatus.DRAFT, OrderStatus.CANCELLED] },
              paymentStatus: {
                in: [PaymentStatus.UNPAID, PaymentStatus.PENDING],
              },
            },
            _sum: { totalMinor: true },
          });
          if (
            (outstanding._sum.totalMinor ?? 0) + quote.total.amount >
            context.organization.creditLimitMinor
          )
            throw new ConflictException(
              "Order exceeds the organization's available credit",
            );
        }
        const order = await transaction.order.create({
          data: {
            number,
            idempotencyKey: key,
            confirmationTokenHash: options.paymentProvider
              ? createHash("sha256")
                  .update(
                    `${process.env.COOKIE_SECRET || "local-cookie-secret"}:confirmation:${key}`,
                  )
                  .digest("hex")
              : undefined,
            source: Channel[input.channel],
            status: options.paymentProvider
              ? OrderStatus.DRAFT
              : OrderStatus.SUBMITTED,
            paymentStatus:
              options.paymentProvider || input.channel === "B2C"
                ? PaymentStatus.PENDING
                : PaymentStatus.UNPAID,
            fulfilmentStatus: FulfilmentStatus.UNFULFILLED,
            stockConfirmationPending: quote.stockConfidence !== "LIVE",
            organizationId: input.organizationId,
            userId: actor?.id,
            createdById: actor?.id,
            agentId: context?.agentId,
            email: input.email,
            currency: "GBP",
            subtotalMinor: quote.subtotal.amount,
            vatMinor: quote.vat.amount,
            totalMinor: quote.total.amount,
            billingAddress: input.deliveryAddress,
            deliveryAddress: input.deliveryAddress,
            notes: input.notes,
            purchaseOrder: input.purchaseOrder,
            payments: options.paymentProvider
              ? {
                  create: {
                    provider: options.paymentProvider,
                    idempotencyKey: `payment:${key}`,
                    status: PaymentStatus.PENDING,
                    amountMinor: quote.total.amount,
                  },
                }
              : undefined,
            items: {
              create: quote.lines.map((line) => ({
                variantId: line.variantId,
                skuSnapshot: line.sku,
                nameSnapshot: line.name,
                quantity: line.quantity,
                unitPriceMinor: line.unitPrice.amount,
                vatMinor: line.vat.amount,
                totalMinor: line.gross.amount,
                pricingRule: line.appliedRule,
              })),
            },
            events: {
              create: {
                type: options.paymentProvider
                  ? "CHECKOUT_STARTED"
                  : "ORDER_SUBMITTED",
                message:
                  options.paymentProvider
                    ? "Card checkout started; payment confirmation is pending"
                    : quote.stockConfidence === "LIVE"
                    ? "Order submitted"
                    : "Order submitted pending stock confirmation",
              },
            },
            externalRefs: undefined,
          },
          include: { items: true, events: true, payments: true },
        });
        if (!options.paymentProvider) {
          await transaction.outboxEvent.create({
            data: {
              aggregate: "Order",
              aggregateId: order.id,
              type: "ORDER_SUBMIT",
              payload: { orderId: order.id, provider: "MINTSOFT" },
            },
          });
          if (actor)
            await transaction.notification.create({
              data: {
                userId: actor.id,
                kind: "ORDER",
                title: `Order ${order.number} submitted`,
                message: order.stockConfirmationPending
                  ? "Order received; stock confirmation is pending."
                  : "Order received and ready for processing.",
                link:
                  input.channel === "B2C"
                    ? "/account/orders"
                    : "/trade/orders",
              },
            });
          await transaction.outboxEvent.create({
            data: {
              aggregate: "Order",
              aggregateId: order.id,
              type: "NOTIFICATION_EMAIL",
              payload: {
                email: order.email,
                subject: `Gemjar order ${order.number}`,
                message: order.stockConfirmationPending
                  ? "Your order was received and is pending stock confirmation."
                  : "Your order was received and is ready for processing.",
              },
            },
          });
        }
        await transaction.auditLog.create({
          data: {
            actorId: actor?.id,
            event: options.paymentProvider
              ? "ORDER_CHECKOUT_STARTED"
              : "ORDER_CREATED",
            entityType: "Order",
            entityId: order.id,
            after: {
              number: order.number,
              source: order.source,
              organizationId: order.organizationId,
              agentId: order.agentId,
              totalMinor: order.totalMinor,
              status: order.status,
            },
          },
        });
        if (order.stockConfirmationPending && !options.paymentProvider) {
          const administrators = await transaction.user.findMany({
            where: { kind: UserKind.ADMIN },
            select: { id: true },
          });
          if (administrators.length)
            await transaction.notification.createMany({
              data: administrators.map(({ id }) => ({
                userId: id,
                kind: "INTEGRATION",
                title: `Order ${order.number} needs stock confirmation`,
                message:
                  "Mintsoft stock is stale or insufficient. Customer order remains accepted for manual review.",
                link: "/admin/orders",
              })),
            });
          await transaction.outboxEvent.create({
            data: {
              aggregate: "Order",
              aggregateId: order.id,
              type: "STOCK_SYNC_REQUESTED",
              payload: { orderId: order.id, provider: "MINTSOFT" },
            },
          });
        }
        return order;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay = await this.prisma.order.findUnique({
          where: { idempotencyKey: key },
          include: { items: true, events: true, payments: true },
        });
        if (replay) return replay;
      }
      throw error;
    }
  }

  async createTrade(
    actor: AuthenticatedUser,
    input: TradeOrderInput,
    key: string,
  ) {
    const channel =
      actor.kind === UserKind.AGENT
        ? ("SALES_AGENT" as const)
        : ("B2B" as const);
    return this.create({ ...input, channel }, key, actor);
  }

  async createTradePaymentDraft(
    actor: AuthenticatedUser,
    input: TradeOrderInput,
    key: string,
    paymentProvider: string,
  ) {
    const channel =
      actor.kind === UserKind.AGENT
        ? ("SALES_AGENT" as const)
        : ("B2B" as const);
    return this.create(
      { ...input, channel },
      key,
      actor,
      { paymentProvider },
    );
  }
}
