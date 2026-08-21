import { PortalShell } from "@/components/portal-shell";
import { TradeAccountOverview } from "@/components/trade-account-overview";

export const metadata = { title: "Trade portal" };

export default function TradePage() {
  return <PortalShell kind="trade" title="Your trade account." context="Authenticated organization context"><TradeAccountOverview /></PortalShell>;
}
