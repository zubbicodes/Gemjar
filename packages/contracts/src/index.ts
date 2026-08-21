export type Currency = "GBP";
export type Channel = "B2C" | "B2B" | "SALES_AGENT" | "ADMIN";
export type OrderStatus = "DRAFT" | "SUBMITTED" | "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED";
export type FulfilmentStatus = "UNFULFILLED" | "PARTIALLY_FULFILLED" | "FULFILLED";
export type StockConfidence = "LIVE" | "STALE" | "PENDING_CONFIRMATION" | "MANUAL_REVIEW";

export interface Money { amount: number; currency: Currency }
export interface PriceQuoteLine {
  variantId: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  net: Money;
  vat: Money;
  gross: Money;
  appliedRule: "CUSTOMER_TIER" | "CUSTOMER_FIXED" | "B2B_DEFAULT" | "RETAIL";
  validation: { valid: boolean; code?: "MOQ" | "PACK_MULTIPLE" | "UNAVAILABLE"; message?: string };
}
export interface PriceQuote {
  lines: PriceQuoteLine[];
  subtotal: Money;
  vat: Money;
  total: Money;
  stockConfidence: StockConfidence;
  quotedAt: string;
}
export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  fieldErrors?: Record<string, string[]>;
}
export interface Page<T> { data: T[]; page: number; pageSize: number; total: number }

export interface InventoryProvider {
  getAvailability(skus: string[]): Promise<Array<{ sku: string; available: number; capturedAt: string }>>;
}
export interface OrderSyncProvider {
  submitOrder(orderId: string, idempotencyKey: string): Promise<{ externalId: string; acceptedAt: string }>;
  getOrderStatus(externalId: string): Promise<{ status: string; updatedAt: string }>;
}
export interface ShipmentProvider {
  pullUpdates(cursor?: string): Promise<{ updates: unknown[]; nextCursor?: string }>;
  handleWebhook(payload: unknown): Promise<void>;
}
export interface InvoiceProvider {
  listInvoices(customerId: string): Promise<Array<{ id: string; number: string; total: Money; issuedAt: string }>>;
  getDocument(invoiceId: string): Promise<{ url: string; expiresAt: string }>;
}
