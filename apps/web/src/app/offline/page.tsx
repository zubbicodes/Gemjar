import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center px-5"><div className="max-w-md text-center"><div className="flex justify-center"><BrandMark /></div><WifiOff className="mx-auto mt-12 size-8 text-forest" /><h1 className="mt-6 font-display text-5xl font-semibold">You’re offline.</h1><p className="mt-4 text-sm leading-7 text-ink/55">Your basket and saved draft are safe. Reconnect before we verify live pricing, availability, payment or submit an order.</p><Link href="/" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8")}>Try again</Link></div></main>;
}
