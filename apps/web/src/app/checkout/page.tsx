import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CheckoutFlow } from "@/components/checkout-flow";

export const metadata = { title: "Secure checkout" };

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-mist">
      <header className="border-b border-ink/10 bg-paper px-5 py-5">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between">
          <BrandMark />
          <span className="flex items-center gap-2 text-xs font-semibold text-ink/65">
            <LockKeyhole className="size-3.5" /> Secure checkout
          </span>
        </div>
      </header>
      <CheckoutFlow />
    </main>
  );
}
