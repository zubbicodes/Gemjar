import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";
import { Public } from "../auth/auth.decorators";

@ApiTags("catalogue")
@Controller("products")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}
  @Public() @Get() async list(@Query("q") query?: string) {
    const data = await this.catalogue.list(query);
    return { data, page: 1, pageSize: data.length, total: data.length };
  }
  @Public() @Get(":slug") one(@Param("slug") slug: string) {
    return this.catalogue.findBySlug(slug);
  }
}
