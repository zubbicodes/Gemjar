import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsEmail,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Public, RequirePermissions } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { SettingsService } from "./settings.service";

class CommerceSettingsDto {
  @IsInt() @Min(1) @Max(1440) staleStockMinutes: number;
  @IsInt() @Min(0) @Max(365) defaultPaymentTermsDays: number;
  @IsEmail() supportEmail: string;
  @IsString() @MinLength(2) @MaxLength(80) notificationFromName: string;
}
class DeliveryMethodDto {
  @IsString() @MinLength(2) @MaxLength(30) code: string;
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsString() @MinLength(5) @MaxLength(300) description: string;
  @IsInt() @Min(0) @Max(100000) priceMinor: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) freeThresholdMinor?: number;
  @IsInt() @Min(0) @Max(365) estimatedDaysMin: number;
  @IsInt() @Min(0) @Max(365) estimatedDaysMax: number;
  @IsBoolean() active: boolean;
  @IsInt() @Min(0) @Max(1000) position: number;
}
class UpdateDeliveryMethodDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsString() @MinLength(5) @MaxLength(300) description: string;
  @IsInt() @Min(0) @Max(100000) priceMinor: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) freeThresholdMinor?: number;
  @IsInt() @Min(0) @Max(365) estimatedDaysMin: number;
  @IsInt() @Min(0) @Max(365) estimatedDaysMax: number;
  @IsBoolean() active: boolean;
  @IsInt() @Min(0) @Max(1000) position: number;
}
class StorefrontContentDto {
  @IsString() @MinLength(2) @MaxLength(80) eyebrow: string;
  @IsString() @MinLength(2) @MaxLength(100) headline: string;
  @IsString() @MinLength(2) @MaxLength(80) emphasis: string;
  @IsString() @MinLength(10) @MaxLength(400) introduction: string;
  @IsString() @MinLength(1) @MaxLength(500) heroImageUrl: string;
  @IsString() @MinLength(10) @MaxLength(160) tradeHeadline: string;
  @IsString() @MinLength(10) @MaxLength(400) tradeIntroduction: string;
  @IsString() @MinLength(20) @MaxLength(2000) deliveryPolicy: string;
  @IsString() @MinLength(20) @MaxLength(2000) returnsPolicy: string;
  @IsEmail() contactEmail: string;
}

@ApiTags("platform settings")
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @RequirePermissions("settings:update") @Get() get() {
    return this.settings.commerce();
  }
  @RequirePermissions("settings:update") @Patch() update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CommerceSettingsDto,
  ) {
    return this.settings.updateCommerce(user.id, body);
  }
  @RequirePermissions("settings:update") @Get("delivery-methods") deliveryMethods() {
    return this.settings.deliveryMethods();
  }
  @RequirePermissions("settings:update") @Post("delivery-methods") createDeliveryMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeliveryMethodDto,
  ) {
    return this.settings.createDeliveryMethod(user.id, {
      ...body,
      code: body.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
  }
  @RequirePermissions("settings:update") @Patch("delivery-methods/:id") updateDeliveryMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateDeliveryMethodDto,
  ) {
    return this.settings.updateDeliveryMethod(user.id, id, body);
  }
}

@ApiTags("storefront content")
@Controller("content/storefront")
export class StorefrontContentController {
  constructor(private readonly settings: SettingsService) {}
  @Public() @Get() get() {
    return this.settings.storefront();
  }
  @RequirePermissions("settings:update") @Patch() update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: StorefrontContentDto,
  ) {
    return this.settings.updateStorefront(user.id, body);
  }
}
