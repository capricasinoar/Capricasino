// Reporting (🧩 COSTURA-REAL #5, Cap. 0). Reportes de GGR y actividad, con
// trazabilidad desde el ledger. En play money son para el operador; con
// licencia, la misma base alimenta los reportes regulatorios.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface GgrDay {
  day: string; // YYYY-MM-DD (UTC)
  bets: number;
  wins: number;
  ggr: number;
  deposits: number;
  withdrawals: number;
}

export interface ClientActivityRow {
  userId: string;
  username: string;
  email: string;
  bets: number;
  wins: number;
  ggr: number; // apuestas − premios (ganancia de la casa sobre este cliente)
  deposits: number;
  withdrawals: number;
  balance: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GGR y flujos por día (UTC), últimos `days` días. */
  async ggrByDay(days = 30): Promise<GgrDay[]> {
    const rows = await this.prisma.$queryRaw<
      { day: Date; bets: bigint; wins: bigint; deposits: bigint; withdrawals: bigint }[]
    >`
      SELECT date_trunc('day', created_at) AS day,
             COALESCE(SUM(amount) FILTER (WHERE type = 'bet'), 0)        AS bets,
             COALESCE(SUM(amount) FILTER (WHERE type = 'win'), 0)        AS wins,
             COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0)    AS deposits,
             COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal'), 0) AS withdrawals
      FROM transactions
      WHERE created_at >= now() - (${days} || ' days')::interval
      GROUP BY 1
      ORDER BY 1 DESC`;
    return rows.map((r) => {
      const bets = Number(r.bets);
      const wins = Number(r.wins);
      return {
        day: r.day.toISOString().slice(0, 10),
        bets,
        wins,
        ggr: bets - wins,
        deposits: Number(r.deposits),
        withdrawals: Number(r.withdrawals),
      };
    });
  }

  /** Actividad económica por cliente (para conciliación y reportes). */
  async clientActivity(): Promise<ClientActivityRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        user_id: string;
        username: string;
        email: string;
        bets: bigint;
        wins: bigint;
        deposits: bigint;
        withdrawals: bigint;
        balance: bigint;
      }[]
    >`
      SELECT u.id AS user_id, u.username, u.email,
             COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'bet'), 0)        AS bets,
             COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'win'), 0)        AS wins,
             COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit'), 0)    AS deposits,
             COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'withdrawal'), 0) AS withdrawals,
             COALESCE(w.cash_balance, 0) AS balance
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      LEFT JOIN wallets w ON w.user_id = u.id
      GROUP BY u.id, u.username, u.email, w.cash_balance
      ORDER BY (COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'bet'), 0) -
                COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'win'), 0)) DESC`;
    return rows.map((r) => {
      const bets = Number(r.bets);
      const wins = Number(r.wins);
      return {
        userId: r.user_id,
        username: r.username,
        email: r.email,
        bets,
        wins,
        ggr: bets - wins,
        deposits: Number(r.deposits),
        withdrawals: Number(r.withdrawals),
        balance: Number(r.balance),
      };
    });
  }

  /** CSV de actividad por cliente (montos en FUN con 2 decimales). */
  async clientActivityCsv(): Promise<string> {
    const rows = await this.clientActivity();
    const fun = (c: number) => (c / 100).toFixed(2);
    const header = ["usuario", "email", "apostado", "premios", "ggr", "cargas", "retiradas", "saldo"];
    const lines = rows.map((r) =>
      [r.username, r.email, fun(r.bets), fun(r.wins), fun(r.ggr), fun(r.deposits), fun(r.withdrawals), fun(r.balance)]
        .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }
}
