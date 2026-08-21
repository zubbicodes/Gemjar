import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { IsArray, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrdersService } from "./orders.service";
import { Public, RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";

class OrderItemDto { @IsString() variantId: string; @IsInt() @Min(1) quantity: number; }
class CreateOrderDto { @IsIn(["B2C"]) channel: "B2C"; @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[]; @IsEmail() email: string; @IsObject() deliveryAddress: Record<string, string>; @IsOptional() @IsString() notes?: string; }
class CreateTradeOrderDto { @IsString() organizationId: string; @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[]; @IsEmail() email: string; @IsObject() deliveryAddress: Record<string, string>; @IsOptional() @IsString() notes?: string; @IsOptional() @IsString() purchaseOrder?: string; }

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @RequirePermissions("orders:read") @Get() list() { return this.orders.list(); }
  @Public() @Post() @ApiHeader({ name: "Idempotency-Key", required: true }) create(@Body() body: CreateOrderDto, @Headers("idempotency-key") key: string) { return this.orders.create(body, key); }
  @Post("trade") @ApiHeader({ name: "Idempotency-Key", required: true }) createTrade(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTradeOrderDto, @Headers("idempotency-key") key: string) { return this.orders.createTrade(user, body, key); }
}
