import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccessService } from "./access.service";
class RoleDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsArray() @IsString({ each: true }) permissionIds: string[];
}
class AssignDto {
  @IsString() roleId: string;
}
@ApiTags("access administration")
@Controller("admin/access")
export class AccessController {
  constructor(private readonly access: AccessService) {}
  @RequirePermissions("roles:read") @Get() overview() {
    return this.access.overview();
  }
  @RequirePermissions("roles:update") @Post("roles") create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RoleDto,
  ) {
    return this.access.createRole(
      user.id,
      body.name,
      body.description,
      body.permissionIds,
    );
  }
  @RequirePermissions("roles:update") @Post("users/:userId/roles") assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() body: AssignDto,
  ) {
    return this.access.assign(user.id, userId, body.roleId);
  }
  @RequirePermissions("roles:update")
  @Delete("users/:userId/roles/:roleId")
  unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Param("roleId") roleId: string,
  ) {
    return this.access.unassign(user.id, userId, roleId);
  }
}
