import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string) {
    const data = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      data,
      total: data.length,
      unread: data.filter((item) => !item.readAt).length,
    };
  }
  create(input: {
    userId: string;
    kind: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data: input });
  }
  async read(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException("Notification was not found");
    return { success: true };
  }
  async readAll(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, updated: result.count };
  }
}
