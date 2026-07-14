// Cargas y retiradas MANUALES de saldo (operador privado, clientes seleccionados).
// 🧩 COSTURA-REAL #1: esto es el adapter "fake" del puerto PSP — el día que haya
// PSP real, cambia el adapter, no el registro contable.
//
// TRIPLE REGISTRO obligatorio de cada movimiento:
//   1. Ledger de doble entrada (inmutable) + fila en transactions  → WalletService
//   2. payment_transactions (el "recibo" del movimiento)
//   3. audit_logs (quién lo hizo, a quién, saldo antes/después, razón)
import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService, WalletError } from "../wallet/wallet.service";

export const HOUSE_PROVIDER = "house"; // provider interno para operaciones manuales

export interface ManualMovementResult {
  paymentId: string;
  transactionId: string;
  balanceBefore: bigint;
  balanceAfter: bigint;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async manualDeposit(p: {
    userId: string;
    amount: bigint;
    adminUserId: string | null;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<ManualMovementResult> {
    return this.movement({ ...p, kind: "deposit" });
  }

  async manualWithdrawal(p: {
    userId: string;
    amount: bigint;
    adminUserId: string | null;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<ManualMovementResult> {
    return this.movement({ ...p, kind: "withdrawal" });
  }

  private async movement(p: {
    kind: "deposit" | "withdrawal";
    userId: string;
    amount: bigint;
    adminUserId: string | null;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<ManualMovementResult> {
    const providerTxId = p.idempotencyKey ?? `manual_${randomUUID()}`;
    const before = await this.wallet.getBalance(p.userId);

    // 1. Movimiento contable (ledger + transaction), atómico e idempotente.
    const op =
      p.kind === "deposit"
        ? await this.wallet.deposit({
            userId: p.userId,
            amount: p.amount,
            providerCode: HOUSE_PROVIDER,
            providerTxId,
            meta: { reason: p.reason ?? null, by: p.adminUserId },
          })
        : await this.wallet.withdraw({
            userId: p.userId,
            amount: p.amount,
            providerCode: HOUSE_PROVIDER,
            providerTxId,
            meta: { reason: p.reason ?? null, by: p.adminUserId },
          });

    // Reintento idempotente: el movimiento ya se registró la primera vez;
    // no duplicamos recibo ni auditoría.
    if (op.replayed) {
      const existing = await this.prisma.paymentTransaction.findFirst({
        where: { userId: p.userId, pspRef: providerTxId },
      });
      return {
        paymentId: existing?.id ?? "",
        transactionId: op.transactionId,
        balanceBefore: before.cash,
        balanceAfter: op.balance,
      };
    }

    // 2. El "recibo" del movimiento.
    const payment = await this.prisma.paymentTransaction.create({
      data: {
        userId: p.userId,
        type: p.kind,
        amount: p.amount,
        method: "manual",
        status: "completed",
        pspRef: providerTxId,
      },
    });

    // 3. Auditoría: quién, a quién, antes/después, razón.
    await this.prisma.auditLog.create({
      data: {
        adminUserId: p.adminUserId,
        action: p.kind === "deposit" ? "wallet.manual_deposit" : "wallet.manual_withdrawal",
        targetType: "user",
        targetId: p.userId,
        before: { cash: before.cash.toString() },
        after: { cash: op.balance.toString(), amount: p.amount.toString(), reason: p.reason ?? null },
      },
    });

    return {
      paymentId: payment.id,
      transactionId: op.transactionId,
      balanceBefore: before.cash,
      balanceAfter: op.balance,
    };
  }
}

export { WalletError };
