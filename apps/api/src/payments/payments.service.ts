import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Channel, OrderStatus, PaymentStatus, UserKind } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { PaymentProviderGateway } from "./payment-provider";

type CheckoutInput = {
  email: string;
  deliveryMethodCode: string;
  deliveryAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    countryCode: "GB";
  };
  notes?: string;
  items: Array<{ variantId: string; quantity: number }>;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly gateway: PaymentProviderGateway,
    private readonly audit: AuditService,
  ) {}

  async deliveryMethods() {
    const data = await this.prisma.deliveryMethod.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    });
    return { data };
  }

  async startCheckout(
    actor: AuthenticatedUser | undefined,
    input: CheckoutInput,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 16)
      throw new ConflictException("A valid Idempotency-Key header is required");
    if (actor && actor.kind !== UserKind.CONSUMER)
      throw new ForbiddenException("Use a consumer account or guest checkout");
    const replay = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { payments: true, items: true },
    });
    if (replay) return this.resumeCheckout(replay, idempotencyKey);
    const method = await this.prisma.deliveryMethod.findUnique({
      where: { code: input.deliveryMethodCode },
    });
    if (!method?.active)
      throw new ConflictException(
        "The selected delivery method is no longer available",
      );
    const quote = await this.pricing.quote({
      channel: "B2C",
      items: input.items,
    });
    if (quote.lines.some((line) => !line.validation.valid))
      throw new ConflictException("Order contains invalid quantities");
    const shippingMinor =
      method.freeThresholdMinor !== null &&
      quote.total.amount >= method.freeThresholdMinor
        ? 0
        : method.priceMinor;
    const totalMinor = quote.total.amount + shippingMinor;
    const order = await this.prisma.order.create({
      data: {
        number: `GJ-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
        idempotencyKey,
        confirmationTokenHash: this.hashToken(idempotencyKey),
        source: Channel.B2C,
        status: OrderStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        userId: actor?.id,
        createdById: actor?.id,
        email: input.email.trim().toLowerCase(),
        currency: "GBP",
        subtotalMinor: quote.subtotal.amount,
        vatMinor: quote.vat.amount,
        shippingMinor,
        totalMinor,
        deliveryMethodCode: method.code,
        deliveryMethodName: method.name,
        billingAddress: input.deliveryAddress,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        stockConfirmationPending: quote.stockConfidence !== "LIVE",
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
        payments: {
          create: {
            provider: this.gateway.activeProvider,
            idempotencyKey: `payment:${idempotencyKey}`,
            status: PaymentStatus.PENDING,
            amountMinor: totalMinor,
          },
        },
        events: {
          create: {
            type: "CHECKOUT_STARTED",
            message: "Checkout started; payment confirmation is pending",
          },
        },
      },
      include: { payments: true, items: true },
    });
    const payment = order.payments[0]!;
    try {
      const intent = await this.gateway.createIntent({
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.number,
        amountMinor: totalMinor,
        currency: order.currency,
        idempotencyKey: payment.idempotencyKey,
        email: order.email,
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { provider: intent.provider, externalId: intent.externalId },
      });
      await this.audit.record({
        actorId: actor?.id,
        event: "PAYMENT_INTENT_CREATED",
        entityType: "Payment",
        entityId: payment.id,
        after: {
          provider: intent.provider,
          orderId: order.id,
          amountMinor: totalMinor,
        },
      });
      return this.checkoutPayload(order, payment.id, intent, idempotencyKey);
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureCode: "PROVIDER_UNAVAILABLE",
          failureMessage: "Payment provider could not start checkout",
        },
      });
      throw error;
    }
  }

  async confirmMock(paymentId: string, confirmationToken: string) {
    if (process.env.NODE_ENV === "production")
      throw new NotFoundException("Payment route was not found");
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (
      !payment ||
      payment.provider !== "mock" ||
      payment.order.confirmationTokenHash !== this.hashToken(confirmationToken)
    )
      throw new NotFoundException("Checkout session was not found");
    return this.completePayment(
      payment.externalId ?? `mock_pi_${payment.id}`,
      `mock-confirmation:${payment.id}`,
    );
  }

  async handleStripeWebhook(payload: Buffer, signature?: string) {
    const event = this.gateway.verifyStripeWebhook(payload, signature);
    const duplicate = await this.prisma.outboxEvent.findFirst({
      where: { aggregate: "StripeEvent", aggregateId: event.id },
    });
    if (duplicate) return { received: true, duplicate: true };
    if (event.type === "succeeded" && event.externalId)
      await this.completePayment(event.externalId, event.id);
    else if (event.type === "failed" && event.externalId)
      await this.failPayment(
        event.externalId,
        event.id,
        event.failureCode,
        event.failureMessage,
      );
    else
      await this.prisma.outboxEvent.create({
        data: {
          aggregate: "StripeEvent",
          aggregateId: event.id,
          type: "STRIPE_EVENT_IGNORED",
          payload: { type: event.type },
          processedAt: new Date(),
        },
      });
    return { received: true };
  }

  async confirmation(orderId: string, confirmationToken: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        confirmationTokenHash: this.hashToken(confirmationToken),
      },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        events: { orderBy: { createdAt: "asc" } },
        shipments: {
          include: { trackingEvents: { orderBy: { occurredAt: "asc" } } },
        },
      },
    });
    if (!order) throw new NotFoundException("Order confirmation was not found");
    return this.publicOrder(order);
  }

  private async resumeCheckout(order: any, token: string) {
    const payment = order.payments[0];
    if (!payment)
      throw new ConflictException("Existing checkout has no payment record");
    const intent = payment.externalId
      ? await this.gateway.resumeIntent(payment.externalId)
      : await this.gateway.createIntent({
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.number,
          amountMinor: payment.amountMinor,
          currency: order.currency,
          idempotencyKey: payment.idempotencyKey,
          email: order.email,
        });
    if (!payment.externalId)
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { provider: intent.provider, externalId: intent.externalId },
      });
    return this.checkoutPayload(order, payment.id, intent, token);
  }

  private async completePayment(externalId: string, eventId: string) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: { externalId },
        include: { order: true },
      });
      if (!payment) throw new NotFoundException("Payment was not found");
      if (payment.status === PaymentStatus.PAID) return payment.order;
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          failureCode: null,
          failureMessage: null,
        },
      });
      const order = await transaction.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.SUBMITTED,
          paymentStatus: PaymentStatus.PAID,
          events: {
            create: {
              type: "PAYMENT_CONFIRMED",
              message: "Payment confirmed; order submitted for fulfilment",
              metadata: { eventId },
            },
          },
        },
        include: { items: true, payments: true, events: true },
      });
      await transaction.outboxEvent.create({
        data: {
          aggregate: "Order",
          aggregateId: order.id,
          type: "ORDER_READY_FOR_FULFILMENT",
          payload: {
            orderId: order.id,
            number: order.number,
            source: order.source,
            eventId,
          },
        },
      });
      await transaction.outboxEvent.create({
        data: {
          aggregate: "StripeEvent",
          aggregateId: eventId,
          type: "PAYMENT_EVENT_PROCESSED",
          payload: { paymentId: payment.id, externalId },
          processedAt: new Date(),
        },
      });
      return order;
    });
    await this.audit.record({
      event: "PAYMENT_CONFIRMED",
      entityType: "Order",
      entityId: result.id,
      after: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.SUBMITTED,
        eventId,
      },
    });
    return this.publicOrder(result);
  }

  private async failPayment(
    externalId: string,
    eventId: string,
    failureCode?: string,
    failureMessage?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { externalId },
    });
    if (!payment || payment.status === PaymentStatus.PAID) return;
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureCode, failureMessage },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          events: {
            create: {
              type: "PAYMENT_FAILED",
              message: failureMessage ?? "Payment failed",
              metadata: { eventId, failureCode },
            },
          },
        },
      }),
      this.prisma.outboxEvent.create({
        data: {
          aggregate: "StripeEvent",
          aggregateId: eventId,
          type: "PAYMENT_EVENT_PROCESSED",
          payload: { paymentId: payment.id, externalId, failureCode },
          processedAt: new Date(),
        },
      }),
    ]);
  }

  private checkoutPayload(
    order: any,
    paymentId: string,
    intent: { provider: string; externalId: string; clientSecret: string },
    confirmationToken: string,
  ) {
    return {
      orderId: order.id,
      number: order.number,
      paymentId,
      provider: intent.provider,
      clientSecret: intent.clientSecret,
      amountMinor: order.totalMinor,
      currency: order.currency,
      confirmationToken,
    };
  }
  private publicOrder(order: any) {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus ?? order.payments?.[0]?.status,
      fulfilmentStatus: order.fulfilmentStatus,
      stockConfirmationPending: order.stockConfirmationPending,
      email: order.email,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      vatMinor: order.vatMinor,
      shippingMinor: order.shippingMinor,
      totalMinor: order.totalMinor,
      deliveryMethodName: order.deliveryMethodName,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      items: order.items,
      events: order.events ?? [],
      shipments: order.shipments ?? [],
    };
  }
  private hashToken(token: string) {
    return createHash("sha256")
      .update(
        `${process.env.COOKIE_SECRET || "local-cookie-secret"}:confirmation:${token}`,
      )
      .digest("hex");
  }
}
