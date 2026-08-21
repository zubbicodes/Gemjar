import { ConflictException, Injectable } from "@nestjs/common";
import { PricingService, type QuoteRequest } from "../pricing/pricing.service";

@Injectable()
export class OrdersService {
  private readonly idempotency = new Map<string, unknown>();
  private readonly orders: any[] = [];
  constructor(private readonly pricing: PricingService) {}

  list() { return { data: this.orders, page: 1, pageSize: this.orders.length, total: this.orders.length }; }
  create(input: QuoteRequest & { email: string; deliveryAddress: Record<string, string>; notes?: string }, key: string) {
    if (!key) throw new ConflictException("Idempotency-Key header is required");
    const previous = this.idempotency.get(key);
    if (previous) return previous;
    const quote = this.pricing.quote(input);
    if (quote.lines.some((line) => !line.validation.valid)) throw new ConflictException("Order contains invalid quantities");
    const order = { id: `ord_${crypto.randomUUID()}`, number: `GJ-${10483 + this.orders.length}`, source: input.channel, status: "SUBMITTED", paymentStatus: input.channel === "B2C" ? "PENDING" : "UNPAID", fulfilmentStatus: "UNFULFILLED", stockConfirmationPending: quote.stockConfidence !== "LIVE", email: input.email, deliveryAddress: input.deliveryAddress, notes: input.notes, quote, createdAt: new Date().toISOString() };
    this.orders.unshift(order);
    this.idempotency.set(key, order);
    return order;
  }
}
