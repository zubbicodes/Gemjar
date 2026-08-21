import { Module } from "@nestjs/common";
import { CatalogueModule } from "../catalogue/catalogue.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({ imports: [CatalogueModule], controllers: [PricingController], providers: [PricingService], exports: [PricingService] })
export class PricingModule {}
