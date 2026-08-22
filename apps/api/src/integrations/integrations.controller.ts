import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JobStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { IntegrationsService } from "./integrations.service";

class JobQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
}

@ApiTags("integrations")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @RequirePermissions("integrations:read") @Get("status") status() {
    return this.integrations.status();
  }

  @RequirePermissions("integrations:read") @Get("jobs") jobs(
    @Query() query: JobQueryDto,
  ) {
    return this.integrations.jobs(query.limit, query.status);
  }

  @RequirePermissions("integrations:retry") @Post("jobs/:id/retry") retry(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.integrations.retry(user, id);
  }

  @RequirePermissions("integrations:retry")
  @Post("mintsoft/stock-sync")
  syncStock(@CurrentUser() user: AuthenticatedUser) {
    return this.integrations.syncStock(user);
  }
  @RequirePermissions("integrations:retry")
  @Post("sage/invoice-sync")
  syncInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.integrations.syncInvoices(user);
  }
}
