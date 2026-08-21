"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/catalogue";
import { useCartStore } from "@/stores/cart";

export function AddToBag({ product, compact = false }: { product: Product; compact?: boolean }) {
  const add = useCartStore((state) => state.add);
  const [added, setAdded] = useState(false);
  return (
    <Button
      variant={compact ? "secondary" : "primary"}
      size={compact ? "icon" : "lg"}
      aria-label={`Add ${product.name} to basket`}
      onClick={() => {
        add(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
    >
      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
      {!compact && (added ? "Added to basket" : "Add to basket")}
    </Button>
  );
}
