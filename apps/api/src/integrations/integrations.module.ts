import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { MintsoftProvider } from "./mintsoft.provider";
import { SageMockProvider } from "./sage-mock.provider";

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, MintsoftProvider, SageMockProvider],
  exports: [MintsoftProvider, SageMockProvider],
})
export class IntegrationsModule {}
