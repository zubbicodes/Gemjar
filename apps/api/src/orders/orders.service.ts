import { ConflictException, Injectable } from "@nestjs/common";
import { Channel, FulfilmentStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { PricingService, type QuoteRequest } from "../pricing/pricing.service";

@Injectable()
export class OrdersService {
  constructor(private readonly pricing: PricingService, private readonly prisma: PrismaService) {}
  async list() {
    const data = await this.prisma.order.findMany({ include: { items: true, shipments: { include: { items: true } }, events: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, take: 100 });
    return { data, page: 1, pageSize: data.length, total: data.length };
  }
  async create(input: QuoteRequest & { email: string; deliveryAddress: Record<string, string>; notes?: string }, key: string) {
    if (!key) throw new ConflictException("Idempotency-Key header is required");
    const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true } });
    if (existing) return existing;
    const quote = await this.pricing.quote(input);
    if (quote.lines.some((line) => !line.validation.valid)) throw new ConflictException("Order contains invalid quantities");
    const number = `GJ-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-8)}`;
    try {
      return await this.prisma.$transaction(async (transaction) => transaction.order.create({
        data: {
          number, idempotencyKey: key, source: Channel[input.channel], status: OrderStatus.SUBMITTED,
          paymentStatus: input.channel === "B2C" ? PaymentStatus.PENDING : PaymentStatus.UNPAID,
          fulfilmentStatus: FulfilmentStatus.UNFULFILLED, stockConfirmationPending: quote.stockConfidence !== "LIVE",
          organizationId: input.organizationId, email: input.email, currency: "GBP", subtotalMinor: quote.subtotal.amount,
          vatMinor: quote.vat.amount, totalMinor: quote.total.amount, billingAddress: input.deliveryAddress,
          deliveryAddress: input.deliveryAddress, notes: input.notes,
          items: { create: quote.lines.map((line) => ({ variantId: line.variantId, skuSnapshot: line.sku, nameSnapshot: line.name, quantity: line.quantity, unitPriceMinor: line.unitPrice.amount, vatMinor: line.vat.amount, totalMinor: line.gross.amount, pricingRule: line.appliedRule })) },
          events: { create: { type: "ORDER_SUBMITTED", message: quote.stockConfidence === "LIVE" ? "Order submitted" : "Order submitted pending stock confirmation" } },
          externalRefs: undefined,
        },
        include: { items: true, events: true },
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replay = await this.prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true, events: true } });
        if (replay) return replay;
      }
      throw error;
    }
  }
}
