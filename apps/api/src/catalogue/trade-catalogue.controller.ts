import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { AccountsService } from "../accounts/accounts.service";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CatalogueService } from "./catalogue.service";

class TradeCatalogueQueryDto {
  @IsString() organizationId: string;
  @IsOptional() @IsString() q?: string;
}

@ApiTags("trade catalogue")
@Controller("trade/products")
export class TradeCatalogueController {
  constructor(
    private readonly catalogue: CatalogueService,
    private readonly accounts: AccountsService,
  ) {}
  @Get() async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TradeCatalogueQueryDto,
  ) {
    await this.accounts.assertApprovedAccess(user, query.organizationId);
    const data = await this.catalogue.listForOrganization(
      query.organizationId,
      query.q,
    );
    return { data, total: data.length };
  }
}
