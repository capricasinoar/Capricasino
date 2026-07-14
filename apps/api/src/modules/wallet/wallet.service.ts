// Wallet Service — el corazón económico (docs/architecture.md Cap. 5).
// REGLAS: nadie más escribe saldo; todo movimiento = transacción + asientos de
// doble entrada (suma cero) en la MISMA transacción de DB; ledger append-only;
// idempotencia por (provider, providerTxId); dinero en BigInt.
import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, TransactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// Evento de dominio que dispara el push de saldo por WebSocket (Cap. 9.3).
export const BALANCE_CHANGED = "balance.changed";
export interface BalanceChangedEvent {
  userId: string;
  cash: bigint;
}

export type WalletErrorCode =
  | "INSUFFICIENT_FUNDS"
  | "WALLET_NOT_FOUND"
  | "TRANSACTION_NOT_FOUND"
  | "ALREADY_REVERSED";

export class WalletError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    readonly balance?: bigint,
  ) {
    super(code);
  }
}

export interface WalletOpResult {
  transactionId: string; // id interno
  providerTxId: string;
  balance: bigint; // cash tras la operación
  replayed: boolean; // true si fue un reintento idempotente
}

interface LedgerLeg {
  account: string;
  direction: "debit" | "credit";
  amount: bigint;
}

const accounts = {
  playerCash: (userId: string) => `player:${userId}:cash`,
  houseWagering: "house:wagering",
  houseDeposits: "house:deposits",
};

// Reintento ante deadlock (40P01) o conflicto de serialización — Cap. 5.3-D.
const RETRYABLE = ["40P01", "40001"];
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const known = e instanceof Prisma.PrismaClientKnownRequestError;
      const pgCode = known ? String((e as Prisma.PrismaClientKnownRequestError).meta?.code ?? "") : "";
      // P2034 = conflicto de transacción/deadlock detectado por Prisma
      const retryable = (known && (e as Prisma.PrismaClientKnownRequestError).code === "P2034") || RETRYABLE.includes(pgCode);
      if (!retryable || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 20 * i + Math.random() * 30));
    }
  }
}

@Injectable()
export class WalletService {
  // events es opcional: en tests se instancia `new WalletService(prisma)` sin bus.
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  async getBalance(userId: string): Promise<{ cash: bigint; bonus: bigint; total: bigint }> {
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) throw new WalletError("WALLET_NOT_FOUND");
    return { cash: w.cashBalance, bonus: w.bonusBalance, total: w.cashBalance + w.bonusBalance };
  }

  /** Apuesta: descuenta cash del jugador hacia la casa. Falla con INSUFFICIENT_FUNDS. */
  debit(p: { userId: string; amount: bigint; providerCode: string; providerTxId: string; roundId?: string; meta?: Prisma.InputJsonValue }) {
    return this.apply({
      ...p,
      type: "bet",
      delta: -p.amount,
      legs: [
        { account: accounts.playerCash(p.userId), direction: "debit", amount: p.amount },
        { account: accounts.houseWagering, direction: "credit", amount: p.amount },
      ],
    });
  }

  /** Premio: acredita de la casa al jugador. Nunca falla por fondos. */
  credit(p: { userId: string; amount: bigint; providerCode: string; providerTxId: string; roundId?: string; meta?: Prisma.InputJsonValue }) {
    return this.apply({
      ...p,
      type: "win",
      delta: p.amount,
      legs: [
        { account: accounts.houseWagering, direction: "debit", amount: p.amount },
        { account: accounts.playerCash(p.userId), direction: "credit", amount: p.amount },
      ],
    });
  }

  /** Carga manual de saldo (la hace el operador). Queda en ledger + transaction. */
  deposit(p: { userId: string; amount: bigint; providerCode: string; providerTxId: string; meta?: Prisma.InputJsonValue }) {
    return this.apply({
      ...p,
      type: "deposit",
      delta: p.amount,
      legs: [
        { account: accounts.houseDeposits, direction: "debit", amount: p.amount },
        { account: accounts.playerCash(p.userId), direction: "credit", amount: p.amount },
      ],
    });
  }

  /** Retirada manual de saldo. Falla con INSUFFICIENT_FUNDS. */
  withdraw(p: { userId: string; amount: bigint; providerCode: string; providerTxId: string; meta?: Prisma.InputJsonValue }) {
    return this.apply({
      ...p,
      type: "withdrawal",
      delta: -p.amount,
      legs: [
        { account: accounts.playerCash(p.userId), direction: "debit", amount: p.amount },
        { account: accounts.houseDeposits, direction: "credit", amount: p.amount },
      ],
    });
  }

  /**
   * Reversión de una transacción previa: NUNCA se edita/borra el asiento
   * original (TRAMPA #6) — se escriben asientos inversos. Idempotente por el
   * providerTxId del propio rollback.
   */
  async rollback(p: { userId: string; providerCode: string; originalProviderTxId: string; providerTxId: string }): Promise<WalletOpResult> {
    const provider = await this.providerByCode(p.providerCode);
    const original = await this.prisma.transaction.findUnique({
      where: { providerId_providerTxId: { providerId: provider.id, providerTxId: p.originalProviderTxId } },
      include: { ledgerEntries: true },
    });
    if (!original || original.userId !== p.userId) throw new WalletError("TRANSACTION_NOT_FOUND");

    // Idempotencia del rollback: ¿ya existe?
    const existing = await this.prisma.transaction.findUnique({
      where: { providerId_providerTxId: { providerId: provider.id, providerTxId: p.providerTxId } },
    });
    if (existing) {
      return { transactionId: existing.id, providerTxId: p.providerTxId, balance: existing.balanceAfter ?? 0n, replayed: true };
    }
    if (original.status === "reversed") throw new WalletError("ALREADY_REVERSED");

    // Delta inverso sobre el cash del jugador
    const playerAccount = accounts.playerCash(p.userId);
    const originalDelta = original.ledgerEntries
      .filter((e) => e.account === playerAccount)
      .reduce((acc, e) => acc + (e.direction === "credit" ? e.amount : -e.amount), 0n);

    return this.apply({
      userId: p.userId,
      amount: original.amount,
      providerCode: p.providerCode,
      providerTxId: p.providerTxId,
      type: "rollback",
      delta: -originalDelta,
      legs: original.ledgerEntries.map((e) => ({
        account: e.account,
        direction: e.direction === "debit" ? ("credit" as const) : ("debit" as const),
        amount: e.amount,
      })),
      meta: { reverses: original.id, reversesProviderTxId: p.originalProviderTxId },
      markReversed: original.id,
    });
  }

  /* ── Núcleo atómico ────────────────────────────────────────────── */

  private async apply(p: {
    userId: string;
    amount: bigint;
    providerCode: string;
    providerTxId: string;
    type: TransactionType;
    delta: bigint; // efecto neto sobre cash del jugador
    legs: LedgerLeg[];
    roundId?: string;
    meta?: Prisma.InputJsonValue;
    markReversed?: string;
  }): Promise<WalletOpResult> {
    if (p.amount <= 0n) throw new Error("amount debe ser > 0");

    // Invariante de doble entrada: Σdebit = Σcredit. Si no cuadra es un bug: abortar.
    const debits = p.legs.filter((l) => l.direction === "debit").reduce((a, l) => a + l.amount, 0n);
    const credits = p.legs.filter((l) => l.direction === "credit").reduce((a, l) => a + l.amount, 0n);
    if (debits !== credits) throw new Error(`Asientos descuadrados: debit=${debits} credit=${credits}`);

    const provider = await this.providerByCode(p.providerCode);

    try {
      const result = await withRetry(() =>
        this.prisma.$transaction(async (tx) => {
          // 1. Insert de la transacción PRIMERO: la UNIQUE (provider, providerTxId)
          //    es la idempotencia atómica (TRAMPA #18: nunca check-then-insert).
          const created = await tx.transaction.create({
            data: {
              userId: p.userId,
              type: p.type,
              providerId: provider.id,
              providerTxId: p.providerTxId,
              roundId: p.roundId,
              amount: p.amount,
              meta: p.meta,
            },
          });

          // 2. Bloqueo pesimista de la fila del wallet (Cap. 5.3-A).
          const locked = await tx.$queryRaw<{ cash_balance: bigint }[]>`
            SELECT cash_balance FROM wallets WHERE user_id = ${p.userId}::uuid FOR UPDATE`;
          if (locked.length === 0) throw new WalletError("WALLET_NOT_FOUND");

          // 3. Update condicional (defensa 2) — el CHECK de la DB es la defensa 3.
          const newBalance = locked[0].cash_balance + p.delta;
          if (newBalance < 0n) throw new WalletError("INSUFFICIENT_FUNDS", locked[0].cash_balance);
          const affected = await tx.$executeRaw`
            UPDATE wallets SET cash_balance = cash_balance + ${p.delta}, version = version + 1, updated_at = now()
            WHERE user_id = ${p.userId}::uuid AND cash_balance + ${p.delta} >= 0`;
          if (affected === 0) throw new WalletError("INSUFFICIENT_FUNDS", locked[0].cash_balance);

          // 4. Asientos de doble entrada, misma transacción de DB.
          await tx.ledgerEntry.createMany({
            data: p.legs.map((l) => ({
              transactionId: created.id,
              account: l.account,
              direction: l.direction,
              amount: l.amount,
            })),
          });

          // 5. Guardar saldo resultante para poder reproducir la respuesta ante reintentos.
          await tx.transaction.update({ where: { id: created.id }, data: { balanceAfter: newBalance } });
          if (p.markReversed) {
            await tx.transaction.update({ where: { id: p.markReversed }, data: { status: "reversed" } });
          }

          return { transactionId: created.id, providerTxId: p.providerTxId, balance: newBalance, replayed: false };
        }),
      );

      // El saldo cambió y quedó commiteado → notificar (push por WebSocket).
      // El WS solo AVISA; la verdad es la DB (TRAMPA #11), por eso emitimos
      // después del COMMIT, nunca dentro de la transacción.
      this.events?.emit(BALANCE_CHANGED, { userId: p.userId, cash: result.balance } satisfies BalanceChangedEvent);
      return result;
    } catch (e) {
      // Reintento del proveedor: misma UNIQUE → devolver EXACTAMENTE el resultado
      // original sin volver a mover saldo (TRAMPA #1/#2).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Si el duplicado llegó EN PARALELO, el original puede estar a
        // milisegundos de hacer COMMIT (o aún sin balanceAfter): esperar breve.
        for (let i = 0; i < 5; i++) {
          const prev = await this.prisma.transaction.findUnique({
            where: { providerId_providerTxId: { providerId: provider.id, providerTxId: p.providerTxId } },
          });
          if (prev?.balanceAfter !== null && prev !== null) {
            return { transactionId: prev.id, providerTxId: p.providerTxId, balance: prev.balanceAfter!, replayed: true };
          }
          await new Promise((r) => setTimeout(r, 25 * (i + 1)));
        }
      }
      throw e;
    }
  }

  private async providerByCode(code: string) {
    const provider = await this.prisma.provider.findUnique({ where: { code } });
    if (!provider) throw new Error(`Provider desconocido: ${code}`);
    return provider;
  }

  /** Recalcula el saldo desde el ledger (auditoría/conciliación — Cap. 5.1). */
  async recomputeFromLedger(userId: string): Promise<bigint> {
    const account = accounts.playerCash(userId);
    const rows = await this.prisma.$queryRaw<{ total: bigint | null }[]>`
      SELECT COALESCE(SUM(CASE direction WHEN 'credit' THEN amount ELSE -amount END), 0)::bigint AS total
      FROM ledger_entries WHERE account = ${account}`;
    return rows[0]?.total ?? 0n;
  }
}
