import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";

export default async function AdminSection({ params }: { params: Promise<{ section: string[] }> }) { const current = (await params).section.join("-"); return <PortalShell kind="admin" title="Gemjar operations."><WorkspaceSection section={current} /></PortalShell>; }
