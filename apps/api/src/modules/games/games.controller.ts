import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { LaunchGameRequest } from "@capri/contracts";
import { z } from "zod";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { apiError } from "../../shared/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { SimProviderAdapter } from "../provider/adapters/sim-provider.adapter";

type LaunchBody = z.infer<typeof LaunchGameRequest>;

// Launch de juego (Cap. 1.7). El catálogo completo llega en S4;
// por ahora este módulo solo abre sesiones de juego.
@Controller("games")
export class GamesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simProvider: SimProviderAdapter,
  ) {}

  @Post("launch")
  @UseGuards(JwtAuthGuard)
  async launch(
    @Body(new ZodValidationPipe(LaunchGameRequest)) body: LaunchBody,
    @CurrentUser() user: JwtPayload,
  ) {
    // Acepta id (UUID) o slug. Solo consulta por id si parece UUID (evita P2023).
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.gameId);
    const game = await this.prisma.game.findFirst({
      where: {
        isActive: true,
        ...(isUuid ? { OR: [{ id: body.gameId }, { slug: body.gameId }] } : { slug: body.gameId }),
      },
      include: { provider: true },
    });
    if (!game) apiError(404, "GAME_NOT_FOUND", "El juego no existe o no está activo");
    if (game.provider.code !== "sim") apiError(400, "PROVIDER_UNAVAILABLE", "Proveedor no disponible todavía");

    // Sesión de juego con token temporal: el proveedor lo devolverá en cada callback
    const launchToken = randomBytes(24).toString("base64url");
    const session = await this.prisma.gameSession.create({
      data: { userId: user.sub, gameId: game.id, launchToken },
    });

    const { gameUrl } = await this.simProvider.launch({
      gameCode: game.code,
      playerToken: launchToken,
      currency: "FUN",
      language: "es",
    });

    return { gameUrl, sessionId: session.id, launchToken };
  }
}
