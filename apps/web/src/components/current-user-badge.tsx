"use client";

import { useApi } from "@/lib/portal-api";

export function CurrentUserBadge() {
  const session = useApi<{
    user: { firstName: string; lastName: string; email: string };
  }>("/auth/me");
  const user = session.data?.user;
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "--";
  return (
    <span
      className="ml-1 grid size-9 place-items-center rounded-full bg-forest text-xs font-bold text-white"
      aria-label={user ? `Signed in as ${user.firstName} ${user.lastName}` : "Signed in user"}
      title={user?.email}
    >
      {initials}
    </span>
  );
}
