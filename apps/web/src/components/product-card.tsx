import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AddToBag } from "@/components/add-to-bag";
import type { Product } from "@/lib/catalogue";
import { formatMoney } from "@/lib/utils";
import { FavouriteButton } from "@/components/favourite-button";

export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <article className="group" data-position={index}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-ink/10 bg-mist">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-5 transition duration-700 group-hover:scale-[1.035]"
          sizes="(max-width: 768px) 90vw, 25vw"
          unoptimized={product.image.startsWith("http")}
        />
        <div className="absolute right-4 top-4">
          <FavouriteButton productId={product.id} productName={product.name} />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between opacity-100 transition sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <span className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-ink backdrop-blur">
            {product.availability}
          </span>
          <AddToBag product={product} compact />
        </div>
      </div>
      <div className="px-1 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest">
          {product.collection}
        </p>
        <Link
          href={`/shop/${product.slug}`}
          className="mt-2 flex items-start justify-between gap-4"
        >
          <h3 className="font-display text-[27px] font-semibold leading-tight tracking-[-0.025em]">
            {product.name}
          </h3>
          <ArrowUpRight className="mt-1 size-4 text-ink/35 transition group-hover:text-forest" />
        </Link>
        <div className="mt-2 flex gap-2 text-sm">
          <span className="font-semibold">{formatMoney(product.price)}</span>
          {product.previousPrice && (
            <span className="text-ink/70 line-through">
              {formatMoney(product.previousPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
