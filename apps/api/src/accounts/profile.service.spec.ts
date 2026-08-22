import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ProfileService } from "./profile.service";

const actor: AuthenticatedUser = {
  id: "user-1",
  email: "user@test.local",
  firstName: "Test",
  lastName: "User",
  kind: "CONSUMER",
  permissions: [],
  sessionId: "session-1",
};

describe("profile ownership", () => {
  it("does not delete an address outside the signed-in account", async () => {
    const remove = vi.fn();
    const prisma = {
      address: {
        findFirstOrThrow: vi.fn().mockRejectedValue(new NotFoundException()),
        delete: remove,
      },
    };
    const service = new ProfileService(
      prisma as never,
      { record: vi.fn() } as never,
    );
    await expect(
      service.removeAddress(actor, "address-2"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.address.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "address-2", userId: "user-1" },
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
