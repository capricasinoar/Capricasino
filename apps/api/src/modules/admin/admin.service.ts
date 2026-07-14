import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Consultas de solo lectura del panel. Los montos se devuelven como number
// (unidad mínima FUN); el frontend divide por 100 para mostrar.
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** KPIs del dashboard (Cap. 10). GGR = apuestas − premios. */
  async dashboard() {
    const [players, wallets, byType, sessionsOpen, since] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.wallet.aggregate({ _sum: { cashBalance: true, bonusBalance: true } }),
      this.prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true }, _count: true }),
      this.prisma.gameSession.count({ where: { status: "open" } }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const sum = (t: string) => Number(byType.find((r) => r.type === t)?._sum.amount ?? 0);
    const bets = sum("bet");
    const wins = sum("win");

    return {
      players,
      balanceInCirculation: Number(wallets._sum.cashBalance ?? 0) + Number(wallets._sum.bonusBalance ?? 0),
      ggr: bets - wins, // ganancia bruta de la casa (ficticia)
      totalBets: bets,
      totalWins: wins,
      deposits: sum("deposit"),
      withdrawals: sum("withdrawal"),
      openSessions: sessionsOpen,
      txLast24h: since,
    };
  }

  /** Lista de clientes con su saldo, buscable por email/username. */
  async listUsers(search?: string, take = 50) {
    const where = search
      ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { username: { contains: search, mode: "insensitive" as const } }] }
      : {};
    const users = await this.prisma.user.findMany({
      where,
      take: Math.min(take, 200),
      orderBy: { createdAt: "desc" },
      include: { wallet: true },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      status: u.status,
      vipLevel: u.vipLevel,
      cash: Number(u.wallet?.cashBalance ?? 0),
      bonus: Number(u.wallet?.bonusBalance ?? 0),
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /** Ficha completa de un cliente: saldo + ledger + últimas transacciones. */
  async userDetail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user) throw new NotFoundException({ error: { code: "USER_NOT_FOUND", message: "Cliente no encontrado" } });

    const [transactions, sessions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { ledgerEntries: true },
      }),
      this.prisma.gameSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { game: true },
      }),
    ]);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      vipLevel: user.vipLevel,
      createdAt: user.createdAt.toISOString(),
      cash: Number(user.wallet?.cashBalance ?? 0),
      bonus: Number(user.wallet?.bonusBalance ?? 0),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: t.balanceAfter === null ? null : Number(t.balanceAfter),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        ledger: t.ledgerEntries.map((e) => ({ account: e.account, direction: e.direction, amount: Number(e.amount) })),
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        game: s.game.name,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
      })),
    };
  }

  /** Auditoría: quién hizo qué (Cap. 8.8). */
  async auditLogs(take = 100) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 500),
      include: { adminUser: { select: { email: true } } },
    });
    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      admin: l.adminUser?.email ?? "sistema",
      targetType: l.targetType,
      targetId: l.targetId,
      before: l.before,
      after: l.after,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
