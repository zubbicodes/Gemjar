import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  InventoryProvider,
  OrderSyncProvider,
} from "./provider.contracts";

type StockEntry = {
  SKU?: string;
  Sku?: string;
  sku?: string;
  Available?: number;
  available?: number;
  FreeStock?: number;
};

@Injectable()
export class MintsoftProvider implements InventoryProvider, OrderSyncProvider {
  private readonly baseUrl = process.env.MINTSOFT_BASE_URL;
  private readonly apiKey = process.env.MINTSOFT_API_KEY;
  private readonly stockPath = process.env.MINTSOFT_STOCK_PATH;
  private readonly orderPath = process.env.MINTSOFT_ORDER_PATH;

  get configured() {
    return this.stockConfigured && this.orderConfigured;
  }

  get stockConfigured() {
    return Boolean(this.baseUrl && this.apiKey && this.stockPath);
  }

  get orderConfigured() {
    return Boolean(this.baseUrl && this.apiKey && this.orderPath);
  }

  async getAvailability(skus: string[]) {
    if (!this.stockConfigured)
      return skus.map((sku, index) => ({
        sku,
        available: 12 + index * 7,
        capturedAt: new Date().toISOString(),
      }));
    const body = await this.request(this.stockPath!, {
      method: "POST",
      body: JSON.stringify({ SKUs: skus }),
    });
    const source = Array.isArray(body)
      ? body
      : this.arrayFrom(body, ["Items", "Products", "Data"]);
    const capturedAt = new Date().toISOString();
    return skus.map((sku) => {
      const entry = source.find(
        (item) => String(item.SKU ?? item.Sku ?? item.sku) === sku,
      );
      return {
        sku,
        available: Math.max(
          0,
          Number(entry?.Available ?? entry?.available ?? entry?.FreeStock ?? 0),
        ),
        capturedAt,
      };
    });
  }

  async submitOrder(orderId: string, idempotencyKey: string) {
    if (!this.orderConfigured)
      return {
        externalId: `MINTSOFT-DEMO-${orderId.slice(-8)}`,
        acceptedAt: new Date().toISOString(),
      };
    const result = await this.request(this.orderPath!, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ OrderId: orderId }),
    });
    const record = result as Record<string, unknown>;
    const externalId = record.ID ?? record.Id ?? record.OrderId;
    if (!externalId)
      throw new ServiceUnavailableException(
        "Mintsoft response omitted order identifier",
      );
    return {
      externalId: String(externalId),
      acceptedAt: new Date().toISOString(),
    };
  }

  private async request(path: string, init: RequestInit) {
    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
          "ms-apikey": this.apiKey!,
          ...init.headers,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as unknown;
    } catch (error) {
      throw new ServiceUnavailableException(
        `Mintsoft request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private arrayFrom(value: unknown, keys: string[]): StockEntry[] {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    for (const key of keys)
      if (Array.isArray(record[key])) return record[key] as StockEntry[];
    return [];
  }
}
