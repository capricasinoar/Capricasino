// Test del flujo de bono: otorgar → bucket bonus; apostar avanza el wagering;
// al cumplirlo, el bono se libera a cash.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { BonusService } from "./bonus.service";

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

run("bonos (integración)", () => {
  const prisma = new PrismaService();
  const wallet = new WalletService(prisma);
  const bonus = new BonusService(prisma, wallet);
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.provider.upsert({ where: { code: "house" }, update: {}, create: { code: "house", name: "House", type: "direct" } });
    const user = await prisma.user.create({
      data: { email: `bonus_${suffix}@test.capri`, username: `bonus_${suffix}`, passwordHash: "x", wallet: { create: {} } },
    });
    userId = user.id;
  });

  afterAll(async () => {
    const txs = await prisma.transaction.findMany({ where: { userId }, select: { id: true } });
    await prisma.ledgerEntry.deleteMany({ where: { transactionId: { in: txs.map((t) => t.id) } } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.bonusGrant.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("otorgar un bono acredita el bucket bonus (no el cash)", async () => {
    await bonus.grant({ userId, amount: 10_000n, wageringMultiplier: 3 }); // 100 USD, wagering 300
    const b = await wallet.getBalance(userId);
    expect(b.bonus).toBe(10_000n);
    expect(b.cash).toBe(0n);

    const active = await bonus.active(userId);
    expect(active).toHaveLength(1);
    expect(active[0].wageringTarget).toBe(30_000);
    expect(active[0].progressPct).toBe(0);
  });

  it("apostar avanza el wagering sin liberar aún", async () => {
    await bonus.recordWager(userId, 10_000n); // 100 de 300
    const active = await bonus.active(userId);
    expect(active[0].wageringProgress).toBe(10_000);
    expect(active[0].progressPct).toBe(33);
    // el bono sigue en bonus, no en cash
    expect((await wallet.getBalance(userId)).cash).toBe(0n);
  });

  it("al cumplir el wagering, el bono se libera a cash", async () => {
    await bonus.recordWager(userId, 20_000n); // completa 300
    const active = await bonus.active(userId);
    expect(active).toHaveLength(0); // ya no está activo

    const b = await wallet.getBalance(userId);
    expect(b.bonus).toBe(0n); // salió del bucket bonus
    expect(b.cash).toBe(10_000n); // entró al cash (retirable)

    // recalculable desde el ledger
    expect(await wallet.recomputeFromLedger(userId)).toBe(10_000n);
  });

  it("grantBonus es idempotente por providerTxId (no duplica bono)", async () => {
    const before = (await wallet.getBalance(userId)).bonus;
    const tx = `dup_${suffix}`;
    await wallet.grantBonus({ userId, amount: 5_000n, providerCode: "house", providerTxId: tx });
    await wallet.grantBonus({ userId, amount: 5_000n, providerCode: "house", providerTxId: tx });
    expect((await wallet.getBalance(userId)).bonus).toBe(before + 5_000n); // una sola vez
  });
});
