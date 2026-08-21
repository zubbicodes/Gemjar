import { PortalShell } from "@/components/portal-shell";
import { QuickOrder } from "@/components/quick-order";
import { WorkspaceSection } from "@/components/workspace-section";

export default async function AgentSection({ params }: { params: Promise<{ section: string[] }> }) { const current = (await params).section.join("-"); const isNewOrder = current === "orders-new"; return <PortalShell kind="agent" title={isNewOrder ? "Create a customer order." : "Your customer book."} context={isNewOrder ? "Aster & Row · Agent order" : "No customer selected"}>{isNewOrder ? <QuickOrder /> : <WorkspaceSection section={current} />}</PortalShell>; }
