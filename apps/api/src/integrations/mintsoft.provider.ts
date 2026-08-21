import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { InventoryProvider, OrderSyncProvider } from "./provider.contracts";

@Injectable()
export class MintsoftProvider implements InventoryProvider, OrderSyncProvider {
  private readonly baseUrl = process.env.MINTSOFT_BASE_URL;
  private readonly apiKey = process.env.MINTSOFT_API_KEY;
  get configured() { return Boolean(this.baseUrl && this.apiKey); }
  async getAvailability(skus: string[]) {
    if (!this.configured) return skus.map((sku, index) => ({ sku, available: 12 + index * 7, capturedAt: new Date().toISOString() }));
    throw new ServiceUnavailableException("Mintsoft endpoint mapping requires approved client sandbox credentials");
  }
  async submitOrder(orderId: string) {
    if (!this.configured) return { externalId: `MINTSOFT-DEMO-${orderId.slice(-8)}`, acceptedAt: new Date().toISOString() };
    throw new ServiceUnavailableException("Mintsoft endpoint mapping requires approved client sandbox credentials");
  }
}
