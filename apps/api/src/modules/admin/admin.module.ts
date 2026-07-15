import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { ResponsibleModule } from "../responsible/responsible.module";
import { VipModule } from "../vip/vip.module";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAuthGuard } from "./admin-auth.guard";
import { ReportsService } from "./reports.service";

// App admin (apps/admin) habla con estos endpoints. Auth totalmente separada
// de la de jugadores. 🧩 Hardening (S10): restricción de IP + 2FA obligatorio.
@Module({
  imports: [PaymentsModule, ResponsibleModule, VipModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard, ReportsService],
})
export class AdminModule {}
