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
