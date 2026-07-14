import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { ProviderController } from "./provider.controller";
import { ProviderService } from "./provider.service";
import { ProviderRegistry } from "./provider.registry";
import { SimProviderAdapter } from "./adapters/sim-provider.adapter";

@Module({
  imports: [WalletModule],
  controllers: [ProviderController],
  providers: [ProviderService, SimProviderAdapter, ProviderRegistry],
  exports: [ProviderRegistry], // los demás módulos hablan con el registro, no con adapters concretos
})
export class ProviderModule {}
