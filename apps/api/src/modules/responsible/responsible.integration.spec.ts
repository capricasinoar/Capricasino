// Tests de juego responsable: autoexclusión bloquea jugar; límite diario de
// apostado/pérdida bloquea la apuesta; levantar exclusión reactiva la cuenta.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ResponsibleService, ExcludedError, LimitReachedError } from "./responsible.service";

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

run("juego responsable (integración)", () => {
  const prisma = new PrismaService();
  const rg = new ResponsibleService(prisma);
  let userId: string;
  let seq = 0;

  // Inserta transacciones de tipo bet/win para simular actividad del día.
  async function activity(type: "bet" | "win", amount: bigint) {
    const house = await prisma.provider.findUnique({ where: { code: "house" } });
    await prisma.transaction.create({
      data: { userId, type, amount, providerId: house!.id, providerTxId: `rg_${suffix}_${seq++}`, balanceAfter: 0n },
    });
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.provider.upsert({ where: { code: "house" }, update: {}, create: { code: "house", name: "House", type: "direct" } });
    const user = await prisma.user.create({
      data: { email: `rg_${suffix}@test.capri`, username: `rg_${suffix}`, passwordHash: "x", wallet: { create: {} } },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.playerLimit.deleteMany({ where: { userId } });
    await prisma.selfExclusion.deleteMany({ where: { userId } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("sin límites ni exclusión, puede jugar y apostar", async () => {
    await expect(rg.assertCanPlay(userId)).resolves.toBeUndefined();
    await expect(rg.assertWithinLimits(userId, 10_000n)).resolves.toBeUndefined();
  });

  it("límite diario de apostado: bloquea cuando la apuesta lo superaría", async () => {
    await rg.setLimit(userId, "daily_wager", 5_000n); // tope 50 FUN/día
    await activity("bet", 3_000n); // ya apostó 30 FUN hoy
    // otra de 30 FUN → 60 > 50 → bloquea
    await expect(rg.assertWithinLimits(userId, 3_000n)).rejects.toBeInstanceOf(LimitReachedError);
    // una de 10 FUN → 40 <= 50 → permite
    await expect(rg.assertWithinLimits(userId, 1_000n)).resolves.toBeUndefined();
    await rg.removeLimit(userId, "daily_wager");
  });

  it("límite diario de pérdida: bloquea cuando la pérdida neta ya lo alcanzó", async () => {
    // Estado del test anterior: bet 3_000. Añadimos para pérdida neta.
    await activity("bet", 7_000n); // total bet hoy = 10_000
    await activity("win", 2_000n); // win = 2_000 → pérdida neta 8_000
    await rg.setLimit(userId, "daily_loss", 5_000n); // tope pérdida 50 FUN
    // pérdida neta 80 FUN >= 50 → bloquea cualquier apuesta
    await expect(rg.assertWithinLimits(userId, 100n)).rejects.toMatchObject({ kind: "daily_loss" });
    await rg.removeLimit(userId, "daily_loss");
  });

  it("autoexclusión temporal bloquea jugar; su estado se refleja", async () => {
    await rg.selfExclude({ userId, days: 7, reason: "descanso", source: "player" });
    await expect(rg.assertCanPlay(userId)).rejects.toBeInstanceOf(ExcludedError);

    const status = await rg.status(userId);
    expect(status.exclusion).not.toBeNull();
    expect(status.exclusion?.source).toBe("player");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.status).toBe("self_excluded");
  });

  it("levantar la exclusión (admin) reactiva la cuenta y permite jugar", async () => {
    await rg.liftExclusion(userId);
    await expect(rg.assertCanPlay(userId)).resolves.toBeUndefined();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.status).toBe("active");
  });

  it("exclusión permanente (until=null) bloquea indefinidamente", async () => {
    await rg.selfExclude({ userId, days: null, source: "player" });
    await expect(rg.assertCanPlay(userId)).rejects.toBeInstanceOf(ExcludedError);
    const ex = await rg.activeExclusion(userId);
    expect(ex?.until).toBeNull();
    await rg.liftExclusion(userId);
  });
});
