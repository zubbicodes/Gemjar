import { Clock3 } from "lucide-react";

const copy: Record<string, { title: string; description: string }> = {
  favourites: {
    title: "Saved pieces",
    description: "Saved-product management is not available yet.",
  },
  profile: {
    title: "Profile & addresses",
    description: "Profile editing is not available yet.",
  },
  settings: {
    title: "Platform settings",
    description: "Platform settings are not available yet.",
  },
};

/** Honest fallback for routes without a completed domain workflow. */
export function WorkspaceSection({ section }: { section: string }) {
  const details = copy[section] ?? {
    title: section.replaceAll("-", " "),
    description: "This workspace is not available yet.",
  };
  return (
    <section className="surface p-10 text-center">
      <Clock3 className="mx-auto size-7 text-ink/25" />
      <h2 className="mt-4 font-display text-2xl font-semibold capitalize">
        {details.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-ink/45">
        {details.description}
      </p>
    </section>
  );
}
