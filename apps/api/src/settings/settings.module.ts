import { Global, Module } from "@nestjs/common";
import {
  SettingsController,
  StorefrontContentController,
} from "./settings.controller";
import { SettingsService } from "./settings.service";

@Global()
@Module({
  controllers: [SettingsController, StorefrontContentController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
