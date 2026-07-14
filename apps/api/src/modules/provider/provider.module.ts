import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { ProviderController } from "./provider.controller";
import { ProviderService } from "./provider.service";
import { SimProviderAdapter } from "./adapters/sim-provider.adapter";

@Module({
  imports: [WalletModule],
  controllers: [ProviderController],
  providers: [ProviderService, SimProviderAdapter],
  exports: [SimProviderAdapter],
})
export class ProviderModule {}
