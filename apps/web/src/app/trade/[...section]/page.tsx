import { PortalShell } from "@/components/portal-shell";
import { QuickOrder } from "@/components/quick-order";
import {
  TradeInvoices,
  TradeOrders,
  TradeTeam,
} from "@/components/trade-workspace";
import { TradeCatalogue } from "@/components/trade-catalogue";
import { WorkspaceSection } from "@/components/workspace-section";
import { NotificationCentre } from "@/components/notification-centre";

const TITLES: Record<string, string> = {
  "quick-order": "Build an order, quickly.",
  orders: "Your order history.",
  invoices: "Your invoices.",
  team: "Your account team.",
};

function section(current: string) {
  switch (current) {
    case "catalogue":
      return <TradeCatalogue />;
    case "quick-order":
      return <QuickOrder kind="trade" />;
    case "orders":
      return <TradeOrders />;
    case "invoices":
      return <TradeInvoices />;
    case "team":
      return <TradeTeam />;
    case "notifications":
      return <NotificationCentre />;
    default:
      return <WorkspaceSection section={current} />;
  }
}

export default async function TradeSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const current = (await params).section.join("-");
  return (
    <PortalShell
      kind="trade"
      title={TITLES[current] ?? "Your trade account."}
      context="Secure trade workspace"
    >
      {section(current)}
    </PortalShell>
  );
}
