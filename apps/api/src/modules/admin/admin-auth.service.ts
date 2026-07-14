// Auth de ADMIN, separada por completo de la de jugadores (Cap. 6.3, Cap. 10):
// otra tabla (admin_users), otro secret JWT, otro guard. Un admin NO es un
// player con flag — mezclarlos es un agujero de seguridad clásico.
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  kind: "admin"; // distingue tokens de admin de los de jugador
}

const ADMIN_ACCESS_TTL = 60 * 60; // 1h (sesión de trabajo del operador)

@Injectable()
export class AdminAuthService {
  private readonly jwt = new JwtService({
    secret: process.env.ADMIN_JWT_SECRET ?? "capri-admin-secret-cambiar-en-produccion",
  });

  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Respuesta genérica: no revelar si el email de admin existe.
    if (!admin || !admin.isActive || !(await argon2.verify(admin.passwordHash, password).catch(() => false))) {
      throw new UnauthorizedException({ error: { code: "INVALID_CREDENTIALS", message: "Credenciales incorrectas" } });
    }
    // 🧩 Pendiente hardening (S10): 2FA TOTP obligatorio para admins.
    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, role: admin.role, kind: "admin" } satisfies AdminJwtPayload,
      { expiresIn: ADMIN_ACCESS_TTL },
    );
    return {
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
      expiresIn: ADMIN_ACCESS_TTL,
    };
  }

  verify(token: string): Promise<AdminJwtPayload> {
    return this.jwt.verifyAsync<AdminJwtPayload>(token);
  }
}
