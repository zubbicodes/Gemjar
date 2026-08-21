import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProductStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Matches, MaxLength, Min, MinLength } from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CatalogueService } from "./catalogue.service";

class CreateProductDto {
  @IsString() @MinLength(2) @MaxLength(140) name: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug: string;
  @IsString() @MinLength(10) description: string;
  @IsString() @Matches(/^[A-Z0-9-]+$/) sku: string;
  @IsInt() @Min(1) retailPriceMinor: number;
  @IsOptional() @IsInt() @Min(1) b2bPriceMinor?: number;
  @IsInt() @Min(1) moq = 1;
  @IsInt() @Min(1) packMultiple = 1;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
}

class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @IsString() @MinLength(10) description?: string;
  @IsOptional() @IsInt() @Min(1) retailPriceMinor?: number;
  @IsOptional() @IsInt() @Min(1) b2bPriceMinor?: number;
  @IsOptional() @IsInt() @Min(1) moq?: number;
  @IsOptional() @IsInt() @Min(1) packMultiple?: number;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

@ApiTags("admin catalogue")
@Controller("admin/products")
export class AdminCatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}
  @RequirePermissions("catalogue:read") @Get() async list() { const data = await this.catalogue.list(undefined, true); return { data, page: 1, pageSize: data.length, total: data.length }; }
  @RequirePermissions("catalogue:create") @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateProductDto) { return this.catalogue.create(body, user.id); }
  @RequirePermissions("catalogue:update") @Patch(":id") update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: UpdateProductDto) { return this.catalogue.update(id, body, user.id); }
}
