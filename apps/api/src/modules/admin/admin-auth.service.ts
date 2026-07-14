// Auth de ADMIN, separada por completo de la de jugadores (Cap. 6.3, Cap. 10):
// otra tabla (admin_users), otro secret JWT, otro guard. Con 2FA TOTP obligatorio
// cuando está habilitado (Cap. 8.1: 2FA obligatorio para admins).
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { generateBase32Secret, verifyTotp, otpauthUri, encryptSecret, decryptSecret } from "../../shared/totp";

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

  async login(email: string, password: string, code?: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Respuesta genérica: no revelar si el email de admin existe.
    if (!admin || !admin.isActive || !(await argon2.verify(admin.passwordHash, password).catch(() => false))) {
      throw new UnauthorizedException({ error: { code: "INVALID_CREDENTIALS", message: "Credenciales incorrectas" } });
    }

    // 2FA obligatorio si está ACTIVO (no si está en configuración pendiente).
    if (admin.totpSecret) {
      const secret = decryptSecret(admin.totpSecret);
      const active = !secret.startsWith("pending:");
      if (active) {
        if (!code) {
          throw new UnauthorizedException({ error: { code: "TWO_FACTOR_REQUIRED", message: "Introduce tu código de 2FA" } });
        }
        if (!verifyTotp(secret, code)) {
          throw new UnauthorizedException({ error: { code: "TWO_FACTOR_INVALID", message: "Código de 2FA incorrecto" } });
        }
      }
    }

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, role: admin.role, kind: "admin" } satisfies AdminJwtPayload,
      { expiresIn: ADMIN_ACCESS_TTL },
    );
    return {
      admin: { id: admin.id, email: admin.email, role: admin.role, twoFactor: !!admin.totpSecret },
      accessToken,
      expiresIn: ADMIN_ACCESS_TTL,
    };
  }

  /** Paso 1: genera un secreto y su URI para escanear (aún NO activa el 2FA). */
  async setup2fa(adminId: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    const secret = generateBase32Secret();
    // Se guarda cifrado pero inactivo hasta confirmar con un código válido.
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpSecret: encryptSecret(`pending:${secret}`) } });
    return { secret, otpauthUri: otpauthUri(secret, admin.email) };
  }

  /** Paso 2: confirma con un código y ACTIVA el 2FA. */
  async enable2fa(adminId: string, code: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (!admin.totpSecret) throw new UnauthorizedException({ error: { code: "NO_SETUP", message: "Primero inicia la configuración de 2FA" } });
    const stored = decryptSecret(admin.totpSecret);
    const secret = stored.startsWith("pending:") ? stored.slice(8) : stored;
    if (!verifyTotp(secret, code)) {
      throw new UnauthorizedException({ error: { code: "TWO_FACTOR_INVALID", message: "Código incorrecto" } });
    }
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpSecret: encryptSecret(secret) } });
    return { enabled: true };
  }

  async disable2fa(adminId: string, code: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (admin.totpSecret) {
      const secret = decryptSecret(admin.totpSecret).replace(/^pending:/, "");
      if (!verifyTotp(secret, code)) {
        throw new UnauthorizedException({ error: { code: "TWO_FACTOR_INVALID", message: "Código incorrecto" } });
      }
    }
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { totpSecret: null } });
    return { enabled: false };
  }

  async status(adminId: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    const active = !!admin.totpSecret && !decryptSecret(admin.totpSecret).startsWith("pending:");
    return { email: admin.email, role: admin.role, twoFactorEnabled: active };
  }

  verify(token: string): Promise<AdminJwtPayload> {
    return this.jwt.verifyAsync<AdminJwtPayload>(token);
  }
}
