import { AgentCustomerManager } from "@/components/agent-customer-manager";
import { PortalShell } from "@/components/portal-shell";

export const metadata = { title: "Agent workspace" };

export default function AgentPage() {
  return <PortalShell kind="agent" title="Your customer book." context="Authenticated assignment context"><AgentCustomerManager /></PortalShell>;
}
