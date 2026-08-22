import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsInt, IsISO8601, IsOptional, IsString, Min } from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminPricingService } from "./admin-pricing.service";

class UpsertPriceDto {
  @IsString() organizationId: string;
  @IsString() variantId: string;
  @IsInt() @Min(1) minQuantity: number;
  @IsInt() @Min(0) unitPriceMinor: number;
  @IsOptional() @IsISO8601() effectiveFrom?: string;
  @IsOptional() @IsISO8601() effectiveTo?: string;
}

@ApiTags("pricing")
@Controller("admin/pricing")
export class AdminPricingController {
  constructor(private readonly pricing: AdminPricingService) {}

  @RequirePermissions("pricing:read")
  @Get("organizations/:organizationId")
  list(@Param("organizationId") organizationId: string) {
    return this.pricing.listForOrganization(organizationId);
  }

  @RequirePermissions("pricing:update") @Post() upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertPriceDto,
  ) {
    return this.pricing.upsert(user, body);
  }

  @RequirePermissions("pricing:update") @Delete(":id") remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.pricing.remove(user, id);
  }
}
