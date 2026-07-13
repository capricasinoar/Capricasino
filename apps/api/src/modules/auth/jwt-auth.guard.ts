import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";

export interface JwtPayload {
  sub: string; // user id
  username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException({ error: { code: "UNAUTHORIZED", message: "Falta el token de acceso" } });
    }
    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException({ error: { code: "TOKEN_INVALID", message: "Token inválido o caducado" } });
    }
  }
}

// El user_id SIEMPRE sale del token verificado, jamás de un parámetro del
// cliente (TRAMPA #10, IDOR — Cap. 8.2).
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>();
  return req.user;
});
