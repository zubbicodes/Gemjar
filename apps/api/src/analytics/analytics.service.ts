import { Injectable } from "@nestjs/common";
import {
  Channel,
  FulfilmentStatus,
  JobStatus,
  OrderStatus,
  OrganizationStatus,
  PaymentStatus,
  RequestStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

const STALE_STOCK_MS = 15 * 60_000;

/**
 * Operational dashboard figures. The plan calls for exception-led dashboards,
 * so the headline counts are the things somebody has to act on.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const staleBefore = new Date(Date.now() - STALE_STOCK_MS);
    const live = { status: { not: OrderStatus.DRAFT } } as const;

    const [
      todayTotals,
      monthTotals,
      ordersToday,
      awaitingFulfilment,
      pendingApprovals,
      partiallyShipped,
      stockPending,
      failedJobs,
      paymentIssues,
      openRequests,
      staleStock,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalMinor: true },
        _count: true,
        where: { ...live, createdAt: { gte: dayStart } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalMinor: true },
        _count: true,
        where: { ...live, createdAt: { gte: monthStart } },
      }),
      this.prisma.order.count({
        where: { ...live, createdAt: { gte: dayStart } },
      }),
      this.prisma.order.count({
        where: {
          ...live,
          fulfilmentStatus: {
            in: [
              FulfilmentStatus.UNFULFILLED,
              FulfilmentStatus.PARTIALLY_FULFILLED,
            ],
          },
          status: {
            notIn: [
              OrderStatus.DRAFT,
              OrderStatus.CANCELLED,
              OrderStatus.COMPLETED,
            ],
          },
        },
      }),
      this.prisma.organization.count({
        where: { status: OrganizationStatus.PENDING },
      }),
      this.prisma.order.count({
        where: { fulfilmentStatus: FulfilmentStatus.PARTIALLY_FULFILLED },
      }),
      this.prisma.order.count({
        where: {
          stockConfirmationPending: true,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        },
      }),
      this.prisma.integrationJob.count({
        where: { status: { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] } },
      }),
      this.prisma.order.count({
        where: { ...live, paymentStatus: PaymentStatus.FAILED },
      }),
      this.prisma.serviceRequest.count({
        where: {
          status: { in: [RequestStatus.REQUESTED, RequestStatus.APPROVED] },
        },
      }),
      this.prisma.stockSnapshot.count({
        where: { capturedAt: { lt: staleBefore } },
      }),
    ]);

    const exceptions = [
      {
        key: "STOCK_STALE",
        label: "Stale stock snapshots",
        count: staleStock,
        tone: staleStock ? "warn" : "good",
      },
      {
        key: "B2B_APPROVALS",
        label: "B2B applications pending",
        count: pendingApprovals,
        tone: pendingApprovals ? "neutral" : "good",
      },
      {
        key: "PARTIAL_SHIPMENTS",
        label: "Partial shipments in progress",
        count: partiallyShipped,
        tone: partiallyShipped ? "neutral" : "good",
      },
      {
        key: "STOCK_CONFIRMATION",
        label: "Orders awaiting stock confirmation",
        count: stockPending,
        tone: stockPending ? "warn" : "good",
      },
      {
        key: "INTEGRATION_FAILURES",
        label: "Failed integration jobs",
        count: failedJobs,
        tone: failedJobs ? "warn" : "good",
      },
      {
        key: "PAYMENT_ISSUES",
        label: "Payment failures",
        count: paymentIssues,
        tone: paymentIssues ? "warn" : "good",
      },
      {
        key: "SERVICE_REQUESTS",
        label: "Open return requests",
        count: openRequests,
        tone: openRequests ? "neutral" : "good",
      },
    ];

    return {
      revenue: {
        today: {
          amount: todayTotals._sum.totalMinor ?? 0,
          currency: "GBP" as const,
        },
        monthToDate: {
          amount: monthTotals._sum.totalMinor ?? 0,
          currency: "GBP" as const,
        },
      },
      orders: {
        today: ordersToday,
        monthToDate: monthTotals._count,
        awaitingFulfilment,
      },
      exceptions,
      needsAttention: exceptions.reduce(
        (sum, entry) => sum + (entry.tone === "warn" ? entry.count : 0),
        0,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Channel mix, top products, top customers, and agent performance. */
  async breakdown() {
    const live = { status: { not: OrderStatus.DRAFT } } as const;
    const [byChannel, topItems, topCustomers, byAgent] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["source"],
        _count: true,
        _sum: { totalMinor: true },
        where: live,
      }),
      this.prisma.orderItem.groupBy({
        by: ["skuSnapshot", "nameSnapshot"],
        _sum: { quantity: true, totalMinor: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
        where: { order: live },
      }),
      this.prisma.order.groupBy({
        by: ["organizationId"],
        _count: true,
        _sum: { totalMinor: true },
        where: { ...live, organizationId: { not: null } },
        orderBy: { _sum: { totalMinor: "desc" } },
        take: 5,
      }),
      this.prisma.order.groupBy({
        by: ["agentId"],
        _count: true,
        _sum: { totalMinor: true },
        where: { ...live, agentId: { not: null } },
      }),
    ]);
    const organizations = await this.prisma.organization.findMany({
      where: {
        id: {
          in: topCustomers
            .map((row) => row.organizationId)
            .filter((id): id is string => Boolean(id)),
        },
      },
      select: { id: true, name: true, accountNumber: true },
    });
    const agents = await this.prisma.salesAgent.findMany({
      where: {
        id: {
          in: byAgent
            .map((row) => row.agentId)
            .filter((id): id is string => Boolean(id)),
        },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return {
      channels: byChannel.map((row) => ({
        channel: row.source as Channel,
        orders: row._count,
        revenueMinor: row._sum.totalMinor ?? 0,
      })),
      topProducts: topItems.map((row) => ({
        sku: row.skuSnapshot,
        name: row.nameSnapshot,
        quantity: row._sum.quantity ?? 0,
        revenueMinor: row._sum.totalMinor ?? 0,
      })),
      topCustomers: topCustomers.map((row) => ({
        organization:
          organizations.find((entry) => entry.id === row.organizationId) ??
          null,
        orders: row._count,
        revenueMinor: row._sum.totalMinor ?? 0,
      })),
      agents: byAgent.map((row) => {
        const agent = agents.find((entry) => entry.id === row.agentId);
        return {
          agentId: row.agentId,
          code: agent?.code ?? null,
          name: agent ? `${agent.user.firstName} ${agent.user.lastName}` : null,
          orders: row._count,
          revenueMinor: row._sum.totalMinor ?? 0,
        };
      }),
    };
  }
}
