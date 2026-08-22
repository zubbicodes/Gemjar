import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { IntegrationStatus, JobStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { MintsoftProvider } from "./mintsoft.provider";
import { SettingsService } from "../settings/settings.service";
import { SageMockProvider } from "./sage-mock.provider";
const OPEN_STATUSES = [
  JobStatus.PENDING,
  JobStatus.PROCESSING,
  JobStatus.RETRYING,
] as const;

/**
 * Read model for the integration centre. Every figure comes from
 * IntegrationConnection/IntegrationJob rows, so the dashboard reflects what the
 * worker actually did rather than an assumed healthy state.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mintsoft: MintsoftProvider,
    private readonly settings: SettingsService,
    private readonly sage: SageMockProvider,
  ) {}

  async status() {
    const settings = await this.settings.commerce();
    const connections = await this.prisma.integrationConnection.findMany({
      orderBy: { provider: "asc" },
    });
    const [pending, failed, succeeded] = await Promise.all([
      this.prisma.integrationJob.groupBy({
        by: ["connectionId"],
        _count: true,
        where: { status: { in: [...OPEN_STATUSES] } },
      }),
      this.prisma.integrationJob.groupBy({
        by: ["connectionId"],
        _count: true,
        where: { status: { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] } },
      }),
      this.prisma.integrationJob.groupBy({
        by: ["connectionId"],
        _count: true,
        where: { status: JobStatus.SUCCEEDED },
      }),
    ]);
    const stockCapturedAt = await this.prisma.stockSnapshot.findFirst({
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });
    const data = connections.map((connection) => {
      const succeededCount =
        succeeded.find((row) => row.connectionId === connection.id)?._count ??
        0;
      const failedCount =
        failed.find((row) => row.connectionId === connection.id)?._count ?? 0;
      const total = succeededCount + failedCount;
      return {
        provider: connection.provider,
        status: connection.status,
        lastSuccessAt: connection.lastSuccessAt,
        lastFailureAt: connection.lastFailureAt,
        pending:
          pending.find((row) => row.connectionId === connection.id)?._count ??
          0,
        failed: failedCount,
        succeeded: succeededCount,
        successRate: total ? Math.round((succeededCount / total) * 100) : 100,
      };
    });
    return {
      data,
      stock: {
        capturedAt: stockCapturedAt?.capturedAt ?? null,
        stale: stockCapturedAt
          ? Date.now() - stockCapturedAt.capturedAt.getTime() >
            settings.staleStockMinutes * 60_000
          : true,
        provider: this.mintsoft.stockConfigured
          ? "MINTSOFT"
          : "MINTSOFT_DEMO",
      },
    };
  }

  async jobs(limit = 50, status?: JobStatus) {
    const data = await this.prisma.integrationJob.findMany({
      where: status ? { status } : undefined,
      include: { connection: { select: { provider: true } } },
      orderBy: { updatedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return { data, total: data.length };
  }

  /** Queues a failed job for another attempt; the worker picks it up. */
  async retry(actor: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.integrationJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException("Integration job was not found");
    const updated = await this.prisma.integrationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        nextAttemptAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      event: "INTEGRATION_JOB_RETRIED",
      entityType: "IntegrationJob",
      entityId: jobId,
      before: { status: job.status, attempts: job.attempts },
      after: { status: updated.status },
    });
    return updated;
  }

  /**
   * Refreshes stock snapshots from the inventory provider. Without approved
   * credentials the Mintsoft adapter serves its demo fallback, which is exactly
   * what the deployed demonstration environment runs on.
   */
  async syncStock(actor: AuthenticatedUser) {
    const variants = await this.prisma.productVariant.findMany({
      select: { id: true, sku: true },
    });
    const connection = await this.prisma.integrationConnection.upsert({
      where: { provider: "MINTSOFT" },
      update: {},
      create: {
        provider: "MINTSOFT",
        status: this.mintsoft.stockConfigured
          ? IntegrationStatus.HEALTHY
          : IntegrationStatus.DEGRADED,
      },
    });
    const correlationId = `stock-${Date.now()}`;
    const job = await this.prisma.integrationJob.create({
      data: {
        connectionId: connection.id,
        type: "STOCK_SYNC",
        status: JobStatus.PROCESSING,
        correlationId,
        idempotencyKey: correlationId,
        payload: { skus: variants.length },
        attempts: 1,
      },
    });
    try {
      const availability = await this.mintsoft.getAvailability(
        variants.map((variant) => variant.sku),
      );
      const capturedAt = new Date();
      await this.prisma.$transaction(
        availability.flatMap((entry) => {
          const variant = variants.find((row) => row.sku === entry.sku);
          return variant
            ? [
                this.prisma.stockSnapshot.create({
                  data: {
                    variantId: variant.id,
                    available: entry.available,
                    capturedAt,
                    provider: this.mintsoft.stockConfigured
                      ? "MINTSOFT"
                      : "MINTSOFT_DEMO",
                  },
                }),
              ]
            : [];
        }),
      );
      await this.prisma.integrationJob.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCEEDED },
      });
      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { lastSuccessAt: capturedAt },
      });
      await this.audit.record({
        actorId: actor.id,
        event: "INTEGRATION_STOCK_SYNCED",
        entityType: "IntegrationConnection",
        entityId: connection.id,
        after: { updated: availability.length, correlationId },
      });
      return {
        updated: availability.length,
        capturedAt: capturedAt.toISOString(),
        correlationId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stock synchronization failed";
      await this.prisma.integrationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorCode: "STOCK_SYNC_FAILED",
          errorMessage: message,
        },
      });
      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { lastFailureAt: new Date(), status: IntegrationStatus.DEGRADED },
      });
      throw error;
    }
  }

  async syncInvoices(actor: AuthenticatedUser) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.SAGE_PROVIDER !== "mock"
    )
      throw new ServiceUnavailableException(
        "Sage live integration is disabled; use approved structured file exchange",
      );
    const connection = await this.prisma.integrationConnection.upsert({
      where: { provider: "SAGE_50" },
      update: {},
      create: { provider: "SAGE_50", status: IntegrationStatus.DEGRADED },
    });
    const correlationId = `invoice-${Date.now()}`;
    const job = await this.prisma.integrationJob.create({
      data: {
        connectionId: connection.id,
        type: "INVOICE_PULL",
        status: JobStatus.PROCESSING,
        correlationId,
        idempotencyKey: correlationId,
        payload: {},
        attempts: 1,
      },
    });
    try {
      const orders = await this.prisma.order.findMany({
        where: { status: { not: "DRAFT" }, invoice: null },
        select: {
          id: true,
          number: true,
          totalMinor: true,
          organizationId: true,
          userId: true,
          createdAt: true,
        },
      });
      for (const order of orders) {
        const customerId = order.organizationId ?? order.userId ?? order.id;
        const [providerInvoice] = await this.sage.listInvoices(customerId);
        await this.prisma.invoiceReference.upsert({
          where: { orderId: order.id },
          update: {},
          create: {
            orderId: order.id,
            number: `${providerInvoice?.number ?? "SI"}-${order.number.replace(/\D/g, "").slice(-6)}`,
            totalMinor: order.totalMinor,
            issuedAt: new Date(),
            externalId: `${providerInvoice?.id ?? "sage"}-${order.id}`,
          },
        });
      }
      const finished = new Date();
      await this.prisma.$transaction([
        this.prisma.integrationJob.update({
          where: { id: job.id },
          data: { status: JobStatus.SUCCEEDED },
        }),
        this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: { status: IntegrationStatus.HEALTHY, lastSuccessAt: finished },
        }),
      ]);
      await this.audit.record({
        actorId: actor.id,
        event: "INTEGRATION_INVOICES_SYNCED",
        entityType: "IntegrationConnection",
        entityId: connection.id,
        after: { created: orders.length, correlationId },
      });
      return { created: orders.length, correlationId };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.integrationJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            errorCode: "INVOICE_SYNC_FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Invoice sync failed",
          },
        }),
        this.prisma.integrationConnection.update({
          where: { id: connection.id },
          data: {
            status: IntegrationStatus.DEGRADED,
            lastFailureAt: new Date(),
          },
        }),
      ]);
      throw error;
    }
  }
}
