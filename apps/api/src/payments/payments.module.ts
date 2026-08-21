import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { PaymentProviderGateway } from "./payment-provider";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [PricingModule],
  controllers: [PaymentsController],
  providers: [PaymentProviderGateway, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
