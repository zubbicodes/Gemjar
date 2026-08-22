"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-ink/10 p-6 sm:flex-row sm:items-end">
      <div>
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-2 text-xs text-ink/45">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-6 text-xs text-ink/45">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorRow({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 p-6 text-xs text-rose-800"
    >
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function EmptyRow({ message }: { message: string }) {
  return <p className="p-6 text-xs text-ink/45">{message}</p>;
}

const ORDER_TONES: Record<string, "neutral" | "good" | "warn" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "neutral",
  CONFIRMED: "neutral",
  PROCESSING: "warn",
  COMPLETED: "good",
  CANCELLED: "danger",
  UNPAID: "neutral",
  PENDING: "warn",
  PAID: "good",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warn",
  FAILED: "danger",
  UNFULFILLED: "neutral",
  PARTIALLY_FULFILLED: "warn",
  FULFILLED: "good",
  DISPATCHED: "neutral",
  IN_TRANSIT: "warn",
  DELIVERED: "good",
  HEALTHY: "good",
  DEGRADED: "warn",
  DISABLED: "neutral",
  SUCCEEDED: "good",
  RETRYING: "warn",
  DEAD_LETTER: "danger",
  APPROVED: "good",
  REJECTED: "danger",
  SUSPENDED: "danger",
  REQUESTED: "warn",
};

/** Renders any of the platform's status enums with a consistent tone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ORDER_TONES[status] ?? "neutral"}>
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
