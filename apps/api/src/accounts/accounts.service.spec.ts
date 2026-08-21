import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountsService } from "./accounts.service";

const organization = { id: "org-1", name: "North & Finch", status: "APPROVED", catalogueRestricted: false, memberships: [], addresses: [] };
const actor = (kind: AuthenticatedUser["kind"], id = "user-1", permissions: string[] = []): AuthenticatedUser => ({ id, email: `${id}@test.local`, firstName: "Test", lastName: "User", kind, permissions, sessionId: "session-1" });

function service(overrides: { membership?: boolean | "VIEWER"; assignment?: boolean } = {}) {
  const prisma = {
    organizationMembership: { findUnique: vi.fn().mockResolvedValue(overrides.membership ? { role: overrides.membership === "VIEWER" ? "VIEWER" : "BUYER" } : null) },
    agentCustomerAssignment: { findFirst: vi.fn().mockResolvedValue(overrides.assignment ? { id: "assignment-1" } : null) },
    organization: { findUnique: vi.fn().mockResolvedValue(organization) },
  };
  return { accounts: new AccountsService(prisma as never, { record: vi.fn() } as never), prisma };
}

describe("organization resource authorization", () => {
  it("allows a B2B member to access their organization", async () => {
    const { accounts } = service({ membership: true });
    await expect(accounts.getOrganization(actor("B2B"), "org-1")).resolves.toEqual(organization);
  });

  it("rejects a B2B member crossing organization boundaries", async () => {
    const { accounts } = service();
    await expect(accounts.getOrganization(actor("B2B"), "org-2")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows only explicitly assigned agent customers", async () => {
    const assigned = service({ assignment: true });
    await expect(assigned.accounts.getOrganization(actor("AGENT", "agent-1"), "org-1")).resolves.toEqual(organization);
    const unassigned = service();
    await expect(unassigned.accounts.getOrganization(actor("AGENT", "agent-1"), "org-2")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an administrator with customer read permission", async () => {
    const { accounts, prisma } = service();
    await expect(accounts.getOrganization(actor("ADMIN", "admin-1", ["customers:read"]), "org-1")).resolves.toEqual(organization);
    expect(prisma.organizationMembership.findUnique).not.toHaveBeenCalled();
  });

  it("allows buyers but prevents viewers from changing commerce state", async () => {
    const buyer = service({ membership: true });
    await expect(buyer.accounts.assertCanOrder(actor("B2B"), "org-1")).resolves.toMatchObject({ membership: { role: "BUYER" } });
    const viewer = service({ membership: "VIEWER" });
    await expect(viewer.accounts.assertCanOrder(actor("B2B"), "org-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
