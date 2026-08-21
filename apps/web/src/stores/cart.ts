"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/catalogue";

type CartItem = Pick<Product, "id" | "name" | "slug" | "sku" | "price" | "image"> & { quantity: number };

type CartState = {
  items: CartItem[];
  add: (product: Product) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) => set((state) => {
        const existing = state.items.find((item) => item.id === product.id);
        if (existing) return { items: state.items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) };
        const { id, name, slug, sku, price, image } = product;
        return { items: [...state.items, { id, name, slug, sku, price, image, quantity: 1 }] };
      }),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      setQuantity: (id, quantity) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item) })),
    }),
    { name: "gemjar-cart-v1" },
  ),
);
