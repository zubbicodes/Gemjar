import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({ where: { slug: "atelier-edit" }, update: {}, create: { name: "The Atelier Edit", slug: "atelier-edit" } });
  const products = [
    ["Verdant Signet", "verdant-signet", "GJ-RNG-042", 18900],
    ["Luna Hoops", "luna-hoops", "GJ-ER-118", 9600],
    ["Serein Chain", "serein-chain", "GJ-NK-207", 14200],
  ] as const;
  for (const [name, slug, sku, price] of products) {
    await prisma.product.upsert({ where: { slug }, update: {}, create: { name, slug, description: "A considered Gemjar piece.", status: ProductStatus.ACTIVE, categories: { create: { categoryId: category.id } }, variants: { create: { sku, retailPriceMinor: price, b2bPriceMinor: Math.round(price * .68) } } } });
  }
}

main().finally(() => prisma.$disconnect());
