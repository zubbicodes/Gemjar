import { AdminDashboard } from "@/components/admin-dashboard";
import { PortalShell } from "@/components/portal-shell";

export const metadata = { title: "Operations" };

export default function AdminPage() {
  return (
    <PortalShell kind="admin" title="Good morning, Amara." context="Gemjar operations">
      <AdminDashboard />
    </PortalShell>
  );
}
