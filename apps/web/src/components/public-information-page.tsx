import { SiteHeader } from "@/components/site-header";

export function PublicInformationPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 font-display text-6xl font-semibold tracking-[-.04em]">
          {title}
        </h1>
        <div className="mt-10 space-y-6 text-sm leading-8 text-ink/75">
          {children}
        </div>
      </article>
    </main>
  );
}
