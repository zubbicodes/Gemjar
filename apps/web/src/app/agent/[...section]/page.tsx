import { AgentWorkspace } from "@/components/agent-workspace";
import { PortalShell } from "@/components/portal-shell";
import { QuickOrder } from "@/components/quick-order";
import { WorkspaceSection } from "@/components/workspace-section";
import { NotificationCentre } from "@/components/notification-centre";

export default async function AgentSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const current = (await params).section.join("-");
  const isNewOrder = current === "orders-new";
  return (
    <PortalShell
      kind="agent"
      title={isNewOrder ? "Create a customer order." : "Your customer book."}
      context={
        isNewOrder ? "Authorized customer context" : "Assigned customers only"
      }
    >
      {isNewOrder ? (
        <QuickOrder kind="agent" />
      ) : current === "notifications" ? (
        <NotificationCentre />
      ) : current === "customers" || current === "activity" ? (
        <AgentWorkspace />
      ) : (
        <WorkspaceSection section={current} />
      )}
    </PortalShell>
  );
}
