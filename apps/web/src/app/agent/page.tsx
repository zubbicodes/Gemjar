import { AgentWorkspace } from "@/components/agent-workspace";
import { PortalShell } from "@/components/portal-shell";

export const metadata = { title: "Agent workspace" };

export default function AgentPage() {
  return (
    <PortalShell kind="agent" title="Sales workspace" context="Assigned customers only">
      <AgentWorkspace />
    </PortalShell>
  );
}
