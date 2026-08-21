import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { CartsController } from "./carts.controller";
import { CartsService } from "./carts.service";
import { ConsumerCartsController } from "./consumer-carts.controller";

@Module({ imports: [PricingModule], controllers: [CartsController, ConsumerCartsController], providers: [CartsService], exports: [CartsService] })
export class CartsModule {}
