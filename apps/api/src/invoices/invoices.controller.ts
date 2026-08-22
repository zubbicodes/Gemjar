import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { InvoicesService } from "./invoices.service";

class InvoiceQueryDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(250) limit?: number;
}

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get() list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvoiceQueryDto,
  ) {
    return query.organizationId
      ? this.invoices.listForOrganization(user, query.organizationId)
      : this.invoices.listForConsumer(user);
  }

  @RequirePermissions("finance:read") @Get("all") all(
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoices.listAll(query.limit);
  }

  @Get("order/:orderId") forOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
  ) {
    return this.invoices.forOrder(user, orderId);
  }
  @Get(":id/document") async document(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const document = await this.invoices.document(user, id);
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename=${document.number}.txt`,
    );
    response.send(document.content);
  }
}
