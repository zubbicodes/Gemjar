import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserKind } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async register(input: { email: string; password: string; firstName: string; lastName: string }) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException("An account already exists for this email address");
    const user = await this.prisma.user.create({ data: { email, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }), firstName: input.firstName.trim(), lastName: input.lastName.trim(), kind: UserKind.CONSUMER, emailVerifiedAt: new Date() }, select: { id: true, email: true, firstName: true, lastName: true, kind: true, mfaRequired: true } });
    return this.createSession(user);
  }

  async login(emailInput: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) throw new UnauthorizedException("Email or password is incorrect");
    const permissions = user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => `${permission.resource}:${permission.action}`));
    return this.createSession(user, [...new Set(permissions)]);
  }

  async refresh(token: string) {
    const session = await this.prisma.session.findUnique({ where: { refreshHash: this.hashToken(token) }, include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException("Refresh session is invalid or expired");
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const permissions = session.user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => `${permission.resource}:${permission.action}`));
    return this.createSession(session.user, [...new Set(permissions)]);
  }

  async logout(token?: string) {
    if (token) await this.prisma.session.updateMany({ where: { refreshHash: this.hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async createSession(user: { id: string; email: string; firstName: string; lastName: string; kind: UserKind; mfaRequired: boolean }, permissions: string[] = []) {
    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.session.create({ data: { userId: user.id, refreshHash: this.hashToken(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_MS) } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, kind: user.kind, permissions });
    return { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kind: user.kind }, permissions, accessToken, refreshToken, requiresMfa: user.mfaRequired };
  }

  private hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
}
