// Procesa los callbacks seamless-wallet del proveedor (Cap. 3.3-B, Cap. 7.5).
// El HTTP status es 200 incluso en errores de negocio; el error va en `status`.
// La firma se verifica en el controller ANTES de llegar aquí.
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ProviderCallback, ProviderCallbackResponse } from "@capri/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService, WalletError } from "../wallet/wallet.service";
import { ResponsibleService, LimitReachedError } from "../responsible/responsible.service";

const PROVIDER_CODE = "sim";

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly rg: ResponsibleService,
  ) {}

  async handle(cb: ProviderCallback): Promise<ProviderCallbackResponse> {
    // Sesión válida y ABIERTA (un token viejo no mueve saldo — TRAMPA #5)
    const session = await this.prisma.gameSession.findUnique({
      where: { launchToken: cb.token },
      include: { game: true },
    });
    if (!session || session.status !== "open") {
      return { status: "INVALID_TOKEN" };
    }
    const userId = session.userId;

    try {
      switch (cb.action) {
        case "balance": {
          const b = await this.wallet.getBalance(userId);
          return { status: "OK", balance: Number(b.cash), currency: "FUN" };
        }

        case "bet": {
          // Juego responsable: límite diario de apostado/pérdida (Cap. 0 #4).
          await this.rg.assertWithinLimits(userId, BigInt(cb.amount));
          const round = await this.upsertRound(session.id, cb.roundId);
          const res = await this.wallet.debit({
            userId,
            amount: BigInt(cb.amount),
            providerCode: PROVIDER_CODE,
            providerTxId: cb.transactionId,
            roundId: round.id,
            meta: { gameCode: cb.gameCode },
          });
          if (!res.replayed) {
            await this.prisma.round.update({
              where: { id: round.id },
              data: { totalBet: { increment: BigInt(cb.amount) } },
            });
          }
          return { status: "OK", balance: Number(res.balance), transactionId: cb.transactionId };
        }

        case "win": {
          // El win NUNCA falla por fondos y NO depende de que el bet haya
          // llegado antes (eventos fuera de orden — Cap. 3.6): el round_id une ambos.
          const round = await this.upsertRound(session.id, cb.roundId);
          const res = await this.wallet.credit({
            userId,
            amount: BigInt(cb.amount),
            providerCode: PROVIDER_CODE,
            providerTxId: cb.transactionId,
            roundId: round.id,
          });
          if (!res.replayed) {
            await this.prisma.round.update({
              where: { id: round.id },
              data: {
                totalWin: { increment: BigInt(cb.amount) },
                status: "settled",
                settledAt: new Date(),
              },
            });
          }
          return { status: "OK", balance: Number(res.balance), transactionId: cb.transactionId };
        }

        case "rollback": {
          const res = await this.wallet.rollback({
            userId,
            providerCode: PROVIDER_CODE,
            originalProviderTxId: cb.referenceTransactionId,
            providerTxId: cb.transactionId,
          });
          return { status: "OK", balance: Number(res.balance), transactionId: cb.transactionId };
        }
      }
    } catch (e) {
      if (e instanceof LimitReachedError) {
        const b = await this.wallet.getBalance(userId).catch(() => null);
        return { status: "LIMIT_REACHED", balance: b ? Number(b.cash) : undefined };
      }
      if (e instanceof WalletError) {
        switch (e.code) {
          case "INSUFFICIENT_FUNDS":
            return { status: "INSUFFICIENT_FUNDS", balance: Number(e.balance ?? 0n) };
          case "TRANSACTION_NOT_FOUND":
          case "ALREADY_REVERSED":
            return { status: "TRANSACTION_NOT_FOUND" };
          default:
            return { status: "INTERNAL_ERROR" };
        }
      }
      // No filtrar detalles internos al proveedor
      console.error("[provider callback] error:", e);
      return { status: "INTERNAL_ERROR" };
    }
  }

  /** Ronda por (sesión, roundId del proveedor); la crea si no existe (bet o win pueden llegar primero). */
  private async upsertRound(gameSessionId: string, providerRoundId: string) {
    try {
      return await this.prisma.round.upsert({
        where: { gameSessionId_providerRoundId: { gameSessionId, providerRoundId } },
        update: {},
        create: { gameSessionId, providerRoundId },
      });
    } catch (e) {
      // Carrera del upsert (dos callbacks simultáneos de la misma ronda):
      // el perdedor del INSERT la lee — a estas alturas ya existe seguro.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return this.prisma.round.findUniqueOrThrow({
          where: { gameSessionId_providerRoundId: { gameSessionId, providerRoundId } },
        });
      }
      throw e;
    }
  }
}
