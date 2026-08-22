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
import { ProductStatus } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
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
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  mediaUrls?: string[];
}

class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @IsString() @MinLength(10) description?: string;
  @IsOptional() @IsInt() @Min(1) retailPriceMinor?: number;
  @IsOptional() @IsInt() @Min(1) b2bPriceMinor?: number;
  @IsOptional() @IsInt() @Min(1) moq?: number;
  @IsOptional() @IsInt() @Min(1) packMultiple?: number;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9-]+$/) sku?: string;
  @IsOptional() @IsBoolean() b2cVisible?: boolean;
  @IsOptional() @IsBoolean() b2bVisible?: boolean;
  @IsOptional() @IsString() @MaxLength(160) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
  @IsOptional() @IsObject() attributes?: Record<string, string>;
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  mediaUrls?: string[];
}

class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug: string;
  @IsOptional() @IsString() parentId?: string;
}
class VariantDto {
  @IsString() @Matches(/^[A-Z0-9-]+$/) sku: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsInt() @Min(1) retailPriceMinor: number;
  @IsOptional() @IsInt() @Min(1) b2bPriceMinor?: number;
  @IsInt() @Min(1) moq: number;
  @IsInt() @Min(1) packMultiple: number;
  @IsOptional() @IsObject() attributes?: Record<string, string>;
}

@ApiTags("admin catalogue")
@Controller("admin/products")
export class AdminCatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}
  @RequirePermissions("catalogue:read") @Get() async list() {
    const data = await this.catalogue.list(undefined, true);
    return { data, page: 1, pageSize: data.length, total: data.length };
  }
  @RequirePermissions("catalogue:read") @Get(":id") one(
    @Param("id") id: string,
  ) {
    return this.catalogue.getById(id);
  }
  @RequirePermissions("catalogue:create") @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductDto,
  ) {
    return this.catalogue.create(body, user.id);
  }
  @RequirePermissions("catalogue:update") @Patch(":id") update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.catalogue.update(id, body, user.id);
  }
  @RequirePermissions("catalogue:update") @Delete(":id") remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.catalogue.removeProduct(id, user.id);
  }
  @RequirePermissions("catalogue:update") @Post(":id/restore") restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.catalogue.restoreProduct(id, user.id);
  }
  @RequirePermissions("catalogue:create") @Post(":id/variants") createVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: VariantDto,
  ) {
    return this.catalogue.createVariant(id, body, user.id);
  }
  @RequirePermissions("catalogue:update")
  @Patch(":id/variants/:variantId")
  updateVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() body: VariantDto,
  ) {
    return this.catalogue.updateVariant(id, variantId, body, user.id);
  }
  @RequirePermissions("catalogue:update")
  @Delete(":id/variants/:variantId")
  removeVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("variantId") variantId: string,
  ) {
    return this.catalogue.removeVariant(id, variantId, user.id);
  }
}

@ApiTags("admin categories")
@Controller("admin/categories")
export class AdminCategoriesController {
  constructor(private readonly catalogue: CatalogueService) {}
  @RequirePermissions("catalogue:read") @Get() list() {
    return this.catalogue.listCategories();
  }
  @RequirePermissions("catalogue:create") @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CategoryDto,
  ) {
    return this.catalogue.createCategory(body, user.id);
  }
  @RequirePermissions("catalogue:update") @Patch(":id") update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CategoryDto,
  ) {
    return this.catalogue.updateCategory(id, body, user.id);
  }
  @RequirePermissions("catalogue:update") @Delete(":id") remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.catalogue.removeCategory(id, user.id);
  }
}
