import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequestStatus, ShipmentStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { RequirePermissions } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { FulfilmentService } from "./fulfilment.service";

class ShipmentLineDto {
  @IsString() orderItemId: string;
  @IsInt() @Min(1) quantity: number;
}

class CreateShipmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ShipmentLineDto)
  lines: ShipmentLineDto[];
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() trackingNumber?: string;
}

class UpdateShipmentDto {
  @IsEnum(ShipmentStatus) status: ShipmentStatus;
  @IsOptional() @IsString() detail?: string;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() trackingNumber?: string;
}

class RequestLineDto {
  @IsString() orderItemId: string;
  @IsInt() @Min(1) quantity: number;
}

class CreateServiceRequestDto {
  @IsIn(["CANCELLATION", "RETURN"]) type: "CANCELLATION" | "RETURN";
  @IsString() reason: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestLineDto)
  items?: RequestLineDto[];
}

class UpdateServiceRequestDto {
  @IsEnum(RequestStatus) status: RequestStatus;
}

@ApiTags("fulfilment")
@Controller()
export class FulfilmentController {
  constructor(private readonly fulfilment: FulfilmentService) {}

  @Get("orders/:orderId/shipments") list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
  ) {
    return this.fulfilment.listForOrder(user, orderId);
  }

  @Get("orders/:orderId/timeline") timeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
  ) {
    return this.fulfilment.timeline(user, orderId);
  }

  @Get("orders/:orderId/requests") requests(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
  ) {
    return this.fulfilment.requestsForOrder(user, orderId);
  }

  @Post("orders/:orderId/requests") request(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CreateServiceRequestDto,
  ) {
    return this.fulfilment.createRequest(user, orderId, body);
  }

  @RequirePermissions("fulfilment:read")
  @Get("admin/requests")
  adminRequests() {
    return this.fulfilment.listRequests();
  }

  @RequirePermissions("fulfilment:update")
  @Patch("admin/requests/:id")
  updateRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateServiceRequestDto,
  ) {
    return this.fulfilment.updateRequest(user, id, body.status);
  }

  @RequirePermissions("fulfilment:update")
  @Post("orders/:orderId/shipments")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CreateShipmentDto,
  ) {
    return this.fulfilment.create(user, orderId, body);
  }

  @RequirePermissions("fulfilment:update")
  @Patch("shipments/:id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateShipmentDto,
  ) {
    return this.fulfilment.updateStatus(user, id, body);
  }
}
