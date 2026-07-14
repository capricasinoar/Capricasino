import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "./wallet.service";

// Endpoints del jugador (Cap. 7.2). El userId sale SIEMPRE del token (anti-IDOR).
@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("balance")
  async balance(@CurrentUser() user: JwtPayload) {
    const b = await this.wallet.getBalance(user.sub);
    return { cash: Number(b.cash), bonus: Number(b.bonus), total: Number(b.total), currency: "FUN" };
  }

  // Historial: el cliente ve TODAS sus cargas, retiradas, apuestas y premios.
  @Get("transactions")
  async transactions(
    @CurrentUser() user: JwtPayload,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const take = Math.min(Number(limit ?? 20), 100);
    const items = await this.prisma.transaction.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, type: true, amount: true, balanceAfter: true, status: true, createdAt: true },
    });
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    return {
      items: page.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: t.balanceAfter === null ? null : Number(t.balanceAfter),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
