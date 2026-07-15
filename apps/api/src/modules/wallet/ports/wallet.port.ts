// Puerto del Wallet Service (docs/architecture.md Cap. 5.6) — el contrato del núcleo.
// TODO Semana 2: implementación con Prisma (FOR UPDATE + idempotencia + ledger), TDD obligatorio.
// Nadie mueve saldo fuera de esta interfaz. Montos en BigInt (unidad mínima USD).

export interface WalletBalance {
  cash: bigint;
  bonus: bigint;
  total: bigint;
}

export interface DebitResult {
  ok: true;
  balance: WalletBalance;
  transactionId: string;
}

export interface InsufficientFunds {
  ok: false;
  code: "INSUFFICIENT_FUNDS";
  balance: WalletBalance;
}

export interface WalletPort {
  /**
   * Descuenta una apuesta. Idempotente por providerTxId: un reintento con el
   * mismo id devuelve el resultado original sin volver a descontar (TRAMPA #1).
   */
  debit(params: {
    userId: string;
    amount: bigint;
    providerTxId: string;
    roundId: string;
    meta?: Record<string, unknown>;
  }): Promise<DebitResult | InsufficientFunds>;

  /** Acredita un premio. Nunca falla por fondos; también idempotente. */
  credit(params: {
    userId: string;
    amount: bigint;
    providerTxId: string;
    roundId: string;
    meta?: Record<string, unknown>;
  }): Promise<DebitResult>;

  /**
   * Revierte una transacción previa escribiendo un asiento de reversión
   * (el ledger es append-only: jamás se borra el original). Idempotente.
   */
  rollback(params: {
    userId: string;
    originalProviderTxId: string;
    providerTxId: string;
  }): Promise<DebitResult | { ok: false; code: "TRANSACTION_NOT_FOUND" }>;

  getBalance(userId: string): Promise<WalletBalance>;
}
