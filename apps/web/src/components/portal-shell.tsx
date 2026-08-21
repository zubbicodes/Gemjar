import Link from "next/link";
import { Bell, Boxes, Building2, ChartNoAxesCombined, CircleUserRound, FileText, Heart, LayoutDashboard, PackageCheck, Search, Settings, ShieldCheck, ShoppingBag, Store, UsersRound, Waypoints } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";

type PortalKind = "account" | "trade" | "agent" | "admin";

const menus: Record<PortalKind, Array<[string, string, React.ElementType]>> = {
  account: [["Overview", "/account", LayoutDashboard], ["Orders", "/account/orders", ShoppingBag], ["Favourites", "/account/favourites", Heart], ["Profile", "/account/profile", CircleUserRound], ["Security", "/account/security", ShieldCheck]],
  trade: [["Overview", "/trade", LayoutDashboard], ["Catalogue", "/trade/catalogue", Store], ["Quick order", "/trade/quick-order", Boxes], ["Orders", "/trade/orders", ShoppingBag], ["Invoices", "/trade/invoices", FileText], ["Team", "/trade/team", UsersRound]],
  agent: [["Overview", "/agent", LayoutDashboard], ["Customers", "/agent/customers", Building2], ["New order", "/agent/orders/new", ShoppingBag], ["Activity", "/agent/activity", ChartNoAxesCombined]],
  admin: [["Overview", "/admin", LayoutDashboard], ["Orders", "/admin/orders", ShoppingBag], ["Catalogue", "/admin/catalogue", Boxes], ["Customers", "/admin/customers", UsersRound], ["Fulfilment", "/admin/fulfilment", PackageCheck], ["Integrations", "/admin/integrations", Waypoints], ["Settings", "/admin/settings", Settings]],
};

export function PortalShell({ kind, title, context, children }: { kind: PortalKind; title: string; context?: string; children: React.ReactNode }) {
  const labels = { account: "My Gemjar", trade: "Gemjar Trade", agent: "Agent workspace", admin: "Operations" };
  return <div className="min-h-screen bg-[#ece9e1] lg:grid lg:grid-cols-[250px_1fr]">
    <aside className="hidden min-h-screen flex-col bg-[#0d211b] px-5 py-7 text-white lg:flex">
      <BrandMark inverse /><div className="mt-10 px-3"><p className="portal-label">Workspace</p><p className="mt-2 text-sm font-semibold">{labels[kind]}</p></div>
      <nav className="mt-8 space-y-1">{menus[kind].map(([label, href, Icon], index) => <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold transition ${index === 0 ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/[.06] hover:text-white"}`}><Icon className="size-4 stroke-[1.7]" />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.05] p-4"><p className="portal-label">Need help?</p><p className="mt-2 text-xs leading-5 text-white/55">Our commerce team is here Monday–Friday.</p><button className="mt-3 text-xs font-bold text-gold">Contact support →</button></div>
    </aside>
    <div className="min-w-0">
      <header className="flex h-[74px] items-center justify-between border-b border-ink/10 bg-white/60 px-5 backdrop-blur lg:px-8"><div className="lg:hidden"><BrandMark /></div><div className="hidden lg:block">{context && <p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink/38">Current context</p>}<p className="mt-0.5 text-xs font-semibold">{context}</p></div><div className="flex items-center gap-2"><button className="icon-link bg-white" aria-label="Search"><Search /></button><button className="icon-link relative bg-white" aria-label="Notifications"><Bell /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" /></button><SignOutButton /><button className="ml-1 grid size-9 place-items-center rounded-full bg-forest text-xs font-bold text-white">AM</button></div></header>
      <main className="mx-auto max-w-[1500px] p-5 lg:p-8"><div className="mb-8"><p className="eyebrow">{labels[kind]}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl">{title}</h1></div>{children}</main>
    </div>
  </div>;
}
