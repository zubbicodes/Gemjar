import { PortalShell } from "@/components/portal-shell";
import { QuickOrder } from "@/components/quick-order";
import { WorkspaceSection } from "@/components/workspace-section";

export default async function TradeSection({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params; const current = section.join("-");
  return <PortalShell kind="trade" title={current === "quick-order" ? "Build an order, quickly." : "Your trade account."} context="Aster & Row · Approved">{current === "quick-order" ? <QuickOrder /> : <WorkspaceSection section={current} />}</PortalShell>;
}
