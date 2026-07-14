import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { apiError } from "../../shared/api-error";
import { PaymentsService } from "../payments/payments.service";
import { WalletError } from "../wallet/wallet.service";
import { AdminAuthService, type AdminJwtPayload } from "./admin-auth.service";
import { AdminAuthGuard, CurrentAdmin, Roles } from "./admin-auth.guard";
import { AdminService } from "./admin.service";

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const AdjustBody = z.object({
  amount: z.number().int().positive(), // en unidad mínima FUN (centavos)
  kind: z.enum(["deposit", "withdrawal"]),
  reason: z.string().max(280).optional(),
});

@Controller("admin/v1")
export class AdminController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly admin: AdminService,
    private readonly payments: PaymentsService,
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
}
