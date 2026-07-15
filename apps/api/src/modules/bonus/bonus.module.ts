import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BonusController } from "./bonus.controller";
import { BonusService } from "./bonus.service";

// Exporta BonusService: el provider (bet) avanza el wagering y el admin otorga bonos.
@Module({
  imports: [WalletModule, NotificationsModule],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}
