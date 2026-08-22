import { Global, Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import {
  AgentsController,
  OrganizationsController,
} from "./accounts.controller";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Global()
@Module({
  controllers: [OrganizationsController, AgentsController, ProfileController],
  providers: [AccountsService, ProfileService],
  exports: [AccountsService],
})
export class AccountsModule {}
