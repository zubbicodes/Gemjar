import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";

@ApiTags("catalogue")
@Controller("products")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}
  @Get() list(@Query("q") query?: string) { const data = this.catalogue.list(query); return { data, page: 1, pageSize: data.length, total: data.length }; }
  @Get(":slug") one(@Param("slug") slug: string) { return this.catalogue.list().find((item) => item.slug === slug); }
}
