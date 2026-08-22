import { Module } from "@nestjs/common";
import { FulfilmentController } from "./fulfilment.controller";
import { FulfilmentService } from "./fulfilment.service";

@Module({
  controllers: [FulfilmentController],
  providers: [FulfilmentService],
  exports: [FulfilmentService],
})
export class FulfilmentModule {}
