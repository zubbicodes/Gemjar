import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CartsService } from "./carts.service";

class CartContextDto { @IsString() organizationId: string; }
class CartItemDto { @IsString() variantId: string; @IsInt() @Min(1) quantity: number; }
class SetItemDto extends CartContextDto { @IsInt() @Min(0) quantity: number; }
class SaveCurrentDto extends CartContextDto { @IsString() @MinLength(2) @MaxLength(100) name: string; }
class SaveDraftDto extends SaveCurrentDto { @IsOptional() @IsString() draftId?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => CartItemDto) items: CartItemDto[]; }

@ApiTags("carts and drafts")
@Controller("carts")
export class CartsController {
  constructor(private readonly carts: CartsService) {}
  @Get("current") current(@CurrentUser() user: AuthenticatedUser, @Query() query: CartContextDto) { return this.carts.current(user, query.organizationId); }
  @Put("current/items/:variantId") item(@CurrentUser() user: AuthenticatedUser, @Param("variantId") variantId: string, @Body() body: SetItemDto) { return this.carts.setItem(user, body.organizationId, variantId, body.quantity); }
  @Post("current/save") saveCurrent(@CurrentUser() user: AuthenticatedUser, @Body() body: SaveCurrentDto) { return this.carts.saveCurrent(user, body.organizationId, body.name); }
  @Get("drafts") drafts(@CurrentUser() user: AuthenticatedUser, @Query("organizationId") organizationId?: string) { return this.carts.listDrafts(user, organizationId); }
  @Post("drafts") saveDraft(@CurrentUser() user: AuthenticatedUser, @Body() body: SaveDraftDto) { return this.carts.saveDraft(user, body); }
  @Get("drafts/:id") draft(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.carts.getDraft(user, id); }
  @Delete("drafts/:id") remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.carts.removeDraft(user, id); }
}
