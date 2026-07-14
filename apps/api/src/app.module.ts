import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { GamesModule } from "./modules/games/games.module";

// Monolito modular: cada módulo es una rebanada vertical con frontera estricta.
// Roadmap: auth (S1 ✅), wallet (S2 ✅), provider (S3 ✅), games (S4: catálogo)...
@Module({
  imports: [PrismaModule, HealthModule, AuthModule, WalletModule, PaymentsModule, ProviderModule, GamesModule],
})
export class AppModule {}
