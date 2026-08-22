import { AccountDashboard } from "@/components/account-dashboard";
import { PortalShell } from "@/components/portal-shell";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <PortalShell kind="account" title="Your Gemjar collection.">
      <AccountDashboard />
    </PortalShell>
  );
}
