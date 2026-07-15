import { Global, Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

// Global: cualquier servicio (p.ej. WalletService) puede inyectar MetricsService
// de forma opcional para registrar métricas de negocio.
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
