import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/auth.decorators";
import { PrismaService } from "./database/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Public() @Get() check() {
    return {
      status: "ok",
      service: "gemjar-api",
      time: new Date().toISOString(),
    };
  }
  @Public() @Get("ready") async ready() {
    const started = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: "ready",
      service: "gemjar-api",
      database: "ok",
      latencyMs: Date.now() - started,
      time: new Date().toISOString(),
    };
  }
}
