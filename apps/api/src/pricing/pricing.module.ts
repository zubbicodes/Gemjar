import { Module } from "@nestjs/common";
import { CatalogueModule } from "../catalogue/catalogue.module";
import { AdminPricingController } from "./admin-pricing.controller";
import { AdminPricingService } from "./admin-pricing.service";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [CatalogueModule],
  controllers: [PricingController, AdminPricingController],
  providers: [PricingService, AdminPricingService],
  exports: [PricingService],
})
export class PricingModule {}
