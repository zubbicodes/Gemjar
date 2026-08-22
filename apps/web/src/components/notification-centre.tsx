"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyRow, ErrorRow, LoadingRow } from "@/components/portal-primitives";
import { apiSend, useApi } from "@/lib/portal-api";

type Notification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationCentre() {
  const view = useApi<{ data: Notification[]; unread: number }>(
    "/notifications",
  );
  async function mark(id?: string) {
    await apiSend(
      id ? `/notifications/${id}/read` : "/notifications/read-all",
      id ? "PATCH" : "POST",
    );
    await view.reload();
  }
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-end justify-between border-b border-ink/10 p-6">
        <div>
          <h2 className="font-display text-3xl font-semibold">Notifications</h2>
          <p className="mt-2 text-xs text-ink/45">
            {view.data?.unread ?? 0} unread updates.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void mark()}>
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>
      {view.loading ? (
        <LoadingRow />
      ) : view.error ? (
        <ErrorRow message={view.error} />
      ) : !view.data?.data.length ? (
        <EmptyRow message="No notifications yet." />
      ) : (
        <div>
          {view.data.data.map((item) => (
            <article
              key={item.id}
              className={`border-b border-ink/[.06] p-6 ${item.readAt ? "opacity-55" : "bg-forest/[.035]"}`}
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-forest">
                    {item.kind}
                  </p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-ink/55">{item.message}</p>
                  <p className="mt-2 text-[10px] text-ink/35">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-3">
                  {item.link && (
                    <Link
                      className="text-xs font-bold text-forest underline"
                      href={item.link}
                    >
                      View
                    </Link>
                  )}
                  {!item.readAt && (
                    <button
                      className="text-xs font-bold text-forest"
                      onClick={() => void mark(item.id)}
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
