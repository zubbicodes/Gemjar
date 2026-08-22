"use client";

import { RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  StatusBadge,
} from "@/components/portal-primitives";
import { Button } from "@/components/ui/button";
import { apiSend, useApi } from "@/lib/portal-api";

type Item = {
  id: string;
  nameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  totalMinor: number;
};
type Request = {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  order?: {
    number: string;
    email: string;
    payments: Array<{ id: string; amountMinor: number; status: string }>;
  };
  items: Array<{ quantity: number; orderItem: Item }>;
};

export function CustomerRequestActions({
  orderId,
  status,
  fulfilmentStatus,
  items,
}: {
  orderId: string;
  status: string;
  fulfilmentStatus: string;
  items: Item[];
}) {
  const requests = useApi<{ data: Request[] }>(`/orders/${orderId}/requests`);
  const [type, setType] = useState<"CANCELLATION" | "RETURN" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = items
      .map((item) => ({
        orderItemId: item.id,
        quantity: Number(form.get(`item:${item.id}`) ?? 0),
      }))
      .filter((item) => item.quantity > 0);
    setBusy(true);
    setError("");
    try {
      await apiSend(`/orders/${orderId}/requests`, "POST", {
        type,
        reason: form.get("reason"),
        items: type === "RETURN" ? lines : undefined,
      });
      setType("");
      await requests.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit request",
      );
    } finally {
      setBusy(false);
    }
  }
  const open = requests.data?.data.some(
    (request) => !["REJECTED", "COMPLETED"].includes(request.status),
  );
  return (
    <div className="mt-5 border-t border-ink/[.07] pt-4">
      {error && <ErrorRow message={error} />}
      {requests.data?.data.map((request) => (
        <div
          key={request.id}
          className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 p-3 text-[11px]"
        >
          <span>
            {request.type.toLowerCase()} · {request.reason}
          </span>
          <StatusBadge status={request.status} />
        </div>
      ))}
      {!type && !open && status !== "CANCELLED" && (
        <div className="flex flex-wrap gap-2">
          {fulfilmentStatus === "UNFULFILLED" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setType("CANCELLATION")}
            >
              <XCircle className="size-3.5" /> Request cancellation
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setType("RETURN")}
          >
            <RotateCcw className="size-3.5" /> Request return
          </Button>
        </div>
      )}
      {type && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-xl border border-ink/[.08] p-4"
        >
          <p className="text-xs font-bold">
            {type === "RETURN" ? "Return items" : "Cancel order"}
          </p>
          <textarea
            name="reason"
            className="field min-h-20 py-3"
            placeholder="Reason"
            minLength={5}
            required
          />
          {type === "RETURN" &&
            items.map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span>
                  {item.nameSnapshot} · {item.skuSnapshot}
                </span>
                <input
                  name={`item:${item.id}`}
                  className="field h-9 w-20"
                  type="number"
                  min="0"
                  max={item.quantity}
                  defaultValue="0"
                />
              </label>
            ))}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Submitting…" : "Submit request"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setType("")}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AdminServiceRequests() {
  const requests = useApi<{ data: Request[] }>("/admin/requests");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function update(id: string, status: string) {
    setBusy(id);
    setError("");
    try {
      await apiSend(`/admin/requests/${id}`, "PATCH", { status });
      await requests.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update request",
      );
    } finally {
      setBusy("");
    }
  }
  async function refundAndComplete(request: Request) {
    const payment = request.order?.payments?.[0];
    if (!payment) {
      setError("No payment is available to refund");
      return;
    }
    const suggested = request.items.reduce(
      (sum, item) =>
        sum +
        Math.round(
          (item.orderItem.totalMinor / item.orderItem.quantity) * item.quantity,
        ),
      0,
    );
    const amount = Number(
      window.prompt("Refund amount in pounds", (suggested / 100).toFixed(2)),
    );
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(request.id);
    setError("");
    try {
      await apiSend("/payments/refunds", "POST", {
        paymentId: payment.id,
        amountMinor: Math.round(amount * 100),
        reason: request.reason,
        idempotencyKey: crypto.randomUUID(),
      });
      await apiSend(`/admin/requests/${request.id}`, "PATCH", {
        status: "COMPLETED",
      });
      await requests.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Refund failed");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="surface mt-6 overflow-hidden">
      <PanelHeading
        title="Returns and cancellations"
        description="Review customer requests and record each controlled state transition."
      />
      {error && <ErrorRow message={error} />}
      {requests.loading ? (
        <LoadingRow />
      ) : requests.error ? (
        <ErrorRow message={requests.error} />
      ) : !requests.data?.data.length ? (
        <EmptyRow message="No service requests have been submitted." />
      ) : (
        <ul className="divide-y divide-ink/[.06]">
          {requests.data.data.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="text-xs font-bold">
                  {request.order?.number} · {request.type}
                </p>
                <p className="mt-1 text-[11px] text-ink/45">
                  {request.order?.email} · {request.reason}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {request.status === "REQUESTED" && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy === request.id}
                      onClick={() => void update(request.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === request.id}
                      onClick={() => void update(request.id, "REJECTED")}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {request.status === "APPROVED" && request.type === "RETURN" && (
                  <Button
                    size="sm"
                    onClick={() => void update(request.id, "RECEIVED")}
                  >
                    Mark received
                  </Button>
                )}
                {request.status === "RECEIVED" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => void refundAndComplete(request)}
                    >
                      Refund &amp; complete
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void update(request.id, "COMPLETED")}
                    >
                      Complete without refund
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
