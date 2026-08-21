import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";

@Injectable()
export class AuthService {
  private readonly demoUser = { id: "usr_demo_admin", email: "admin@gemjar.test", firstName: "Amara", lastName: "Morgan", kind: "ADMIN", passwordHash: "" };
  constructor(private readonly jwt: JwtService) {}
  async initialize() { if (!this.demoUser.passwordHash) this.demoUser.passwordHash = await argon2.hash("GemjarDemo!2026", { type: argon2.argon2id }); }
  async login(email: string, password: string) {
    await this.initialize();
    if (email.toLowerCase() !== this.demoUser.email || !(await argon2.verify(this.demoUser.passwordHash, password))) throw new UnauthorizedException("Email or password is incorrect");
    const { passwordHash: _, ...user } = this.demoUser;
    return { user, accessToken: await this.jwt.signAsync({ sub: user.id, kind: user.kind, mfaVerified: false }), requiresMfa: true };
  }
}
