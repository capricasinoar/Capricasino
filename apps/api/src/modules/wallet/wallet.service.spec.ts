// Tests del Wallet — la especificación ejecutable del núcleo (Cap. 14.1).
// Cubren los cuatro problemas de concurrencia del Cap. 5.3 contra Postgres REAL.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService, WalletError } from "./wallet.service";

const probe = new PrismaClient();
let dbUp = true;
try {
  await probe.$queryRaw`SELECT 1`;
} catch {
  dbUp = false;
}
await probe.$disconnect();

const run = describe.skipIf(!dbUp);
const suffix = Math.random().toString(36).slice(2, 8);

run("wallet (núcleo económico, integración)", () => {
  const prisma = new PrismaService();
  const wallet = new WalletService(prisma);
  let userId: string;
  let txSeq = 0;
  const nextTx = () => `t_${suffix}_${txSeq++}`;

  beforeAll(async () => {
    await prisma.$connect();
    // Provider interno para operaciones manuales (idempotencia necesita provider no nulo)
    await prisma.provider.upsert({
      where: { code: "house" },
      update: {},
      create: { code: "house", name: "Capri House (operaciones manuales)", type: "direct" },
    });
    const user = await prisma.user.create({
      data: {
        email: `wallet_${suffix}@test.capri`,
        username: `wallet_${suffix}`,
        passwordHash: "x",
        wallet: { create: {} },
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    const txs = await prisma.transaction.findMany({ where: { userId }, select: { id: true } });
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: { in: txs.map((t) => t.id) } } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("deposit acredita y escribe asientos de doble entrada que suman cero", async () => {
    const res = await wallet.deposit({ userId, amount: 10_000n, providerCode: "house", providerTxId: nextTx() });
    expect(res.balance).toBe(10_000n);

    const entries = await prisma.ledgerEntry.findMany({ where: { transactionId: res.transactionId } });
    expect(entries).toHaveLength(2);
    const debit = entries.filter((e) => e.direction === "debit").reduce((a, e) => a + e.amount, 0n);
    const credit = entries.filter((e) => e.direction === "credit").reduce((a, e) => a + e.amount, 0n);
    expect(debit).toBe(credit); // suma cero
  });

  it("debit descuenta; sin fondos suficientes rechaza SIN tocar el ledger", async () => {
    const ok = await wallet.debit({ userId, amount: 4_000n, providerCode: "house", providerTxId: nextTx() });
    expect(ok.balance).toBe(6_000n);

    const before = await prisma.ledgerEntry.count();
    await expect(
      wallet.debit({ userId, amount: 999_999n, providerCode: "house", providerTxId: nextTx() }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
    expect(await prisma.ledgerEntry.count()).toBe(before); // nada escrito
  });

  it("idempotencia: el MISMO providerTxId dos veces descuenta UNA vez y devuelve la misma respuesta (TRAMPA #1)", async () => {
    const txId = nextTx();
    const primera = await wallet.debit({ userId, amount: 1_000n, providerCode: "house", providerTxId: txId });
    const reintento = await wallet.debit({ userId, amount: 1_000n, providerCode: "house", providerTxId: txId });

    expect(primera.balance).toBe(5_000n);
    expect(reintento.balance).toBe(5_000n); // misma respuesta, NO 4_000
    expect(reintento.replayed).toBe(true);
    expect(reintento.transactionId).toBe(primera.transactionId);

    const b = await wallet.getBalance(userId);
    expect(b.cash).toBe(5_000n);
  });

  it("win idempotente: el mismo premio dos veces acredita una (TRAMPA #2)", async () => {
    const txId = nextTx();
    await wallet.credit({ userId, amount: 2_000n, providerCode: "house", providerTxId: txId });
    const retry = await wallet.credit({ userId, amount: 2_000n, providerCode: "house", providerTxId: txId });
    expect(retry.replayed).toBe(true);
    expect((await wallet.getBalance(userId)).cash).toBe(7_000n);
  });

  it("carrera clásica: dos bets simultáneas con fondos para UNA → exactamente una pasa (Cap. 5.3-A)", async () => {
    // saldo actual 7_000; dos apuestas de 5_000 en paralelo
    const results = await Promise.allSettled([
      wallet.debit({ userId, amount: 5_000n, providerCode: "house", providerTxId: nextTx() }),
      wallet.debit({ userId, amount: 5_000n, providerCode: "house", providerTxId: nextTx() }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const ko = results.filter(
      (r) => r.status === "rejected" && (r.reason as WalletError).code === "INSUFFICIENT_FUNDS",
    );
    expect(ok).toHaveLength(1);
    expect(ko).toHaveLength(1);
    expect((await wallet.getBalance(userId)).cash).toBe(2_000n);
  });

  it("estrés: 30 bets concurrentes de 100 con saldo para 25 → pasan EXACTAMENTE 25 y saldo 0", async () => {
    await wallet.deposit({ userId, amount: 500n, providerCode: "house", providerTxId: nextTx() }); // saldo 2_500
    const bets = Array.from({ length: 30 }, () =>
      wallet.debit({ userId, amount: 100n, providerCode: "house", providerTxId: nextTx() }),
    );
    const results = await Promise.allSettled(bets);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const insufficient = results.filter(
      (r) => r.status === "rejected" && (r.reason as WalletError).code === "INSUFFICIENT_FUNDS",
    ).length;
    expect(ok).toBe(25); // ni una más, ni una menos: sin lost updates
    expect(insufficient).toBe(5);
    expect((await wallet.getBalance(userId)).cash).toBe(0n);
  });

  it("rollback escribe asientos INVERSOS (no borra) y es idempotente", async () => {
    const betTx = nextTx();
    await wallet.deposit({ userId, amount: 1_000n, providerCode: "house", providerTxId: nextTx() }); // saldo 1_000
    await wallet.debit({ userId, amount: 600n, providerCode: "house", providerTxId: betTx }); // saldo 400

    const rbTx = nextTx();
    const rb = await wallet.rollback({ userId, providerCode: "house", originalProviderTxId: betTx, providerTxId: rbTx });
    expect(rb.balance).toBe(1_000n); // apuesta devuelta

    // idempotente: repetir el rollback no duplica la devolución
    const retry = await wallet.rollback({ userId, providerCode: "house", originalProviderTxId: betTx, providerTxId: rbTx });
    expect(retry.replayed).toBe(true);
    expect((await wallet.getBalance(userId)).cash).toBe(1_000n);

    // un SEGUNDO rollback (otro txId) sobre la misma original → rechazado
    await expect(
      wallet.rollback({ userId, providerCode: "house", originalProviderTxId: betTx, providerTxId: nextTx() }),
    ).rejects.toMatchObject({ code: "ALREADY_REVERSED" });

    // el asiento original sigue existiendo (append-only)
    const original = await prisma.transaction.findFirst({ where: { userId, type: "bet", status: "reversed" } });
    expect(original).not.toBeNull();
  });

  it("el saldo materializado SIEMPRE es recalculable desde el ledger (Cap. 5.1)", async () => {
    const materializado = (await wallet.getBalance(userId)).cash;
    const recalculado = await wallet.recomputeFromLedger(userId);
    expect(recalculado).toBe(materializado);
  });

  it("TRAMPA #7: la constraint CHECK hace imposible el saldo negativo incluso saltándose el código", async () => {
    await expect(
      prisma.$executeRaw`UPDATE wallets SET cash_balance = -1 WHERE user_id = ${userId}::uuid`,
    ).rejects.toThrow(); // Postgres aborta: violates check constraint
  });

  it("retirada sin fondos suficientes se rechaza", async () => {
    await expect(
      wallet.withdraw({ userId, amount: 999_999n, providerCode: "house", providerTxId: nextTx() }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
  });
});
