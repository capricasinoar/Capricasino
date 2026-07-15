import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { ResponsibleModule } from "../responsible/responsible.module";
import { BonusModule } from "../bonus/bonus.module";
import { ProviderController } from "./provider.controller";
import { ProviderService } from "./provider.service";
import { ProviderRegistry } from "./provider.registry";
import { SimProviderAdapter } from "./adapters/sim-provider.adapter";

@Module({
  imports: [WalletModule, ResponsibleModule, BonusModule],
  controllers: [ProviderController],
  providers: [ProviderService, SimProviderAdapter, ProviderRegistry],
  // ProviderService se exporta para el motor de juego embebido (SimModule).
  exports: [ProviderRegistry, ProviderService],
})
export class ProviderModule {}
