import { afterEach, describe, expect, it, vi } from "vitest";
import { MintsoftProvider } from "./mintsoft.provider";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.restoreAllMocks();
});

describe("MintsoftProvider", () => {
  it("uses deterministic development availability without approved mapping", async () => {
    delete process.env.MINTSOFT_BASE_URL;
    delete process.env.MINTSOFT_API_KEY;
    await expect(
      new MintsoftProvider().getAvailability(["GJ-1", "GJ-2"]),
    ).resolves.toEqual([
      expect.objectContaining({ sku: "GJ-1", available: 12 }),
      expect.objectContaining({ sku: "GJ-2", available: 19 }),
    ]);
  });

  it("maps configured stock responses by SKU", async () => {
    Object.assign(process.env, {
      MINTSOFT_BASE_URL: "https://mintsoft.test/",
      MINTSOFT_API_KEY: "secret",
      MINTSOFT_STOCK_PATH: "/stock",
      MINTSOFT_ORDER_PATH: "/orders",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Items: [{ SKU: "GJ-1", FreeStock: 7 }] }),
      }),
    );
    await expect(
      new MintsoftProvider().getAvailability(["GJ-1"]),
    ).resolves.toEqual([
      expect.objectContaining({ sku: "GJ-1", available: 7 }),
    ]);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://mintsoft.test/stock"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "ms-apikey": "secret" }),
      }),
    );
  });
});
