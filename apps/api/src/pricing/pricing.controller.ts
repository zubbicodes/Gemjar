import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsIn, IsInt, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { Public } from "../auth/auth.decorators";
import { PricingService } from "./pricing.service";

class QuoteItemDto { @IsString() variantId: string; @IsInt() @Min(1) quantity: number; }
class RetailQuoteDto { @IsIn(["B2C"]) channel: "B2C"; @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items: QuoteItemDto[]; }
class TradeQuoteDto { @IsString() organizationId: string; @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items: QuoteItemDto[]; }

@ApiTags("pricing")
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}
  @Public() @Post("quote") quote(@Body() body: RetailQuoteDto) { return this.pricing.quote(body); }
  @Post("trade-quote") tradeQuote(@CurrentUser() user: AuthenticatedUser, @Body() body: TradeQuoteDto) { return this.pricing.tradeQuote(user, body); }
}
