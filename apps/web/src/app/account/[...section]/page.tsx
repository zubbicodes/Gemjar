import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";
import { SecurityManager } from "@/components/security-manager";
import { ConsumerOrderHistory } from "@/components/consumer-order-history";

export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const current = (await params).section.join("-");
  return (
    <PortalShell
      kind="account"
      title={
        current === "orders"
          ? "Orders, from payment to arrival."
          : "Your Gemjar collection."
      }
    >
      {current === "security" ? (
        <SecurityManager />
      ) : current === "orders" ? (
        <ConsumerOrderHistory />
      ) : (
        <WorkspaceSection section={current} />
      )}
    </PortalShell>
  );
}
