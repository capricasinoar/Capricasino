import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";

// Monolito modular: cada módulo es una rebanada vertical con frontera estricta.
// Roadmap: auth (S1 ✅), wallet (S2), provider (S3), games (S4)...
@Module({
  imports: [PrismaModule, HealthModule, AuthModule],
})
export class AppModule {}
