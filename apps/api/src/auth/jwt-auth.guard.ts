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
      if (!payload.sid) throw new UnauthorizedException("Session is invalid or expired");
      const session = await this.prisma.session.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, kind: true } } } });
      if (!session) throw new UnauthorizedException("Session is invalid or expired");
      request.user = { ...session.user, permissions: payload.permissions, sessionId: session.id };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Session is invalid or expired");
    }
  }
}
