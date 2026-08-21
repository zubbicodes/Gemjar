import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";
import { SecurityManager } from "@/components/security-manager";

export default async function AccountSection({ params }: { params: Promise<{ section: string[] }> }) { const current = (await params).section.join("-"); return <PortalShell kind="account" title="Your Gemjar collection.">{current === "security" ? <SecurityManager /> : <WorkspaceSection section={current} />}</PortalShell>; }
