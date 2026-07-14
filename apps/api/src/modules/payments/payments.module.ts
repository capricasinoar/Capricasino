import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { PaymentsService } from "./payments.service";

// Sin controller HTTP todavía: las cargas/retiradas manuales se hacen por la
// CLI del operador (src/cli/wallet-admin.ts). El panel admin llega en S9 con
// su auth separada + 2FA; hasta entonces NO se expone esto a la red.
@Module({
  imports: [WalletModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
