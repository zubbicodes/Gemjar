import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationRole, OrganizationStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Public, RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountsService } from "./accounts.service";

class ApplicationDto {
  @IsString() @MinLength(2) @MaxLength(120) companyName: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName: string;
  @IsEmail() email: string;
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  password: string;
}
class CreateOrganizationDto extends ApplicationDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,30}$/)
  accountNumber?: string;
  @IsInt() @Min(0) @Max(365) paymentTermsDays: number;
  @IsBoolean() poRequired: boolean;
  @IsOptional() @IsInt() @Min(0) creditLimitMinor?: number;
  @IsBoolean() catalogueRestricted: boolean;
}
class StatusDto {
  @IsEnum(OrganizationStatus) status: OrganizationStatus;
}
class TermsDto {
  @IsInt() @Min(0) @Max(365) paymentTermsDays: number;
  @IsBoolean() poRequired: boolean;
  @IsOptional() @IsInt() @Min(0) creditLimitMinor?: number | null;
  @IsBoolean() catalogueRestricted: boolean;
  @IsIn(["EXCLUSIVE", "INCLUSIVE"])
  vatDisplay: "EXCLUSIVE" | "INCLUSIVE";
}
class MemberDto {
  @IsEmail() email: string;
  @IsEnum(OrganizationRole) role: OrganizationRole;
}
class OrganizationAddressDto {
  @IsString() @MinLength(1) @MaxLength(40) label: string;
  @IsString() @MinLength(2) @MaxLength(120) recipient: string;
  @IsString() @MinLength(2) @MaxLength(160) line1: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsString() @MinLength(2) @MaxLength(100) city: string;
  @IsOptional() @IsString() @MaxLength(100) county?: string;
  @IsString() @Matches(/^[A-Za-z0-9 ]{3,10}$/) postcode: string;
}
class AgentDto {
  @IsEmail() email: string;
  @IsString() @Matches(/^[A-Za-z0-9-]{2,20}$/) code: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName: string;
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  password: string;
}
class AssignmentDto {
  @IsString() organizationId: string;
}

@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly accounts: AccountsService) {}
  @Public() @Post("applications") apply(@Body() body: ApplicationDto) {
    return this.accounts.apply(body);
  }
  @RequirePermissions("customers:create") @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrganizationDto,
  ) {
    return this.accounts.createOrganization(user, body);
  }
  @RequirePermissions("customers:read") @Get() list() {
    return this.accounts.listOrganizations();
  }
  @Get("current") current(@CurrentUser() user: AuthenticatedUser) {
    return this.accounts.currentOrganizations(user.id);
  }
  @Get(":id") one(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.accounts.getOrganization(user, id);
  }
  @RequirePermissions("customers:update") @Patch(":id/status") status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: StatusDto,
  ) {
    return this.accounts.updateStatus(user, id, body.status);
  }
  @RequirePermissions("customers:update") @Patch(":id/terms") terms(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: TermsDto,
  ) {
    return this.accounts.updateTerms(user, id, body);
  }
  @Post(":id/members") member(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: MemberDto,
  ) {
    return this.accounts.addMember(user, id, body.email, body.role);
  }
  @Delete(":id/members/:userId") removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.accounts.removeMember(user, id, userId);
  }
  @Post(":id/addresses") address(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: OrganizationAddressDto,
  ) {
    return this.accounts.addOrganizationAddress(user, id, body);
  }
  @Delete(":id/addresses/:addressId") removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("addressId") addressId: string,
  ) {
    return this.accounts.removeOrganizationAddress(user, id, addressId);
  }
}

@ApiTags("sales agents")
@Controller("agents")
export class AgentsController {
  constructor(private readonly accounts: AccountsService) {}
  @RequirePermissions("agents:read") @Get() list() {
    return this.accounts.listAgents();
  }
  @RequirePermissions("agents:create") @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AgentDto,
  ) {
    return this.accounts.createAgent(user, body);
  }
  @RequirePermissions("agents:update") @Post(":id/assignments") assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: AssignmentDto,
  ) {
    return this.accounts.assignAgent(user, id, body.organizationId);
  }
  @RequirePermissions("agents:update")
  @Delete(":id/assignments/:organizationId")
  unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("organizationId") organizationId: string,
  ) {
    return this.accounts.unassignAgent(user, id, organizationId);
  }
  @Get("me/customers") customers(@CurrentUser() user: AuthenticatedUser) {
    return this.accounts.assignedCustomers(user);
  }
  @Get("me/customers/:organizationId") customer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.accounts.assignedCustomer(user, organizationId);
  }
}
