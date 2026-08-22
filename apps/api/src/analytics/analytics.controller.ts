import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/auth.decorators";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("admin/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @RequirePermissions("orders:read") @Get("overview") overview() {
    return this.analytics.overview();
  }

  @RequirePermissions("orders:read") @Get("breakdown") breakdown() {
    return this.analytics.breakdown();
  }
}
