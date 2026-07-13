import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { LoginRequest, RegisterRequest } from "@capri/contracts";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { AuthService, type AuthTokens } from "./auth.service";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "./jwt-auth.guard";

export const REFRESH_COOKIE = "capri_rt";

// La cookie solo viaja a los endpoints de auth (path), inaccesible a JS (httpOnly)
// y solo mismo sitio (SameSite=Strict) — Cap. 8.1.
function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function toBody(tokens: AuthTokens) {
  // El refresh token NUNCA va en el body, solo en la cookie.
  const { refreshToken: _omit, ...body } = tokens;
  return body;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body(new ZodValidationPipe(RegisterRequest)) body: RegisterRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const tokens = await this.auth.register(body, { ip: req.ip, userAgent: req.headers["user-agent"] });
    setRefreshCookie(reply, tokens.refreshToken);
    reply.status(201);
    return toBody(tokens);
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginRequest)) body: LoginRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const tokens = await this.auth.login(body, { ip: req.ip, userAgent: req.headers["user-agent"] });
    setRefreshCookie(reply, tokens.refreshToken);
    return toBody(tokens);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const tokens = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE] ?? "", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    setRefreshCookie(reply, tokens.refreshToken);
    return toBody(tokens);
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  }

  // Endpoint protegido mínimo para probar el guard (el /me completo llega con perfil).
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return { id: user.sub, username: user.username };
  }
}
