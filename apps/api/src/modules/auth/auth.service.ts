import { createHash, randomBytes } from "node:crypto";
import { Injectable, Optional } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { RegisterRequest, LoginRequest } from "@capri/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { apiError } from "../../shared/api-error";
import { NotificationsService } from "../notifications/notifications.service";

export interface AuthTokens {
  user: { id: string; username: string; vipLevel: number };
  accessToken: string;
  expiresIn: number; // segundos
  refreshToken: string; // viaja SOLO en cookie httpOnly (la pone el controller)
}

export const ACCESS_TTL_SECONDS = 900; // 15 min (Cap. 8.1: JWT corto)
const REFRESH_TTL_DAYS = 30;

// El refresh token es opaco (no JWT): 48 bytes aleatorios. En DB solo vive su
// hash SHA-256 — un dump de la tabla sessions no permite suplantar a nadie.
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async register(data: RegisterRequest, meta: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    try {
      // Usuario + wallet en la misma transacción: no puede existir user sin wallet.
      // El wallet nace a 0; el saldo de bienvenida lo acreditará el Wallet Service (S2)
      // como transacción con asiento en el ledger — regla 2 de CLAUDE.md.
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: data.email, username: data.username, passwordHash },
        });
        await tx.wallet.create({ data: { userId: created.id } });
        return created;
      });
      await this.notifications?.create(user.id, "welcome", {});
      return this.issueTokens(user, meta);
    } catch (e: unknown) {
      // Violación de UNIQUE (email o username ya existen).
      // Mensaje deliberadamente genérico: no revelamos cuál de los dos (Cap. 8.4, enumeración).
      if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
        apiError(409, "ALREADY_REGISTERED", "No se pudo crear la cuenta con esos datos");
      }
      throw e;
    }
  }

  async login(data: LoginRequest, meta: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    // Respuesta idéntica exista o no el email (Cap. 8.4: no enumerar usuarios).
    if (!user || !(await argon2.verify(user.passwordHash, data.password))) {
      apiError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
    }
    if (user.status !== "active") {
      apiError(403, "ACCOUNT_BLOCKED", "La cuenta no está activa");
    }
    return this.issueTokens(user, meta);
  }

  /**
   * Rotación de refresh tokens (Cap. 8.1): cada refresh emite un token nuevo y
   * revoca el anterior. Si llega un token YA REVOCADO es señal de robo (alguien
   * reutilizó un token viejo) → se revocan TODAS las sesiones del usuario.
   */
  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });

    if (!session) {
      apiError(401, "INVALID_REFRESH", "Sesión no válida");
    }
    if (session.revoked) {
      // Reuso detectado → revocación en cascada de la familia de sesiones.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revoked: false },
        data: { revoked: true },
      });
      apiError(401, "REFRESH_REUSE_DETECTED", "Sesión revocada por seguridad. Vuelve a iniciar sesión");
    }
    if (session.expiresAt < new Date()) {
      apiError(401, "SESSION_EXPIRED", "La sesión ha caducado");
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== "active") {
      apiError(401, "INVALID_REFRESH", "Sesión no válida");
    }

    // Rotación: revocar la sesión usada y emitir una nueva.
    await this.prisma.session.update({ where: { id: session.id }, data: { revoked: true } });
    return this.issueTokens(user, meta);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      data: { revoked: true },
    });
  }

  private async issueTokens(
    user: { id: string; username: string; vipLevel: number },
    meta: { ip?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: ACCESS_TTL_SECONDS },
    );

    return {
      user: { id: user.id, username: user.username, vipLevel: user.vipLevel },
      accessToken,
      expiresIn: ACCESS_TTL_SECONDS,
      refreshToken,
    };
  }
}
