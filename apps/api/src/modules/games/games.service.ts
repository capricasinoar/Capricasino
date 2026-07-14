// Catálogo servido desde la DB con forma agnóstica al proveedor (Cap. 7.4).
// `playable` se deriva de si hay adapter registrado para el proveedor del juego.
import { Injectable } from "@nestjs/common";
import type { GameSummary } from "@capri/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { ProviderRegistry } from "../provider/provider.registry";

interface ListParams {
  category?: string; // slug de categoría
  provider?: string; // código de proveedor
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
  ) {}

  async list(params: ListParams): Promise<{ items: GameSummary[]; nextCursor: string | null }> {
    const take = Math.min(params.limit ?? 60, 100);
    const games = await this.prisma.game.findMany({
      where: {
        isActive: true,
        ...(params.provider ? { provider: { code: params.provider } } : {}),
        ...(params.category ? { categories: { some: { category: { slug: params.category } } } } : {}),
        ...(params.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
      },
      include: { provider: true, categories: { include: { category: true } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = games.length > take;
    const page = hasMore ? games.slice(0, take) : games;
    return {
      items: page.map((g) => this.toSummary(g)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async categories(): Promise<{ slug: string; name: string; count: number }[]> {
    const cats = await this.prisma.category.findMany({
      include: { _count: { select: { games: true } } },
      orderBy: { name: "asc" },
    });
    return cats.map((c) => ({ slug: c.slug, name: c.name, count: c._count.games }));
  }

  private toSummary(g: {
    id: string;
    name: string;
    slug: string;
    type: string;
    rtp: unknown;
    volatility: string | null;
    thumbnailUrl: string | null;
    isFeatured: boolean;
    provider: { code: string; name: string };
    categories: { category: { slug: string } }[];
  }): GameSummary {
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      provider: g.provider.code,
      providerName: g.provider.name,
      type: g.type as GameSummary["type"],
      rtp: g.rtp === null || g.rtp === undefined ? null : Number(g.rtp),
      volatility: (g.volatility as GameSummary["volatility"]) ?? null,
      thumbnail: g.thumbnailUrl,
      categories: g.categories.map((c) => c.category.slug),
      isFeatured: g.isFeatured,
      playable: this.registry.has(g.provider.code),
    };
  }
}
