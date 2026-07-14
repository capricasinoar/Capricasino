import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { LimitKind } from "@prisma/client";
import { z } from "zod";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { apiError } from "../../shared/api-error";
import { ResponsibleService } from "./responsible.service";

const SetLimitBody = z.object({
  kind: z.enum(["daily_wager", "daily_loss", "session_reminder"]),
  value: z.number().int().positive(), // monto (unidad mínima) o minutos
});
const ExcludeBody = z.object({
  days: z.number().int().positive().nullable(), // null = permanente
  reason: z.string().max(280).optional(),
});

// Herramientas de juego responsable del PROPIO jugador (Cap. 0 costura #4).
// No mueven dinero — no chocan con la regla "solo el operador carga/retira".
@Controller("responsible-gaming")
@UseGuards(JwtAuthGuard)
export class ResponsibleController {
  constructor(private readonly rg: ResponsibleService) {}

  @Get("status")
  status(@CurrentUser() user: JwtPayload) {
    return this.rg.status(user.sub);
  }

  @Put("limits")
  async setLimit(@Body(new ZodValidationPipe(SetLimitBody)) body: z.infer<typeof SetLimitBody>, @CurrentUser() user: JwtPayload) {
    await this.rg.setLimit(user.sub, body.kind as LimitKind, BigInt(body.value));
    return this.rg.status(user.sub);
  }

  @Delete("limits/:kind")
  async removeLimit(@Param("kind") kind: string, @CurrentUser() user: JwtPayload) {
    if (!["daily_wager", "daily_loss", "session_reminder"].includes(kind)) {
      apiError(400, "INVALID_LIMIT", "Tipo de límite inválido");
    }
    await this.rg.removeLimit(user.sub, kind as LimitKind);
    return this.rg.status(user.sub);
  }

  @Post("self-exclude")
  @HttpCode(200)
  async selfExclude(@Body(new ZodValidationPipe(ExcludeBody)) body: z.infer<typeof ExcludeBody>, @CurrentUser() user: JwtPayload) {
    await this.rg.selfExclude({ userId: user.sub, days: body.days, reason: body.reason, source: "player" });
    return { ok: true };
  }
}
