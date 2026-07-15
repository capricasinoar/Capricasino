// Tests de resiliencia del protocolo de callbacks (Cap. 3.6-3.8):
// firma inválida, token viejo, duplicados, win antes que bet, rollback,
// y el "modo caos": bombardeo concurrente de callbacks duplicados.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { signCallback, type SignableCallback } from "./hmac.util";

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
const SECRET = process.env.PROVIDER_SIM_SECRET ?? "capri-sim-secret-dev";

run("provider callbacks (resiliencia, integración)", () => {
  const prisma = new PrismaService();
  const wallet = new WalletService(prisma);
  let app: NestFastifyApplication;
  let userId: string;
  let token: string;
  let seq = 0;
  const tx = () => `prv_${suffix}_${seq++}`;

  function signed(p: Omit<SignableCallback, "timestamp"> & { gameCode?: string }) {
    const payload = { ...p, timestamp: Date.now() };
    return { ...payload, hash: signCallback(payload, SECRET) };
  }

  async function callback(body: unknown) {
    const res = await app.inject({ method: "POST", url: "/provider/v1/callback", payload: body as object });
    return { code: res.statusCode, body: res.json() };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const { createApp } = await import("../../main");
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Cliente con saldo + sesión de juego abierta sobre el juego dice del seed
    const user = await prisma.user.create({
      data: {
        email: `prv_${suffix}@test.capri`,
        username: `prv_${suffix}`,
        passwordHash: "x",
        wallet: { create: {} },
      },
    });
    userId = user.id;
    await wallet.deposit({ userId, amount: 10_000n, providerCode: "house", providerTxId: tx() });

    const dice = await prisma.game.findUnique({ where: { slug: "dice" } });
    token = `tok_${suffix}`;
    await prisma.gameSession.create({ data: { userId, gameId: dice!.id, launchToken: token } });
  });

  afterAll(async () => {
    await app?.close();
    const txs = await prisma.transaction.findMany({ where: { userId }, select: { id: true } });
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: { in: txs.map((t) => t.id) } } });
    await prisma.transaction.deleteMany({ where: { userId } });
    const sessions = await prisma.gameSession.findMany({ where: { userId }, select: { id: true } });
    await prisma.round.deleteMany({ where: { gameSessionId: { in: sessions.map((s) => s.id) } } });
    await prisma.gameSession.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("rechaza con 401 una firma inválida SIN tocar el saldo (TRAMPA #5)", async () => {
    const body = signed({ action: "bet", token, amount: 1_000, roundId: "r_bad", transactionId: tx(), gameCode: "dice" });
    const res = await callback({ ...body, hash: "0".repeat(64) });
    expect(res.code).toBe(401);
    expect((await wallet.getBalance(userId)).cash).toBe(10_000n);
  });

  it("un intento de fabricar saldo sin conocer el secret falla", async () => {
    const payload = { action: "win", token, amount: 1_000_000, roundId: "r_fake", transactionId: tx(), timestamp: Date.now() };
    const res = await callback({ ...payload, hash: signCallback(payload, "secret-equivocado") });
    expect(res.code).toBe(401);
  });

  it("token desconocido o sesión cerrada → INVALID_TOKEN", async () => {
    const res = await callback(signed({ action: "balance", token: "tok_inexistente" }));
    expect(res.code).toBe(200);
    expect(res.body.status).toBe("INVALID_TOKEN");
  });

  it("balance responde el cash del wallet", async () => {
    const res = await callback(signed({ action: "balance", token }));
    expect(res.body).toMatchObject({ status: "OK", balance: 10_000, currency: "USD" });
  });

  it("bet descuenta y crea la ronda; win liquida la ronda", async () => {
    const roundId = `r_${suffix}_1`;
    const betRes = await callback(signed({ action: "bet", token, amount: 1_000, roundId, transactionId: tx(), gameCode: "dice" }));
    expect(betRes.body).toMatchObject({ status: "OK", balance: 9_000 });

    const winRes = await callback(signed({ action: "win", token, amount: 1_980, roundId, transactionId: tx() }));
    expect(winRes.body).toMatchObject({ status: "OK", balance: 10_980 });

    const round = await prisma.round.findFirst({ where: { providerRoundId: roundId } });
    expect(round?.status).toBe("settled");
    expect(round?.totalBet).toBe(1_000n);
    expect(round?.totalWin).toBe(1_980n);
  });

  it("timeout fantasma: el MISMO bet reintentado responde idéntico y descuenta UNA vez (Cap. 3.6)", async () => {
    const betTx = tx();
    const body = signed({ action: "bet", token, amount: 500, roundId: `r_${suffix}_2`, transactionId: betTx, gameCode: "dice" });
    const primera = await callback(body);
    const reintento = await callback(body); // el proveedor no recibió el OK y reintenta
    expect(primera.body.balance).toBe(10_480);
    expect(reintento.body).toMatchObject({ status: "OK", balance: 10_480 }); // misma respuesta
    expect((await wallet.getBalance(userId)).cash).toBe(10_480n);
  });

  it("win duplicado no paga dos veces (TRAMPA #2)", async () => {
    const winTx = tx();
    const body = signed({ action: "win", token, amount: 700, roundId: `r_${suffix}_2`, transactionId: winTx });
    await callback(body);
    const dup = await callback(body);
    expect(dup.body.balance).toBe(11_180);
    expect((await wallet.getBalance(userId)).cash).toBe(11_180n);
  });

  it("eventos fuera de orden: un win puede llegar ANTES que su bet (Cap. 3.6)", async () => {
    const roundId = `r_${suffix}_ooo`;
    const winRes = await callback(signed({ action: "win", token, amount: 300, roundId, transactionId: tx() }));
    expect(winRes.body.status).toBe("OK"); // acreditar nunca falla por fondos

    const betRes = await callback(signed({ action: "bet", token, amount: 200, roundId, transactionId: tx(), gameCode: "dice" }));
    expect(betRes.body.status).toBe("OK");

    const round = await prisma.round.findFirst({ where: { providerRoundId: roundId } });
    expect(round?.totalBet).toBe(200n);
    expect(round?.totalWin).toBe(300n);
  });

  it("bet sin fondos → INSUFFICIENT_FUNDS con el saldo actual", async () => {
    const res = await callback(signed({ action: "bet", token, amount: 99_999_999, roundId: `r_${suffix}_nf`, transactionId: tx(), gameCode: "dice" }));
    expect(res.body.status).toBe("INSUFFICIENT_FUNDS");
    expect(res.body.balance).toBe(11_280);
  });

  it("rollback devuelve la apuesta y es idempotente; rollback de tx inexistente → TRANSACTION_NOT_FOUND", async () => {
    const betTx = tx();
    await callback(signed({ action: "bet", token, amount: 1_000, roundId: `r_${suffix}_rb`, transactionId: betTx, gameCode: "dice" }));

    const rbTx = tx();
    const rb = await callback(signed({ action: "rollback", token, referenceTransactionId: betTx, transactionId: rbTx }));
    expect(rb.body).toMatchObject({ status: "OK", balance: 11_280 });

    const dup = await callback(signed({ action: "rollback", token, referenceTransactionId: betTx, transactionId: rbTx }));
    expect(dup.body.balance).toBe(11_280); // no duplica la devolución

    const missing = await callback(signed({ action: "rollback", token, referenceTransactionId: "no_existe", transactionId: tx() }));
    expect(missing.body.status).toBe("TRANSACTION_NOT_FOUND");
  });

  it("MODO CAOS: 40 callbacks concurrentes (20 bets únicos, cada uno duplicado) → contabilidad exacta", async () => {
    const saldoInicial = (await wallet.getBalance(userId)).cash; // 11_280
    const bets = Array.from({ length: 20 }, (_, i) => ({
      body: signed({ action: "bet", token, amount: 100, roundId: `r_${suffix}_chaos_${i}`, transactionId: `chaos_${suffix}_${i}`, gameCode: "dice" }),
    }));
    // cada bet se envía DOS veces, todo en paralelo y desordenado
    const all = [...bets, ...bets].sort(() => Math.random() - 0.5);
    const results = await Promise.all(all.map((b) => callback(b.body)));

    expect(results.every((r) => r.body.status === "OK")).toBe(true);
    const final = await wallet.getBalance(userId);
    expect(final.cash).toBe(saldoInicial - 2_000n); // 20 × 100, ni un céntimo más

    // y el ledger cuadra exactamente con el saldo materializado
    expect(await wallet.recomputeFromLedger(userId)).toBe(final.cash);
  });
});
