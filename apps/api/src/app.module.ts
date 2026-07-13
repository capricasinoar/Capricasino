import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";

// Monolito modular: cada módulo es una rebanada vertical con frontera estricta.
// Se irán sumando según el roadmap: auth (S1), wallet (S2), provider (S3), games (S4)...
@Module({
  imports: [HealthModule],
})
export class AppModule {}
