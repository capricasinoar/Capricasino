import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { BonusService } from "./bonus.service";

// El jugador ve sus bonos activos y su progreso de wagering (transparencia =
// confianza; es el punto de máxima fricción en casinos, Cap. UX.4).
@Controller("bonuses")
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonus: BonusService) {}

  @Get()
  active(@CurrentUser() user: JwtPayload) {
    return this.bonus.active(user.sub);
  }
}
