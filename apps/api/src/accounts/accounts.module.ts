import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AgentsController, OrganizationsController } from "./accounts.controller";

@Module({ controllers: [OrganizationsController, AgentsController], providers: [AccountsService] })
export class AccountsModule {}
