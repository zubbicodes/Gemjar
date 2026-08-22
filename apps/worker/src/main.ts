import {
  IntegrationStatus,
  JobStatus,
  Prisma,
  PrismaClient,
  ShipmentStatus,
} from "@prisma/client";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

type IntegrationJob = {
  integrationJobId: string;
  provider: "MINTSOFT" | "SAGE_50" | "SES";
  type:
    | "STOCK_SYNC"
    | "ORDER_SUBMIT"
    | "SHIPMENT_PULL"
    | "INVOICE_PULL"
    | "EMAIL_SEND";
  correlationId: string;
  entityId?: string;
};
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const queue = new Queue<IntegrationJob>("gemjar-integrations", {
  connection: queueConnection,
});
const maxAttempts = Number(process.env.INTEGRATION_MAX_ATTEMPTS || 5);
const ses = new SESv2Client({ region: process.env.AWS_REGION || "eu-west-2" });

async function mintsoftRequest(path: string, init?: RequestInit) {
  const baseUrl = process.env.MINTSOFT_BASE_URL;
  const apiKey = process.env.MINTSOFT_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("MINTSOFT_NOT_CONFIGURED");
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ms-apikey": apiKey,
      ...init?.headers,
    },
  });
  if (!response.ok)
    throw new Error(`Mintsoft returned HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

function responseRows(value: unknown) {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["Items", "Products", "Data"])
    if (Array.isArray(record[key]))
      return record[key] as Array<Record<string, unknown>>;
  return [];
}

async function processIntegration(job: Job<IntegrationJob>) {
  const row = await prisma.integrationJob.findUnique({
    where: { id: job.data.integrationJobId },
  });
  if (!row || row.status === JobStatus.SUCCEEDED) return { duplicate: true };
  await prisma.integrationJob.update({
    where: { id: row.id },
    data: {
      status: JobStatus.PROCESSING,
      attempts: { increment: 1 },
      nextAttemptAt: null,
    },
  });
  try {
    if (
      job.data.provider === "SAGE_50" &&
      process.env.NODE_ENV === "production" &&
      process.env.SAGE_PROVIDER === "mock"
    )
      throw new Error("Sage mock provider is prohibited in production");
    let externalId: string | undefined;
    if (job.data.type === "STOCK_SYNC") {
      const variants = await prisma.productVariant.findMany({
        select: { id: true, sku: true },
      });
      let availability = variants.map((variant, index) => ({
        sku: variant.sku,
        available: 12 + index * 7,
      }));
      if (
        job.data.provider === "MINTSOFT" &&
        process.env.MINTSOFT_BASE_URL &&
        process.env.MINTSOFT_API_KEY &&
        process.env.MINTSOFT_STOCK_PATH
      ) {
        const response = await mintsoftRequest(process.env.MINTSOFT_STOCK_PATH, {
          method: "POST",
          body: JSON.stringify({ SKUs: variants.map(({ sku }) => sku) }),
        });
        const rows = responseRows(response);
        availability = variants.map((variant) => {
          const entry = rows.find(
            (candidate) =>
              String(candidate.SKU ?? candidate.Sku ?? candidate.sku) ===
              variant.sku,
          );
          return {
            sku: variant.sku,
            available: Math.max(
              0,
              Number(
                entry?.Available ??
                  entry?.available ??
                  entry?.FreeStock ??
                  0,
              ),
            ),
          };
        });
      }
      const capturedAt = new Date();
      await prisma.stockSnapshot.createMany({
        data: availability.map((entry) => ({
          variantId: variants.find(({ sku }) => sku === entry.sku)!.id,
          available: entry.available,
          capturedAt,
          provider:
            process.env.MINTSOFT_STOCK_PATH && process.env.MINTSOFT_API_KEY
              ? "MINTSOFT"
              : "MINTSOFT_DEMO",
        })),
      });
      externalId = `STOCK-${capturedAt.toISOString()}`;
    }
    if (job.data.type === "ORDER_SUBMIT") {
      if (!job.data.entityId) throw new Error("ORDER_SUBMIT requires entityId");
      if (
        job.data.provider === "MINTSOFT" &&
        process.env.MINTSOFT_BASE_URL &&
        process.env.MINTSOFT_API_KEY &&
        process.env.MINTSOFT_ORDER_PATH
      ) {
        const order = await prisma.order.findUniqueOrThrow({
          where: { id: job.data.entityId },
          include: { items: true },
        });
        const result = (await mintsoftRequest(process.env.MINTSOFT_ORDER_PATH, {
          method: "POST",
          headers: { "Idempotency-Key": row.idempotencyKey },
          body: JSON.stringify({
            OrderNumber: order.number,
            Email: order.email,
            DeliveryAddress: order.deliveryAddress,
            Lines: order.items.map((item) => ({
              SKU: item.skuSnapshot,
              Quantity: item.quantity,
            })),
          }),
        })) as Record<string, unknown>;
        externalId = String(
          result.ID ?? result.Id ?? result.OrderId ?? order.number,
        );
      } else
        externalId = `${job.data.provider}-DEMO-${job.data.entityId.slice(-8).toUpperCase()}`;
      await prisma.externalReference.upsert({
        where: {
          provider_entityType_externalId: {
            provider: job.data.provider,
            entityType: "ORDER",
            externalId,
          },
        },
        update: { orderId: job.data.entityId },
        create: {
          provider: job.data.provider,
          entityType: "ORDER",
          externalId,
          orderId: job.data.entityId,
        },
      });
    }
    if (job.data.type === "EMAIL_SEND") {
      const payload = row.payload as {
        email?: string;
        subject?: string;
        message?: string;
      };
      if (!payload.email || !payload.subject || !payload.message)
        throw new Error("EMAIL_SEND payload is incomplete");
      const shouldSend =
        process.env.NODE_ENV === "production" &&
        Boolean(process.env.SES_FROM_EMAIL);
      if (shouldSend)
        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: process.env.SES_FROM_EMAIL,
            Destination: { ToAddresses: [payload.email] },
            Content: {
              Simple: {
                Subject: { Data: payload.subject },
                Body: { Text: { Data: payload.message } },
              },
            },
          }),
        );
      externalId = shouldSend ? `SES-${row.id}` : `SES-DEMO-${row.id}`;
    }
    if (job.data.type === "INVOICE_PULL") {
      const orders = await prisma.order.findMany({
        where: { status: { not: "DRAFT" }, invoice: null },
        select: { id: true, number: true, totalMinor: true },
      });
      for (const order of orders)
        await prisma.invoiceReference.upsert({
          where: { orderId: order.id },
          update: {},
          create: {
            orderId: order.id,
            number: `SI-${order.number.replace(/\D/g, "").slice(-6)}`,
            totalMinor: order.totalMinor,
            issuedAt: new Date(),
            externalId: `sage-${order.id}`,
          },
        });
      externalId = `INVOICES-${orders.length}`;
    }
    if (job.data.type === "SHIPMENT_PULL") {
      let updates: Array<Record<string, unknown>> = [];
      if (
        process.env.MINTSOFT_BASE_URL &&
        process.env.MINTSOFT_API_KEY &&
        process.env.MINTSOFT_SHIPMENT_PATH
      ) {
        updates = responseRows(
          await mintsoftRequest(process.env.MINTSOFT_SHIPMENT_PATH),
        );
      }
      let applied = 0;
      for (const update of updates) {
        const externalOrderId = String(
          update.OrderId ?? update.OrderID ?? update.orderId ?? "",
        );
        const orderNumber = String(
          update.OrderNumber ?? update.orderNumber ?? "",
        );
        const reference = externalOrderId
          ? await prisma.externalReference.findFirst({
              where: {
                provider: "MINTSOFT",
                entityType: "ORDER",
                externalId: externalOrderId,
              },
            })
          : null;
        const order = reference?.orderId
          ? await prisma.order.findUnique({ where: { id: reference.orderId } })
          : orderNumber
            ? await prisma.order.findUnique({ where: { number: orderNumber } })
            : null;
        if (!order) continue;
        const trackingNumber = String(
          update.TrackingNumber ?? update.trackingNumber ?? "",
        ) || null;
        const rawStatus = String(update.Status ?? update.status ?? "PENDING")
          .toUpperCase()
          .replaceAll(" ", "_");
        const status = Object.values(ShipmentStatus).includes(
          rawStatus as ShipmentStatus,
        )
          ? (rawStatus as ShipmentStatus)
          : ShipmentStatus.PENDING;
        const existing = await prisma.shipment.findFirst({
          where: {
            orderId: order.id,
            ...(trackingNumber ? { trackingNumber } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        const occurredAt = new Date(
          String(update.OccurredAt ?? update.UpdatedAt ?? new Date().toISOString()),
        );
        const shipment = existing
          ? await prisma.shipment.update({
              where: { id: existing.id },
              data: {
                status,
                trackingNumber,
                carrier: String(update.Carrier ?? update.carrier ?? "") || null,
                dispatchedAt:
                  status === ShipmentStatus.DISPATCHED ||
                  status === ShipmentStatus.IN_TRANSIT ||
                  status === ShipmentStatus.DELIVERED
                    ? (existing.dispatchedAt ?? occurredAt)
                    : existing.dispatchedAt,
                deliveredAt:
                  status === ShipmentStatus.DELIVERED
                    ? (existing.deliveredAt ?? occurredAt)
                    : existing.deliveredAt,
              },
            })
          : await prisma.shipment.create({
              data: {
                orderId: order.id,
                status,
                trackingNumber,
                carrier: String(update.Carrier ?? update.carrier ?? "") || null,
                dispatchedAt:
                  status === ShipmentStatus.PENDING ? null : occurredAt,
                deliveredAt:
                  status === ShipmentStatus.DELIVERED ? occurredAt : null,
              },
            });
        await prisma.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status,
            detail: `Mintsoft shipment ${status.toLowerCase().replaceAll("_", " ")}`,
            occurredAt,
          },
        });
        applied++;
      }
      externalId = `SHIPMENTS-${applied}`;
    }
    const completedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.integrationJob.update({
        where: { id: row.id },
        data: {
          status: JobStatus.SUCCEEDED,
          errorCode: null,
          errorMessage: null,
        },
      });
      await transaction.integrationConnection.update({
        where: { id: row.connectionId },
        data: { status: IntegrationStatus.HEALTHY, lastSuccessAt: completedAt },
      });
      await transaction.auditLog.create({
        data: {
          event: "INTEGRATION_JOB_SUCCEEDED",
          entityType: "IntegrationJob",
          entityId: row.id,
          after: {
            provider: job.data.provider,
            type: job.data.type,
            externalId,
          },
        },
      });
    });
    return { externalId, completedAt: completedAt.toISOString() };
  } catch (error) {
    const finalAttempt = job.attemptsMade + 1 >= maxAttempts;
    const message =
      error instanceof Error ? error.message : "Integration failed";
    const delay = Math.min(1000 * 2 ** (job.attemptsMade + 1), 15 * 60_000);
    const administrators = finalAttempt
      ? await prisma.user.findMany({
          where: { kind: "ADMIN" },
          select: { id: true },
        })
      : [];
    await prisma.$transaction(async (transaction) => {
      await transaction.integrationJob.update({
        where: { id: row.id },
        data: {
          status: finalAttempt ? JobStatus.DEAD_LETTER : JobStatus.RETRYING,
          errorCode: "PROVIDER_ERROR",
          errorMessage: message,
          nextAttemptAt: finalAttempt ? null : new Date(Date.now() + delay),
        },
      });
      await transaction.integrationConnection.update({
        where: { id: row.connectionId },
        data: { status: IntegrationStatus.DEGRADED, lastFailureAt: new Date() },
      });
      if (finalAttempt && administrators.length)
        await transaction.notification.createMany({
          data: administrators.map(({ id }) => ({
            userId: id,
            kind: "INTEGRATION",
            title: `${job.data.provider} job needs attention`,
            message: `${job.data.type} failed after ${maxAttempts} attempts: ${message}`,
            link: "/admin/integrations",
          })),
        });
      if (finalAttempt && process.env.SUPPORT_EMAIL)
        await transaction.outboxEvent.create({
          data: {
            aggregate: "IntegrationJob",
            aggregateId: row.id,
            type: "NOTIFICATION_EMAIL",
            payload: {
              email: process.env.SUPPORT_EMAIL,
              subject: `Gemjar integration failure: ${job.data.provider}`,
              message: `${job.data.type} failed after ${maxAttempts} attempts: ${message}`,
            },
          },
        });
      if (finalAttempt)
        await transaction.auditLog.create({
          data: {
            event: "INTEGRATION_JOB_DEAD_LETTERED",
            entityType: "IntegrationJob",
            entityId: row.id,
            after: {
              provider: job.data.provider,
              type: job.data.type,
              attempts: maxAttempts,
              errorCode: "PROVIDER_ERROR",
            },
          },
        });
    });
    throw error;
  }
}

const worker = new Worker<IntegrationJob>(
  "gemjar-integrations",
  processIntegration,
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    settings: {
      backoffStrategy: (attemptsMade) =>
        Math.min(1000 * 2 ** attemptsMade + Math.random() * 500, 15 * 60_000),
    },
  },
);

async function relayOutbox() {
  const events = await prisma.outboxEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  for (const event of events) {
    if (
      event.type !== "ORDER_SUBMIT" &&
      event.type !== "NOTIFICATION_EMAIL" &&
      event.type !== "STOCK_SYNC_REQUESTED"
    )
      continue;
    const provider =
      event.type === "NOTIFICATION_EMAIL" ? "SES" : "MINTSOFT";
    const connectionRow = await prisma.integrationConnection.upsert({
      where: { provider },
      update: {},
      create: { provider, status: IntegrationStatus.DEGRADED },
    });
    await prisma.integrationJob.upsert({
      where: { idempotencyKey: event.id },
      update: {},
      create: {
        connectionId: connectionRow.id,
        type:
          event.type === "ORDER_SUBMIT"
            ? "ORDER_SUBMIT"
            : event.type === "STOCK_SYNC_REQUESTED"
              ? "STOCK_SYNC"
              : "EMAIL_SEND",
        status: JobStatus.PENDING,
        correlationId: event.id,
        idempotencyKey: event.id,
        payload: event.payload as Prisma.InputJsonValue,
      },
    });
    await prisma.outboxEvent.updateMany({
      where: { id: event.id, processedAt: null },
      data: { processedAt: new Date() },
    });
  }
}

async function enqueuePending() {
  await prisma.integrationJob.updateMany({
    where: {
      status: JobStatus.PROCESSING,
      updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    data: { status: JobStatus.PENDING, nextAttemptAt: new Date() },
  });
  const rows = await prisma.integrationJob.findMany({
    where: {
      status: JobStatus.PENDING,
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    include: { connection: { select: { provider: true } } },
    take: 100,
  });
  for (const row of rows) {
    const claimed = await prisma.integrationJob.updateMany({
      where: { id: row.id, status: JobStatus.PENDING },
      data: { status: JobStatus.PROCESSING },
    });
    if (!claimed.count) continue;
    try {
      await queue.add(
        row.type,
        {
          integrationJobId: row.id,
          provider: row.connection.provider as IntegrationJob["provider"],
          type: row.type as IntegrationJob["type"],
          correlationId: row.correlationId,
          entityId: (row.payload as { orderId?: string }).orderId,
        },
        {
          jobId: `retry-${row.id}-${row.attempts}`,
          attempts: maxAttempts,
          backoff: { type: "custom" },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      await prisma.integrationJob.updateMany({
        where: { id: row.id, status: JobStatus.PROCESSING },
        data: { status: JobStatus.PENDING, nextAttemptAt: new Date() },
      });
      throw error;
    }
  }
}

async function scheduleRecurringJobs() {
  const schedules: Array<{
    provider: "MINTSOFT" | "SAGE_50";
    type: "STOCK_SYNC" | "SHIPMENT_PULL" | "INVOICE_PULL";
    minutes: number;
  }> = [
    {
      provider: "MINTSOFT",
      type: "STOCK_SYNC",
      minutes: Number(process.env.STOCK_SYNC_INTERVAL_MINUTES || 15),
    },
    {
      provider: "MINTSOFT",
      type: "SHIPMENT_PULL",
      minutes: Number(process.env.SHIPMENT_SYNC_INTERVAL_MINUTES || 5),
    },
    {
      provider: "SAGE_50",
      type: "INVOICE_PULL",
      minutes: Number(process.env.INVOICE_SYNC_INTERVAL_MINUTES || 60),
    },
  ];
  const now = Date.now();
  for (const schedule of schedules) {
    const interval = Math.max(1, schedule.minutes) * 60_000;
    const bucket = Math.floor(now / interval);
    const idempotencyKey = `scheduled:${schedule.provider}:${schedule.type}:${bucket}`;
    const connectionRow = await prisma.integrationConnection.upsert({
      where: { provider: schedule.provider },
      update: {},
      create: { provider: schedule.provider, status: IntegrationStatus.DEGRADED },
    });
    await prisma.integrationJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        connectionId: connectionRow.id,
        type: schedule.type,
        status: JobStatus.PENDING,
        correlationId: idempotencyKey,
        idempotencyKey,
        payload: { scheduledAt: new Date().toISOString() },
      },
    });
  }
}

function logRelayError(error: unknown) {
  console.error(
    JSON.stringify({
      level: "error",
      event: "integration_relay_failed",
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}
const relayTimer = setInterval(
  () => void relayOutbox().catch(logRelayError),
  5000,
);
const pendingTimer = setInterval(
  () => void enqueuePending().catch(logRelayError),
  5000,
);
const scheduleTimer = setInterval(
  () => void scheduleRecurringJobs().catch(logRelayError),
  60_000,
);
worker.on("completed", (job) =>
  console.info(
    JSON.stringify({
      level: "info",
      event: "integration_job_completed",
      jobId: job.id,
      correlationId: job.data.correlationId,
    }),
  ),
);
worker.on("failed", (job, error) =>
  console.error(
    JSON.stringify({
      level: "error",
      event: "integration_job_failed",
      jobId: job?.id,
      correlationId: job?.data.correlationId,
      message: error.message,
    }),
  ),
);
void relayOutbox().catch(logRelayError);
void enqueuePending().catch(logRelayError);
void scheduleRecurringJobs().catch(logRelayError);

async function shutdown() {
  clearInterval(relayTimer);
  clearInterval(pendingTimer);
  clearInterval(scheduleTimer);
  await worker.close();
  await queue.close();
  await connection.quit();
  await queueConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
