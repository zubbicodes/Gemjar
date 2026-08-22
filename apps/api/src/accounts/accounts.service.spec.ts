import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountsService } from "./accounts.service";

const organization = {
  id: "org-1",
  name: "North & Finch",
  status: "APPROVED",
  catalogueRestricted: false,
  memberships: [],
  addresses: [],
};
const actor = (
  kind: AuthenticatedUser["kind"],
  id = "user-1",
  permissions: string[] = [],
): AuthenticatedUser => ({
  id,
  email: `${id}@test.local`,
  firstName: "Test",
  lastName: "User",
  kind,
  permissions,
  sessionId: "session-1",
});

function service(
  overrides: { membership?: boolean | "VIEWER"; assignment?: boolean } = {},
) {
  const prisma = {
    organizationMembership: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.membership
            ? { role: overrides.membership === "VIEWER" ? "VIEWER" : "BUYER" }
            : null,
        ),
    },
    agentCustomerAssignment: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides.assignment ? { id: "assignment-1" } : null,
        ),
    },
    organization: { findUnique: vi.fn().mockResolvedValue(organization) },
  };
  return {
    accounts: new AccountsService(
      prisma as never,
      { record: vi.fn() } as never,
    ),
    prisma,
  };
}

describe("organization resource authorization", () => {
  it("creates verification email atomically with a public trade application", async () => {
    const transaction = {
      user: { create: vi.fn().mockResolvedValue({ id: "owner-1" }) },
      organization: {
        create: vi.fn().mockResolvedValue({ ...organization, status: "PENDING" }),
      },
      securityToken: { create: vi.fn().mockResolvedValue({ id: "token-1" }) },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    };
    const accounts = new AccountsService(
      prisma as never,
      { record: vi.fn() } as never,
    );

    await accounts.apply({
      companyName: "North & Finch",
      firstName: "Priya",
      lastName: "Shah",
      email: "priya@test.local",
      password: "TradePassword1",
    });

    expect(transaction.securityToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner-1",
        type: "EMAIL_VERIFICATION",
      }),
    });
    expect(transaction.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aggregate: "SecurityToken",
        type: "NOTIFICATION_EMAIL",
        payload: expect.objectContaining({ email: "priya@test.local" }),
      }),
    });
  });

  it("notifies every member when trade application status changes", async () => {
    const before = {
      ...organization,
      status: "PENDING",
      memberships: [
        { user: { id: "owner-1", email: "owner@test.local" } },
        { user: { id: "buyer-2", email: "buyer@test.local" } },
      ],
    };
    const notification = { create: vi.fn() };
    notification.create
      .mockResolvedValueOnce({ id: "notice-1" })
      .mockResolvedValueOnce({ id: "notice-2" });
    const outboxEvent = { create: vi.fn().mockResolvedValue({}) };
    const transaction = {
      organization: {
        update: vi.fn().mockResolvedValue({ ...before, status: "APPROVED" }),
      },
      notification,
      outboxEvent,
    };
    const prisma = {
      organization: { findUnique: vi.fn().mockResolvedValue(before) },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    };
    const accounts = new AccountsService(
      prisma as never,
      { record: vi.fn() } as never,
    );

    await accounts.updateStatus(actor("ADMIN"), "org-1", "APPROVED");

    expect(notification.create).toHaveBeenCalledTimes(2);
    expect(outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aggregate: "Notification",
          type: "NOTIFICATION_EMAIL",
          payload: expect.objectContaining({ email: "owner@test.local" }),
        }),
      }),
    );
  });

  it("creates an approved organization and owner from the admin workflow", async () => {
    const created = {
      ...organization,
      accountNumber: "GJ-TRADE-002",
      status: "APPROVED",
    };
    const transaction = {
      user: { create: vi.fn().mockResolvedValue({ id: "owner-2" }) },
      organization: { create: vi.fn().mockResolvedValue(created) },
      securityToken: { create: vi.fn().mockResolvedValue({ id: "token-1" }) },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      organization: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    };
    const audit = { record: vi.fn() };
    const accounts = new AccountsService(prisma as never, audit as never);

    await expect(
      accounts.createOrganization(actor("ADMIN", "admin-1"), {
        companyName: "Stone House",
        firstName: "Ava",
        lastName: "Reed",
        email: " AVA@EXAMPLE.TEST ",
        password: "Temporary123!",
        accountNumber: "gj-trade-002",
        paymentTermsDays: 30,
        poRequired: true,
        creditLimitMinor: 100000,
        catalogueRestricted: false,
      }),
    ).resolves.toEqual(created);
    expect(transaction.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "ava@example.test",
        kind: "B2B",
        emailVerifiedAt: expect.any(Date),
      }),
    });
    expect(transaction.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountNumber: "GJ-TRADE-002",
          status: "APPROVED",
          memberships: { create: { userId: "owner-2", role: "OWNER" } },
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: "ORGANIZATION_CREATED" }),
    );
  });

  it("allows a B2B member to access their organization", async () => {
    const { accounts } = service({ membership: true });
    await expect(
      accounts.getOrganization(actor("B2B"), "org-1"),
    ).resolves.toEqual(organization);
  });

  it("rejects a B2B member crossing organization boundaries", async () => {
    const { accounts } = service();
    await expect(
      accounts.getOrganization(actor("B2B"), "org-2"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows only explicitly assigned agent customers", async () => {
    const assigned = service({ assignment: true });
    await expect(
      assigned.accounts.getOrganization(actor("AGENT", "agent-1"), "org-1"),
    ).resolves.toEqual(organization);
    const unassigned = service();
    await expect(
      unassigned.accounts.getOrganization(actor("AGENT", "agent-1"), "org-2"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an administrator with customer read permission", async () => {
    const { accounts, prisma } = service();
    await expect(
      accounts.getOrganization(
        actor("ADMIN", "admin-1", ["customers:read"]),
        "org-1",
      ),
    ).resolves.toEqual(organization);
    expect(prisma.organizationMembership.findUnique).not.toHaveBeenCalled();
  });

  it("allows buyers but prevents viewers from changing commerce state", async () => {
    const buyer = service({ membership: true });
    await expect(
      buyer.accounts.assertCanOrder(actor("B2B"), "org-1"),
    ).resolves.toMatchObject({ membership: { role: "BUYER" } });
    const viewer = service({ membership: "VIEWER" });
    await expect(
      viewer.accounts.assertCanOrder(actor("B2B"), "org-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
