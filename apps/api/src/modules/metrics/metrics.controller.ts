import { Controller, Get, Header } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { MetricsService } from "./metrics.service";

// Endpoint de scrape de Prometheus. Fuera de /api/v1 (excluido en main.ts) y
// sin rate limit. En producción se restringe por red/firewall al scraper.
@SkipThrottle()
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("content-type", "text/plain; version=0.0.4; charset=utf-8")
  metricsEndpoint() {
    return this.metrics.render();
  }
}
