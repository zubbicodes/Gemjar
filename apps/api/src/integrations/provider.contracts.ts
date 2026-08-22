export interface InventoryProvider {
  getAvailability(
    skus: string[],
  ): Promise<Array<{ sku: string; available: number; capturedAt: string }>>;
}
export interface OrderSyncProvider {
  submitOrder(
    orderId: string,
    idempotencyKey: string,
  ): Promise<{ externalId: string; acceptedAt: string }>;
}
export interface InvoiceProvider {
  listInvoices(
    customerId: string,
  ): Promise<
    Array<{ id: string; number: string; totalMinor: number; issuedAt: string }>
  >;
}
export interface ShipmentUpdate {
  externalOrderId: string;
  status: "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  carrier?: string;
  trackingNumber?: string;
  occurredAt: string;
}
export interface ShipmentProvider {
  pullUpdates(cursor?: string): Promise<{
    updates: ShipmentUpdate[];
    cursor?: string;
  }>;
  handleWebhook(payload: unknown): Promise<ShipmentUpdate[]>;
}
export interface CustomerSyncProvider {
  pullCustomers(cursor?: string): Promise<{ customers: unknown[]; cursor?: string }>;
}
export interface PricingSyncProvider {
  pullPrices(cursor?: string): Promise<{ prices: unknown[]; cursor?: string }>;
}
