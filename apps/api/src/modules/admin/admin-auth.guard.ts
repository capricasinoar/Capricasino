import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { AdminAuthService, type AdminJwtPayload } from "./admin-auth.service";

// RBAC: cada endpoint puede exigir uno o varios roles (principio de menor
// privilegio, Cap. 8.2). super_admin pasa siempre.
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { admin?: AdminJwtPayload }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException({ error: { code: "UNAUTHORIZED", message: "Falta el token de admin" } });

    let payload: AdminJwtPayload;
    try {
      payload = await this.auth.verify(token);
    } catch {
      throw new UnauthorizedException({ error: { code: "TOKEN_INVALID", message: "Token inválido o caducado" } });
    }
    if (payload.kind !== "admin") {
      throw new UnauthorizedException({ error: { code: "NOT_ADMIN", message: "Token no es de administrador" } });
    }
    req.admin = payload;

    const required = this.reflector.get<string[]>("roles", context.getHandler());
    if (required?.length && payload.role !== "super_admin" && !required.includes(payload.role)) {
      throw new ForbiddenException({ error: { code: "FORBIDDEN", message: "Permiso insuficiente" } });
    }
    return true;
  }
}

export const CurrentAdmin = createParamDecorator((_d: unknown, ctx: ExecutionContext): AdminJwtPayload => {
  return ctx.switchToHttp().getRequest<FastifyRequest & { admin: AdminJwtPayload }>().admin;
});
