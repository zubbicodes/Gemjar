import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { RequirePermissions } from "../auth/auth.decorators";
import { AuditService } from "./audit.service";

class AuditQueryDto { @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(250) limit?: number; }

@ApiTags("audit")
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @RequirePermissions("audit:read") @Get() list(@Query() query: AuditQueryDto) { return this.audit.list(query.limit); }
}
