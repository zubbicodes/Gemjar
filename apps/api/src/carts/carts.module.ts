import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { CartsController } from "./carts.controller";
import { CartsService } from "./carts.service";

@Module({ imports: [PricingModule], controllers: [CartsController], providers: [CartsService], exports: [CartsService] })
export class CartsModule {}
