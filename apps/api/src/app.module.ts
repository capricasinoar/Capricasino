import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { HealthModule } from "./modules/health/health.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { MetricsInterceptor } from "./modules/metrics/metrics.interceptor";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { GamesModule } from "./modules/games/games.module";
import { SimModule } from "./modules/sim/sim.module";
import { ResponsibleModule } from "./modules/responsible/responsible.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AdminModule } from "./modules/admin/admin.module";

// Monolito modular: cada módulo es una rebanada vertical con frontera estricta.
// Roadmap: auth (S1 ✅), wallet (S2 ✅), provider (S3 ✅), games (S4 ✅),
// realtime (S6 ✅), admin (S9 ✅).
@Module({
  imports: [
    EventEmitterModule.forRoot(), // bus interno de eventos de dominio (Cap. 9.3)
    // Rate limiting global moderado (Cap. 8.6); login/registro llevan tope
    // estricto propio (@Throttle) y el callback del proveedor se exime.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    MetricsModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    WalletModule,
    PaymentsModule,
    ProviderModule,
    GamesModule,
    SimModule,
    ResponsibleModule,
    NotificationsModule,
    RealtimeModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
