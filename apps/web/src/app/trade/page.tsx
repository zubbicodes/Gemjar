import { BadgePoundSterling, Boxes, Clock3, ShoppingBag } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PortalShell } from "@/components/portal-shell";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalogue";

export const metadata = { title: "Trade portal" };

export default function TradePage() {
  return <PortalShell kind="trade" title="Welcome back, Aster & Row." context="Aster & Row · Approved"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={BadgePoundSterling} label="Available credit" value="£18.4k" note="Net 30" trend="neutral" /><MetricCard icon={ShoppingBag} label="Open orders" value="6" note="2 dispatched" /><MetricCard icon={Boxes} label="Ready to reorder" value="12" note="This month" /><MetricCard icon={Clock3} label="Next payment" value="12 Sep" note="£2,840" trend="neutral" /></div><div className="mt-8 flex items-end justify-between"><div><p className="eyebrow">Selected for your store</p><h2 className="mt-2 font-display text-3xl font-semibold">Your catalogue</h2></div><button className="text-xs font-bold text-forest">Quick order →</button></div><div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={{ ...product, price: Math.round(product.price * .68) }} index={index} />)}</div></PortalShell>;
}
