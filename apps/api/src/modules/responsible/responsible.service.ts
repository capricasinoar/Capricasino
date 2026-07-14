// Juego responsable (🧩 COSTURA-REAL #4, Cap. 0). Hoy la implementación es
// "básica" (límites + autoexclusión); el día de la licencia se amplía a "full"
// (reality checks obligatorios, reportes al regulador) sin cambiar los puntos
// de enforcement — que son launch (jugar) y bet (apostar).
import { Injectable } from "@nestjs/common";
import { LimitKind } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export class ExcludedError extends Error {
  constructor(readonly until: Date | null) {
    super("SELF_EXCLUDED");
  }
}
export class LimitReachedError extends Error {
  constructor(readonly kind: LimitKind) {
    super("LIMIT_REACHED");
  }
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class ResponsibleService {
  constructor(private readonly prisma: PrismaService) {}

  /** ¿El jugador está autoexcluido ahora mismo? (bloquea jugar) */
  async activeExclusion(userId: string) {
    const now = new Date();
    return this.prisma.selfExclusion.findFirst({
      where: { userId, OR: [{ until: null }, { until: { gt: now } }] },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Lanza si está autoexcluido. Enforcement en games/launch. */
  async assertCanPlay(userId: string): Promise<void> {
    const ex = await this.activeExclusion(userId);
    if (ex) throw new ExcludedError(ex.until);
  }

  /**
   * Lanza si esta apuesta rompería un límite diario. Enforcement en el bet del
   * proveedor, ANTES de descontar. Ventana = día UTC en curso.
   */
  async assertWithinLimits(userId: string, betAmount: bigint): Promise<void> {
    const limits = await this.prisma.playerLimit.findMany({
      where: { userId, active: true, kind: { in: [LimitKind.daily_wager, LimitKind.daily_loss] } },
    });
    if (limits.length === 0) return;

    const since = startOfUtcDay();
    const [bets, wins] = await Promise.all([
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "bet", createdAt: { gte: since } } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "win", createdAt: { gte: since } } }),
    ]);
    const wagered = bets._sum.amount ?? 0n;
    const won = wins._sum.amount ?? 0n;

    for (const l of limits) {
      if (l.kind === LimitKind.daily_wager && wagered + betAmount > l.value) {
        throw new LimitReachedError(LimitKind.daily_wager);
      }
      if (l.kind === LimitKind.daily_loss) {
        // Pérdida neta ya realizada hoy; si ya alcanzó el tope, no más apuestas.
        const netLoss = wagered - won;
        if (netLoss >= l.value) throw new LimitReachedError(LimitKind.daily_loss);
      }
    }
  }

  /** Estado completo para el jugador (su panel de juego responsable). */
  async status(userId: string) {
    const [limits, exclusion] = await Promise.all([
      this.prisma.playerLimit.findMany({ where: { userId, active: true } }),
      this.activeExclusion(userId),
    ]);
    const since = startOfUtcDay();
    const [bets, wins] = await Promise.all([
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "bet", createdAt: { gte: since } } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "win", createdAt: { gte: since } } }),
    ]);
    const wageredToday = Number(bets._sum.amount ?? 0n);
    const netLossToday = Math.max(0, wageredToday - Number(wins._sum.amount ?? 0n));

    return {
      limits: limits.map((l) => ({ kind: l.kind, value: Number(l.value) })),
      exclusion: exclusion ? { until: exclusion.until?.toISOString() ?? null, source: exclusion.source } : null,
      wageredToday,
      netLossToday,
    };
  }

  async setLimit(userId: string, kind: LimitKind, value: bigint): Promise<void> {
    await this.prisma.playerLimit.upsert({
      where: { userId_kind: { userId, kind } },
      update: { value, active: true },
      create: { userId, kind, value },
    });
  }

  async removeLimit(userId: string, kind: LimitKind): Promise<void> {
    await this.prisma.playerLimit.updateMany({ where: { userId, kind }, data: { active: false } });
  }

  /**
   * Autoexclusión. days=null → permanente. La hace el jugador o un admin.
   * Marca el estado de la cuenta como self_excluded si es indefinida/larga.
   */
  async selfExclude(params: {
    userId: string;
    days: number | null;
    reason?: string;
    source: "player" | "admin";
    createdBy?: string;
  }): Promise<void> {
    const until = params.days === null ? null : new Date(Date.now() + params.days * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.selfExclusion.create({
        data: { userId: params.userId, until, reason: params.reason, source: params.source, createdBy: params.createdBy },
      }),
      this.prisma.user.update({ where: { id: params.userId }, data: { status: "self_excluded" } }),
    ]);
  }

  /** Levantar exclusión (solo admin/soporte): reactiva la cuenta. */
  async liftExclusion(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.selfExclusion.updateMany({
        where: { userId, OR: [{ until: null }, { until: { gt: now } }] },
        data: { until: now },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { status: "active" } }),
    ]);
  }
}
