import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { decryptSecret, encodeBase32, encryptSecret, generateRecoveryCode, recoveryHash, verifyTotp } from "./mfa.crypto";

type ChallengePurpose = "mfa-enrollment" | "mfa-verification";
type ChallengePayload = { sub: string; purpose: ChallengePurpose };

@Injectable()
export class MfaService {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  issueChallenge(userId: string, purpose: ChallengePurpose) {
    return this.jwt.signAsync({ sub: userId, purpose }, { expiresIn: "10m" });
  }

  async hasVerifiedFactor(userId: string) {
    return Boolean(await this.prisma.mfaFactor.findFirst({ where: { userId, verifiedAt: { not: null } }, select: { id: true } }));
  }

  async setup(ticket: string) {
    const challenge = await this.readChallenge(ticket, "mfa-enrollment");
    const user = await this.prisma.user.findUnique({ where: { id: challenge.sub }, select: { email: true } });
    if (!user) throw new UnauthorizedException("MFA challenge is no longer valid");
    const secret = encodeBase32(randomBytes(20));
    await this.prisma.$transaction([
      this.prisma.mfaFactor.deleteMany({ where: { userId: challenge.sub, verifiedAt: null } }),
      this.prisma.mfaFactor.create({ data: { userId: challenge.sub, secretEncrypted: encryptSecret(secret) } }),
    ]);
    const label = encodeURIComponent(`Gemjar:${user.email}`);
    const issuer = encodeURIComponent("Gemjar Commerce");
    return { secret, otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` };
  }

  async confirm(ticket: string, code: string) {
    const challenge = await this.readChallenge(ticket, "mfa-enrollment");
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId: challenge.sub, verifiedAt: null }, orderBy: { createdAt: "desc" } });
    if (!factor || !verifyTotp(decryptSecret(factor.secretEncrypted), code)) throw new UnauthorizedException("The authenticator code is incorrect or expired");
    const recoveryCodes = Array.from({ length: 10 }, generateRecoveryCode);
    await this.prisma.$transaction([
      this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { verifiedAt: new Date(), lastUsedAt: new Date() } }),
      this.prisma.mfaRecoveryCode.createMany({ data: recoveryCodes.map((recoveryCode) => ({ factorId: factor.id, codeHash: recoveryHash(recoveryCode) })) }),
    ]);
    return { userId: challenge.sub, recoveryCodes };
  }

  async verify(ticket: string, code: string) {
    const challenge = await this.readChallenge(ticket, "mfa-verification");
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId: challenge.sub, verifiedAt: { not: null } }, orderBy: { verifiedAt: "desc" } });
    if (!factor) throw new UnauthorizedException("MFA factor was not found");
    const isTotp = verifyTotp(decryptSecret(factor.secretEncrypted), code);
    if (!isTotp) {
      const recoveryCode = await this.prisma.mfaRecoveryCode.findUnique({ where: { codeHash: recoveryHash(code) } });
      if (!recoveryCode || recoveryCode.factorId !== factor.id || recoveryCode.usedAt) throw new UnauthorizedException("The MFA or recovery code is incorrect");
      const claimed = await this.prisma.mfaRecoveryCode.updateMany({ where: { id: recoveryCode.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new UnauthorizedException("The recovery code has already been used");
    }
    await this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { lastUsedAt: new Date() } });
    return { userId: challenge.sub, usedRecoveryCode: !isTotp };
  }

  private async readChallenge(ticket: string, expected: ChallengePurpose) {
    try {
      const payload = await this.jwt.verifyAsync<ChallengePayload>(ticket);
      if (payload.purpose !== expected || !payload.sub) throw new Error("Wrong challenge purpose");
      return payload;
    } catch {
      throw new UnauthorizedException("MFA challenge is invalid or expired");
    }
  }
}
