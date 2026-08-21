import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";
import { AdminCatalogueManager } from "@/components/admin-catalogue-manager";
import { AdminOrderManager } from "@/components/admin-order-manager";

export default async function AdminSection({ params }: { params: Promise<{ section: string[] }> }) { const current = (await params).section.join("-"); return <PortalShell kind="admin" title="Gemjar operations.">{current === "catalogue" ? <AdminCatalogueManager /> : current === "orders" ? <AdminOrderManager /> : <WorkspaceSection section={current} />}</PortalShell>; }
