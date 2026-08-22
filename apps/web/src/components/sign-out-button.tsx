"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { csrfHeaders } from "@/lib/csrf";
import { useCartStore } from "@/stores/cart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";

export function SignOutButton() {
  const router = useRouter();
  const resetCart = useCartStore((state) => state.resetAfterLogout);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try { await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include", headers: csrfHeaders() }); }
    finally {
      resetCart();
      window.localStorage.removeItem("gemjar.agent.customer");
      router.replace("/login");
      router.refresh();
      setBusy(false);
    }
  }
  return <button type="button" onClick={() => void signOut()} disabled={busy} className="icon-link bg-white" aria-label="Sign out" title="Sign out"><LogOut /></button>;
}
