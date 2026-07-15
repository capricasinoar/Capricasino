import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { VipService, VIP_TIERS } from "./vip.service";

@Controller("vip")
@UseGuards(JwtAuthGuard)
export class VipController {
  constructor(private readonly vip: VipService) {}

  // Estado VIP del jugador + la tabla de niveles (para mostrar el camino).
  @Get("status")
  async status(@CurrentUser() user: JwtPayload) {
    const status = await this.vip.status(user.sub);
    return {
      ...status,
      tiers: VIP_TIERS.map((t) => ({ name: t.name, minWagered: t.minWagered, cashbackPct: t.cashbackPct, perks: t.perks })),
    };
  }
}
