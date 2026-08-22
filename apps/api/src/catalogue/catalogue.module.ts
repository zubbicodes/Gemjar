import { Module } from "@nestjs/common";
import { CatalogueController } from "./catalogue.controller";
import { CatalogueService } from "./catalogue.service";
import {
  AdminCatalogueController,
  AdminCategoriesController,
} from "./admin-catalogue.controller";
import { TradeCatalogueController } from "./trade-catalogue.controller";
import { CatalogueTransferController } from "./catalogue-transfer.controller";
import { CatalogueTransferService } from "./catalogue-transfer.service";

@Module({
  controllers: [
    CatalogueController,
    AdminCatalogueController,
    AdminCategoriesController,
    TradeCatalogueController,
    CatalogueTransferController,
  ],
  providers: [CatalogueService, CatalogueTransferService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
