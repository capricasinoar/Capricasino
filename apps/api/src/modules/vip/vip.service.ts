// Club VIP (Cap. UX.3): el nivel sube según el volumen apostado (en USD, unidad
// mínima). Se calcula al vuelo desde el ledger de transacciones — no hay estado
// que mantener sincronizado. Cada nivel mejora el cashback y los beneficios.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface VipTier {
  key: string;
  name: string;
  minWagered: number; // umbral de apostado acumulado (unidad mínima USD)
  cashbackPct: number;
  perks: string;
}

// Umbrales en centavos: 5.000 / 50.000 / 250.000 USD.
export const VIP_TIERS: VipTier[] = [
  { key: "marina", name: "Marina", minWagered: 0, cashbackPct: 0, perks: "Giros diarios y soporte estándar" },
  { key: "anacapri", name: "Anacapri", minWagered: 500_000, cashbackPct: 5, perks: "Cashback 5% y límites ampliados" },
  { key: "faraglioni", name: "Faraglioni", minWagered: 5_000_000, cashbackPct: 10, perks: "Cashback 10%, bonos a medida y rakeback" },
  { key: "grotta", name: "Grotta Azzurra", minWagered: 25_000_000, cashbackPct: 15, perks: "Anfitrión personal y recompensas únicas" },
];

export interface VipStatus {
  level: number; // 0..3
  tier: string; // nombre del nivel actual
  cashbackPct: number;
  perks: string;
  totalWagered: number; // acumulado apostado (unidad mínima)
  nextTier: string | null; // nombre del siguiente nivel (null si es el máximo)
  wageredToNext: number; // cuánto falta para el siguiente (0 si es el máximo)
  progressPct: number; // 0..100 hacia el siguiente nivel
}

@Injectable()
export class VipService {
  constructor(private readonly prisma: PrismaService) {}

  async totalWagered(userId: string): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "bet" } });
    return Number(agg._sum.amount ?? 0n);
  }

  async status(userId: string): Promise<VipStatus> {
    const wagered = await this.totalWagered(userId);
    return this.statusFromWagered(wagered);
  }

  /** Nivel a partir de un acumulado dado (separado para testear sin DB). */
  statusFromWagered(wagered: number): VipStatus {
    let idx = 0;
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (wagered >= VIP_TIERS[i].minWagered) {
        idx = i;
        break;
      }
    }
    const tier = VIP_TIERS[idx];
    const next = VIP_TIERS[idx + 1] ?? null;
    const wageredToNext = next ? Math.max(0, next.minWagered - wagered) : 0;
    const progressPct = next
      ? Math.min(100, Math.round(((wagered - tier.minWagered) / (next.minWagered - tier.minWagered)) * 100))
      : 100;
    return {
      level: idx,
      tier: tier.name,
      cashbackPct: tier.cashbackPct,
      perks: tier.perks,
      totalWagered: wagered,
      nextTier: next?.name ?? null,
      wageredToNext,
      progressPct,
    };
  }
}
