import { Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MintsoftProvider } from "./mintsoft.provider";

@ApiTags("integrations")
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly mintsoft: MintsoftProvider) {}
  @Get("status") status() { return { data: [{ provider: "MINTSOFT", status: this.mintsoft.configured ? "HEALTHY" : "DEMO", lastSuccessAt: new Date().toISOString(), pending: 0, failed: 0 }, { provider: "SAGE_50", status: "MOCK", lastSuccessAt: new Date().toISOString(), pending: 0, failed: 0 }] }; }
  @Post("mintsoft/stock-sync") syncStock() { return this.mintsoft.getAvailability(["GJ-RNG-042", "GJ-ER-118", "GJ-NK-207"]); }
}
