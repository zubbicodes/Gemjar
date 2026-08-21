import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";

export default async function AccountSection({ params }: { params: Promise<{ section: string[] }> }) { const current = (await params).section.join("-"); return <PortalShell kind="account" title="Your Gemjar collection."><WorkspaceSection section={current} /></PortalShell>; }
