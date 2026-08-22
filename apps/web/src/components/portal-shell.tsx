import { ArrowUpRight, Boxes, FileText, Plus, Search, ShoppingBag, UsersRound } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PortalNav, type PortalKind } from "@/components/portal-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { CurrentUserBadge } from "@/components/current-user-badge";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";

export function PortalShell({
  kind,
  title,
  context,
  children,
}: {
  kind: PortalKind;
  title: string;
  context?: string;
  children: React.ReactNode;
}) {
  const labels = {
    account: "My Gemjar",
    trade: "Gemjar Trade",
    agent: "Agent workspace",
    admin: "Operations",
  };
  const searchTargets: Record<PortalKind, string> = {
    account: "/shop",
    trade: "/trade/catalogue",
    agent: "/agent/customers",
    admin: "/admin/catalogue",
  };
  const quickTools: Record<PortalKind, Array<[string, string, React.ElementType]>> = {
    account: [["Shop products", "/shop", ShoppingBag], ["Track orders", "/account/orders", Boxes], ["Edit profile", "/account/profile", UsersRound]],
    trade: [["Quick order", "/trade/quick-order", Plus], ["Browse catalogue", "/trade/catalogue", Boxes], ["View invoices", "/trade/invoices", FileText]],
    agent: [["New order", "/agent/orders/new", Plus], ["Find customer", "/agent/customers", UsersRound], ["View activity", "/agent/activity", FileText]],
    admin: [["Add product", "/admin/catalogue", Plus], ["Manage orders", "/admin/orders", ShoppingBag], ["Add customer", "/admin/customers", UsersRound]],
  };
  return (
    <div className="portal-shell min-h-screen bg-mist/60 lg:grid lg:h-screen lg:grid-cols-[224px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="hidden min-h-screen flex-col border-r border-ink/10 bg-white px-4 py-6 text-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <BrandMark />
        <div className="mt-10 px-3">
          <p className="portal-label">Workspace</p>
          <p className="mt-2 text-sm font-semibold">{labels[kind]}</p>
        </div>
        <PortalNav kind={kind} />
        <div className="mt-auto rounded-xl border border-forest/15 bg-mist/60 p-4">
          <p className="portal-label">Need help?</p>
          <p className="mt-2 text-xs leading-5 text-ink/55">
            Our commerce team is here Monday–Friday.
          </p>
          <a
            href="mailto:support@gemjar.co.uk"
            className="mt-3 inline-block text-xs font-bold text-forest"
          >
            Contact support →
          </a>
        </div>
      </aside>
      <div className="min-w-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-ink/10 bg-white px-5 lg:px-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="hidden lg:block">
            {context && (
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink/38">
                Current context
              </p>
            )}
            <p className="mt-0.5 text-xs font-semibold">{context}</p>
          </div>
          <div className="flex items-center gap-2">
            <PortalThemeToggle />
            <Link
              href={searchTargets[kind]}
              className="icon-link bg-white"
              aria-label="Search"
            >
              <Search />
            </Link>
            <SignOutButton />
            <CurrentUserBadge />
          </div>
        </header>
        <div className="shrink-0 overflow-x-auto border-b border-ink/10 bg-white/70 lg:hidden">
          <PortalNav kind={kind} compact />
        </div>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:flex-1 lg:overflow-y-auto lg:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <p className="eyebrow">{labels[kind]}</p>
            <h1 className="display-safe mt-2 font-display text-3xl font-semibold tracking-[-.025em] sm:text-4xl">
              {title}
            </h1>
            </div>
            <Link href={searchTargets[kind]} className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold text-forest">
              Search workspace <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <section aria-label="Quick tools" className="mb-6 grid gap-2 sm:grid-cols-3">
            {quickTools[kind].map(([label, href, Icon]) => (
              <Link key={label} href={href} className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3 text-sm font-bold transition-[border-color,background-color,color,transform] hover:border-forest/35 hover:bg-mist/50 active:translate-y-px">
                <span className="grid size-9 place-items-center rounded-lg bg-forest/10 text-forest"><Icon className="size-4" /></span>
                <span className="flex-1 whitespace-nowrap">{label}</span>
                <ArrowUpRight className="size-4 text-ink/30 group-hover:text-forest" />
              </Link>
            ))}
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
