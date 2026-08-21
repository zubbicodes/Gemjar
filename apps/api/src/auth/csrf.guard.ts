import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";
import { IS_PUBLIC_KEY } from "./auth.decorators";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method) || !request.cookies?.gj_access) return true;
    const cookie = request.cookies?.gj_csrf;
    const header = request.headers["x-csrf-token"];
    if (typeof cookie !== "string" || typeof header !== "string" || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) throw new ForbiddenException("CSRF validation failed");
    return true;
  }
}
