import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OrdersService } from "./orders.service";
import { RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";

class OrderItemDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}
class CreateTradeOrderDto {
  @IsString() organizationId: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
  @IsEmail() email: string;
  @IsObject() deliveryAddress: Record<string, string>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() purchaseOrder?: string;
}

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @RequirePermissions("orders:read") @Get() list() {
    return this.orders.list();
  }
  @Get("mine") mine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.mine(user);
  }
  @Get(":id/reorder") reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.orders.reorder(user, id);
  }
  @Get("organization/:organizationId") forOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.orders.forOrganization(user, organizationId);
  }
  @Post("trade")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  createTrade(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTradeOrderDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.orders.createTrade(user, body, key);
  }
}
