import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsService } from "./payments.service";

// La entrada/salida de dinero la hace SOLO el operador (CLI `pnpm admin` o panel
// admin). NO hay endpoint de depósito/retiro para jugadores.
@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
