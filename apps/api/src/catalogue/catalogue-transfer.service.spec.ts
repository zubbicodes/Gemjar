import { describe, expect, it, vi } from "vitest";
import { CatalogueTransferService } from "./catalogue-transfer.service";

function service(existing: unknown = null) {
  const create = vi
    .fn()
    .mockImplementation(async ({ data }) => ({ id: "import-1", ...data }));
  const prisma = {
    importJob: { findUnique: vi.fn().mockResolvedValue(existing) },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback) =>
        callback({ importJob: { create }, auditLog: { create: vi.fn() } }),
      ),
  };
  return { transfers: new CatalogueTransferService(prisma as never), create };
}

describe("catalogue CSV staging", () => {
  it("retains valid rows for a separate idempotent commit", async () => {
    const { transfers, create } = service();
    const csv =
      "name,slug,sku,description,retailPrice,b2bPrice,moq,packMultiple,category,imageUrl\nVerdant Ring,verdant-ring,GJ-100,A considered verdant ring,120.00,90.00,1,1,Rings,https://example.test/ring.jpg\n";
    const result = await transfers.stage(csv, "import-key-100", "admin-1");
    expect(result).toEqual(
      expect.objectContaining({
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        status: "PENDING",
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: [expect.objectContaining({ sku: "GJ-100" })],
        }),
      }),
    );
  });

  it("returns an existing job for the same idempotency key", async () => {
    const existing = { id: "existing", idempotencyKey: "same-key" };
    const { transfers, create } = service(existing);
    await expect(
      transfers.stage("ignored", "same-key", "admin-1"),
    ).resolves.toBe(existing);
    expect(create).not.toHaveBeenCalled();
  });
});
