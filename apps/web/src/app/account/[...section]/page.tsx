import { PortalShell } from "@/components/portal-shell";
import { WorkspaceSection } from "@/components/workspace-section";
import { SecurityManager } from "@/components/security-manager";
import { ConsumerOrderHistory } from "@/components/consumer-order-history";
import { AccountProfile } from "@/components/account-profile";
import { AccountFavourites } from "@/components/account-favourites";
import { NotificationCentre } from "@/components/notification-centre";

export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const current = (await params).section.join("-");
  return (
    <PortalShell
      kind="account"
      title={
        current === "orders"
          ? "Orders, from payment to arrival."
          : "Your Gemjar collection."
      }
    >
      {current === "security" ? (
        <SecurityManager />
      ) : current === "orders" ? (
        <ConsumerOrderHistory />
      ) : current === "profile" ? (
        <AccountProfile />
      ) : current === "favourites" ? (
        <AccountFavourites />
      ) : current === "notifications" ? (
        <NotificationCentre />
      ) : (
        <WorkspaceSection section={current} />
      )}
    </PortalShell>
  );
}
