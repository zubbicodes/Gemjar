import { Injectable } from "@nestjs/common";

export type CatalogueItem = { id: string; name: string; slug: string; description: string; variant: { id: string; sku: string; retailPriceMinor: number; b2bPriceMinor: number; moq: number; packMultiple: number; available: number; capturedAt: string } };

@Injectable()
export class CatalogueService {
  private readonly products: CatalogueItem[] = [
    { id: "prd_emerald_signet", name: "Verdant Signet", slug: "verdant-signet", description: "A sculptural signet in satin gold.", variant: { id: "var_emerald_signet", sku: "GJ-RNG-042", retailPriceMinor: 18900, b2bPriceMinor: 12850, moq: 1, packMultiple: 1, available: 18, capturedAt: new Date().toISOString() } },
    { id: "prd_luna_hoops", name: "Luna Hoops", slug: "luna-hoops", description: "Quietly bold hoops with a brushed finish.", variant: { id: "var_luna_hoops", sku: "GJ-ER-118", retailPriceMinor: 9600, b2bPriceMinor: 6450, moq: 2, packMultiple: 2, available: 7, capturedAt: new Date(Date.now() - 18 * 60_000).toISOString() } },
    { id: "prd_serein_chain", name: "Serein Chain", slug: "serein-chain", description: "An understated chain designed for layering.", variant: { id: "var_serein_chain", sku: "GJ-NK-207", retailPriceMinor: 14200, b2bPriceMinor: 9650, moq: 1, packMultiple: 1, available: 31, capturedAt: new Date().toISOString() } },
  ];
  list(query?: string) { const term = query?.trim().toLowerCase(); return term ? this.products.filter((item) => `${item.name} ${item.variant.sku}`.toLowerCase().includes(term)) : this.products; }
  findVariant(id: string) { return this.products.find((item) => item.variant.id === id)?.variant; }
}
