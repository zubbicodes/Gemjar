import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
import type { Response } from "express";
import { AuthService } from "./auth.service";

class LoginDto { @IsEmail() email: string; @IsString() @MinLength(10) password: string; }

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("login") async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.email, body.password);
    response.cookie("gj_access", result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60 * 1000, path: "/" });
    return { user: result.user, requiresMfa: result.requiresMfa };
  }
}
