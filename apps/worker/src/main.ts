import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

type IntegrationJob = { provider: "MINTSOFT" | "SAGE_50"; type: "STOCK_SYNC" | "ORDER_SUBMIT" | "SHIPMENT_PULL" | "INVOICE_PULL"; correlationId: string; entityId?: string };

const worker = new Worker<IntegrationJob>("gemjar-integrations", async (job: Job<IntegrationJob>) => {
  const { provider, type, correlationId } = job.data;
  console.info(JSON.stringify({ level: "info", event: "integration_job_started", provider, type, correlationId, attempt: job.attemptsMade + 1 }));
  if (provider === "SAGE_50" && process.env.NODE_ENV === "production" && process.env.SAGE_PROVIDER === "mock") throw new Error("Sage mock provider is prohibited in production");
  return { provider, type, correlationId, completedAt: new Date().toISOString() };
}, {
  connection,
  concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  settings: { backoffStrategy: (attemptsMade) => Math.min(1000 * 2 ** attemptsMade + Math.random() * 500, 15 * 60_000) },
});

worker.on("completed", (job) => console.info(JSON.stringify({ level: "info", event: "integration_job_completed", jobId: job.id, correlationId: job.data.correlationId })));
worker.on("failed", (job, error) => console.error(JSON.stringify({ level: "error", event: "integration_job_failed", jobId: job?.id, correlationId: job?.data.correlationId, message: error.message })));

async function shutdown() { await worker.close(); await connection.quit(); process.exit(0); }
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
