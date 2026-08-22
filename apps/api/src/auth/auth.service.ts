import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserKind } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { MfaService } from "./mfa.service";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const accessInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} as const;
export type SessionContext = { ip?: string; userAgent?: string };

/**
 * Second-factor enforcement is on unless AUTH_MFA_ENABLED is explicitly "false".
 * Turning it off downgrades administrator and sales-agent sign-in to a single
 * password, and exists only so demonstration environments can be walked through
 * without an authenticator app. Leave it on wherever real customer data lives.
 */
export function mfaEnforced() {
  return process.env.AUTH_MFA_ENABLED?.trim().toLowerCase() !== "false";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const email = input.email.trim().toLowerCase();
    if (
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
    )
      throw new ConflictException(
        "An account already exists for this email address",
      );
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(input.password, {
          type: argon2.argon2id,
        }),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        kind: UserKind.CONSUMER,
      },
    });
    const token = await this.createSecurityToken(
      user.id,
      "EMAIL_VERIFICATION",
      EMAIL_TOKEN_TTL_MS,
    );
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_REGISTERED",
      entityType: "User",
      entityId: user.id,
    });
    return {
      state: "EMAIL_VERIFICATION_REQUIRED" as const,
      user: this.safeUser(user),
      ...this.developmentToken(token),
    };
  }

  async login(
    emailInput: string,
    password: string,
    context: SessionContext = {},
  ) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: accessInclude,
    });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      await this.audit.record({
        actorId: user?.id,
        event: "AUTH_LOGIN_FAILED",
        entityType: "User",
        entityId: user?.id ?? "unknown",
        metadata: {
          emailHash: this.hashToken(email),
          ...this.auditContext(context),
        },
      });
      throw new UnauthorizedException("Email or password is incorrect");
    }
    if (!user.emailVerifiedAt)
      throw new ForbiddenException(
        "Verify your email address before signing in",
      );
    const requiresMfa =
      mfaEnforced() &&
      (user.mfaRequired ||
        user.kind === UserKind.ADMIN ||
        user.kind === UserKind.AGENT);
    if (requiresMfa) {
      const enrolled = await this.mfa.hasVerifiedFactor(user.id);
      const challengeToken = await this.mfa.issueChallenge(
        user.id,
        enrolled ? "mfa-verification" : "mfa-enrollment",
      );
      await this.audit.record({
        actorId: user.id,
        event: enrolled
          ? "AUTH_MFA_CHALLENGED"
          : "AUTH_MFA_ENROLLMENT_REQUIRED",
        entityType: "User",
        entityId: user.id,
        metadata: this.auditContext(context),
      });
      return {
        state: "MFA_REQUIRED" as const,
        user: this.safeUser(user),
        challengeToken,
        enrollmentRequired: !enrolled,
      };
    }
    return this.createSession(user, this.permissions(user), context);
  }

  async setupMfa(ticket: string) {
    return this.mfa.setup(ticket);
  }

  async confirmMfa(ticket: string, code: string, context: SessionContext = {}) {
    const result = await this.mfa.confirm(ticket, code);
    const user = await this.findAccessUser(result.userId);
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_MFA_ENROLLED",
      entityType: "User",
      entityId: user.id,
      metadata: this.auditContext(context),
    });
    return {
      ...(await this.createSession(user, this.permissions(user), context)),
      recoveryCodes: result.recoveryCodes,
    };
  }

  async verifyMfa(ticket: string, code: string, context: SessionContext = {}) {
    const result = await this.mfa.verify(ticket, code);
    const user = await this.findAccessUser(result.userId);
    await this.audit.record({
      actorId: user.id,
      event: result.usedRecoveryCode
        ? "AUTH_RECOVERY_CODE_USED"
        : "AUTH_MFA_VERIFIED",
      entityType: "User",
      entityId: user.id,
      metadata: this.auditContext(context),
    });
    return this.createSession(user, this.permissions(user), context);
  }

  async verifyEmail(token: string, context: SessionContext = {}) {
    const securityToken = await this.consumeSecurityToken(
      token,
      "EMAIL_VERIFICATION",
    );
    const user = await this.prisma.user.update({
      where: { id: securityToken.userId },
      data: { emailVerifiedAt: new Date() },
      include: accessInclude,
    });
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_EMAIL_VERIFIED",
      entityType: "User",
      entityId: user.id,
    });
    return this.createSession(user, this.permissions(user), context);
  }

  async requestEmailVerification(emailInput: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
    });
    if (!user || user.emailVerifiedAt) return { accepted: true };
    await this.prisma.securityToken.updateMany({
      where: { userId: user.id, type: "EMAIL_VERIFICATION", usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = await this.createSecurityToken(
      user.id,
      "EMAIL_VERIFICATION",
      EMAIL_TOKEN_TTL_MS,
    );
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_EMAIL_VERIFICATION_REQUESTED",
      entityType: "User",
      entityId: user.id,
    });
    return { accepted: true, ...this.developmentToken(token) };
  }

  async requestPasswordReset(emailInput: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
    });
    if (!user) return { accepted: true };
    await this.prisma.securityToken.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = await this.createSecurityToken(
      user.id,
      "PASSWORD_RESET",
      RESET_TOKEN_TTL_MS,
    );
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
    });
    return { accepted: true, ...this.developmentToken(token) };
  }

  async resetPassword(token: string, password: string) {
    const securityToken = await this.consumeSecurityToken(
      token,
      "PASSWORD_RESET",
    );
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: securityToken.userId },
        data: {
          passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: securityToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorId: securityToken.userId,
      event: "AUTH_PASSWORD_RESET",
      entityType: "User",
      entityId: securityToken.userId,
    });
    return { success: true };
  }

  async refresh(token: string, context: SessionContext = {}) {
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: this.hashToken(token) },
      include: { user: { include: accessInclude } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date())
      throw new UnauthorizedException("Refresh session is invalid or expired");
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });
    await this.audit.record({
      actorId: session.userId,
      event: "AUTH_SESSION_ROTATED",
      entityType: "Session",
      entityId: session.id,
      metadata: this.auditContext(context),
    });
    return this.createSession(
      session.user,
      this.permissions(session.user),
      context,
    );
  }

  async logout(
    token: string | undefined,
    actorId?: string,
    context: SessionContext = {},
  ) {
    if (!token) return;
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: this.hashToken(token) },
      select: { id: true, userId: true },
    });
    if (!session) return;
    await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });
    await this.audit.record({
      actorId: actorId ?? session.userId,
      event: "AUTH_LOGOUT",
      entityType: "Session",
      entityId: session.id,
      metadata: this.auditContext(context),
    });
  }

  async listSessions(userId: string, currentSessionId: string) {
    const data = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipHash: true,
        userAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      data: data.map((session) => ({
        ...session,
        current: session.id === currentSessionId,
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException("Active session was not found");
    await this.audit.record({
      actorId: userId,
      event: "AUTH_SESSION_REVOKED",
      entityType: "Session",
      entityId: sessionId,
    });
    return { success: true };
  }

  async resetMfa(actorId: string, userId: string, reason: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, kind: true },
    });
    if (!target) throw new NotFoundException("User was not found");
    const [factors, sessions] = await this.prisma.$transaction([
      this.prisma.mfaFactor.deleteMany({ where: { userId } }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorId,
      event: "AUTH_MFA_RESET",
      entityType: "User",
      entityId: userId,
      before: { factorCount: factors.count },
      after: { activeSessionsRevoked: sessions.count },
      metadata: { reason: reason.trim(), targetKind: target.kind },
    });
    return {
      success: true,
      factorsRemoved: factors.count,
      sessionsRevoked: sessions.count,
    };
  }

  private async createSession(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      kind: UserKind;
    },
    permissions: string[] = [],
    context: SessionContext = {},
  ) {
    const refreshToken = randomBytes(48).toString("base64url");
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ipHash: context.ip ? this.hashToken(context.ip) : undefined,
        userAgent: context.userAgent?.slice(0, 500),
      },
    });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      sid: session.id,
      kind: user.kind,
      permissions,
    });
    await this.audit.record({
      actorId: user.id,
      event: "AUTH_SESSION_CREATED",
      entityType: "Session",
      entityId: session.id,
      metadata: this.auditContext(context),
    });
    return {
      state: "AUTHENTICATED" as const,
      user: this.safeUser(user),
      permissions,
      accessToken,
      refreshToken,
    };
  }

  private async findAccessUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: accessInclude,
    });
    if (!user) throw new UnauthorizedException("User no longer exists");
    return user;
  }

  private permissions(user: {
    roles: Array<{
      role: {
        permissions: Array<{
          permission: { resource: string; action: string };
        }>;
      };
    }>;
  }) {
    return [
      ...new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(
            ({ permission }) => `${permission.resource}:${permission.action}`,
          ),
        ),
      ),
    ];
  }

  private safeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    kind: UserKind;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      kind: user.kind,
    };
  }
  private async createSecurityToken(userId: string, type: string, ttl: number) {
    const raw = randomBytes(32).toString("base64url");
    await this.prisma.$transaction(async (transaction) => {
      const [stored, user] = await Promise.all([
        transaction.securityToken.create({
          data: {
            userId,
            type,
            tokenHash: this.hashToken(raw),
            expiresAt: new Date(Date.now() + ttl),
          },
        }),
        transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { email: true },
        }),
      ]);
      const verification = type === "EMAIL_VERIFICATION";
      const path = verification
        ? `/verify-email?token=${encodeURIComponent(raw)}`
        : `/forgot-password?token=${encodeURIComponent(raw)}`;
      await transaction.outboxEvent.create({
        data: {
          aggregate: "SecurityToken",
          aggregateId: stored.id,
          type: "NOTIFICATION_EMAIL",
          payload: {
            email: user.email,
            subject: verification
              ? "Verify your Gemjar email"
              : "Reset your Gemjar password",
            message: `${verification ? "Verify your email" : "Reset your password"}: ${process.env.WEB_URL || "http://localhost:3000"}${path}`,
          },
        },
      });
    });
    return raw;
  }
  private async consumeSecurityToken(raw: string, type: string) {
    const token = await this.prisma.securityToken.findUnique({
      where: { tokenHash: this.hashToken(raw) },
    });
    if (
      !token ||
      token.type !== type ||
      token.usedAt ||
      token.expiresAt <= new Date()
    )
      throw new UnauthorizedException("Security token is invalid or expired");
    const claimed = await this.prisma.securityToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!claimed.count)
      throw new UnauthorizedException("Security token has already been used");
    return token;
  }
  private developmentToken(token: string) {
    return process.env.NODE_ENV === "production"
      ? {}
      : { developmentToken: token };
  }
  private auditContext(context: SessionContext) {
    return {
      ipHash: context.ip ? this.hashToken(context.ip) : null,
      userAgent: context.userAgent?.slice(0, 500) ?? null,
    };
  }
  private hashToken(token: string) {
    return createHash("sha256")
      .update(`${process.env.COOKIE_SECRET || "local-cookie-secret"}:${token}`)
      .digest("hex");
  }
}
