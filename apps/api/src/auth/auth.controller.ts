import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";
import type { Request, Response } from "express";
import { Public } from "./auth.decorators";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedUser } from "./auth.types";
import { AuthService } from "./auth.service";

class LoginDto { @IsEmail() email: string; @IsString() @MinLength(10) password: string; }
class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName: string;
  @IsString() @MinLength(12) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: "Password must include upper-case, lower-case and numeric characters" }) password: string;
}

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post("register") async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.register(body), response); }
  @Public() @Post("login") async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.login(body.email, body.password), response); }
  @Public() @Post("refresh") async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) { return this.respondWithSession(await this.auth.refresh(request.cookies?.gj_refresh ?? ""), response); }
  @Post("logout") async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { await this.auth.logout(request.cookies?.gj_refresh); response.clearCookie("gj_access", { path: "/" }); response.clearCookie("gj_refresh", { path: "/api/v1/auth" }); return { success: true }; }
  @Get("me") me(@CurrentUser() user: AuthenticatedUser) { return { user }; }

  private respondWithSession(result: Awaited<ReturnType<AuthService["login"]>>, response: Response) {
    const secure = process.env.NODE_ENV === "production";
    response.cookie("gj_access", result.accessToken, { httpOnly: true, secure, sameSite: "lax", maxAge: 15 * 60 * 1000, path: "/" });
    response.cookie("gj_refresh", result.refreshToken, { httpOnly: true, secure, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000, path: "/api/v1/auth" });
    return { user: result.user, permissions: result.permissions, requiresMfa: result.requiresMfa };
  }
}
