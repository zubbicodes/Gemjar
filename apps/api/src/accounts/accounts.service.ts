import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganizationRole, OrganizationStatus, UserKind } from "@prisma/client";
import * as argon2 from "argon2";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

const organizationInclude = { memberships: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true, kind: true } } } }, addresses: true } as const;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async apply(input: { companyName: string; firstName: string; lastName: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException("An account already exists for this email address");
    const result = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email, firstName: input.firstName.trim(), lastName: input.lastName.trim(), passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }), kind: UserKind.B2B } });
      const organization = await transaction.organization.create({ data: { name: input.companyName.trim(), memberships: { create: { userId: user.id, role: OrganizationRole.OWNER } } }, include: organizationInclude });
      return { user, organization };
    });
    await this.audit.record({ actorId: result.user.id, event: "ORGANIZATION_APPLIED", entityType: "Organization", entityId: result.organization.id, after: { status: result.organization.status, name: result.organization.name } });
    return { applicationId: result.organization.id, status: result.organization.status, verificationRequired: true };
  }

  async listOrganizations() {
    const data = await this.prisma.organization.findMany({ include: organizationInclude, orderBy: { createdAt: "desc" } });
    return { data, total: data.length };
  }

  async currentOrganizations(userId: string) {
    const data = await this.prisma.organizationMembership.findMany({ where: { userId }, include: { organization: { include: { addresses: true } } } });
    return { data: data.map(({ organization, role }) => ({ ...organization, membershipRole: role })) };
  }

  async getOrganization(actor: AuthenticatedUser, organizationId: string) {
    await this.assertCanAccess(actor, organizationId);
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, include: organizationInclude });
    if (!organization) throw new NotFoundException("Organization was not found");
    return organization;
  }

  async updateStatus(actor: AuthenticatedUser, organizationId: string, status: OrganizationStatus) {
    const before = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!before) throw new NotFoundException("Organization was not found");
    const organization = await this.prisma.organization.update({ where: { id: organizationId }, data: { status } });
    await this.audit.record({ actorId: actor.id, event: "ORGANIZATION_STATUS_UPDATED", entityType: "Organization", entityId: organizationId, before: { status: before.status }, after: { status } });
    return organization;
  }

  async addMember(actor: AuthenticatedUser, organizationId: string, emailInput: string, role: OrganizationRole) {
    const canAdminister = actor.permissions.includes("customers:update") || Boolean(await this.prisma.organizationMembership.findFirst({ where: { userId: actor.id, organizationId, role: OrganizationRole.OWNER } }));
    if (!canAdminister) throw new ForbiddenException("Only an organization owner or authorized administrator can manage members");
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
    if (!user) throw new NotFoundException("Invite the user to create an account before adding membership");
    const membership = await this.prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId } }, update: { role }, create: { userId: user.id, organizationId, role }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } });
    await this.audit.record({ actorId: actor.id, event: "ORGANIZATION_MEMBER_UPSERTED", entityType: "OrganizationMembership", entityId: `${user.id}:${organizationId}`, after: { role } });
    return membership;
  }

  async listAgents() {
    const data = await this.prisma.salesAgent.findMany({ include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, assignments: { include: { organization: true } } }, orderBy: { code: "asc" } });
    return { data, total: data.length };
  }

  async createAgent(actor: AuthenticatedUser, emailInput: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() }, include: { agent: true } });
    if (!user) throw new NotFoundException("Create and verify the staff user before assigning an agent profile");
    if (user.agent) throw new ConflictException("This user already has an agent profile");
    const agent = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: user.id }, data: { kind: UserKind.AGENT, mfaRequired: true } });
      return transaction.salesAgent.create({ data: { userId: user.id, code: code.trim().toUpperCase() }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } });
    });
    await this.audit.record({ actorId: actor.id, event: "AGENT_CREATED", entityType: "SalesAgent", entityId: agent.id, after: { code: agent.code, userId: agent.userId } });
    return agent;
  }

  async assignAgent(actor: AuthenticatedUser, agentId: string, organizationId: string) {
    const assignment = await this.prisma.agentCustomerAssignment.upsert({ where: { agentId_organizationId: { agentId, organizationId } }, update: { active: true, unassignedAt: null, assignedAt: new Date() }, create: { agentId, organizationId }, include: { organization: true } });
    await this.audit.record({ actorId: actor.id, event: "AGENT_CUSTOMER_ASSIGNED", entityType: "AgentCustomerAssignment", entityId: assignment.id, after: { agentId, organizationId } });
    return assignment;
  }

  async assignedCustomers(actor: AuthenticatedUser) {
    const agent = await this.prisma.salesAgent.findUnique({ where: { userId: actor.id } });
    if (!agent || !agent.active) throw new ForbiddenException("An active sales-agent profile is required");
    const data = await this.prisma.agentCustomerAssignment.findMany({ where: { agentId: agent.id, active: true, organization: { status: OrganizationStatus.APPROVED } }, include: { organization: { include: { addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 5 } } } }, orderBy: { organization: { name: "asc" } } });
    return { data: data.map(({ organization, assignedAt }) => ({ ...organization, assignedAt })) };
  }

  async assignedCustomer(actor: AuthenticatedUser, organizationId: string) {
    if (actor.kind !== UserKind.AGENT) throw new ForbiddenException("Sales-agent access is required");
    return this.getOrganization(actor, organizationId);
  }

  private async assertCanAccess(actor: AuthenticatedUser, organizationId: string) {
    if (actor.permissions.includes("customers:read")) return;
    if (actor.kind === UserKind.B2B && await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: actor.id, organizationId } } })) return;
    if (actor.kind === UserKind.AGENT && await this.prisma.agentCustomerAssignment.findFirst({ where: { organizationId, active: true, agent: { userId: actor.id, active: true } } })) return;
    throw new ForbiddenException("You do not have access to this customer organization");
  }
}
