import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { InvoiceProvider, OrderSyncProvider } from "./provider.contracts";

@Injectable()
export class SageMockProvider implements InvoiceProvider, OrderSyncProvider {
  async submitOrder(orderId: string, idempotencyKey: string) {
    if (idempotencyKey.includes("transient-failure")) throw new ServiceUnavailableException("Simulated transient Sage failure");
    if (idempotencyKey.includes("permanent-failure")) throw new Error("Simulated permanent mapping failure");
    return { externalId: `SAGE-MOCK-${orderId.slice(-8).toUpperCase()}`, acceptedAt: new Date().toISOString() };
  }
  async listInvoices(customerId: string) {
    return [{ id: `inv_${customerId}`, number: "SI-004821", totalMinor: 284000, issuedAt: new Date(Date.now() - 7 * 86400000).toISOString() }];
  }
}
