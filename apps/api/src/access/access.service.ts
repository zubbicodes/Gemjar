import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async overview() {
    const [roles, permissions, users] = await Promise.all([
      this.prisma.role.findMany({
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      }),
      this.prisma.user.findMany({
        where: { kind: { in: ["ADMIN", "AGENT"] } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kind: true,
          roles: { include: { role: true } },
        },
        orderBy: { email: "asc" },
      }),
    ]);
    return { roles, permissions, users };
  }
  async createRole(
    actorId: string,
    name: string,
    description: string | undefined,
    permissionIds: string[],
  ) {
    const role = await this.prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
    await this.audit.record({
      actorId,
      event: "ROLE_CREATED",
      entityType: "Role",
      entityId: role.id,
      after: { name: role.name, permissionIds },
    });
    return role;
  }
  async assign(actorId: string, userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User was not found");
    const assigned = await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
    await this.audit.record({
      actorId,
      event: "USER_ROLE_ASSIGNED",
      entityType: "User",
      entityId: userId,
      after: { roleId },
    });
    return assigned;
  }
  async unassign(actorId: string, userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });
    if (role?.name === "Administrator") {
      const count = await this.prisma.userRole.count({ where: { roleId } });
      if (count <= 1)
        throw new ConflictException(
          "Last administrator role cannot be removed",
        );
    }
    const result = await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
    if (!result.count)
      throw new NotFoundException("Role assignment was not found");
    await this.audit.record({
      actorId,
      event: "USER_ROLE_UNASSIGNED",
      entityType: "User",
      entityId: userId,
      before: { roleId },
    });
    return { success: true };
  }
}
