import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PricingService } from "./pricing.service";
import { Public } from "../auth/auth.decorators";

class QuoteItemDto { @IsString() variantId: string; @IsInt() @Min(1) quantity: number; }
class QuoteDto { @IsIn(["B2C", "B2B", "SALES_AGENT"]) channel: "B2C" | "B2B" | "SALES_AGENT"; @IsOptional() @IsString() organizationId?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items: QuoteItemDto[]; }

@ApiTags("pricing")
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}
  @Public() @Post("quote") quote(@Body() body: QuoteDto) { return this.pricing.quote(body); }
}
