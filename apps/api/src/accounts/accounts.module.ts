import { Global, Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AgentsController, OrganizationsController } from "./accounts.controller";

@Global()
@Module({ controllers: [OrganizationsController, AgentsController], providers: [AccountsService], exports: [AccountsService] })
export class AccountsModule {}
