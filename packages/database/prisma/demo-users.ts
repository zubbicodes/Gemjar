import {
  OrganizationRole,
  OrganizationStatus,
  PrismaClient,
  UserKind,
} from "@prisma/client";
import * as argon2 from "argon2";

export const DEFAULT_DEMO_PASSWORD = "GemjarDemo!2026";

const ADMIN_PERMISSIONS = [
  "catalogue:read",
  "catalogue:create",
  "catalogue:update",
  "pricing:read",
  "pricing:update",
  "customers:read",
  "customers:create",
  "customers:update",
  "agents:read",
  "agents:create",
  "agents:update",
  "orders:read",
  "orders:update",
  "fulfilment:read",
  "fulfilment:update",
  "finance:read",
  "finance:refund",
  "integrations:read",
  "integrations:retry",
  "audit:read",
  "settings:update",
];

export const TRADE_ACCOUNT_NUMBER = "GJ-TRADE-001";

export function demoPassword() {
  return process.env.DEMO_USER_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD;
}

async function seedAdministratorRole(prisma: PrismaClient) {
  const permissionIds: string[] = [];
  for (const pair of ADMIN_PERMISSIONS) {
    const [resource, action] = pair.split(":") as [string, string];
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
    permissionIds.push(permission.id);
  }
  const role = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: { description: "Full Gemjar platform administration" },
    create: {
      name: "Administrator",
      description: "Full Gemjar platform administration",
    },
  });
  for (const permissionId of permissionIds)
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId } },
      update: {},
      create: { roleId: role.id, permissionId },
    });
  return role;
}

/**
 * Creates the demonstration accounts every environment needs to be walked
 * through. Idempotent: safe to run on every deployment, and it never touches
 * catalogue, pricing, or order data, so demonstration edits survive a redeploy.
 */
export async function seedDemoUsers(prisma: PrismaClient) {
  const passwordHash = await argon2.hash(demoPassword(), {
    type: argon2.argon2id,
  });
  const verifiedAt = new Date();
  const role = await seedAdministratorRole(prisma);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gemjar.test" },
    update: {
      passwordHash,
      firstName: "Amara",
      lastName: "Morgan",
      kind: UserKind.ADMIN,
      emailVerifiedAt: verifiedAt,
      mfaRequired: true,
    },
    create: {
      email: "admin@gemjar.test",
      passwordHash,
      firstName: "Amara",
      lastName: "Morgan",
      kind: UserKind.ADMIN,
      emailVerifiedAt: verifiedAt,
      mfaRequired: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  });

  await prisma.user.upsert({
    where: { email: "customer@gemjar.test" },
    update: {
      passwordHash,
      kind: UserKind.CONSUMER,
      emailVerifiedAt: verifiedAt,
    },
    create: {
      email: "customer@gemjar.test",
      passwordHash,
      firstName: "Maya",
      lastName: "Hart",
      kind: UserKind.CONSUMER,
      emailVerifiedAt: verifiedAt,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "buyer@gemjar.test" },
    update: { passwordHash, kind: UserKind.B2B, emailVerifiedAt: verifiedAt },
    create: {
      email: "buyer@gemjar.test",
      passwordHash,
      firstName: "Priya",
      lastName: "Shah",
      kind: UserKind.B2B,
      emailVerifiedAt: verifiedAt,
    },
  });
  const organization = await prisma.organization.upsert({
    where: { accountNumber: TRADE_ACCOUNT_NUMBER },
    update: {
      name: "North & Finch",
      status: OrganizationStatus.APPROVED,
      catalogueRestricted: true,
    },
    create: {
      name: "North & Finch",
      accountNumber: TRADE_ACCOUNT_NUMBER,
      status: OrganizationStatus.APPROVED,
      paymentTermsDays: 30,
      poRequired: true,
      creditLimitMinor: 250000,
      catalogueRestricted: true,
    },
  });
  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: organization.id,
      },
    },
    update: { role: OrganizationRole.OWNER },
    create: {
      userId: owner.id,
      organizationId: organization.id,
      role: OrganizationRole.OWNER,
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@gemjar.test" },
    update: {
      passwordHash,
      kind: UserKind.AGENT,
      emailVerifiedAt: verifiedAt,
      mfaRequired: true,
    },
    create: {
      email: "agent@gemjar.test",
      passwordHash,
      firstName: "Theo",
      lastName: "Bennett",
      kind: UserKind.AGENT,
      emailVerifiedAt: verifiedAt,
      mfaRequired: true,
    },
  });
  const agent = await prisma.salesAgent.upsert({
    where: { userId: agentUser.id },
    update: { active: true },
    create: { userId: agentUser.id, code: "AG-001" },
  });
  await prisma.agentCustomerAssignment.upsert({
    where: {
      agentId_organizationId: {
        agentId: agent.id,
        organizationId: organization.id,
      },
    },
    update: { active: true, unassignedAt: null },
    create: { agentId: agent.id, organizationId: organization.id },
  });

  if (
    !(await prisma.address.count({
      where: { organizationId: organization.id },
    }))
  )
    await prisma.address.create({
      data: {
        organizationId: organization.id,
        label: "Head office",
        recipient: "North & Finch",
        line1: "18 Walcot Street",
        city: "Bath",
        postcode: "BA1 5BD",
      },
    });

  return { admin, agentUser, owner, organization };
}
