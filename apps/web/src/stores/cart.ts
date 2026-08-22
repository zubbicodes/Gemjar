"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/lib/catalogue";
import { csrfHeaders } from "@/lib/csrf";
import { indexedDbStorage } from "@/lib/indexed-db-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
export type CartItem = Pick<
  Product,
  "id" | "variantId" | "name" | "slug" | "sku" | "price" | "image"
> & { quantity: number };
type ServerCart = {
  cart: {
    items: Array<{
      productId: string;
      variantId: string;
      name: string;
      slug: string;
      sku: string;
      price: number;
      image: string;
      quantity: number;
    }>;
  } | null;
  cartToken?: string;
};

type CartState = {
  items: CartItem[];
  cartToken?: string;
  hydrated: boolean;
  syncing: boolean;
  offline: boolean;
  accountMode: boolean;
  add: (product: Product) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
  sync: () => Promise<void>;
  mergeAfterLogin: () => Promise<void>;
  resetAfterLogout: () => void;
};

function mapItems(body: ServerCart): CartItem[] {
  return (
    body.cart?.items.map((item) => ({
      id: item.productId,
      variantId: item.variantId,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    })) ?? []
  );
}
function mergeItems(local: CartItem[], remote: CartItem[]) {
  const items = new Map(remote.map((item) => [item.variantId, item]));
  for (const item of local) {
    const current = items.get(item.variantId);
    items.set(
      item.variantId,
      current
        ? { ...current, quantity: Math.max(current.quantity, item.quantity) }
        : item,
    );
  }
  return [...items.values()];
}
async function read(response: Response): Promise<ServerCart> {
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.message || "Basket synchronization failed");
  return body;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      syncing: false,
      offline: false,
      accountMode: false,
      add: (product) =>
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing)
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          const { id, variantId, name, slug, sku, price, image } = product;
          return {
            items: [
              ...state.items,
              { id, variantId, name, slug, sku, price, image, quantity: 1 },
            ],
          };
        }),
      remove: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(1, quantity) }
              : item,
          ),
        })),
      clear: () => set({ items: [] }),
      hydrate: async () => {
        if (get().hydrated || typeof window === "undefined") return;
        const local = get().items;
        try {
          const me = await fetch(`${API_URL}/auth/me`, {
            credentials: "include",
            cache: "no-store",
          });
          const authenticated =
            me.ok && (await me.json()).user?.kind === "CONSUMER";
          if (authenticated) {
            set({ accountMode: true });
            const token = get().cartToken;
            const response = token
              ? await fetch(`${API_URL}/carts/consumer/merge`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "X-Cart-Token": token, ...csrfHeaders() },
                })
              : await fetch(`${API_URL}/carts/consumer`, {
                  credentials: "include",
                  cache: "no-store",
                });
            const body = await read(response);
            const remote = mapItems(body);
            const merged = mergeItems(local, remote);
            set({ items: merged, cartToken: undefined, offline: false });
            if (
              merged.length !== remote.length ||
              merged.some(
                (item, index) => item.quantity !== remote[index]?.quantity,
              )
            )
              await get().sync();
          } else {
            const token = get().cartToken;
            if (token) {
              const body = await read(
                await fetch(`${API_URL}/carts/guest`, {
                  headers: { "X-Cart-Token": token },
                  cache: "no-store",
                }),
              );
              const remote = mapItems(body);
              set({
                items: mergeItems(local, remote),
                accountMode: false,
                offline: false,
              });
            } else if (local.length) await get().sync();
          }
        } catch {
          set({ offline: true });
        } finally {
          set({ hydrated: true });
        }
      },
      sync: async () => {
        if (typeof window === "undefined") return;
        set({ syncing: true });
        try {
          const items = get().items.map(({ variantId, quantity }) => ({
            variantId,
            quantity,
          }));
          const accountMode = get().accountMode;
          const response = await fetch(
            `${API_URL}/carts/${accountMode ? "consumer" : "guest"}`,
            {
              method: "PUT",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(accountMode
                  ? csrfHeaders()
                  : get().cartToken
                    ? { "X-Cart-Token": get().cartToken! }
                    : {}),
              },
              body: JSON.stringify({ items }),
            },
          );
          const body = await read(response);
          set({
            cartToken: accountMode
              ? undefined
              : (body.cartToken ?? get().cartToken),
            offline: false,
          });
        } catch {
          set({ offline: true });
        } finally {
          set({ syncing: false });
        }
      },
      mergeAfterLogin: async () => {
        const token = get().cartToken;
        set({ accountMode: true });
        if (!token) {
          await get().sync();
          return;
        }
        try {
          const body = await read(
            await fetch(`${API_URL}/carts/consumer/merge`, {
              method: "POST",
              credentials: "include",
              headers: { "X-Cart-Token": token, ...csrfHeaders() },
            }),
          );
          set({ items: mapItems(body), cartToken: undefined, offline: false });
        } catch {
          set({ offline: true });
        }
      },
      resetAfterLogout: () =>
        set({
          items: [],
          cartToken: undefined,
          accountMode: false,
          hydrated: false,
          offline: false,
        }),
    }),
    {
      name: "gemjar-cart-v1",
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        items: state.items,
        cartToken: state.cartToken,
      }),
    },
  ),
);
