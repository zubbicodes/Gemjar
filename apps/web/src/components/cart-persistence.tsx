"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart";

export function CartPersistence() {
  const hydrate = useCartStore((state) => state.hydrate);
  const sync = useCartStore((state) => state.sync);
  const hydrated = useCartStore((state) => state.hydrated);
  const items = useCartStore((state) => state.items);
  const initial = useRef(true);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (!hydrated) return;
    if (initial.current) {
      initial.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void sync();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [hydrated, items, sync]);
  return null;
}
