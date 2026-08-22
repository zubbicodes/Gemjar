import { Search } from "lucide-react";
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
  return (
    <div className="portal-shell min-h-screen bg-[#ece9e1] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-[#0d211b] px-5 py-7 text-white lg:flex">
        <BrandMark inverse />
        <div className="mt-10 px-3">
          <p className="portal-label">Workspace</p>
          <p className="mt-2 text-sm font-semibold">{labels[kind]}</p>
        </div>
        <PortalNav kind={kind} />
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.05] p-4">
          <p className="portal-label">Need help?</p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            Our commerce team is here Monday–Friday.
          </p>
          <a
            href="mailto:support@gemjar.co.uk"
            className="mt-3 inline-block text-xs font-bold text-gold"
          >
            Contact support →
          </a>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-[74px] items-center justify-between border-b border-ink/10 bg-white/60 px-5 backdrop-blur lg:px-8">
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
        <div className="overflow-x-auto border-b border-ink/10 bg-white/70 lg:hidden">
          <PortalNav kind={kind} compact />
        </div>
        <main className="mx-auto max-w-[1500px] p-5 lg:p-8">
          <div className="mb-8">
            <p className="eyebrow">{labels[kind]}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.03em] sm:text-5xl">
              {title}
            </h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
