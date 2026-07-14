// Tests del TRIPLE REGISTRO de cargas/retiradas manuales:
// ledger (doble entrada) + payment_transactions (recibo) + audit_logs (quién/antes/después).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { PaymentsService } from "./payments.service";

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

run("payments manuales (triple registro, integración)", () => {
  const prisma = new PrismaService();
  const payments = new PaymentsService(prisma, new WalletService(prisma));
  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.provider.upsert({
      where: { code: "house" },
      update: {},
      create: { code: "house", name: "Capri House (operaciones manuales)", type: "direct" },
    });
    const admin = await prisma.adminUser.upsert({
      where: { email: `owner_${suffix}@test.capri` },
      update: {},
      create: { email: `owner_${suffix}@test.capri`, passwordHash: "!cli", role: "super_admin" },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: {
        email: `pay_${suffix}@test.capri`,
        username: `pay_${suffix}`,
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
    await prisma.paymentTransaction.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { targetId: userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.adminUser.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("una carga manual deja los TRES registros", async () => {
    const res = await payments.manualDeposit({
      userId,
      amount: 50_000n,
      adminUserId: adminId,
      reason: "Carga inicial cliente VIP",
    });
    expect(res.balanceBefore).toBe(0n);
    expect(res.balanceAfter).toBe(50_000n);

    // 1. Ledger + transaction
    const tx = await prisma.transaction.findUnique({
      where: { id: res.transactionId },
      include: { ledgerEntries: true },
    });
    expect(tx?.type).toBe("deposit");
    expect(tx?.ledgerEntries).toHaveLength(2);

    // 2. Recibo en payment_transactions
    const pago = await prisma.paymentTransaction.findUnique({ where: { id: res.paymentId } });
    expect(pago?.type).toBe("deposit");
    expect(pago?.amount).toBe(50_000n);
    expect(pago?.method).toBe("manual");
    expect(pago?.status).toBe("completed");

    // 3. Auditoría con quién, antes/después y razón
    const audit = await prisma.auditLog.findFirst({
      where: { targetId: userId, action: "wallet.manual_deposit" },
    });
    expect(audit?.adminUserId).toBe(adminId);
    expect(audit?.before).toMatchObject({ cash: "0" });
    expect(audit?.after).toMatchObject({ cash: "50000", reason: "Carga inicial cliente VIP" });
  });

  it("una retirada manual deja los tres registros y respeta los fondos", async () => {
    const res = await payments.manualWithdrawal({
      userId,
      amount: 20_000n,
      adminUserId: adminId,
      reason: "Retiro solicitado por el cliente",
    });
    expect(res.balanceAfter).toBe(30_000n);

    const pago = await prisma.paymentTransaction.findFirst({ where: { userId, type: "withdrawal" } });
    expect(pago?.status).toBe("completed");
    const audit = await prisma.auditLog.findFirst({
      where: { targetId: userId, action: "wallet.manual_withdrawal" },
    });
    expect(audit).not.toBeNull();

    // retirada mayor que el saldo → rechazada, sin registros nuevos
    const recibosAntes = await prisma.paymentTransaction.count({ where: { userId } });
    await expect(
      payments.manualWithdrawal({ userId, amount: 999_999n, adminUserId: adminId }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
    expect(await prisma.paymentTransaction.count({ where: { userId } })).toBe(recibosAntes);
  });

  it("reintento con la misma idempotencyKey NO duplica carga ni recibo", async () => {
    const key = `manual_test_${suffix}`;
    await payments.manualDeposit({ userId, amount: 5_000n, adminUserId: adminId, idempotencyKey: key });
    await payments.manualDeposit({ userId, amount: 5_000n, adminUserId: adminId, idempotencyKey: key });

    const recibos = await prisma.paymentTransaction.count({ where: { userId, pspRef: key } });
    expect(recibos).toBe(1);
    const balance = await prisma.wallet.findUnique({ where: { userId } });
    expect(balance?.cashBalance).toBe(35_000n); // 30_000 + 5_000, no + 10_000
  });
});
