"use client";

import {
  BadgePoundSterling,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CircleUserRound,
  FileText,
  Heart,
  LayoutDashboard,
  Bell,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UsersRound,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalKind = "account" | "trade" | "agent" | "admin";

const menus: Record<
  PortalKind,
  Array<[label: string, href: string, Icon: React.ElementType]>
> = {
  account: [
    ["Overview", "/account", LayoutDashboard],
    ["Orders", "/account/orders", ShoppingBag],
    ["Favourites", "/account/favourites", Heart],
    ["Profile", "/account/profile", CircleUserRound],
    ["Security", "/account/security", ShieldCheck],
    ["Notifications", "/account/notifications", Bell],
  ],
  trade: [
    ["Overview", "/trade", LayoutDashboard],
    ["Catalogue", "/trade/catalogue", Store],
    ["Quick order", "/trade/quick-order", Boxes],
    ["Orders", "/trade/orders", ShoppingBag],
    ["Invoices", "/trade/invoices", FileText],
    ["Team", "/trade/team", UsersRound],
    ["Notifications", "/trade/notifications", Bell],
  ],
  agent: [
    ["Overview", "/agent", LayoutDashboard],
    ["Customers", "/agent/customers", Building2],
    ["New order", "/agent/orders/new", ShoppingBag],
    ["Activity", "/agent/activity", ChartNoAxesCombined],
    ["Notifications", "/agent/notifications", Bell],
  ],
  admin: [
    ["Overview", "/admin", LayoutDashboard],
    ["Orders", "/admin/orders", ShoppingBag],
    ["Catalogue", "/admin/catalogue", Boxes],
    ["Customers", "/admin/customers", UsersRound],
    ["Agents", "/admin/agents", CircleUserRound],
    ["Pricing", "/admin/pricing", BadgePoundSterling],
    ["Fulfilment", "/admin/fulfilment", PackageCheck],
    ["Invoices", "/admin/invoices", FileText],
    ["Integrations", "/admin/integrations", Waypoints],
    ["Settings", "/admin/settings", Settings],
    ["Notifications", "/admin/notifications", Bell],
    ["Analytics", "/admin/analytics", ChartNoAxesCombined],
    ["Audit", "/admin/audit", ShieldCheck],
    ["Roles", "/admin/roles", ShieldCheck],
    ["Content", "/admin/content", FileText],
  ],
};

export function PortalNav({
  kind,
  compact = false,
}: {
  kind: PortalKind;
  compact?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={`${kind} portal`}
      className={
        compact
          ? "flex min-w-max gap-1 px-4 py-2"
          : "mt-8 space-y-1"
      }
    >
      {menus[kind].map(([label, href, Icon]) => {
        const active = href === pathname || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
              compact
                ? active
                  ? "bg-forest text-white"
                  : "text-ink/60 hover:bg-forest/5 hover:text-forest"
                : active
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/[.06] hover:text-white"
            }`}
          >
            <Icon className="size-4 stroke-[1.7]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
