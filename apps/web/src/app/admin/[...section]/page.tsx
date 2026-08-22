import { AdminCatalogueManager } from "@/components/admin-catalogue-manager";
import { AdminCustomers } from "@/components/admin-customers";
import { AdminOrderManager } from "@/components/admin-order-manager";
import { FulfilmentConsole } from "@/components/fulfilment-console";
import { IntegrationCentre } from "@/components/integration-centre";
import { PortalShell } from "@/components/portal-shell";
import { PricingManager } from "@/components/pricing-manager";
import { WorkspaceSection } from "@/components/workspace-section";
import { AdminServiceRequests } from "@/components/service-requests";
import { SettingsManager } from "@/components/settings-manager";
import { NotificationCentre } from "@/components/notification-centre";
import { AgentManager } from "@/components/agent-manager";
import { AnalyticsReport, AuditReport } from "@/components/operations-reports";
import { AccessManager } from "@/components/access-manager";
import { ContentManager } from "@/components/content-manager";
import { InvoiceManager } from "@/components/invoice-manager";

const TITLES: Record<string, string> = {
  catalogue: "Catalogue.",
  orders: "Order operations.",
  customers: "Trade customers.",
  fulfilment: "Fulfilment.",
  pricing: "Customer pricing.",
  integrations: "Integration centre.",
};

function section(current: string) {
  switch (current) {
    case "catalogue":
      return <AdminCatalogueManager />;
    case "orders":
      return <AdminOrderManager />;
    case "customers":
      return <AdminCustomers />;
    case "fulfilment":
      return (
        <>
          <FulfilmentConsole />
          <AdminServiceRequests />
        </>
      );
    case "pricing":
      return <PricingManager />;
    case "integrations":
      return <IntegrationCentre />;
    case "settings":
      return <SettingsManager />;
    case "notifications":
      return <NotificationCentre />;
    case "agents":
      return <AgentManager />;
    case "analytics":
      return <AnalyticsReport />;
    case "audit":
      return <AuditReport />;
    case "roles":
      return <AccessManager />;
    case "content":
      return <ContentManager />;
    case "invoices":
      return <InvoiceManager />;
    default:
      return <WorkspaceSection section={current} />;
  }
}

export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const current = (await params).section.join("-");
  return (
    <PortalShell kind="admin" title={TITLES[current] ?? "Gemjar operations."}>
      {section(current)}
    </PortalShell>
  );
}
