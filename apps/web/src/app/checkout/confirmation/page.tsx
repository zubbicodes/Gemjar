import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata = { title: "Order confirmation" };
export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-mist">
      <header className="border-b border-ink/10 bg-paper px-5 py-5">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <BrandMark />
          <span className="flex items-center gap-2 text-xs font-semibold text-ink/65">
            <LockKeyhole className="size-3.5" /> Secure confirmation
          </span>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="p-20 text-center text-sm text-ink/65">
            Loading confirmation…
          </div>
        }
      >
        <OrderConfirmation />
      </Suspense>
    </main>
  );
}
