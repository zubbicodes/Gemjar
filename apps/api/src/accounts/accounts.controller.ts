import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationRole, OrganizationStatus } from "@prisma/client";
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Public, RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountsService } from "./accounts.service";

class ApplicationDto { @IsString() @MinLength(2) @MaxLength(120) companyName: string; @IsString() @MinLength(2) @MaxLength(60) firstName: string; @IsString() @MinLength(2) @MaxLength(60) lastName: string; @IsEmail() email: string; @IsString() @MinLength(12) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/) password: string; }
class StatusDto { @IsEnum(OrganizationStatus) status: OrganizationStatus; }
class MemberDto { @IsEmail() email: string; @IsEnum(OrganizationRole) role: OrganizationRole; }
class AgentDto { @IsEmail() email: string; @IsString() @Matches(/^[A-Za-z0-9-]{2,20}$/) code: string; }
class AssignmentDto { @IsString() organizationId: string; }

@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly accounts: AccountsService) {}
  @Public() @Post("applications") apply(@Body() body: ApplicationDto) { return this.accounts.apply(body); }
  @RequirePermissions("customers:read") @Get() list() { return this.accounts.listOrganizations(); }
  @Get("current") current(@CurrentUser() user: AuthenticatedUser) { return this.accounts.currentOrganizations(user.id); }
  @Get(":id") one(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.accounts.getOrganization(user, id); }
  @RequirePermissions("customers:update") @Patch(":id/status") status(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: StatusDto) { return this.accounts.updateStatus(user, id, body.status); }
  @Post(":id/members") member(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: MemberDto) { return this.accounts.addMember(user, id, body.email, body.role); }
}

@ApiTags("sales agents")
@Controller("agents")
export class AgentsController {
  constructor(private readonly accounts: AccountsService) {}
  @RequirePermissions("agents:read") @Get() list() { return this.accounts.listAgents(); }
  @RequirePermissions("agents:create") @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() body: AgentDto) { return this.accounts.createAgent(user, body.email, body.code); }
  @RequirePermissions("agents:update") @Post(":id/assignments") assign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: AssignmentDto) { return this.accounts.assignAgent(user, id, body.organizationId); }
  @Get("me/customers") customers(@CurrentUser() user: AuthenticatedUser) { return this.accounts.assignedCustomers(user); }
  @Get("me/customers/:organizationId") customer(@CurrentUser() user: AuthenticatedUser, @Param("organizationId") organizationId: string) { return this.accounts.assignedCustomer(user, organizationId); }
}
