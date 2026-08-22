"use client";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
  formatDate,
} from "@/components/portal-primitives";
import { useApi } from "@/lib/portal-api";
import { formatMoney } from "@/lib/utils";
type Invoice = {
  id: string;
  number: string;
  totalMinor: number;
  issuedAt: string;
  order: { number: string; organization?: { name: string } | null };
};
export function InvoiceManager() {
  const view = useApi<{ data: Invoice[] }>("/invoices/all?limit=250");
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Invoices"
        description="Provider-neutral invoice register and document downloads."
      />
      {view.loading ? (
        <LoadingRow />
      ) : view.error ? (
        <ErrorRow message={view.error} />
      ) : !view.data?.data.length ? (
        <EmptyRow message="No invoices issued yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Order</th>
                <th className="p-4">Issued</th>
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {view.data.data.map((invoice) => (
                <tr key={invoice.id} className="border-t border-ink/[.06]">
                  <td className="p-4">
                    <a
                      className="font-bold text-forest underline"
                      href={`${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/invoices/${invoice.id}/document`}
                    >
                      {invoice.number}
                    </a>
                  </td>
                  <td className="p-4">
                    {invoice.order.organization?.name ?? "Consumer"}
                  </td>
                  <td className="p-4">{invoice.order.number}</td>
                  <td className="p-4">{formatDate(invoice.issuedAt)}</td>
                  <td className="p-4 text-right font-semibold">
                    {formatMoney(invoice.totalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
