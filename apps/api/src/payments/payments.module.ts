import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentProviderGateway } from "./payment-provider";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [PricingModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentProviderGateway, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
