// Bonos (Cap. 5.4, 5.5). Modelo SEGURO para el casino privado: el operador
// otorga un bono (bucket bonus, no retirable); el cliente debe APOSTAR N veces
// su valor (wagering) con su cash; al cumplirlo, el bono se libera a cash. Las
// apuestas NO cambian de mecánica (siguen saliendo del cash) — así no se toca
// la ruta crítica del wallet.
import { randomUUID } from "node:crypto";
import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { NotificationsService } from "../notifications/notifications.service";

const HOUSE = "house";

@Injectable()
export class BonusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** El operador otorga un bono con requisito de apuesta (wagering = amount × mult). */
  async grant(params: { userId: string; amount: bigint; wageringMultiplier: number; adminUserId?: string }) {
    const wageringTarget = params.amount * BigInt(params.wageringMultiplier);
    // Acredita el bucket bonus (ledger) y registra la concesión.
    await this.wallet.grantBonus({
      userId: params.userId,
      amount: params.amount,
      providerCode: HOUSE,
      providerTxId: `bonusgrant_${randomUUID()}`,
      meta: { wageringMultiplier: params.wageringMultiplier, by: params.adminUserId ?? null },
    });
    const grant = await this.prisma.bonusGrant.create({
      data: {
        userId: params.userId,
        campaignId: await this.ensureManualCampaign(),
        amount: params.amount,
        wageringTarget,
        status: "active",
      },
    });
    await this.notifications?.create(params.userId, "bonus", {
      amount: Number(params.amount),
      wagering: Number(wageringTarget),
    });
    return grant;
  }

  /**
   * Avanza el wagering de los bonos activos con cada apuesta (contribución 100%
   * en los originals). Al alcanzar el objetivo, libera el bono a cash.
   * No bloquea el flujo de juego: se llama tras un bet exitoso.
   */
  async recordWager(userId: string, betAmount: bigint) {
    const grants = await this.prisma.bonusGrant.findMany({ where: { userId, status: "active" }, orderBy: { createdAt: "asc" } });
    for (const g of grants) {
      const progress = g.wageringProgress + betAmount;
      if (progress >= g.wageringTarget) {
        // Cumplido: libera el bono a cash y marca completado.
        await this.wallet.releaseBonus({
          userId,
          amount: g.amount,
          providerCode: HOUSE,
          providerTxId: `bonusrelease_${g.id}`,
        });
        await this.prisma.bonusGrant.update({ where: { id: g.id }, data: { wageringProgress: g.wageringTarget, status: "completed" } });
        await this.notifications?.create(userId, "bonus_released", { amount: Number(g.amount) });
      } else {
        await this.prisma.bonusGrant.update({ where: { id: g.id }, data: { wageringProgress: progress } });
      }
    }
  }

  /** Bonos activos del jugador con su progreso. */
  async active(userId: string) {
    const grants = await this.prisma.bonusGrant.findMany({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    return grants.map((g) => ({
      id: g.id,
      amount: Number(g.amount),
      wageringTarget: Number(g.wageringTarget),
      wageringProgress: Number(g.wageringProgress),
      progressPct: g.wageringTarget > 0n ? Math.min(100, Math.round((Number(g.wageringProgress) / Number(g.wageringTarget)) * 100)) : 100,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  // Campaña "manual" única bajo la que cuelgan los bonos otorgados a mano.
  private async ensureManualCampaign(): Promise<string> {
    const existing = await this.prisma.bonusCampaign.findUnique({ where: { code: "manual" } });
    if (existing) return existing.id;
    const created = await this.prisma.bonusCampaign.create({
      data: { code: "manual", name: "Bono manual del operador", type: "no_deposit", wageringMultiplier: 0, status: "active" },
    });
    return created.id;
  }
}
