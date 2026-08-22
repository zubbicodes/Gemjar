import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OrganizationRole,
  OrganizationStatus,
  Prisma,
  UserKind,
} from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

const organizationInclude = {
  memberships: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kind: true,
        },
      },
    },
  },
  addresses: true,
} as const;

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async apply(input: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const verificationToken = randomBytes(32).toString("base64url");
    if (
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
    )
      throw new ConflictException(
        "An account already exists for this email address",
      );
    const result = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: await argon2.hash(input.password, {
            type: argon2.argon2id,
          }),
          kind: UserKind.B2B,
        },
      });
      const organization = await transaction.organization.create({
        data: {
          name: input.companyName.trim(),
          memberships: {
            create: { userId: user.id, role: OrganizationRole.OWNER },
          },
        },
        include: organizationInclude,
      });
      const token = await transaction.securityToken.create({
        data: {
          userId: user.id,
          type: "EMAIL_VERIFICATION",
          tokenHash: createHash("sha256")
            .update(
              `${process.env.COOKIE_SECRET || "local-cookie-secret"}:${verificationToken}`,
            )
            .digest("hex"),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          aggregate: "SecurityToken",
          aggregateId: token.id,
          type: "NOTIFICATION_EMAIL",
          payload: {
            email,
            subject: "Verify your Gemjar trade email",
            message: `Verify your email: ${process.env.WEB_URL || "http://localhost:3000"}/verify-email?token=${encodeURIComponent(verificationToken)}`,
          },
        },
      });
      return { user, organization };
    });
    await this.audit.record({
      actorId: result.user.id,
      event: "ORGANIZATION_APPLIED",
      entityType: "Organization",
      entityId: result.organization.id,
      after: {
        status: result.organization.status,
        name: result.organization.name,
      },
    });
    return {
      applicationId: result.organization.id,
      status: result.organization.status,
      verificationRequired: true,
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { verificationToken }),
    };
  }

  async createOrganization(
    actor: AuthenticatedUser,
    input: {
      companyName: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      accountNumber?: string;
      paymentTermsDays: number;
      poRequired: boolean;
      creditLimitMinor?: number;
      catalogueRestricted: boolean;
    },
  ) {
    const email = input.email.trim().toLowerCase();
    const accountNumber =
      input.accountNumber?.trim().toUpperCase() || undefined;
    const [existingUser, existingOrganization] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      accountNumber
        ? this.prisma.organization.findUnique({
            where: { accountNumber },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    if (existingUser)
      throw new ConflictException(
        "An account already exists for this email address",
      );
    if (existingOrganization)
      throw new ConflictException(
        "An organization already uses this account number",
      );

    const organization = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: await argon2.hash(input.password, {
            type: argon2.argon2id,
          }),
          kind: UserKind.B2B,
          emailVerifiedAt: new Date(),
        },
      });
      return transaction.organization.create({
        data: {
          name: input.companyName.trim(),
          accountNumber,
          status: OrganizationStatus.APPROVED,
          paymentTermsDays: input.paymentTermsDays,
          poRequired: input.poRequired,
          creditLimitMinor: input.creditLimitMinor,
          catalogueRestricted: input.catalogueRestricted,
          memberships: {
            create: { userId: user.id, role: OrganizationRole.OWNER },
          },
        },
        include: organizationInclude,
      });
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_CREATED",
      entityType: "Organization",
      entityId: organization.id,
      after: {
        name: organization.name,
        accountNumber,
        status: organization.status,
      },
    });
    return organization;
  }

  async listOrganizations() {
    const data = await this.prisma.organization.findMany({
      include: organizationInclude,
      orderBy: { createdAt: "desc" },
    });
    return { data, total: data.length };
  }

  async currentOrganizations(userId: string) {
    const data = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: { include: organizationInclude } },
    });
    return {
      data: data.map(({ organization, role }) => ({
        ...organization,
        membershipRole: role,
      })),
    };
  }

  async getOrganization(actor: AuthenticatedUser, organizationId: string) {
    await this.assertCanAccess(actor, organizationId);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: organizationInclude,
    });
    if (!organization)
      throw new NotFoundException("Organization was not found");
    return organization;
  }

  async updateStatus(
    actor: AuthenticatedUser,
    organizationId: string,
    status: OrganizationStatus,
  ) {
    const before = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
    if (!before) throw new NotFoundException("Organization was not found");
    if (before.status === status) return before;
    const organization = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.organization.update({
        where: { id: organizationId },
        data: { status },
      });
      const title = `${before.name} application ${status.toLowerCase()}`;
      const message = `Your trade account application is now ${status.toLowerCase()}.`;
      for (const { user } of before.memberships) {
        const notification = await transaction.notification.create({
          data: {
            userId: user.id,
            kind: "ACCOUNT",
            title,
            message,
            link: "/trade",
          },
        });
        await this.queueEmail(
          transaction,
          notification.id,
          user.email,
          title,
          message,
        );
      }
      return updated;
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_STATUS_UPDATED",
      entityType: "Organization",
      entityId: organizationId,
      before: { status: before.status },
      after: { status },
    });
    return organization;
  }

  async updateTerms(
    actor: AuthenticatedUser,
    organizationId: string,
    input: {
      paymentTermsDays: number;
      poRequired: boolean;
      creditLimitMinor?: number | null;
      catalogueRestricted: boolean;
      vatDisplay: "EXCLUSIVE" | "INCLUSIVE";
    },
  ) {
    const before = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!before) throw new NotFoundException("Organization was not found");
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        paymentTermsDays: input.paymentTermsDays,
        poRequired: input.poRequired,
        creditLimitMinor: input.creditLimitMinor ?? null,
        catalogueRestricted: input.catalogueRestricted,
        vatDisplay: input.vatDisplay,
      },
      include: organizationInclude,
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_TERMS_UPDATED",
      entityType: "Organization",
      entityId: organizationId,
      before: {
        paymentTermsDays: before.paymentTermsDays,
        poRequired: before.poRequired,
        creditLimitMinor: before.creditLimitMinor,
        catalogueRestricted: before.catalogueRestricted,
        vatDisplay: before.vatDisplay,
      },
      after: input,
    });
    return organization;
  }

  private queueEmail(
    transaction: Prisma.TransactionClient,
    notificationId: string,
    email: string,
    subject: string,
    message: string,
  ) {
    return transaction.outboxEvent.create({
      data: {
        aggregate: "Notification",
        aggregateId: notificationId,
        type: "NOTIFICATION_EMAIL",
        payload: { email, subject, message },
      },
    });
  }

  async addMember(
    actor: AuthenticatedUser,
    organizationId: string,
    emailInput: string,
    role: OrganizationRole,
  ) {
    await this.assertCanAdministerOrganization(actor, organizationId);
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
    });
    if (!user)
      throw new NotFoundException(
        "Invite the user to create an account before adding membership",
      );
    const membership = await this.prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId } },
      update: { role },
      create: { userId: user.id, organizationId, role },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_MEMBER_UPSERTED",
      entityType: "OrganizationMembership",
      entityId: `${user.id}:${organizationId}`,
      after: { role },
    });
    return membership;
  }

  async removeMember(
    actor: AuthenticatedUser,
    organizationId: string,
    userId: string,
  ) {
    await this.assertCanAdministerOrganization(actor, organizationId);
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership)
      throw new NotFoundException("Organization member was not found");
    if (membership.role === OrganizationRole.OWNER) {
      const owners = await this.prisma.organizationMembership.count({
        where: { organizationId, role: OrganizationRole.OWNER },
      });
      if (owners <= 1)
        throw new ConflictException(
          "The last organization owner cannot be removed",
        );
    }
    await this.prisma.organizationMembership.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_MEMBER_REMOVED",
      entityType: "OrganizationMembership",
      entityId: `${userId}:${organizationId}`,
      before: { role: membership.role },
    });
    return { success: true };
  }

  async addOrganizationAddress(
    actor: AuthenticatedUser,
    organizationId: string,
    input: {
      label: string;
      recipient: string;
      line1: string;
      line2?: string;
      city: string;
      county?: string;
      postcode: string;
    },
  ) {
    await this.assertCanAdministerOrganization(actor, organizationId);
    const address = await this.prisma.address.create({
      data: {
        organizationId,
        label: input.label.trim(),
        recipient: input.recipient.trim(),
        line1: input.line1.trim(),
        line2: input.line2?.trim() || null,
        city: input.city.trim(),
        county: input.county?.trim() || null,
        postcode: input.postcode.trim().toUpperCase(),
        countryCode: "GB",
      },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_ADDRESS_CREATED",
      entityType: "Address",
      entityId: address.id,
      after: {
        organizationId,
        label: address.label,
        postcode: address.postcode,
      },
    });
    return address;
  }

  async removeOrganizationAddress(
    actor: AuthenticatedUser,
    organizationId: string,
    addressId: string,
  ) {
    await this.assertCanAdministerOrganization(actor, organizationId);
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, organizationId },
    });
    if (!address)
      throw new NotFoundException("Organization address was not found");
    await this.prisma.address.delete({ where: { id: addressId } });
    await this.audit.record({
      actorId: actor.id,
      event: "ORGANIZATION_ADDRESS_DELETED",
      entityType: "Address",
      entityId: addressId,
      before: {
        organizationId,
        label: address.label,
        postcode: address.postcode,
      },
    });
    return { success: true };
  }

  async listAgents() {
    const data = await this.prisma.salesAgent.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignments: { include: { organization: true } },
      },
      orderBy: { code: "asc" },
    });
    return { data, total: data.length };
  }

  async createAgent(
    actor: AuthenticatedUser,
    input: {
      email: string;
      code: string;
      firstName: string;
      lastName: string;
      password: string;
    },
  ) {
    const email = input.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { agent: true },
    });
    if (!user)
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: await argon2.hash(input.password, {
            type: argon2.argon2id,
          }),
          kind: UserKind.AGENT,
          emailVerifiedAt: new Date(),
          mfaRequired: true,
        },
        include: { agent: true },
      });
    if (user.agent)
      throw new ConflictException("This user already has an agent profile");
    const agent = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { kind: UserKind.AGENT, mfaRequired: true },
      });
      return transaction.salesAgent.create({
        data: { userId: user.id, code: input.code.trim().toUpperCase() },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
    });
    await this.audit.record({
      actorId: actor.id,
      event: "AGENT_CREATED",
      entityType: "SalesAgent",
      entityId: agent.id,
      after: { code: agent.code, userId: agent.userId },
    });
    return agent;
  }

  async unassignAgent(
    actor: AuthenticatedUser,
    agentId: string,
    organizationId: string,
  ) {
    const assignment = await this.prisma.agentCustomerAssignment.findUnique({
      where: { agentId_organizationId: { agentId, organizationId } },
    });
    if (!assignment)
      throw new NotFoundException("Agent assignment was not found");
    const updated = await this.prisma.agentCustomerAssignment.update({
      where: { id: assignment.id },
      data: { active: false, unassignedAt: new Date() },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "AGENT_CUSTOMER_UNASSIGNED",
      entityType: "AgentCustomerAssignment",
      entityId: assignment.id,
      before: { active: assignment.active },
      after: { active: false, agentId, organizationId },
    });
    return updated;
  }

  async assignAgent(
    actor: AuthenticatedUser,
    agentId: string,
    organizationId: string,
  ) {
    const assignment = await this.prisma.agentCustomerAssignment.upsert({
      where: { agentId_organizationId: { agentId, organizationId } },
      update: { active: true, unassignedAt: null, assignedAt: new Date() },
      create: { agentId, organizationId },
      include: { organization: true },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "AGENT_CUSTOMER_ASSIGNED",
      entityType: "AgentCustomerAssignment",
      entityId: assignment.id,
      after: { agentId, organizationId },
    });
    return assignment;
  }

  async assignedCustomers(actor: AuthenticatedUser) {
    const agent = await this.prisma.salesAgent.findUnique({
      where: { userId: actor.id },
    });
    if (!agent || !agent.active)
      throw new ForbiddenException("An active sales-agent profile is required");
    const data = await this.prisma.agentCustomerAssignment.findMany({
      where: {
        agentId: agent.id,
        active: true,
        organization: { status: OrganizationStatus.APPROVED },
      },
      include: {
        organization: {
          include: {
            addresses: true,
            orders: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        },
      },
      orderBy: { organization: { name: "asc" } },
    });
    return {
      data: data.map(({ organization, assignedAt }) => ({
        ...organization,
        assignedAt,
      })),
    };
  }

  async assignedCustomer(actor: AuthenticatedUser, organizationId: string) {
    if (actor.kind !== UserKind.AGENT)
      throw new ForbiddenException("Sales-agent access is required");
    return this.getOrganization(actor, organizationId);
  }

  async assertCanAccess(actor: AuthenticatedUser, organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        status: true,
        catalogueRestricted: true,
        poRequired: true,
        paymentTermsDays: true,
        creditLimitMinor: true,
      },
    });
    if (!organization)
      throw new NotFoundException("Organization was not found");
    if (actor.permissions.includes("customers:read")) return organization;
    if (
      actor.kind === UserKind.B2B &&
      (await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: actor.id, organizationId } },
      }))
    )
      return organization;
    if (
      actor.kind === UserKind.AGENT &&
      (await this.prisma.agentCustomerAssignment.findFirst({
        where: {
          organizationId,
          active: true,
          agent: { userId: actor.id, active: true },
        },
      }))
    )
      return organization;
    throw new ForbiddenException(
      "You do not have access to this customer organization",
    );
  }

  async assertCanOrder(actor: AuthenticatedUser, organizationId: string) {
    const organization = await this.assertApprovedAccess(
      actor,
      organizationId,
    );
    if (actor.kind === UserKind.B2B) {
      const membership = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: actor.id, organizationId } },
      });
      if (!membership || membership.role === OrganizationRole.VIEWER)
        throw new ForbiddenException(
          "Viewer memberships cannot change baskets or submit orders",
        );
      return { organization, membership, agentId: undefined };
    }
    if (actor.kind === UserKind.AGENT) {
      const assignment = await this.prisma.agentCustomerAssignment.findFirst({
        where: {
          organizationId,
          active: true,
          agent: { userId: actor.id, active: true },
        },
        include: { agent: true },
      });
      if (!assignment)
        throw new ForbiddenException(
          "The customer is not assigned to this sales agent",
        );
      return {
        organization,
        membership: undefined,
        agentId: assignment.agentId,
      };
    }
    if (actor.permissions.includes("orders:update"))
      return { organization, membership: undefined, agentId: undefined };
    throw new ForbiddenException("Ordering access is required");
  }

  async assertApprovedAccess(
    actor: AuthenticatedUser,
    organizationId: string,
  ) {
    const organization = await this.assertCanAccess(actor, organizationId);
    if (organization.status !== OrganizationStatus.APPROVED)
      throw new ForbiddenException(
        "The organization is not approved for trade access",
      );
    return organization;
  }

  private async assertCanAdministerOrganization(
    actor: AuthenticatedUser,
    organizationId: string,
  ) {
    if (actor.permissions.includes("customers:update")) return;
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: actor.id, organizationId } },
    });
    if (membership?.role !== OrganizationRole.OWNER)
      throw new ForbiddenException(
        "Only an organization owner or authorized administrator can manage this account",
      );
  }
}
