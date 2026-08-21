import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import type { AccessPayload } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.gj_access ?? request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("Authentication is required");
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, firstName: true, lastName: true, kind: true } });
      if (!user) throw new UnauthorizedException("Session user no longer exists");
      request.user = { ...user, permissions: payload.permissions };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Session is invalid or expired");
    }
  }
}
