import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({ imports: [JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET || "local-development-secret-change-me", signOptions: { expiresIn: "15m" } })], controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
