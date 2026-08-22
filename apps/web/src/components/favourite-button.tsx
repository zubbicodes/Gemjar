"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { apiSend } from "@/lib/portal-api";

export function FavouriteButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      await apiSend("/account/favourites", "POST", { productId });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Sign in to save products",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy || saved}
        onClick={() => void save()}
        aria-label={`Save ${productName}`}
        title={saved ? "Saved" : "Save product"}
        className="grid size-10 place-items-center rounded-full bg-white/90 text-forest shadow-soft transition hover:bg-white disabled:opacity-70"
      >
        <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
      </button>
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-12 z-20 w-48 rounded-xl bg-rose-50 p-2 text-[10px] text-rose-800 shadow-soft"
        >
          {error}
        </span>
      )}
    </div>
  );
}
