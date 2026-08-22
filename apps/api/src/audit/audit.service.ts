import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

type AuditEntry = {
  actorId?: string;
  event: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }

  async list(limit = 100, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 250);
    const data = await this.prisma.auditLog.findMany({
      include: { actor: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = data.length > take;
    if (hasMore) data.pop();
    return {
      data,
      nextCursor: hasMore ? data.at(-1)?.id ?? null : null,
    };
  }
}
