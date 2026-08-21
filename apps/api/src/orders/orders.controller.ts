import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { IsArray, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrdersService } from "./orders.service";
import { Public, RequirePermissions } from "../auth/auth.decorators";

class OrderItemDto { @IsString() variantId: string; @IsInt() @Min(1) quantity: number; }
class CreateOrderDto { @IsIn(["B2C", "B2B", "SALES_AGENT"]) channel: "B2C" | "B2B" | "SALES_AGENT"; @IsOptional() @IsString() organizationId?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[]; @IsEmail() email: string; @IsObject() deliveryAddress: Record<string, string>; @IsOptional() @IsString() notes?: string; }

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @RequirePermissions("orders:read") @Get() list() { return this.orders.list(); }
  @Public() @Post() @ApiHeader({ name: "Idempotency-Key", required: true }) create(@Body() body: CreateOrderDto, @Headers("idempotency-key") key: string) { return this.orders.create(body, key); }
}
