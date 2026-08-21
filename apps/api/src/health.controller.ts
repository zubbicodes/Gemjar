import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/auth.decorators";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Public() @Get() check() { return { status: "ok", service: "gemjar-api", time: new Date().toISOString() }; }
}
