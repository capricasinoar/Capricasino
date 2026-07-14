import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { LaunchGameRequest } from "@capri/contracts";
import { z } from "zod";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { apiError } from "../../shared/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { ProviderRegistry } from "../provider/provider.registry";
import { GamesService } from "./games.service";

type LaunchBody = z.infer<typeof LaunchGameRequest>;

@Controller("games")
export class GamesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
    private readonly registry: ProviderRegistry,
  ) {}

  // Catálogo público (el lobby lo muestra logueado o no).
  @Get()
  list(
    @Query("category") category?: string,
    @Query("provider") provider?: string,
    @Query("search") search?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.games.list({ category, provider, search, cursor });
  }

  @Get("categories")
  categories() {
    return this.games.categories();
  }

  // Lanzar un juego: requiere sesión y despacha al adapter del proveedor.
  @Post("launch")
  @UseGuards(JwtAuthGuard)
  async launch(
    @Body(new ZodValidationPipe(LaunchGameRequest)) body: LaunchBody,
    @CurrentUser() user: JwtPayload,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.gameId);
    const game = await this.prisma.game.findFirst({
      where: {
        isActive: true,
        ...(isUuid ? { OR: [{ id: body.gameId }, { slug: body.gameId }] } : { slug: body.gameId }),
      },
      include: { provider: true },
    });
    if (!game) apiError(404, "GAME_NOT_FOUND", "El juego no existe o no está activo");

    // Agnóstico: se resuelve el adapter por el código del proveedor del juego.
    const adapter = this.registry.get(game.provider.code);
    if (!adapter) {
      apiError(400, "PROVIDER_UNAVAILABLE", "Este juego todavía no está disponible para jugar");
    }

    const launchToken = randomBytes(24).toString("base64url");
    const session = await this.prisma.gameSession.create({
      data: { userId: user.sub, gameId: game.id, launchToken },
    });

    const { gameUrl } = await adapter.launch({
      gameCode: game.code,
      playerToken: launchToken,
      currency: "FUN",
      language: "es",
    });

    return { gameUrl, sessionId: session.id, launchToken };
  }
}
