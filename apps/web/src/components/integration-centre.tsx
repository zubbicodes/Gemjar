"use client";

import { RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
  formatDateTime,
  relativeTime,
} from "@/components/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";

type Connection = {
  provider: string;
  status: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  pending: number;
  failed: number;
  succeeded: number;
  successRate: number;
};

type StatusView = {
  data: Connection[];
  stock: { capturedAt: string | null; stale: boolean; provider: string };
};

type Job = {
  id: string;
  type: string;
  status: string;
  correlationId: string;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: string;
  connection: { provider: string };
};

const RETRYABLE = ["FAILED", "DEAD_LETTER", "RETRYING"];

export function IntegrationCentre() {
  const status = useApi<StatusView>("/integrations/status");
  const jobs = useApi<{ data: Job[] }>("/integrations/jobs");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(
    action: () => Promise<unknown>,
    key: string,
    success: string,
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await Promise.all([status.reload(), jobs.reload()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold">
            Integration centre
          </h2>
          <p className="mt-2 text-xs text-ink/45">
            Monitor stock, orders, invoices, failures and recovery.
          </p>
        </div>
        <div className="flex gap-2"><Button
          size="sm"
          disabled={Boolean(busy)}
          onClick={() =>
            run(
              () => apiSend("/integrations/mintsoft/stock-sync", "POST"),
              "stock",
              "Stock snapshots refreshed.",
            )
          }
        >
          <RefreshCw
            className={`size-3.5 ${busy === "stock" ? "animate-spin" : ""}`}
          />{" "}
          Sync stock now
        </Button><Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => run(() => apiSend("/integrations/sage/invoice-sync", "POST"), "invoices", "Invoices synchronized.")}><RefreshCw className={`size-3.5 ${busy === "invoices" ? "animate-spin" : ""}`} /> Sync invoices</Button></div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorRow message={error} />
        </div>
      )}
      {notice && (
        <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          {notice}
        </p>
      )}

      {status.loading ? (
        <LoadingRow />
      ) : status.error ? (
        <ErrorRow message={status.error} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {status.data?.data.map((connection) => (
              <article key={connection.provider} className="surface p-6">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-semibold">
                      {connection.provider.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-ink/40">
                      Last success{" "}
                      {connection.lastSuccessAt
                        ? relativeTime(connection.lastSuccessAt)
                        : "never"}
                      {connection.lastFailureAt
                        ? ` · last failure ${relativeTime(connection.lastFailureAt)}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={connection.status} />
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/50 p-3">
                    <b className="block text-lg">{connection.pending}</b>
                    <span className="text-[9px] uppercase tracking-wider text-ink/40">
                      Pending
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/50 p-3">
                    <b
                      className={`block text-lg ${connection.failed ? "text-rose-700" : ""}`}
                    >
                      {connection.failed}
                    </b>
                    <span className="text-[9px] uppercase tracking-wider text-ink/40">
                      Failed
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/50 p-3">
                    <b className="block text-lg">{connection.successRate}%</b>
                    <span className="text-[9px] uppercase tracking-wider text-ink/40">
                      Success
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {status.data?.stock && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/50">
              <Badge tone={status.data.stock.stale ? "warn" : "good"}>
                {status.data.stock.stale ? "stock stale" : "stock live"}
              </Badge>
              Captured{" "}
              {status.data.stock.capturedAt
                ? relativeTime(status.data.stock.capturedAt)
                : "never"}{" "}
              via{" "}
              {status.data.stock.provider.replaceAll("_", " ").toLowerCase()}.
            </p>
          )}
        </>
      )}

      <section className="surface mt-6 overflow-hidden">
        <PanelHeading
          title="Job history"
          description="Every synchronization attempt, with payload-safe diagnostics and manual retry."
        />
        {jobs.loading ? (
          <LoadingRow />
        ) : jobs.error ? (
          <ErrorRow message={jobs.error} />
        ) : !jobs.data?.data.length ? (
          <EmptyRow message="No integration jobs have run yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/38">
                <tr>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Detail</th>
                  <th className="px-6 py-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.data.map((job) => (
                  <tr key={job.id} className="border-t border-ink/[.06]">
                    <td className="px-6 py-4 font-bold">
                      {job.connection.provider.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-4">
                      {job.type.replaceAll("_", " ").toLowerCase()}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-4">{job.attempts}</td>
                    <td className="px-4 py-4 text-ink/50">
                      {job.errorMessage ? (
                        <span className="text-rose-700">
                          {job.errorCode}: {job.errorMessage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-ink/40">
                          {formatDateTime(job.updatedAt)}
                        </span>
                        {RETRYABLE.includes(job.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              run(
                                () =>
                                  apiSend(
                                    `/integrations/jobs/${job.id}/retry`,
                                    "POST",
                                  ),
                                job.id,
                                "Job queued for retry.",
                              )
                            }
                          >
                            <RotateCcw className="size-3" /> Retry
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
