import { Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }
  @Patch(":id/read") read(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.notifications.read(user.id, id);
  }
  @Post("read-all") readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.readAll(user.id);
  }
}
