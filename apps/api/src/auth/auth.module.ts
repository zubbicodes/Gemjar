import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { AuthAdminController, AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { MfaService } from "./mfa.service";
import { CsrfGuard } from "./csrf.guard";

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET || "local-development-secret-change-me", signOptions: { expiresIn: "15m" } })],
  controllers: [AuthController, AuthAdminController],
  providers: [AuthService, MfaService, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: CsrfGuard }, { provide: APP_GUARD, useClass: PermissionsGuard }],
  exports: [AuthService],
})
export class AuthModule {}
