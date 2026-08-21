import { Body, Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Public, RequirePermissions } from "./auth.decorators";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedUser } from "./auth.types";
import { AuthService, type SessionContext } from "./auth.service";

class LoginDto { @IsEmail() email: string; @IsString() @MinLength(10) password: string; }
class EmailDto { @IsEmail() email: string; }
class TokenDto { @IsString() @MinLength(20) token: string; }
class MfaTicketDto { @IsString() @MinLength(20) ticket: string; }
class MfaCodeDto extends MfaTicketDto { @IsString() @MinLength(6) @MaxLength(20) code: string; }
class ResetPasswordDto extends TokenDto { @IsString() @MinLength(12) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: "Password must include upper-case, lower-case and numeric characters" }) password: string; }
class MfaResetDto { @IsString() @MinLength(8) @MaxLength(300) reason: string; }
class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName: string;
  @IsString() @MinLength(12) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: "Password must include upper-case, lower-case and numeric characters" }) password: string;
}

type SessionResult = Awaited<ReturnType<AuthService["confirmMfa"]>> | Awaited<ReturnType<AuthService["verifyMfa"]>> | Awaited<ReturnType<AuthService["verifyEmail"]>>;

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Post("register") register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Public() @Throttle({ default: { limit: 8, ttl: 60_000 } }) @Post("login") async login(@Body() body: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.email, body.password, this.context(request));
    if (result.state !== "AUTHENTICATED") return result;
    return this.respondWithSession(result, response);
  }
  @Public() @Post("mfa/setup") setupMfa(@Body() body: MfaTicketDto) { return this.auth.setupMfa(body.ticket); }
  @Public() @Post("mfa/confirm") async confirmMfa(@Body() body: MfaCodeDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.confirmMfa(body.ticket, body.code, this.context(request)), response); }
  @Public() @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post("mfa/verify") async verifyMfa(@Body() body: MfaCodeDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.verifyMfa(body.ticket, body.code, this.context(request)), response); }
  @Public() @Post("email/verify") async verifyEmail(@Body() body: TokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.verifyEmail(body.token, this.context(request)), response); }
  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post("email/verification/request") requestVerification(@Body() body: EmailDto) { return this.auth.requestEmailVerification(body.email); }
  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post("password/forgot") forgotPassword(@Body() body: EmailDto) { return this.auth.requestPasswordReset(body.email); }
  @Public() @Post("password/reset") resetPassword(@Body() body: ResetPasswordDto) { return this.auth.resetPassword(body.token, body.password); }
  @Public() @Post("refresh") async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.refresh(request.cookies?.gj_refresh ?? "", this.context(request)), response); }
  @Post("logout") async logout(@CurrentUser() user: AuthenticatedUser, @Req() request: Request, @Res({ passthrough: true }) response: Response) { await this.auth.logout(request.cookies?.gj_refresh, user.id, this.context(request)); this.clearCookies(response); return { success: true }; }
  @Get("me") me(@CurrentUser() user: AuthenticatedUser) { return { user }; }
  @Get("sessions") sessions(@CurrentUser() user: AuthenticatedUser) { return this.auth.listSessions(user.id, user.sessionId); }
  @Delete("sessions/:id") revokeSession(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.auth.revokeSession(user.id, id); }

  private respondWithSession(result: SessionResult, response: Response) {
    const secure = process.env.NODE_ENV === "production";
    const csrfToken = randomBytes(24).toString("base64url");
    response.cookie("gj_access", result.accessToken, { httpOnly: true, secure, sameSite: "strict", maxAge: 15 * 60 * 1000, path: "/" });
    response.cookie("gj_refresh", result.refreshToken, { httpOnly: true, secure, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/api/v1/auth" });
    response.cookie("gj_csrf", csrfToken, { httpOnly: false, secure, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
    const { accessToken: _access, refreshToken: _refresh, ...safe } = result;
    return { ...safe, csrfToken };
  }

  private clearCookies(response: Response) { response.clearCookie("gj_access", { path: "/" }); response.clearCookie("gj_refresh", { path: "/api/v1/auth" }); response.clearCookie("gj_csrf", { path: "/" }); }
  private context(request: Request): SessionContext { return { ip: request.ip, userAgent: request.get("user-agent") }; }
}

@ApiTags("admin identity")
@Controller("admin/users")
export class AuthAdminController {
  constructor(private readonly auth: AuthService) {}
  @RequirePermissions("settings:update") @Post(":id/mfa/reset") resetMfa(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: MfaResetDto) { return this.auth.resetMfa(user.id, id, body.reason); }
}
