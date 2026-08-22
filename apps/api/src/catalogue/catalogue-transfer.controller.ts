import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { Response } from "express";
import { RequirePermissions } from "../auth/auth.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CatalogueTransferService } from "./catalogue-transfer.service";

class StageImportDto {
  @IsString() @MinLength(1) csv: string;
  @IsString() @MinLength(8) idempotencyKey: string;
}
class StageWorkbookDto {
  @IsString() @MinLength(1) @MaxLength(15000000) base64: string;
  @IsString() @MinLength(8) idempotencyKey: string;
}

@ApiTags("admin catalogue transfers")
@Controller("admin/catalogue-transfers")
export class CatalogueTransferController {
  constructor(private readonly transfers: CatalogueTransferService) {}
  @RequirePermissions("imports:create") @Get("imports") imports() {
    return this.transfers.listImports();
  }
  @RequirePermissions("imports:create") @Post("imports") stage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: StageImportDto,
  ) {
    return this.transfers.stage(body.csv, body.idempotencyKey, user.id);
  }
  @RequirePermissions("imports:create") @Post("imports/xlsx") stageWorkbook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: StageWorkbookDto,
  ) {
    return this.transfers.stageWorkbook(body.base64, body.idempotencyKey, user.id);
  }
  @RequirePermissions("imports:commit") @Post("imports/:id/commit") commit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.transfers.commit(id, user.id);
  }
  @RequirePermissions("exports:create") @Get("exports") exports() {
    return this.transfers.listExports();
  }
  @RequirePermissions("exports:create") @Post("exports") createExport(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfers.createExport(user.id);
  }
  @RequirePermissions("exports:create")
  @Get("exports/:id/download")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async download(@Param("id") id: string, @Res() response: Response) {
    const job = await this.transfers.downloadExport(id);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename=gemjar-catalogue-${id}.csv`,
    );
    response.send(job.content);
  }
}
