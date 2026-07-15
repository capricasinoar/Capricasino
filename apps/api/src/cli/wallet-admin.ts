// CLI del operador — cargas y retiradas manuales de saldo con triple registro.
// Se ejecuta desde la raíz del monorepo:
//   pnpm admin balance  cliente@email.com
//   pnpm admin deposit  cliente@email.com 500        "Carga inicial"
//   pnpm admin withdraw cliente@email.com 200        "Retiro solicitado"
//   pnpm admin history  cliente@email.com [n]
// Montos en USD (se convierten a unidad mínima, x100, internamente).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

// Carga .env de la raíz del monorepo (la CLI corre fuera de Nest/Prisma CLI)
function loadEnv() {
  for (const candidate of [".env", "../../.env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), candidate), "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
      }
      return;
    } catch {
      /* siguiente candidato */
    }
  }
}
loadEnv();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "owner@capri.local";

function fun(unidadMinima: bigint): string {
  const sign = unidadMinima < 0n ? "-" : "";
  const abs = unidadMinima < 0n ? -unidadMinima : unidadMinima;
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")} USD`;
}

async function main() {
  const [cmd, email, amountArg, ...reasonParts] = process.argv.slice(2);
  if (!cmd || !email) {
    console.log("Uso: pnpm admin <balance|deposit|withdraw|history> <email> [monto USD] [razón]");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  // Import dinámico para reutilizar los servicios reales (mismo código que los tests)
  const { WalletService, WalletError } = await import("../modules/wallet/wallet.service");
  const { PaymentsService } = await import("../modules/payments/payments.service");
  const wallet = new WalletService(prisma as never);
  const payments = new PaymentsService(prisma as never, wallet);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✗ No existe ningún cliente con email ${email}`);
    process.exit(1);
  }
  const admin = await prisma.adminUser.findUnique({ where: { email: ADMIN_EMAIL } });

  try {
    switch (cmd) {
      case "balance": {
        const b = await wallet.getBalance(user.id);
        console.log(`${user.username} <${email}>`);
        console.log(`  cash:  ${fun(b.cash)}`);
        console.log(`  bonus: ${fun(b.bonus)}`);
        break;
      }

      case "deposit":
      case "withdraw": {
        const amountFun = Number(amountArg);
        if (!Number.isFinite(amountFun) || amountFun <= 0) {
          console.error("✗ Monto inválido. Ejemplo: pnpm admin deposit cliente@mail.com 500");
          process.exit(1);
        }
        const amount = BigInt(Math.round(amountFun * 100));
        const reason = reasonParts.join(" ") || undefined;
        const op =
          cmd === "deposit"
            ? await payments.manualDeposit({ userId: user.id, amount, adminUserId: admin?.id ?? null, reason })
            : await payments.manualWithdrawal({ userId: user.id, amount, adminUserId: admin?.id ?? null, reason });

        console.log(`✓ ${cmd === "deposit" ? "Carga" : "Retirada"} registrada para ${user.username}`);
        console.log(`  monto:        ${fun(amount)}`);
        console.log(`  saldo antes:  ${fun(op.balanceBefore)}`);
        console.log(`  saldo ahora:  ${fun(op.balanceAfter)}`);
        console.log(`  recibo:       ${op.paymentId}`);
        console.log(`  transacción:  ${op.transactionId}`);
        if (reason) console.log(`  razón:        ${reason}`);
        break;
      }

      case "history": {
        const n = Math.min(Number(amountArg) || 15, 100);
        const txs = await prisma.transaction.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: n,
        });
        console.log(`Últimos ${txs.length} movimientos de ${user.username}:`);
        for (const t of txs) {
          const fecha = t.createdAt.toISOString().replace("T", " ").slice(0, 19);
          const saldo = t.balanceAfter === null ? "" : ` → saldo ${fun(t.balanceAfter)}`;
          console.log(`  ${fecha}  ${t.type.padEnd(10)} ${fun(t.amount).padStart(14)}${saldo}  [${t.status}]`);
        }
        break;
      }

      default:
        console.error(`✗ Comando desconocido: ${cmd}`);
        process.exit(1);
    }
  } catch (e) {
    if (e instanceof WalletError) {
      console.error(`✗ Operación rechazada: ${e.code}${e.balance !== undefined ? ` (saldo: ${fun(e.balance)})` : ""}`);
      process.exit(1);
    }
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
