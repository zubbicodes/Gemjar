import { Module } from "@nestjs/common";
import { CatalogueController } from "./catalogue.controller";
import { CatalogueService } from "./catalogue.service";
import { AdminCatalogueController } from "./admin-catalogue.controller";
import { TradeCatalogueController } from "./trade-catalogue.controller";

@Module({ controllers: [CatalogueController, AdminCatalogueController, TradeCatalogueController], providers: [CatalogueService], exports: [CatalogueService] })
export class CatalogueModule {}
