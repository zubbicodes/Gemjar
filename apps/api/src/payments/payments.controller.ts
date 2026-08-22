import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type { Request } from "express";
import {
  OptionalAuth,
  Public,
  RequirePermissions,
} from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PaymentsService } from "./payments.service";

class CheckoutItemDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}
class CheckoutAddressDto {
  @IsString() @MinLength(2) firstName: string;
  @IsString() @MinLength(2) lastName: string;
  @IsString() @MinLength(10) phone: string;
  @IsString() @MinLength(4) line1: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() @MinLength(2) city: string;
  @IsOptional() @IsString() county?: string;
  @IsString()
  @Matches(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, {
    message: "postcode must be a valid UK postcode",
  })
  postcode: string;
  @IsIn(["GB"]) countryCode: "GB";
}
class CheckoutDto {
  @IsEmail() email: string;
  @IsString() deliveryMethodCode: string;
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  deliveryAddress: CheckoutAddressDto;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
class TradeCheckoutDto {
  @IsString() organizationId: string;
  @IsEmail() email: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
  @IsObject() deliveryAddress: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) purchaseOrder?: string;
}
class ConfirmationDto {
  @IsString() @MinLength(16) confirmationToken: string;
}
class RefundDto {
  @IsString() paymentId: string;
  @IsInt() @Min(1) amountMinor: number;
  @IsString() @MinLength(3) @MaxLength(300) reason: string;
  @IsString() @MinLength(16) idempotencyKey: string;
}

@ApiTags("payments and checkout")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public() @Get("delivery-methods") deliveryMethods() {
    return this.payments.deliveryMethods();
  }

  @OptionalAuth()
  @Post("checkout")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  checkout(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CheckoutDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.payments.startCheckout(user, body, key);
  }

  @Post("trade-checkout")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  tradeCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TradeCheckoutDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.payments.startTradeCheckout(user, body, key);
  }

  @Public()
  @Post(":id/mock-confirm")
  confirmMock(@Param("id") id: string, @Body() body: ConfirmationDto) {
    return this.payments.confirmMock(id, body.confirmationToken);
  }

  @Public()
  @Post("webhooks/stripe")
  stripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string,
  ) {
    return this.payments.handleStripeWebhook(
      request.rawBody ?? Buffer.alloc(0),
      signature,
    );
  }

  @Public()
  @Get("orders/:orderId/confirmation")
  confirmation(
    @Param("orderId") orderId: string,
    @Headers("x-confirmation-token") token: string,
  ) {
    return this.payments.confirmation(orderId, token);
  }
  @RequirePermissions("finance:refund") @Post("refunds") refund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RefundDto,
  ) {
    return this.payments.refund(user, body);
  }
}
