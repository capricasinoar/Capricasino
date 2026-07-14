import { Body, Controller, Get, HttpCode, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { LimitKind } from "@prisma/client";
import { z } from "zod";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { apiError } from "../../shared/api-error";
import { PaymentsService } from "../payments/payments.service";
import { WalletError } from "../wallet/wallet.service";
import { ResponsibleService } from "../responsible/responsible.service";
import { AdminAuthService, type AdminJwtPayload } from "./admin-auth.service";
import { AdminAuthGuard, CurrentAdmin, Roles } from "./admin-auth.guard";
import { AdminService } from "./admin.service";
import { ReportsService } from "./reports.service";

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const AdjustBody = z.object({
  amount: z.number().int().positive(), // en unidad mínima FUN (centavos)
  kind: z.enum(["deposit", "withdrawal"]),
  reason: z.string().max(280).optional(),
});
const ExcludeBody = z.object({
  days: z.number().int().positive().nullable(), // null = permanente
  reason: z.string().max(280).optional(),
});

@Controller("admin/v1")
export class AdminController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly admin: AdminService,
    private readonly payments: PaymentsService,
    private readonly reports: ReportsService,
    private readonly rg: ResponsibleService,
  ) {}

  // ── Auth (sin guard) ──
  @Post("auth/login")
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginBody)) body: z.infer<typeof LoginBody>) {
    return this.auth.login(body.email, body.password);
  }

  // ── Todo lo demás exige token de admin ──
  @Get("me")
  @UseGuards(AdminAuthGuard)
  me(@CurrentAdmin() admin: AdminJwtPayload) {
    return { id: admin.sub, email: admin.email, role: admin.role };
  }

  @Get("dashboard")
  @UseGuards(AdminAuthGuard)
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  @UseGuards(AdminAuthGuard)
  users(@Query("search") search?: string) {
    return this.admin.listUsers(search);
  }

  @Get("users/:id")
  @UseGuards(AdminAuthGuard)
  user(@Param("id") id: string) {
    return this.admin.userDetail(id);
  }

  // Cargar/retirar saldo — reutiliza el wallet (asiento auditado). finance o super_admin.
  @Post("users/:id/adjust")
  @UseGuards(AdminAuthGuard)
  @Roles("finance")
  async adjust(
    @Param("id") userId: string,
    @Body(new ZodValidationPipe(AdjustBody)) body: z.infer<typeof AdjustBody>,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    try {
      const op =
        body.kind === "deposit"
          ? await this.payments.manualDeposit({ userId, amount: BigInt(body.amount), adminUserId: admin.sub, reason: body.reason })
          : await this.payments.manualWithdrawal({ userId, amount: BigInt(body.amount), adminUserId: admin.sub, reason: body.reason });
      return {
        paymentId: op.paymentId,
        balanceBefore: Number(op.balanceBefore),
        balanceAfter: Number(op.balanceAfter),
      };
    } catch (e) {
      if (e instanceof WalletError && e.code === "INSUFFICIENT_FUNDS") {
        apiError(409, "INSUFFICIENT_FUNDS", "El cliente no tiene saldo suficiente para retirar");
      }
      throw e;
    }
  }

  @Get("audit-logs")
  @UseGuards(AdminAuthGuard)
  auditLogs() {
    return this.admin.auditLogs();
  }

  // ── Reporting (costura #5) ──
  @Get("reports/ggr")
  @UseGuards(AdminAuthGuard)
  ggr(@Query("days") days?: string) {
    return this.reports.ggrByDay(days ? Math.min(Number(days), 365) : 30);
  }

  @Get("reports/client-activity")
  @UseGuards(AdminAuthGuard)
  clientActivity() {
    return this.reports.clientActivity();
  }

  @Get("reports/client-activity.csv")
  @UseGuards(AdminAuthGuard)
  async clientActivityCsv(@Res({ passthrough: true }) reply: FastifyReply) {
    const csv = await this.reports.clientActivityCsv();
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", 'attachment; filename="capri-actividad-clientes.csv"');
    return csv;
  }

  // ── Juego responsable de un cliente (costura #4) ──
  @Get("users/:id/responsible-gaming")
  @UseGuards(AdminAuthGuard)
  rgStatus(@Param("id") userId: string) {
    return this.rg.status(userId);
  }

  @Post("users/:id/exclude")
  @UseGuards(AdminAuthGuard)
  @Roles("support", "risk")
  async exclude(
    @Param("id") userId: string,
    @Body(new ZodValidationPipe(ExcludeBody)) body: z.infer<typeof ExcludeBody>,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    await this.rg.selfExclude({ userId, days: body.days, reason: body.reason, source: "admin", createdBy: admin.sub });
    return { ok: true };
  }

  @Post("users/:id/lift-exclusion")
  @UseGuards(AdminAuthGuard)
  @Roles("support", "risk")
  async liftExclusion(@Param("id") userId: string) {
    await this.rg.liftExclusion(userId);
    return { ok: true };
  }
}
