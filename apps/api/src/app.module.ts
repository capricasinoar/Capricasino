import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { GamesModule } from "./modules/games/games.module";
import { ResponsibleModule } from "./modules/responsible/responsible.module";
import { AdminModule } from "./modules/admin/admin.module";

// Monolito modular: cada módulo es una rebanada vertical con frontera estricta.
// Roadmap: auth (S1 ✅), wallet (S2 ✅), provider (S3 ✅), games (S4 ✅),
// realtime (S6 ✅), admin (S9 ✅).
@Module({
  imports: [
    EventEmitterModule.forRoot(), // bus interno de eventos de dominio (Cap. 9.3)
    PrismaModule,
    HealthModule,
    AuthModule,
    WalletModule,
    PaymentsModule,
    ProviderModule,
    GamesModule,
    ResponsibleModule,
    RealtimeModule,
    AdminModule,
  ],
})
export class AppModule {}
