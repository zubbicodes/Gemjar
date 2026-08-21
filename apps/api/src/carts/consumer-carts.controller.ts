import { Body, Controller, Get, Headers, Post, Put } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsString, Min, ValidateNested } from "class-validator";
import { Public } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CartsService } from "./carts.service";

class ConsumerCartItemDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}
class ConsumerCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumerCartItemDto)
  items: ConsumerCartItemDto[];
}

@ApiTags("consumer carts")
@Controller("carts")
export class ConsumerCartsController {
  constructor(private readonly carts: CartsService) {}

  @Public()
  @Get("guest")
  @ApiHeader({ name: "X-Cart-Token", required: false })
  guest(@Headers("x-cart-token") token?: string) {
    return this.carts.guestCart(token);
  }

  @Public()
  @Put("guest")
  @ApiHeader({ name: "X-Cart-Token", required: false })
  saveGuest(
    @Headers("x-cart-token") token: string | undefined,
    @Body() body: ConsumerCartDto,
  ) {
    return this.carts.saveGuestCart(token, body.items);
  }

  @Get("consumer") consumer(@CurrentUser() user: AuthenticatedUser) {
    return this.carts.consumerCart(user);
  }
  @Put("consumer") saveConsumer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ConsumerCartDto,
  ) {
    return this.carts.saveConsumerCart(user, body.items);
  }
  @Post("consumer/merge")
  @ApiHeader({ name: "X-Cart-Token", required: false })
  merge(
    @CurrentUser() user: AuthenticatedUser,
    @Headers("x-cart-token") token?: string,
  ) {
    return this.carts.mergeGuestCart(user, token);
  }
}
